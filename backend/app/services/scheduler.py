"""
Background sync scheduler — periodically syncs every connected ad account
across every tenant, so dashboards stay fresh without a manual "Sync" click.

Runs in-process via APScheduler. Single-instance only: if this API is ever
scaled to multiple replicas, each replica would run its own scheduler and
duplicate the sync — move to Celery beat (already scaffolded via REDIS_URL
in settings) before doing that.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.config import settings
from app.services.ingest import sync_all_accounts

_scheduler = BackgroundScheduler()


def start_scheduler():
    if _scheduler.running:
        return

    _scheduler.add_job(
        sync_all_accounts,
        "interval",
        hours=settings.SYNC_INTERVAL_HOURS,
        id="sync_all_accounts",
        kwargs={"days_back": 3},
        max_instances=1,
        coalesce=True,
    )

    if settings.SYNC_ON_STARTUP:
        # One-off immediate run so data isn't stale for up to SYNC_INTERVAL_HOURS
        # after every restart — separate from the recurring interval job above.
        _scheduler.add_job(sync_all_accounts, kwargs={"days_back": 3}, id="sync_all_accounts_startup")

    _scheduler.start()


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
