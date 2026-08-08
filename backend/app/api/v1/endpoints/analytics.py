import uuid
from datetime import date, timedelta, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.deps import get_db, get_current_tenant_id
from app.models.daily_metric import DailyMetric
from app.models.campaign_metric import CampaignDailyMetric
from app.models.campaign_classification import CampaignClassification
from app.models.brand_account import BrandAccount
from app.schemas.analytics import (
    AnalyticsOverviewResponse, DailyDataPoint,
    ChannelBreakdownResponse, ChannelBreakdown,
    CampaignTableResponse, CampaignRow,
    AdsetListResponse, AdsetRow,
    CampaignClassificationUpdate,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _get_account_ids(db, tenant_id, brand_id):
    if not brand_id:
        return None
    accounts = db.query(BrandAccount).filter(
        BrandAccount.brand_id == brand_id,
        BrandAccount.tenant_id == tenant_id,
    ).all()
    return [a.account_id for a in accounts]


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def overview(
    brand_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    platform: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    d_to = date.fromisoformat(date_to) if date_to else date.today()
    d_from = date.fromisoformat(date_from) if date_from else d_to - timedelta(days=29)
    account_ids = _get_account_ids(db, tenant_id, brand_id)

    q = db.query(
        DailyMetric.date,
        func.sum(DailyMetric.spend).label("spend"),
        func.sum(DailyMetric.revenue).label("revenue"),
        func.sum(DailyMetric.conversions).label("conversions"),
        func.sum(DailyMetric.clicks).label("clicks"),
    ).filter(
        DailyMetric.tenant_id == tenant_id,
        DailyMetric.date >= d_from,
        DailyMetric.date <= d_to,
    )
    if account_ids is not None:
        if not account_ids:
            return AnalyticsOverviewResponse(daily=[], date_from=str(d_from), date_to=str(d_to))
        q = q.filter(DailyMetric.account_id.in_(account_ids))
    if platform:
        q = q.filter(DailyMetric.platform == platform)

    rows = q.group_by(DailyMetric.date).order_by(DailyMetric.date).all()

    # Sales vs Lead Gen split per day — DailyMetric has no classification link,
    # so this has to come from campaign-level rows joined against it in Python.
    cq = db.query(
        CampaignDailyMetric.date,
        CampaignDailyMetric.account_id,
        CampaignDailyMetric.platform,
        CampaignDailyMetric.campaign_id,
        CampaignDailyMetric.spend,
        CampaignDailyMetric.revenue,
        CampaignDailyMetric.conversions,
    ).filter(
        CampaignDailyMetric.tenant_id == tenant_id,
        CampaignDailyMetric.date >= d_from,
        CampaignDailyMetric.date <= d_to,
    )
    if account_ids is not None:
        cq = cq.filter(CampaignDailyMetric.account_id.in_(account_ids)) if account_ids else cq.filter(False)
    if platform:
        cq = cq.filter(CampaignDailyMetric.platform == platform)

    classifications = {
        (c.account_id, c.platform, c.campaign_id): c.campaign_type
        for c in db.query(CampaignClassification).filter(CampaignClassification.tenant_id == tenant_id).all()
    }

    from collections import defaultdict
    per_date = defaultdict(lambda: {"sales_spend": 0.0, "sales_revenue": 0.0, "lead_spend": 0.0, "lead_count": 0})
    for r in cq.all():
        campaign_type = classifications.get((r.account_id, r.platform, r.campaign_id), "SALES")
        bucket = per_date[str(r.date)]
        if campaign_type == "LEAD_GEN":
            bucket["lead_spend"] += float(r.spend or 0)
            bucket["lead_count"] += int(r.conversions or 0)
        else:
            bucket["sales_spend"] += float(r.spend or 0)
            bucket["sales_revenue"] += float(r.revenue or 0)

    daily = []
    for r in rows:
        spend = float(r.spend or 0)
        revenue = float(r.revenue or 0)
        split = per_date[str(r.date)]
        cost_per_lead = round(split["lead_spend"] / split["lead_count"], 2) if split["lead_count"] > 0 else None
        daily.append(DailyDataPoint(
            date=str(r.date),
            spend=round(spend, 2),
            revenue=round(revenue, 2),
            roas=round(revenue / spend, 2) if spend > 0 else 0,
            conversions=int(r.conversions or 0),
            clicks=int(r.clicks or 0),
            sales_revenue=round(split["sales_revenue"], 2),
            sales_roas=round(split["sales_revenue"] / split["sales_spend"], 2) if split["sales_spend"] > 0 else 0,
            lead_spend=round(split["lead_spend"], 2),
            lead_count=split["lead_count"],
            cost_per_lead=cost_per_lead,
        ))
    return AnalyticsOverviewResponse(daily=daily, date_from=str(d_from), date_to=str(d_to))


@router.get("/by-channel", response_model=ChannelBreakdownResponse)
def by_channel(
    brand_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    d_to = date.fromisoformat(date_to) if date_to else date.today()
    d_from = date.fromisoformat(date_from) if date_from else d_to - timedelta(days=6)
    account_ids = _get_account_ids(db, tenant_id, brand_id)

    q = db.query(
        DailyMetric.platform,
        func.sum(DailyMetric.spend).label("spend"),
        func.sum(DailyMetric.revenue).label("revenue"),
        func.sum(DailyMetric.conversions).label("conversions"),
    ).filter(
        DailyMetric.tenant_id == tenant_id,
        DailyMetric.date >= d_from,
        DailyMetric.date <= d_to,
    )
    if account_ids is not None:
        if not account_ids:
            return ChannelBreakdownResponse(channels=[])
        q = q.filter(DailyMetric.account_id.in_(account_ids))

    rows = q.group_by(DailyMetric.platform).all()
    channels = []
    for r in rows:
        spend = float(r.spend or 0)
        revenue = float(r.revenue or 0)
        channels.append(ChannelBreakdown(
            platform=r.platform,
            spend=round(spend, 2),
            revenue=round(revenue, 2),
            roas=round(revenue / spend, 2) if spend > 0 else 0,
            conversions=int(r.conversions or 0),
        ))
    return ChannelBreakdownResponse(channels=channels)


@router.get("/campaigns", response_model=CampaignTableResponse)
def campaigns(
    brand_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    platform: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    d_to = date.fromisoformat(date_to) if date_to else date.today()
    d_from = date.fromisoformat(date_from) if date_from else d_to - timedelta(days=6)
    account_ids = _get_account_ids(db, tenant_id, brand_id)

    q = db.query(
        CampaignDailyMetric.campaign_id,
        CampaignDailyMetric.campaign_name,
        CampaignDailyMetric.platform,
        CampaignDailyMetric.account_id,
        func.sum(CampaignDailyMetric.spend).label("spend"),
        func.sum(CampaignDailyMetric.revenue).label("revenue"),
        func.sum(CampaignDailyMetric.conversions).label("conversions"),
        func.sum(CampaignDailyMetric.impressions).label("impressions"),
        func.sum(CampaignDailyMetric.clicks).label("clicks"),
    ).filter(
        CampaignDailyMetric.tenant_id == tenant_id,
        CampaignDailyMetric.date >= d_from,
        CampaignDailyMetric.date <= d_to,
    )
    if account_ids is not None:
        if not account_ids:
            return CampaignTableResponse(campaigns=[], total=0)
        q = q.filter(CampaignDailyMetric.account_id.in_(account_ids))
    if platform:
        q = q.filter(CampaignDailyMetric.platform == platform)

    rows = q.group_by(
        CampaignDailyMetric.campaign_id,
        CampaignDailyMetric.campaign_name,
        CampaignDailyMetric.platform,
        CampaignDailyMetric.account_id,
    ).order_by(func.sum(CampaignDailyMetric.spend).desc()).all()

    classifications = {
        (c.account_id, c.platform, c.campaign_id): c
        for c in db.query(CampaignClassification).filter(CampaignClassification.tenant_id == tenant_id).all()
    }

    # Status can change day to day (e.g. paused mid-range) — use whatever the
    # most recent synced day says, not an aggregate across the whole range.
    latest_status_rows = db.query(
        CampaignDailyMetric.account_id,
        CampaignDailyMetric.platform,
        CampaignDailyMetric.campaign_id,
        CampaignDailyMetric.status,
    ).filter(
        CampaignDailyMetric.tenant_id == tenant_id,
        CampaignDailyMetric.date >= d_from,
        CampaignDailyMetric.date <= d_to,
    ).distinct(
        CampaignDailyMetric.account_id, CampaignDailyMetric.platform, CampaignDailyMetric.campaign_id,
    ).order_by(
        CampaignDailyMetric.account_id, CampaignDailyMetric.platform, CampaignDailyMetric.campaign_id,
        CampaignDailyMetric.date.desc(),
    ).all()
    statuses = {(s.account_id, s.platform, s.campaign_id): s.status for s in latest_status_rows}

    campaigns_out = []
    for r in rows:
        spend = float(r.spend or 0)
        revenue = float(r.revenue or 0)
        conversions = int(r.conversions or 0)
        impressions = int(r.impressions or 0)
        clicks = int(r.clicks or 0)

        classification = classifications.get((r.account_id, r.platform, r.campaign_id))
        campaign_type = classification.campaign_type if classification else "SALES"
        type_source = classification.source if classification else "AUTO"
        cost_per_lead = round(spend / conversions, 2) if campaign_type == "LEAD_GEN" and conversions > 0 else None

        campaigns_out.append(CampaignRow(
            campaign_id=r.campaign_id,
            campaign_name=r.campaign_name or "",
            platform=r.platform,
            account_id=r.account_id,
            status=statuses.get((r.account_id, r.platform, r.campaign_id)),
            spend=round(spend, 2),
            revenue=round(revenue, 2),
            roas=round(revenue / spend, 2) if spend > 0 else 0,
            conversions=conversions,
            impressions=impressions,
            clicks=clicks,
            ctr=round(clicks / impressions * 100, 2) if impressions > 0 else 0,
            campaign_type=campaign_type,
            type_source=type_source,
            cost_per_lead=cost_per_lead,
        ))
    return CampaignTableResponse(campaigns=campaigns_out, total=len(campaigns_out))


@router.patch("/campaigns/{campaign_id}/classification")
def update_campaign_classification(
    campaign_id: str,
    body: CampaignClassificationUpdate,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Manually set a campaign's Sales/Lead Gen classification. Always wins over auto-classification."""
    if body.campaign_type not in ("SALES", "LEAD_GEN"):
        raise HTTPException(status_code=422, detail="campaign_type must be 'SALES' or 'LEAD_GEN'")

    now = datetime.now(timezone.utc)
    stmt = pg_insert(CampaignClassification).values(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        account_id=body.account_id,
        platform=body.platform,
        campaign_id=campaign_id,
        campaign_type=body.campaign_type,
        source="MANUAL",
        created_at=now,
        updated_at=now,
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_campaign_classification",
        set_={"campaign_type": body.campaign_type, "source": "MANUAL", "updated_at": now},
    )
    db.execute(stmt)
    db.commit()
    return {"campaign_id": campaign_id, "campaign_type": body.campaign_type, "source": "MANUAL"}


@router.get("/brands/{brand_id}/campaigns/{campaign_id}/adsets", response_model=AdsetListResponse)
def campaign_adsets(
    brand_id: str,
    campaign_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Returns adset-level breakdown for a campaign.
    Adset data is not yet ingested — returns empty list until adset ingest is implemented.
    """
    return AdsetListResponse(adsets=[], total=0)
