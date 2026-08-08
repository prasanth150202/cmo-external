"use client";
import { useEffect, useState, useRef } from "react";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import api from "@/lib/api";
import DateRangePicker, { usePersistedDateRange } from "@/components/DateRangePicker";
import PlatformFilter, { type Platform } from "@/components/PlatformFilter";
import { usePersistedState } from "@/lib/usePersistedState";

const fmtShort = (v: number) =>
  v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000     ? `₹${(v / 1_000).toFixed(0)}k`
  : `₹${Math.round(v)}`;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [brands, setBrands]       = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [dateRange, setDateRange] = usePersistedDateRange("cmo_date_range");
  const [platform, setPlatform] = usePersistedState<Platform>("cmo_platform_filter", "");
  const [loading, setLoading]     = useState(true);

  // See Overview page for why this guard exists — prevents an older,
  // slower-to-resolve fetch from clobbering a newer one's results.
  const requestIdRef = useRef(0);

  const load = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBrand) params.set("brand_id", selectedBrand);
    if (platform) params.set("platform", platform);
    params.set("date_from", dateRange.from);
    params.set("date_to", dateRange.to);
    try {
      const [c, b] = await Promise.all([
        api.get(`/analytics/campaigns?${params}`),
        api.get("/brands/overview"),
      ]);
      if (requestId === requestIdRef.current) {
        setCampaigns(c.data.campaigns || []);
        setBrands(b.data || []);
      }
    } catch {
      if (requestId === requestIdRef.current) setCampaigns([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedBrand, platform, dateRange.from, dateRange.to]);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-white">📈 Campaigns</h1>
          <p className="text-slate-500 mt-1">{campaigns.length} campaigns · {dateRange.label}</p>
        </div>
        <div className="flex items-center gap-3">
          <PlatformFilter value={platform} onChange={setPlatform} />
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-white font-medium border focus:outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <option value="">All Brands</option>
            {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button onClick={load} className="p-2.5 rounded-xl border transition-all text-slate-400 hover:text-white hover:bg-white/5"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              {["Campaign", "Platform", "Type", "Spend", "Revenue", "ROAS / CPL", "Conversions", "Impressions", "CTR"].map(h => (
                <th key={h} className={`px-5 py-4 text-[10px] text-slate-500 uppercase font-bold tracking-wider ${["Spend","Revenue","ROAS / CPL","Conversions","Impressions","CTR"].includes(h) ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-500">No campaign data — sync your accounts first</td></tr>
            ) : (
              campaigns.map((c: any, i: number) => {
                const isLeadGen = c.campaign_type === "LEAD_GEN";
                const roasOk = c.roas >= 2;
                return (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-white font-medium text-sm max-w-[220px] truncate">{c.campaign_name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${c.platform === "META" ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {c.platform}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        title="Detected from the campaign's conversion goal in Google/Meta"
                        className={`inline-block text-[10px] font-medium px-2 py-1.5 rounded-lg border bg-black/20 ${
                          isLeadGen ? "text-amber-400 border-amber-500/20" : "text-sky-400 border-sky-500/20"
                        }`}>
                        {isLeadGen ? "Lead Gen" : "Sales"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right"><p className="text-sm font-medium text-white">{fmtShort(c.spend)}</p></td>
                    <td className="px-5 py-4 text-right"><p className="text-sm font-semibold text-emerald-400">{fmtShort(c.revenue)}</p></td>
                    <td className="px-5 py-4 text-right">
                      {isLeadGen ? (
                        <p className="text-sm font-bold text-amber-400">
                          {c.cost_per_lead != null ? `${fmtShort(c.cost_per_lead)}/lead` : "—"}
                        </p>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-sm font-bold ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>{c.roas.toFixed(2)}×</span>
                          {roasOk ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right"><p className="text-sm text-white">{c.conversions.toLocaleString()}{isLeadGen && <span className="text-slate-500 text-xs"> leads</span>}</p></td>
                    <td className="px-5 py-4 text-right"><p className="text-sm text-slate-400">{c.impressions.toLocaleString()}</p></td>
                    <td className="px-5 py-4 text-right"><p className="text-sm text-slate-400">{c.ctr.toFixed(2)}%</p></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
