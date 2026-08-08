"""
Auto-classifies campaigns as SALES vs LEAD_GEN based on which conversion_action_category
they actually generate conversions on. A manual override (source='MANUAL') always wins —
the upsert's WHERE clause only lets this overwrite rows that are still source='AUTO'.
"""
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.campaign_classification import CampaignClassification

SALES_CATEGORIES = {
    "PURCHASE", "ADD_TO_CART", "BEGIN_CHECKOUT", "SUBSCRIBE_PAID", "STORE_SALE",
}
LEAD_GEN_CATEGORIES = {
    "SIGNUP", "PHONE_CALL_LEAD", "IMPORTED_LEAD", "SUBMIT_LEAD_FORM",
    "BOOK_APPOINTMENT", "REQUEST_QUOTE", "CONTACT", "QUALIFIED_LEAD", "CONVERTED_LEAD",
}


def _bucket_for(category: str) -> str:
    if category in LEAD_GEN_CATEGORIES:
        return "LEAD_GEN"
    if category in SALES_CATEGORIES:
        return "SALES"
    return "OTHER"


def classify_campaigns(
    db: Session,
    tenant_id: str,
    account_id: str,
    platform: str,
    category_rows: List[Dict[str, Any]],
) -> int:
    """
    category_rows: [{"campaign_id": ..., "category": ..., "conversions": ...}, ...]
    Aggregates conversions per campaign per bucket (SALES/LEAD_GEN), picks the
    majority bucket per campaign, and upserts as source='AUTO'.
    """
    totals: Dict[str, Dict[str, float]] = defaultdict(lambda: {"SALES": 0.0, "LEAD_GEN": 0.0})
    for row in category_rows:
        bucket = _bucket_for(row["category"])
        if bucket == "OTHER":
            continue
        totals[row["campaign_id"]][bucket] += row["conversions"]

    if not totals:
        return 0

    now = datetime.now(timezone.utc)
    values = [
        {
            "id": uuid.uuid4(),
            "tenant_id": tenant_id,
            "account_id": account_id,
            "platform": platform,
            "campaign_id": campaign_id,
            "campaign_type": "LEAD_GEN" if buckets["LEAD_GEN"] > buckets["SALES"] else "SALES",
            "source": "AUTO",
            "created_at": now,
            "updated_at": now,
        }
        for campaign_id, buckets in totals.items()
    ]

    stmt = pg_insert(CampaignClassification).values(values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_campaign_classification",
        set_={
            "campaign_type": stmt.excluded.campaign_type,
            "updated_at": stmt.excluded.updated_at,
        },
        where=(CampaignClassification.source == "AUTO"),
    )
    db.execute(stmt)
    db.commit()
    return len(values)
