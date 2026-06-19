export interface User {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
}

export interface Brand {
  id: string;
  name: string;
  color?: string;
  industry?: string;
  target_roas?: number;
  monthly_budget_cap?: number;
  currency: string;
  accounts: BrandAccount[];
}

export interface BrandAccount {
  id: string;
  platform: "META" | "GOOGLE";
  account_id: string;
  account_name?: string;
}

export interface BrandOverview extends Brand {
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
}

export interface KPISummary {
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  impressions: number;
  clicks: number;
}

export interface DashboardSummary {
  kpis: KPISummary;
  date_from: string;
  date_to: string;
  brand_id?: string;
}

export interface DailyDataPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  clicks: number;
}

export interface ChannelBreakdown {
  platform: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
}

export interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface Suggestion {
  id: string;
  rule_id: string;
  entity_id: string;
  entity_name: string;
  channel: string;
  type: string;
  direction: string;
  magnitude: number;
  priority: string;
  reason: string;
  narrative?: string;
}

export interface SyncJob {
  id: string;
  account_id: string;
  platform: string;
  status: "pending" | "running" | "completed" | "failed";
  rows_synced: number;
  error?: string;
  created_at?: string;
  updated_at?: string;
}
