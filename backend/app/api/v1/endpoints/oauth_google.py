import uuid
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_user, get_current_tenant_id
from app.models.user import User
from app.models.oauth_token import OAuthToken
from app.services.token_vault import encrypt, decrypt

router = APIRouter(prefix="/oauth/google", tags=["oauth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

_pending_states: dict = {}


@router.get("/status")
def google_status(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Check if Google OAuth token exists for this tenant."""
    token = db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "GOOGLE",
    ).first()
    return {"connected": token is not None}


ALLOWED_RETURN_TO = {"settings", "onboarding"}


@router.get("/connect")
def connect_google(return_to: str = "settings", user: User = Depends(get_current_user)):
    """Redirect agency owner to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env")
    if return_to not in ALLOWED_RETURN_TO:
        return_to = "settings"

    state = f"{user.tenant_id}:{uuid.uuid4().hex}:{return_to}"
    _pending_states[state] = str(user.tenant_id)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "scope": "https://www.googleapis.com/auth/adwords",
        "state": state,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",  # force refresh_token on every connect
    }
    url = GOOGLE_AUTH_URL + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": url}


@router.get("/callback")
def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback — exchange code for access + refresh tokens."""
    tenant_id = _pending_states.pop(state, None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    return_to = state.split(":")[-1] if state.count(":") >= 2 and state.split(":")[-1] in ALLOWED_RETURN_TO else "settings"

    with httpx.Client() as client:
        resp = client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Google token exchange failed: {resp.text}")
        token_data = resp.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token received. Revoke app access in Google Account settings and reconnect.")

    existing = db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "GOOGLE",
    ).first()

    if existing:
        existing.access_token = encrypt(access_token)
        existing.refresh_token = encrypt(refresh_token)
        existing.expires_at = expires_at
        existing.updated_at = datetime.now(timezone.utc)
    else:
        db.add(OAuthToken(
            tenant_id=tenant_id,
            platform="GOOGLE",
            access_token=encrypt(access_token),
            refresh_token=encrypt(refresh_token),
            expires_at=expires_at,
            scopes=["https://www.googleapis.com/auth/adwords"],
        ))

    db.commit()
    return RedirectResponse(f"{settings.FRONTEND_URL}/{return_to}?google=connected")


@router.delete("/disconnect")
def disconnect_google(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    from app.models.brand_account import BrandAccount
    db.query(BrandAccount).filter(
        BrandAccount.tenant_id == tenant_id,
        BrandAccount.platform == "GOOGLE",
    ).delete()
    db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "GOOGLE",
    ).delete()
    db.commit()
    return {"message": "Google disconnected"}


@router.get("/accounts")
def list_google_accounts(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    token = db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == "GOOGLE",
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Google not connected")

    from app.services.google import google_service
    try:
        accounts = google_service.list_accessible_customers(
            decrypt(token.access_token),
            decrypt(token.refresh_token) if token.refresh_token else "",
        )
        return {"accounts": accounts}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
