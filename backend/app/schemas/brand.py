from typing import Optional, List
from pydantic import BaseModel


class BrandCreate(BaseModel):
    name: str
    color: Optional[str] = "#3B82F6"
    industry: Optional[str] = None
    target_roas: Optional[float] = None
    monthly_budget_cap: Optional[float] = None
    currency: str = "INR"
    logo_url: Optional[str] = None
    website_url: Optional[str] = None


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    industry: Optional[str] = None
    target_roas: Optional[float] = None
    monthly_budget_cap: Optional[float] = None
    currency: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None


class AccountMapRequest(BaseModel):
    platform: str  # META | GOOGLE
    account_id: str
    account_name: Optional[str] = None


class AccountOut(BaseModel):
    id: str
    platform: str
    account_id: str
    account_name: Optional[str]

    class Config:
        from_attributes = True


class BrandOut(BaseModel):
    id: str
    name: str
    color: Optional[str]
    industry: Optional[str]
    target_roas: Optional[float]
    monthly_budget_cap: Optional[float]
    currency: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    accounts: List[AccountOut] = []

    class Config:
        from_attributes = True


class BrandOverviewItem(BaseModel):
    id: str
    name: str
    color: Optional[str]
    industry: Optional[str] = None
    target_roas: Optional[float] = None
    currency: str
    spend: float = 0
    revenue: float = 0
    roas: float = 0
    conversions: int = 0
    accounts: List[AccountOut] = []
