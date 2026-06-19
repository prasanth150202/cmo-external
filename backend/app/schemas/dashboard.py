from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SyncRequest(BaseModel):
    brand_id: Optional[str] = None
    force_recent: bool = False


class SyncStatusItem(BaseModel):
    account_id: str
    platform: str
    status: str
    rows_synced: int
    error: Optional[str]
    updated_at: Optional[str]


class KPISummary(BaseModel):
    spend: float = 0
    revenue: float = 0
    roas: float = 0
    conversions: int = 0
    impressions: int = 0
    clicks: int = 0


class DashboardSummary(BaseModel):
    kpis: KPISummary
    date_from: str
    date_to: str
    brand_id: Optional[str]


class Suggestion(BaseModel):
    id: str
    rule_id: str
    entity_id: str
    entity_name: str
    channel: str
    type: str
    direction: str
    magnitude: float
    priority: str
    reason: str
    narrative: Optional[str] = None


class LiveStateResponse(BaseModel):
    suggestions: List[Suggestion]
    evaluated_at: str
