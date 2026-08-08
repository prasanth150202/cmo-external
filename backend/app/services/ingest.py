"""
Unified ingest dispatcher.
Pulls data from Meta or Google for a given brand_account, chunked by date range.
Upserts into daily_metrics and campaign_daily_metrics.
Tracks progress in sync_jobs.
"""
from datetime import date, timedelta
from typing import Optional
import time
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.brand_account import BrandAccount
from app.models.oauth_token import OAuthToken
from app.models.sync_job import SyncJob
from app.models.daily_metric import DailyMetric
from app.models.campaign_metric import CampaignDailyMetric
from app.services.token_vault import decrypt
from app.services.meta import meta_service
from app.services.google import google_service
from app.services.classification import classify_campaigns

ACCOUNT_CHUNK_DAYS = 90
CAMPAIGN_CHUNK_DAYS = 30
MAX_RETRIES = 3


def _date_chunks(start: date, end: date, chunk_days: int):
    cursor = start
    while cursor <= end:
        chunk_end = min(cursor + timedelta(days=chunk_days - 1), end)
        yield cursor, chunk_end
        cursor = chunk_end + timedelta(days=1)


def _get_token(db: Session, tenant_id: str, platform: str) -> Optional[OAuthToken]:
    return db.query(OAuthToken).filter(
        OAuthToken.tenant_id == tenant_id,
        OAuthToken.platform == platform,
    ).first()


def _upsert_daily(db: Session, tenant_id: str, account_id: str, platform: str, rows: list) -> int:
    if not rows:
        return 0
    stmt = pg_insert(DailyMetric).values([
        {
            "id": uuid.uuid4(),
            "tenant_id": tenant_id,
            "account_id": account_id,
            "platform": platform,
            "date": r["date"],
            "spend": r["spend"],
            "revenue": r["revenue"],
            "roas": r["roas"],
            "conversions": r["conversions"],
            "impressions": r["impressions"],
            "clicks": r["clicks"],
            "ctr": r["ctr"],
        }
        for r in rows
    ])
    stmt = stmt.on_conflict_do_update(
        constraint="uq_daily_metric",
        set_={
            "spend": stmt.excluded.spend,
            "revenue": stmt.excluded.revenue,
            "roas": stmt.excluded.roas,
            "conversions": stmt.excluded.conversions,
            "impressions": stmt.excluded.impressions,
            "clicks": stmt.excluded.clicks,
            "ctr": stmt.excluded.ctr,
            "synced_at": stmt.excluded.synced_at,
        },
    )
    db.execute(stmt)
    db.commit()
    return len(rows)


def _upsert_campaigns(db: Session, tenant_id: str, account_id: str, platform: str, rows: list) -> int:
    if not rows:
        return 0
    stmt = pg_insert(CampaignDailyMetric).values([
        {
            "id": uuid.uuid4(),
            "tenant_id": tenant_id,
            "account_id": account_id,
            "platform": platform,
            "campaign_id": r["campaign_id"],
            "campaign_name": r.get("campaign_name", ""),
            "status": r.get("status"),
            "date": r["date"],
            "spend": r["spend"],
            "revenue": r["revenue"],
            "roas": r["roas"],
            "conversions": r["conversions"],
            "impressions": r["impressions"],
            "clicks": r["clicks"],
            "ctr": r["ctr"],
        }
        for r in rows
    ])
    stmt = stmt.on_conflict_do_update(
        constraint="uq_campaign_metric",
        set_={
            "campaign_name": stmt.excluded.campaign_name,
            "status": stmt.excluded.status,
            "spend": stmt.excluded.spend,
            "revenue": stmt.excluded.revenue,
            "roas": stmt.excluded.roas,
            "conversions": stmt.excluded.conversions,
            "impressions": stmt.excluded.impressions,
            "clicks": stmt.excluded.clicks,
            "ctr": stmt.excluded.ctr,
            "synced_at": stmt.excluded.synced_at,
        },
    )
    db.execute(stmt)
    db.commit()
    return len(rows)


