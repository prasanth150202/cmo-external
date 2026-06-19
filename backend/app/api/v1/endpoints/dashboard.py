from datetime import date, timedelta, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_tenant_id
from app.models.brand import Brand
from app.models.brand_account import BrandAccount
from app.models.daily_metric import DailyMetric
from app.models.sync_job import SyncJob
from app.schemas.dashboard import DashboardSummary, KPISummary, SyncRequest, LiveStateResponse, Suggestion
from app.services.ingest import sync_account
from app.services.rules.executor import evaluate_all

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    brand_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    d_to = date.fromisoformat(date_to) if date_to else date.today()
    d_from = date.fromisoformat(date_from) if date_from else d_to - timedelta(days=6)

    account_ids = None
    if brand_id:
        accounts = db.query(BrandAccount).filter(
            BrandAccount.brand_id == brand_id,
            BrandAccount.tenant_id == tenant_id,
        ).all()
        account_ids = [a.account_id for a in accounts]

    q = db.query(
        func.sum(DailyMetric.spend).label("spend"),
        func.sum(DailyMetric.revenue).label("revenue"),
        func.sum(DailyMetric.conversions).label("conversions"),
        func.sum(DailyMetric.impressions).label("impressions"),
        func.sum(DailyMetric.clicks).label("clicks"),
    ).filter(
        DailyMetric.tenant_id == tenant_id,
        DailyMetric.date >= d_from,
        DailyMetric.date <= d_to,
    )
    if account_ids is not None:
        if not account_ids:
            return DashboardSummary(kpis=KPISummary(), date_from=str(d_from), date_to=str(d_to), brand_id=brand_id)
        q = q.filter(DailyMetric.account_id.in_(account_ids))

    row = q.first()
    spend = float(row.spend or 0)
    revenue = float(row.revenue or 0)
    roas = round(revenue / spend, 2) if spend > 0 else 0

    return DashboardSummary(
        kpis=KPISummary(
            spend=round(spend, 2),
            revenue=round(revenue, 2),
            roas=roas,
            conversions=int(row.conversions or 0),
            impressions=int(row.impressions or 0),
            clicks=int(row.clicks or 0),
        ),
        date_from=str(d_from),
        date_to=str(d_to),
        brand_id=brand_id,
    )


@router.post("/sync")
def trigger_sync(
    body: SyncRequest,
    background_tasks: BackgroundTasks,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Trigger a manual data sync for all accounts under a brand (or all brands)."""
    q = db.query(BrandAccount).filter(BrandAccount.tenant_id == tenant_id)
    if body.brand_id:
        q = q.filter(BrandAccount.brand_id == body.brand_id)
    accounts = q.all()

    if not accounts:
        raise HTTPException(status_code=404, detail="No accounts found to sync")

    days_back = 3 if body.force_recent else 90
    job_ids = []

    for acct in accounts:
        # Run sync in background so the endpoint returns immediately
        background_tasks.add_task(sync_account, db, tenant_id, acct, days_back)
        job_ids.append({"account_id": acct.account_id, "platform": acct.platform})

    return {"message": f"Sync started for {len(accounts)} account(s)", "accounts": job_ids}


@router.get("/sync-status")
def sync_status(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    jobs = db.query(SyncJob).filter(SyncJob.tenant_id == tenant_id).order_by(SyncJob.created_at.desc()).limit(50).all()
    return [
        {
            "id": str(j.id),
            "account_id": j.account_id,
            "platform": j.platform,
            "status": j.status,
            "rows_synced": j.rows_synced,
            "error": j.error,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "updated_at": j.updated_at.isoformat() if j.updated_at else None,
        }
        for j in jobs
    ]


@router.get("/live-state")
def live_state(
    brand_id: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Run rule engine and return current suggestions."""
    target_roas = 2.0
    if brand_id:
        brand = db.query(Brand).filter(Brand.id == brand_id, Brand.tenant_id == tenant_id).first()
        if brand and brand.target_roas:
            target_roas = float(brand.target_roas)

    suggestions = evaluate_all(db, tenant_id, brand_id=brand_id, target_roas=target_roas)
    return LiveStateResponse(
        suggestions=[Suggestion(**s) for s in suggestions],
        evaluated_at=datetime.now(timezone.utc).isoformat(),
    )
