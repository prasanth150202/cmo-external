from typing import List, Optional
from pydantic import BaseModel


class DailyDataPoint(BaseModel):
    date: str
    spend: float
    revenue: float
    roas: float
    conversions: int
    clicks: int


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
    status: Optional[str] = None
    spend: float
    revenue: float
    roas: float
    conversions: int
    impressions: int
    clicks: int
    ctr: float


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
