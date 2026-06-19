import uuid
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_user, get_current_tenant_id
from app.models.user import User
from app.models.oauth_token import OAuthToken
from app.services.token_vault import encrypt, decrypt

router = APIRouter(prefix="/oauth/meta", tags=["oauth"])

META_AUTH_URL = "https://www.facebook.com/v20.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v20.0/oauth/access_token"
META_EXTEND_URL = "https://graph.facebook.com/v20.0/oauth/access_token"

# In-memory CSRF state store (Phase 2: use Redis)
_pending_states: dict = {}


@router.get("/status")
def meta_status(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Check if Meta OAuth token exists for this tenant."""
    token = db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "META",
    ).first()
    return {"connected": token is not None}


@router.get("/connect")
def connect_meta(
    user: User = Depends(get_current_user),
):
    """Redirect agency owner to Meta OAuth consent screen."""
    if not settings.META_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Meta OAuth not configured. Add META_CLIENT_ID to .env")

    state = f"{user.tenant_id}:{uuid.uuid4().hex}"
    _pending_states[state] = str(user.tenant_id)

    params = {
        "client_id": settings.META_CLIENT_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "scope": "ads_read,ads_management,business_management",
        "state": state,
        "response_type": "code",
    }
    url = META_AUTH_URL + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": url}


@router.get("/callback")
def meta_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Handle Meta OAuth callback — exchange code, store long-lived token."""
    tenant_id = _pending_states.pop(state, None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    # Exchange code for short-lived token
    with httpx.Client() as client:
        resp = client.get(META_TOKEN_URL, params={
            "client_id": settings.META_CLIENT_ID,
            "client_secret": settings.META_CLIENT_SECRET,
            "redirect_uri": settings.META_REDIRECT_URI,
            "code": code,
        })
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Meta token exchange failed: {resp.text}")
        short_token = resp.json().get("access_token")

        # Exchange for 60-day long-lived token
        ext_resp = client.get(META_EXTEND_URL, params={
            "grant_type": "fb_exchange_token",
            "client_id": settings.META_CLIENT_ID,
            "client_secret": settings.META_CLIENT_SECRET,
            "fb_exchange_token": short_token,
        })
        if ext_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Meta token extension failed")
        token_data = ext_resp.json()
        long_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Upsert token
    existing = db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "META",
    ).first()

    if existing:
        existing.access_token = encrypt(long_token)
        existing.expires_at = expires_at
        existing.updated_at = datetime.now(timezone.utc)
    else:
        db.add(OAuthToken(
            tenant_id=tenant_id,
            platform="META",
            access_token=encrypt(long_token),
            expires_at=expires_at,
            scopes=["ads_read", "ads_management", "business_management"],
        ))

    db.commit()
    return RedirectResponse("http://localhost:3000/settings?meta=connected")


@router.delete("/disconnect")
def disconnect_meta(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Remove Meta token and unmap all Meta brand accounts."""
    from app.models.brand_account import BrandAccount
    db.query(BrandAccount).filter(
        BrandAccount.tenant_id == tenant_id,
        BrandAccount.platform == "META",
    ).delete()
    db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "META",
    ).delete()
    db.commit()
    return {"message": "Meta disconnected"}


@router.get("/accounts")
def list_meta_accounts(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List Meta ad accounts available to the connected token."""
    token = db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "META",
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Meta not connected")

    from app.services.meta import meta_service
    try:
        accounts = meta_service.list_ad_accounts(decrypt(token.access_token))
        return {"accounts": accounts}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
