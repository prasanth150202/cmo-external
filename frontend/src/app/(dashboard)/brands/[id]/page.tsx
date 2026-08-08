"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, ChevronRight, ChevronUp, ChevronDown,
  X, Layers, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import DateRangePicker, { usePersistedDateRange, type DateRange } from "@/components/DateRangePicker";
import PlatformFilter, { type Platform } from "@/components/PlatformFilter";
import { usePersistedState } from "@/lib/usePersistedState";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const fmtShort = (v: number) =>
  v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000     ? `₹${(v / 1_000).toFixed(0)}k`
  : `₹${Math.round(v)}`;
const fmtNum = (v: number) => Math.round(v).toLocaleString("en-IN");

// ── SparkLine ─────────────────────────────────────────────────────────────────
function SparkLine({ values, color }: { values: number[]; color: string }) {
  const W = 80, H = 28;
  const valid = values.filter(v => !isNaN(v));
  if (valid.length < 2) return <div style={{ width: W, height: H }} />;
  const min = Math.min(...valid), max = Math.max(...valid), range = max - min || 1;
  const pts = valid.map((v, i) => [
    (i / (valid.length - 1)) * W,
    H - 2 - ((v - min) / range) * (H - 6),
  ] as [number, number]);
  const id = `sp${Math.random().toString(36).slice(2, 6)}`;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={`${d} L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r={2} fill={color} />
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accentColor, textColor, sparkValues, loading }: {
  label: string; value: string; sub?: string;
  accentColor: string; textColor: string;
  sparkValues: number[]; loading: boolean;
}) {
  return (
    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accentColor }} />
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${textColor}`}>{loading ? "…" : value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
      {!loading && sparkValues.length >= 2 && (
        <div className="flex justify-end mt-2">
          <SparkLine values={sparkValues} color={accentColor} />
        </div>
      )}
    </div>
  );
}

// ── Recharts tooltip style ────────────────────────────────────────────────────
const ttStyle = {
  contentStyle: { background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 },
  labelStyle:   { color: "#94a3b8" },
  itemStyle:    { color: "#f1f5f9" },
};

// ── Sort-able TH ──────────────────────────────────────────────────────────────
function SortTh({ col, label, sortCol, sortAsc, onSort, right }: {
  col: string; label: string; sortCol: string; sortAsc: boolean;
  onSort: (c: string) => void; right?: boolean;
}) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 select-none whitespace-nowrap ${right ? "text-right" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3 opacity-20" />}
      </span>
    </th>
  );
}

// ── Drill panel ───────────────────────────────────────────────────────────────
interface DrillState {
  campaignId: string;
  campaignName: string;
}

