from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_tenant_id
from app.models.daily_metric import DailyMetric
from app.models.campaign_metric import CampaignDailyMetric
from app.models.brand_account import BrandAccount
from app.schemas.analytics import (
    AnalyticsOverviewResponse, DailyDataPoint,
    ChannelBreakdownResponse, ChannelBreakdown,
    CampaignTableResponse, CampaignRow,
    AdsetListResponse, AdsetRow,
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

    rows = q.group_by(DailyMetric.date).order_by(DailyMetric.date).all()
    daily = []
    for r in rows:
        spend = float(r.spend or 0)
        revenue = float(r.revenue or 0)
        daily.append(DailyDataPoint(
            date=str(r.date),
            spend=round(spend, 2),
            revenue=round(revenue, 2),
            roas=round(revenue / spend, 2) if spend > 0 else 0,
            conversions=int(r.conversions or 0),
            clicks=int(r.clicks or 0),
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

    rows = q.group_by(
        CampaignDailyMetric.campaign_id,
        CampaignDailyMetric.campaign_name,
        CampaignDailyMetric.platform,
    ).order_by(func.sum(CampaignDailyMetric.spend).desc()).all()

    campaigns_out = []
    for r in rows:
        spend = float(r.spend or 0)
        revenue = float(r.revenue or 0)
        impressions = int(r.impressions or 0)
        clicks = int(r.clicks or 0)
        campaigns_out.append(CampaignRow(
            campaign_id=r.campaign_id,
            campaign_name=r.campaign_name or "",
            platform=r.platform,
            spend=round(spend, 2),
            revenue=round(revenue, 2),
            roas=round(revenue / spend, 2) if spend > 0 else 0,
            conversions=int(r.conversions or 0),
            impressions=impressions,
            clicks=clicks,
            ctr=round(clicks / impressions * 100, 2) if impressions > 0 else 0,
        ))
    return CampaignTableResponse(campaigns=campaigns_out, total=len(campaigns_out))


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
