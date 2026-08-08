from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_tenant_id
from app.models.brand import Brand
from app.models.brand_account import BrandAccount
from app.models.daily_metric import DailyMetric
from app.schemas.brand import BrandCreate, BrandUpdate, BrandOut, AccountMapRequest, AccountOut, BrandOverviewItem
from app.services.ingest import sync_account

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", response_model=List[BrandOut])
def list_brands(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    brands = db.query(Brand).filter(Brand.tenant_id == tenant_id).all()
    return [
        BrandOut(
            id=str(b.id), name=b.name, color=b.color, industry=b.industry,
            target_roas=float(b.target_roas) if b.target_roas else None,
            monthly_budget_cap=float(b.monthly_budget_cap) if b.monthly_budget_cap else None,
            currency=b.currency, logo_url=b.logo_url, website_url=b.website_url,
            accounts=[AccountOut(id=str(a.id), platform=a.platform, account_id=a.account_id, account_name=a.account_name) for a in b.accounts],
        )
        for b in brands
    ]


@router.post("", response_model=BrandOut, status_code=201)
def create_brand(
    body: BrandCreate,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    brand = Brand(tenant_id=tenant_id, **body.model_dump())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return BrandOut(
        id=str(brand.id), name=brand.name, color=brand.color, industry=brand.industry,
        target_roas=float(brand.target_roas) if brand.target_roas else None,
        monthly_budget_cap=float(brand.monthly_budget_cap) if brand.monthly_budget_cap else None,
        currency=brand.currency, logo_url=brand.logo_url, website_url=brand.website_url, accounts=[],
    )


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: str,
    body: BrandUpdate,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.tenant_id == tenant_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(brand, k, v)
    db.commit()
    db.refresh(brand)
    return BrandOut(
        id=str(brand.id), name=brand.name, color=brand.color, industry=brand.industry,
        target_roas=float(brand.target_roas) if brand.target_roas else None,
        monthly_budget_cap=float(brand.monthly_budget_cap) if brand.monthly_budget_cap else None,
        currency=brand.currency, logo_url=brand.logo_url, website_url=brand.website_url,
        accounts=[AccountOut(id=str(a.id), platform=a.platform, account_id=a.account_id, account_name=a.account_name) for a in brand.accounts],
    )


@router.delete("/{brand_id}", status_code=204)
def delete_brand(
    brand_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.tenant_id == tenant_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    db.delete(brand)
    db.commit()


@router.post("/{brand_id}/accounts", response_model=AccountOut, status_code=201)
def map_account(
    brand_id: str,
    body: AccountMapRequest,
    background_tasks: BackgroundTasks,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.tenant_id == tenant_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    existing = db.query(BrandAccount).filter(
        BrandAccount.tenant_id == tenant_id,
        BrandAccount.platform == body.platform,
        BrandAccount.account_id == body.account_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Account already mapped")

    account = BrandAccount(
        tenant_id=tenant_id,
        brand_id=brand_id,
        platform=body.platform,
        account_id=body.account_id,
        account_name=body.account_name,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    # Kick off the initial 90-day historical pull automatically — no manual
    # "Sync" click needed right after connecting an account.
    background_tasks.add_task(sync_account, db, tenant_id, account, 90)

    return AccountOut(id=str(account.id), platform=account.platform, account_id=account.account_id, account_name=account.account_name)


@router.delete("/{brand_id}/accounts/{account_id}", status_code=204)
def unmap_account(
    brand_id: str,
    account_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    acct = db.query(BrandAccount).filter(
        BrandAccount.id == account_id,
        BrandAccount.brand_id == brand_id,
        BrandAccount.tenant_id == tenant_id,
    ).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account mapping not found")
    db.delete(acct)
    db.commit()


@router.get("/overview")
def brands_overview(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    platform: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    from datetime import date, timedelta
    from app.models.campaign_metric import CampaignDailyMetric
    from app.models.campaign_classification import CampaignClassification

    d_to   = date.fromisoformat(date_to)   if date_to   else date.today()
    d_from = date.fromisoformat(date_from) if date_from else d_to - timedelta(days=6)

    brands = db.query(Brand).filter(Brand.tenant_id == tenant_id).all()

    # Campaign-level rows carry classification (Sales vs Lead Gen); account-level
    # DailyMetric doesn't, so "money" figures have to be built from campaigns.
    campaign_rows = db.query(
        CampaignDailyMetric.account_id,
        CampaignDailyMetric.platform,
        CampaignDailyMetric.campaign_id,
        func.sum(CampaignDailyMetric.spend).label("spend"),
        func.sum(CampaignDailyMetric.revenue).label("revenue"),
        func.sum(CampaignDailyMetric.conversions).label("conversions"),
    ).filter(
        CampaignDailyMetric.tenant_id == tenant_id,
        CampaignDailyMetric.date >= d_from,
        CampaignDailyMetric.date <= d_to,
    ).group_by(
        CampaignDailyMetric.account_id, CampaignDailyMetric.platform, CampaignDailyMetric.campaign_id,
    ).all()

    classifications = {
        (c.account_id, c.platform, c.campaign_id): c.campaign_type
        for c in db.query(CampaignClassification).filter(CampaignClassification.tenant_id == tenant_id).all()
    }

    # Per-account_id totals, split by bucket
    from collections import defaultdict
    per_account = defaultdict(lambda: {"sales_revenue": 0.0, "sales_conversions": 0, "lead_spend": 0.0, "lead_conversions": 0})
    for r in campaign_rows:
        campaign_type = classifications.get((r.account_id, r.platform, r.campaign_id), "SALES")
        bucket = per_account[r.account_id]
        if campaign_type == "LEAD_GEN":
            bucket["lead_spend"] += float(r.spend or 0)
            bucket["lead_conversions"] += int(r.conversions or 0)
        else:
            bucket["sales_revenue"] += float(r.revenue or 0)
            bucket["sales_conversions"] += int(r.conversions or 0)

    result = []
    for brand in brands:
        account_ids = [a.account_id for a in brand.accounts if not platform or a.platform == platform]
        if platform and not account_ids:
            continue
        metrics = db.query(
            func.sum(DailyMetric.spend).label("spend"),
            func.sum(DailyMetric.conversions).label("conversions"),
        ).filter(
            DailyMetric.tenant_id == tenant_id,
            DailyMetric.account_id.in_(account_ids) if account_ids else False,
            DailyMetric.date >= d_from,
            DailyMetric.date <= d_to,
        ).first() if account_ids else None

        spend = float(metrics.spend or 0) if metrics else 0
        conversions = int(metrics.conversions or 0) if metrics else 0

        sales_revenue = sum(per_account[aid]["sales_revenue"] for aid in account_ids)
        lead_spend = sum(per_account[aid]["lead_spend"] for aid in account_ids)
        lead_count = sum(per_account[aid]["lead_conversions"] for aid in account_ids)
        roas = round(sales_revenue / spend, 2) if spend > 0 else 0
        cost_per_lead = round(lead_spend / lead_count, 2) if lead_count > 0 else None

        result.append(BrandOverviewItem(
            id=str(brand.id), name=brand.name, color=brand.color,
            industry=brand.industry,
            target_roas=float(brand.target_roas) if brand.target_roas else None,
            currency=brand.currency, spend=spend, revenue=sales_revenue,
            roas=roas, conversions=conversions,
            has_lead_gen=lead_spend > 0, lead_count=lead_count, cost_per_lead=cost_per_lead,
            accounts=[AccountOut(id=str(a.id), platform=a.platform, account_id=a.account_id, account_name=a.account_name)
                      for a in brand.accounts if not platform or a.platform == platform],
        ))
    return result