function DrillPanel({
  drill, range, brandId, targetRoas, onClose,
}: {
  drill: DrillState;
  range: DateRange;
  brandId: string;
  targetRoas: number;
  onClose: () => void;
}) {
  const [rows,    setRows]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noData,  setNoData]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/analytics/brands/${brandId}/campaigns/${drill.campaignId}/adsets?date_from=${range.from}&date_to=${range.to}`)
      .then(r => {
        const data = r.data?.adsets ?? [];
        setRows(data);
        setNoData(data.length === 0);
      })
      .catch(() => { setRows([]); setNoData(true); })
      .finally(() => setLoading(false));
  }, [drill, range, brandId]);

  useEffect(() => {
    setRows([]); setNoData(false);
    load();
  }, [load]);

  return (
    <div
      className="fixed top-0 right-0 bottom-0 w-[480px] bg-[#0f1117] border-l border-white/5 flex flex-col z-40"
      style={{ boxShadow: "-20px 0 60px rgba(0,0,0,0.4)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{drill.campaignName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Ad Sets</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-slate-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin opacity-40" />
            <span className="text-xs">Loading ad sets…</span>
          </div>
        ) : noData ? (
          <div className="py-16 flex flex-col items-center gap-4 px-6 text-center text-slate-500">
            <Layers className="w-8 h-8 opacity-10" />
            <p className="text-xs font-medium text-slate-400">No ad set data synced yet</p>
            <p className="text-[11px] text-slate-600 max-w-xs">
              Ad set metrics for this campaign haven&apos;t been ingested. Ad set-level data will appear here once the ingest pipeline is extended.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 sticky top-0 bg-[#0f1117]">
                {["Ad Set", "Spend", "Revenue", "ROAS", "Conv", "Clicks", "Impr", "CTR", "CPA"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const roasOk = r.roas >= targetRoas;
                return (
                  <tr key={r.adset_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-white max-w-[180px]">
                      <span className="truncate block text-sm" title={r.adset_name}>{r.adset_name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{fmtMoney(r.spend)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-400">{fmtMoney(r.revenue)}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>{r.roas.toFixed(2)}×</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{fmtNum(r.conversions)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{fmtNum(r.clicks)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{fmtNum(r.impressions)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{r.ctr}%</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{r.cpa ? fmtMoney(r.cpa) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BrandDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [brand,     setBrand]     = useState<any>(null);
  const [daily,     setDaily]     = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [range,     setRange]     = usePersistedDateRange("cmo_date_range");
  const [platform,  setPlatform]  = usePersistedState<Platform>("cmo_platform_filter", "");
  const [drill,     setDrill]     = useState<DrillState | null>(null);

  // Campaign table state
  const [sortCol,        setSortCol]        = useState("spend");
  const [sortAsc,        setSortAsc]        = useState(false);
  const [campFilter,     setCampFilter]     = useState<"LIVE" | "ALL">("LIVE");
  const [createdInRange, setCreatedInRange] = useState(false);

  // See Overview page for why this guard exists — prevents an older,
  // slower-to-resolve fetch from clobbering a newer one's results.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const params = `brand_id=${id}&date_from=${range.from}&date_to=${range.to}${platform ? `&platform=${platform}` : ""}`;
    try {
      const [brandsRes, overviewRes, campaignsRes] = await Promise.all([
        api.get("/brands"),
        api.get(`/analytics/overview?${params}`),
        api.get(`/analytics/campaigns?${params}`),
      ]);
      if (requestId === requestIdRef.current) {
        const found = (brandsRes.data as any[]).find((b: any) => b.id === id);
        setBrand(found ?? null);
        setDaily(overviewRes.data.daily ?? []);
        setCampaigns(campaignsRes.data.campaigns ?? []);
      }
    } catch {
      if (requestId === requestIdRef.current) { setBrand(null); setDaily([]); setCampaigns([]); }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [id, range.from, range.to, platform]);

  useEffect(() => { load(); }, [load]);

  // ── Derived metrics ──
  const totalSpend   = daily.reduce((s, d) => s + (d.spend       ?? 0), 0);
  const totalRevenue = daily.reduce((s, d) => s + (d.revenue     ?? 0), 0);
  const totalClicks  = daily.reduce((s, d) => s + (d.clicks      ?? 0), 0);
  const avgRoas      = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const mid        = Math.floor(daily.length / 2);
  const roasFirst  = mid > 0 ? daily.slice(0, mid).reduce((s: number, r: any) => s + r.roas, 0) / mid : 0;
  const roasSecond = (daily.length - mid) > 0 ? daily.slice(mid).reduce((s: number, r: any) => s + r.roas, 0) / (daily.length - mid) : 0;
  const roasTrend  = roasFirst > 0 ? ((roasSecond - roasFirst) / roasFirst) * 100 : 0;

  const targetRoas = brand?.target_roas ?? 0;
  const roasOk     = targetRoas > 0 && avgRoas >= targetRoas;

  // ── Sales vs Lead Gen split (from campaign-level classification) ──
  const salesCampaigns = campaigns.filter((c: any) => c.campaign_type !== "LEAD_GEN");
  const leadCampaigns  = campaigns.filter((c: any) => c.campaign_type === "LEAD_GEN");
  const salesSpend     = salesCampaigns.reduce((s, c: any) => s + (c.spend ?? 0), 0);
  const salesRevenue   = salesCampaigns.reduce((s, c: any) => s + (c.revenue ?? 0), 0);
  const salesConv      = salesCampaigns.reduce((s, c: any) => s + (c.conversions ?? 0), 0);
  const salesRoas      = salesSpend > 0 ? salesRevenue / salesSpend : 0;
  const leadSpend      = leadCampaigns.reduce((s, c: any) => s + (c.spend ?? 0), 0);
  const leadCount      = leadCampaigns.reduce((s, c: any) => s + (c.conversions ?? 0), 0);
  const leadClicks     = leadCampaigns.reduce((s, c: any) => s + (c.clicks ?? 0), 0);
  const costPerLead    = leadCount > 0 ? leadSpend / leadCount : 0;
  const leadConvRate   = leadClicks > 0 ? (leadCount / leadClicks) * 100 : 0;
  const hasLeadGen     = leadCampaigns.length > 0;
  const pureLeadGen    = hasLeadGen && salesCampaigns.length === 0;

  // ── Campaign filtering ──
  const liveCampaigns = campaigns.filter((c: any) => (c.status || "").toUpperCase() === "ACTIVE");
  const baseCampaigns = campFilter === "LIVE" ? liveCampaigns : campaigns;
  const filteredCampaigns = createdInRange
    ? baseCampaigns.filter((c: any) => {
        if (!c.created_at) return false;
        const d = c.created_at.slice(0, 10);
        return d >= range.from && d <= range.to;
      })
    : baseCampaigns;

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  };

  const sortedCampaigns = [...filteredCampaigns].sort((a: any, b: any) => {
    const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
    if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  return (
    <div className={`transition-all duration-300 ${drill ? "mr-[480px]" : ""}`}>
      <div className="p-8 space-y-8">
        {/* ── Header ── */}
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {brand ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-sm shadow-lg"
                  style={{ backgroundColor: brand.color || "#6366f1" }}
                >
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-medium text-white">{brand.name}</h1>
                  <p className="text-slate-500 text-sm">
                    {brand.industry || "—"} · Target {targetRoas > 0 ? `${targetRoas}× ROAS` : "No target"} · {range.from} → {range.to}
                  </p>
                </div>
              </div>
            ) : loading ? (
              <div className="h-10 w-56 bg-white/10 rounded-xl animate-pulse" />
            ) : (
              <h1 className="text-2xl font-medium text-white">Brand Detail</h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            <PlatformFilter value={platform} onChange={setPlatform} />
            <DateRangePicker value={range} onChange={setRange} />
            <button
              onClick={load}
              className="p-2.5 rounded-xl border transition-all text-slate-400 hover:text-white hover:bg-white/5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {pureLeadGen ? (
            <>
              <KpiCard label="Leads" loading={loading}
                value={fmtNum(leadCount)} sub={range.label}
                accentColor="#f59e0b" textColor="text-amber-400"
                sparkValues={daily.map(d => d.lead_count)} />
              <KpiCard label="Cost Per Lead" loading={loading}
                value={costPerLead > 0 ? fmtMoney(costPerLead) : "—"} sub={range.label}
                accentColor="#f59e0b" textColor="text-amber-400"
                sparkValues={daily.map(d => d.cost_per_lead ?? 0)} />
              <KpiCard label="Spend" loading={loading}
                value={fmtMoney(totalSpend)} sub={range.label}
                accentColor="#3b82f6" textColor="text-white"
                sparkValues={daily.map(d => d.spend)} />
              <KpiCard label="Lead Conv. Rate" loading={loading}
                value={leadClicks > 0 ? `${leadConvRate.toFixed(1)}%` : "—"}
                sub={leadClicks > 0 ? `${fmtNum(leadClicks)} clicks` : "No clicks"}
                accentColor="#a855f7" textColor="text-purple-400"
                sparkValues={daily.map(d => d.lead_count)} />
            </>
          ) : (
            <>
              <KpiCard label="Sales Revenue" loading={loading}
                value={fmtMoney(salesRevenue)} sub={salesCampaigns.length > 0 ? range.label : "No sales campaigns"}
                accentColor="#22c55e" textColor="text-emerald-400"
                sparkValues={daily.map(d => d.revenue)} />
              <KpiCard label="Sales ROAS" loading={loading}
                value={`${salesRoas.toFixed(2)}×`}
                sub={salesCampaigns.length === 0 ? "No sales campaigns" : targetRoas > 0
                  ? `Target ${targetRoas}× · ${roasTrend >= 0 ? "↑" : "↓"} ${Math.abs(roasTrend).toFixed(1)}% trend`
                  : `Trend ${roasTrend >= 0 ? "↑" : "↓"} ${Math.abs(roasTrend).toFixed(1)}%`}
                accentColor={roasOk ? "#14b8a6" : "#f59e0b"} textColor={roasOk ? "text-teal-400" : "text-amber-400"}
                sparkValues={daily.map(d => d.roas)} />
              <KpiCard label="Spend" loading={loading}
                value={fmtMoney(totalSpend)} sub={range.label}
                accentColor="#3b82f6" textColor="text-white"
                sparkValues={daily.map(d => d.spend)} />
              {hasLeadGen ? (
                <KpiCard label="Leads" loading={loading}
                  value={fmtNum(leadCount)}
                  sub={costPerLead > 0 ? `Cost/Lead ${fmtMoney(costPerLead)}` : "Cost/Lead —"}
                  accentColor="#f59e0b" textColor="text-amber-400"
                  sparkValues={daily.map(d => d.lead_count)} />
              ) : (
                <KpiCard label="Conversions" loading={loading}
                  value={fmtNum(salesConv)}
                  sub={salesConv > 0 ? `CPA ${fmtMoney(salesSpend / salesConv)}` : "CPA —"}
                  accentColor="#a855f7" textColor="text-purple-400"
                  sparkValues={daily.map(d => d.conversions)} />
              )}
            </>
          )}
        </div>

        {/* ── Stat row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">ROAS Trend</p>
            <p className={`text-2xl font-medium ${roasTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {roasTrend >= 0 ? "↑" : "↓"} {Math.abs(roasTrend).toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-600 mt-1">vs first half of period</p>
          </div>
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Total Clicks</p>
            <p className="text-2xl font-medium text-white">{loading ? "…" : fmtNum(totalClicks)}</p>
            <p className="text-[10px] text-slate-600 mt-1">all channels</p>
          </div>
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Campaigns</p>
            <p className="text-2xl font-medium text-indigo-400">{loading ? "…" : campaigns.length}</p>
            <p className="text-[10px] text-slate-600 mt-1">in date range</p>
          </div>
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Ad Accounts</p>
            <p className="text-2xl font-medium text-slate-300">{loading ? "…" : (brand?.accounts?.length ?? 0)}</p>
            <p className="text-[10px] text-slate-600 mt-1">connected</p>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-2 gap-5">
          {/* Spend vs Revenue (or Leads, for Lead Gen brands) */}
          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{hasLeadGen ? "Spend vs Leads" : "Spend vs Revenue"}</p>
              <span className="text-[10px] text-slate-600 font-mono">{daily.length}-day</span>
            </div>
            {loading ? (
              <div className="h-48 animate-pulse bg-white/5 rounded-xl" />
            ) : daily.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data for this range</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={daily}>
                    <defs>
                      <linearGradient id="gSpendBd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gRevBd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={hasLeadGen ? "#f59e0b" : "#22c55e"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={hasLeadGen ? "#f59e0b" : "#22c55e"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.07)" />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis yAxisId="spend" tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={fmtShort} />
                    {hasLeadGen && <YAxis yAxisId="leads" orientation="right" tick={{ fill: "#475569", fontSize: 10 }} allowDecimals={false} />}
                    <Tooltip {...ttStyle} formatter={(v: number, name: string) => hasLeadGen && name === "Leads" ? v : fmtMoney(v)} />
                    <Area yAxisId="spend" type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} fill="url(#gSpendBd)" name="Spend" dot={false} />
                    {hasLeadGen ? (
                      <Area yAxisId="leads" type="monotone" dataKey="lead_count" stroke="#f59e0b" strokeWidth={2} fill="url(#gRevBd)" name="Leads" dot={false} />
                    ) : (
                      <Area yAxisId="spend" type="monotone" dataKey="sales_revenue" stroke="#22c55e" strokeWidth={2} fill="url(#gRevBd)" name="Revenue" dot={false} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-5 mt-2 text-[10px] font-medium uppercase text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-500/75 inline-block"/>Spend</span>
                  <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-sm inline-block ${hasLeadGen ? "bg-amber-500/75" : "bg-emerald-500/75"}`}/>{hasLeadGen ? "Leads" : "Revenue"}</span>
                </div>
              </>
            )}
          </div>

          {/* ROAS Trend (or Cost-Per-Lead Trend, for Lead Gen brands) */}
          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{hasLeadGen ? "Cost Per Lead Trend" : "ROAS Trend"}</p>
              {!hasLeadGen && targetRoas > 0 && <span className="text-[10px] text-slate-600 font-mono">Target {targetRoas}×</span>}
            </div>
            {loading ? (
              <div className="h-48 animate-pulse bg-white/5 rounded-xl" />
            ) : daily.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>
            ) : hasLeadGen ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.07)" />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={fmtShort} />
                  <Tooltip {...ttStyle} formatter={(v: number) => v > 0 ? `${fmtMoney(v)}/lead` : "No leads"} />
                  <Bar dataKey="cost_per_lead" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Cost/Lead" opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.07)" />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => v + "×"} />
                  <Tooltip {...ttStyle} formatter={(v: number) => v.toFixed(2) + "×"} />
                  <Bar dataKey="sales_roas" fill={roasOk ? "#14b8a6" : "#f59e0b"} radius={[3, 3, 0, 0]} name="ROAS" opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Campaign Performance Table ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Campaign Performance</h2>

              {campaigns.length > 0 && (
                <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
                  {[
                    { key: "LIVE", label: "Live", count: liveCampaigns.length },
                    { key: "ALL",  label: "All",  count: campaigns.length },
                  ].map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setCampFilter(key as any)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium uppercase tracking-widest rounded transition-colors ${
                        campFilter === key ? "bg-white text-black drop-shadow-sm" : "text-slate-500 hover:text-white"
                      }`}
                    >
                      {key === "LIVE" && campFilter === "LIVE" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {label}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        campFilter === key ? "bg-black/10 text-black/60" : "bg-white/10 text-slate-400"
                      }`}>{count}</span>
                    </button>
                  ))}
                </div>
              )}

              {campaigns.length > 0 && (
                <button
                  onClick={() => setCreatedInRange(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                    createdInRange
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                      : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${createdInRange ? "bg-indigo-400" : "bg-slate-600"}`} />
                  Created in range
                </button>
              )}
            </div>

            <span className="text-xs text-slate-600">
              {campaigns.length > 0
                ? `${filteredCampaigns.length} of ${campaigns.length} campaigns · click row for ad sets`
                : `${range.from} → ${range.to}`}
            </span>
          </div>

          {loading ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3 border-b border-white/5">
                  <div className="h-4 bg-white/5 rounded animate-pulse w-48" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-20" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-20" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl px-6 py-12 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-slate-400 font-medium">No campaign data for this period</p>
              <p className="text-xs text-slate-600 max-w-sm">
                Campaign metrics for <span className="font-mono text-slate-500">{range.from} → {range.to}</span> haven&apos;t been synced yet. Try a wider date range or sync from Meta.
              </p>
              <button
                onClick={load}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <SortTh col="campaign_name" label="Campaign"   sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} />
                    <SortTh col="platform"      label="Platform"   sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} />
                    <SortTh col="campaign_type" label="Type"       sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} />
                    <SortTh col="spend"         label="Spend"      sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} right />
                    <SortTh col="revenue"       label="Revenue"    sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} right />
                    <SortTh col="roas"          label="ROAS / CPL" sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} right />
                    <SortTh col="conversions"   label="Conv"       sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} right />
                    <SortTh col="impressions"   label="Impr"       sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} right />
                    <SortTh col="clicks"        label="Clicks"     sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} right />
                    <SortTh col="ctr"           label="CTR"        sortCol={sortCol} sortAsc={sortAsc} onSort={toggleSort} right />
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((c: any) => {
                    const isRoasOk  = targetRoas > 0 ? c.roas >= targetRoas : c.roas >= 2;
                    const isSelected = drill?.campaignId === c.campaign_id;
                    const isLeadGen = c.campaign_type === "LEAD_GEN";
                    return (
                      <tr
                        key={c.campaign_id}
                        onClick={() => {
                          if (isSelected) setDrill(null);
                          else setDrill({ campaignId: c.campaign_id, campaignName: c.campaign_name });
                        }}
                        className={`border-b border-white/5 last:border-0 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-500/15 border-l-2 border-l-indigo-500"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-white max-w-[260px]">
                          <div className="flex items-center gap-2">
                            {(c.status || "").toUpperCase() === "ACTIVE" ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                            ) : c.status ? (
                              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-amber-500/15 text-amber-400">
                                {c.status}
                              </span>
                            ) : null}
                            <span className="truncate text-sm">{c.campaign_name}</span>
                            <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isSelected ? "text-indigo-400 rotate-90" : "text-slate-700"}`} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${
                            c.platform === "META"
                              ? "bg-indigo-500/10 text-indigo-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}>{c.platform}</span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <span
                            title="Detected from the campaign's conversion goal in Google/Meta"
                            className={`inline-block text-[10px] font-medium px-2 py-1.5 rounded-lg border bg-black/20 ${
                              isLeadGen ? "text-amber-400 border-amber-500/20" : "text-sky-400 border-sky-500/20"
                            }`}>
                            {isLeadGen ? "Lead Gen" : "Sales"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right"><p className="text-sm font-medium text-white">{fmtMoney(c.spend)}</p></td>
                        <td className="px-4 py-3 text-right"><p className="text-sm font-semibold text-emerald-400">{fmtMoney(c.revenue)}</p></td>
                        <td className="px-4 py-3 text-right">
                          {isLeadGen ? (
                            <p className="text-sm font-bold text-amber-400">
                              {c.cost_per_lead != null ? `${fmtMoney(c.cost_per_lead)}/lead` : "—"}
                            </p>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`text-sm font-bold ${isRoasOk ? "text-emerald-400" : "text-amber-400"}`}>{c.roas.toFixed(2)}×</span>
                              {isRoasOk ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-amber-500" />}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right"><p className="text-sm text-slate-300">{fmtNum(c.conversions)}</p></td>
                        <td className="px-4 py-3 text-right"><p className="text-sm text-slate-400">{fmtNum(c.impressions)}</p></td>
                        <td className="px-4 py-3 text-right"><p className="text-sm text-slate-400">{fmtNum(c.clicks)}</p></td>
                        <td className="px-4 py-3 text-right"><p className="text-sm text-slate-400">{c.ctr.toFixed(2)}%</p></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Drill Panel ── */}
      {drill && (
        <DrillPanel
          drill={drill}
          range={range}
          brandId={id}
          targetRoas={targetRoas || 2}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}
