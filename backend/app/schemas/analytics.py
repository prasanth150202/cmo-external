from typing import List, Optional
from pydantic import BaseModel


class DailyDataPoint(BaseModel):
    date: str
    spend: float
    revenue: float
    roas: float
    conversions: int
    clicks: int
    sales_revenue: float = 0
    sales_roas: float = 0
    lead_spend: float = 0
    lead_count: int = 0
    cost_per_lead: Optional[float] = None


class ChannelBreakdown(BaseModel):
    platform: str
    spend: float
    revenue: float
    roas: float
    conversions: int


class CampaignRow(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: str
    account_id: str
    status: Optional[str] = None
    spend: float
    revenue: float
    roas: float
    conversions: int
    impressions: int
    clicks: int
    ctr: float
    campaign_type: str = "SALES"  # 'SALES' | 'LEAD_GEN'
    type_source: str = "AUTO"  # 'AUTO' | 'MANUAL'
    cost_per_lead: Optional[float] = None


class CampaignClassificationUpdate(BaseModel):
    account_id: str
    platform: str
    campaign_type: str  # 'SALES' | 'LEAD_GEN'


class AdsetRow(BaseModel):
    adset_id: str
    adset_name: str
    spend: float
    revenue: float
    roas: float
    conversions: int
    impressions: int
    clicks: int
    ctr: float
    cpa: Optional[float] = None


class AdsetListResponse(BaseModel):
    adsets: List[AdsetRow]
    total: int


class AnalyticsOverviewResponse(BaseModel):
    daily: List[DailyDataPoint]
    date_from: str
    date_to: str


class ChannelBreakdownResponse(BaseModel):
    channels: List[ChannelBreakdown]


class CampaignTableResponse(BaseModel):
    campaigns: List[CampaignRow]
    total: int
