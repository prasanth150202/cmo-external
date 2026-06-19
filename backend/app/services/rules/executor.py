"""
Rule engine executor — evaluates all rules against campaign metrics,
logs every triggered suggestion to suggestion_log, returns results.
"""
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.models.campaign_metric import CampaignDailyMetric
from app.models.suggestion_log import SuggestionLog
from app.services.rules.meta_b01 import meta_b01_scale_up
from app.services.rules.meta_b02 import meta_b02_scale_down
from app.services.rules.meta_f03 import meta_f03_funnel_collapse
from app.services.ai import generate_narrative

RULE_PIPELINE = [
    meta_f03_funnel_collapse,  # P1 — check first
    meta_b01_scale_up,
    meta_b02_scale_down,
]


def _build_campaign_context(campaign_id: str, campaign_name: str, rows_7d: list, rows_today: list, rows_3d: list) -> Dict:
    def agg(rows):
        if not rows:
            return {"spend": 0, "revenue": 0, "roas": 0, "conversions": 0, "impressions": 0, "clicks": 0}
        spend = sum(float(r.spend or 0) for r in rows)
        revenue = sum(float(r.revenue or 0) for r in rows)
        roas = revenue / spend if spend > 0 else 0
        return {
            "spend": round(spend, 2),
            "revenue": round(revenue, 2),
            "roas": round(roas, 4),
            "conversions": sum(int(r.conversions or 0) for r in rows),
            "impressions": sum(int(r.impressions or 0) for r in rows),
            "clicks": sum(int(r.clicks or 0) for r in rows),
        }

    m7d = agg(rows_7d)
    m3d = agg(rows_3d)
    today = agg(rows_today)

    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign_name,
        "m7d": m7d,
        "m3d": m3d,
        "today": today,
        "budget_utilization_7d": 0.85,  # placeholder — set if budget data available
        "trajectory_score": (m3d["roas"] - m7d["roas"]) / (m7d["roas"] + 0.0001),
        "age_days": 30,  # placeholder
        "learning_phase": False,
    }


def evaluate_all(
    db: Session,
    tenant_id: str,
    brand_id: Optional[str] = None,
    target_roas: float = 2.0,
) -> List[Dict[str, Any]]:
    """
    Load last 7 days of campaign metrics for the tenant,
    run all rules, log suggestions, return results.
    """
    from datetime import date, timedelta

    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    three_days_ago = today - timedelta(days=3)

    base_q = db.query(CampaignDailyMetric).filter(
        CampaignDailyMetric.tenant_id == tenant_id
    )

    rows_7d = base_q.filter(CampaignDailyMetric.date >= seven_days_ago).all()
    rows_today = base_q.filter(CampaignDailyMetric.date == today).all()
    rows_3d = base_q.filter(CampaignDailyMetric.date >= three_days_ago).all()

    # Group by campaign
    campaigns: Dict[str, Dict] = {}
    for row in rows_7d:
        if row.campaign_id not in campaigns:
            campaigns[row.campaign_id] = {"name": row.campaign_name, "7d": [], "today": [], "3d": []}
        campaigns[row.campaign_id]["7d"].append(row)

    for row in rows_today:
        if row.campaign_id in campaigns:
            campaigns[row.campaign_id]["today"].append(row)

    for row in rows_3d:
        if row.campaign_id in campaigns:
            campaigns[row.campaign_id]["3d"].append(row)

    suggestions = []

    for campaign_id, data in campaigns.items():
        ctx = _build_campaign_context(
            campaign_id, data["name"],
            data["7d"], data["today"], data["3d"]
        )
        ctx["target_roas"] = target_roas

        for rule_fn in RULE_PIPELINE:
            fired, suggestion = rule_fn(ctx)
            if fired and suggestion:
                suggestion["entity_id"] = campaign_id
                suggestion["entity_name"] = data["name"]
                suggestion["channel"] = "META"  # extend for GOOGLE later

                # Generate AI narrative
                suggestion["narrative"] = generate_narrative(suggestion)

                # Log to DB
                log = SuggestionLog(
                    tenant_id=tenant_id,
                    brand_id=brand_id,
                    campaign_id=campaign_id,
                    rule_id=suggestion["rule_id"],
                    suggestion_json=suggestion,
                )
                db.add(log)
                db.flush()
                suggestion["id"] = str(log.id)

                suggestions.append(suggestion)
                break  # one rule per campaign max

    db.commit()
    return suggestions