def _sync_meta(db: Session, tenant_id: str, account_id: str, token: OAuthToken, date_from: date, date_to: date, job: SyncJob) -> int:
    access_token = decrypt(token.access_token)
    total = 0

    for chunk_start, chunk_end in _date_chunks(date_from, date_to, ACCOUNT_CHUNK_DAYS):
        for attempt in range(MAX_RETRIES):
            try:
                rows = meta_service.fetch_account_daily_metrics(access_token, account_id, chunk_start, chunk_end)
                total += _upsert_daily(db, tenant_id, account_id, "META", rows)
                break
            except RuntimeError as e:
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)

    for chunk_start, chunk_end in _date_chunks(date_from, date_to, CAMPAIGN_CHUNK_DAYS):
        for attempt in range(MAX_RETRIES):
            try:
                rows = meta_service.fetch_campaign_daily_metrics(access_token, account_id, chunk_start, chunk_end)
                total += _upsert_campaigns(db, tenant_id, account_id, "META", rows)
                break
            except RuntimeError as e:
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)

    return total


def _sync_google(db: Session, tenant_id: str, account_id: str, token: OAuthToken, date_from: date, date_to: date, job: SyncJob) -> int:
    access_token = decrypt(token.access_token)
    refresh_token = decrypt(token.refresh_token) if token.refresh_token else ""
    total = 0

    for chunk_start, chunk_end in _date_chunks(date_from, date_to, ACCOUNT_CHUNK_DAYS):
        for attempt in range(MAX_RETRIES):
            try:
                rows = google_service.fetch_account_daily_metrics(access_token, refresh_token, account_id, chunk_start, chunk_end)
                total += _upsert_daily(db, tenant_id, account_id, "GOOGLE", rows)
                break
            except RuntimeError:
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)

    for chunk_start, chunk_end in _date_chunks(date_from, date_to, CAMPAIGN_CHUNK_DAYS):
        for attempt in range(MAX_RETRIES):
            try:
                rows = google_service.fetch_campaign_daily_metrics(access_token, refresh_token, account_id, chunk_start, chunk_end)
                total += _upsert_campaigns(db, tenant_id, account_id, "GOOGLE", rows)
                break
            except RuntimeError:
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)

    try:
        category_rows = google_service.fetch_campaign_conversion_categories(access_token, refresh_token, account_id, date_from, date_to)
        classify_campaigns(db, tenant_id, account_id, "GOOGLE", category_rows)
    except RuntimeError:
        pass  # classification is supplementary — never fail the sync over it

    return total


def sync_account(db: Session, tenant_id: str, brand_account: BrandAccount, days_back: int = 90) -> SyncJob:
    """
    Main entry point. Creates a sync_job, runs the appropriate platform sync,
    updates the job status on completion or failure.
    """
    from datetime import datetime, timezone

    date_to = date.today()
    date_from = date_to - timedelta(days=days_back)

    job = SyncJob(
        tenant_id=tenant_id,
        account_id=brand_account.account_id,
        platform=brand_account.platform,
        status="running",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        token = _get_token(db, tenant_id, brand_account.platform)
        if not token:
            raise RuntimeError(f"No OAuth token found for platform {brand_account.platform}. Please connect your account first.")

        if brand_account.platform == "META":
            total = _sync_meta(db, tenant_id, brand_account.account_id, token, date_from, date_to, job)
        elif brand_account.platform == "GOOGLE":
            total = _sync_google(db, tenant_id, brand_account.account_id, token, date_from, date_to, job)
        else:
            raise RuntimeError(f"Unknown platform: {brand_account.platform}")

        job.status = "completed"
        job.rows_synced = total
        job.updated_at = datetime.now(timezone.utc)

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(job)
    return job


def sync_all_accounts(days_back: int = 3) -> dict:
    """
    Scheduled entry point — syncs every connected account across every tenant.
    Runs outside any request context, so it opens its own DB session and never
    lets one tenant's/account's failure stop the rest of the batch.
    """
    from app.db.engine import SessionLocal

    db = SessionLocal()
    synced, failed = 0, 0
    try:
        accounts = db.query(BrandAccount).all()
        for account in accounts:
            try:
                job = sync_account(db, str(account.tenant_id), account, days_back)
                if job.status == "completed":
                    synced += 1
                else:
                    failed += 1
            except Exception:
                # sync_account already catches and records its own errors on the
                # job row — this is only for something unexpected before/after that.
                failed += 1
    finally:
        db.close()
    return {"accounts_synced": synced, "accounts_failed": failed}
