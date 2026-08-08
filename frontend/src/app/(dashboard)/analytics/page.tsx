"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "@/lib/api";
import DateRangePicker, { defaultRange, type DateRange } from "@/components/DateRangePicker";

const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const fmtShort = (v: number) =>
  v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000     ? `₹${(v / 1_000).toFixed(0)}k`
  : `₹${Math.round(v)}`;

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

const tooltipStyle = { contentStyle: { background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }, labelStyle: { color: "#94a3b8" }, itemStyle: { color: "#f1f5f9" } };

function AnalyticsPageInner() {
  const searchParams = useSearchParams();
  const [daily, setDaily] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand_id") || "");
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBrand) params.set("brand_id", selectedBrand);
    params.set("date_from", dateRange.from);
    params.set("date_to", dateRange.to);
    const q = params.toString();
    try {
      const [d, c, b] = await Promise.all([
        api.get(`/analytics/overview?${q}`),
        api.get(`/analytics/by-channel?${q}`),
        api.get("/brands/overview"),
      ]);
      setDaily(d.data.daily || []);
      setChannels(c.data.channels || []);
      setBrands(b.data || []);
    } catch { setDaily([]); setChannels([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedBrand, dateRange.from, dateRange.to]);

  const totalSpend   = daily.reduce((s, d) => s + (d.spend || 0), 0);
  const totalRevenue = daily.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalClicks  = daily.reduce((s, d) => s + (d.clicks || 0), 0);
  const avgRoas      = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-white">📊 Analytics</h1>
          <p className="text-slate-500 mt-1">Performance breakdown across brands and platforms</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Spend"   value={fmtShort(totalSpend)}   sub="Sum of all platforms" accent="#6366f1" />
        <KpiCard label="Total Revenue" value={fmtShort(totalRevenue)} sub="Attributed revenue"   accent="#10b981" />
        <KpiCard label="Avg ROAS"      value={avgRoas.toFixed(2) + "×"} sub="Revenue / Spend"    accent="#f59e0b" />
        <KpiCard label="Total Clicks"  value={totalClicks.toLocaleString("en-IN")} sub="All channels" accent="#3b82f6" />
      </div>

      {/* Spend vs Revenue chart */}
      <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-5">Spend vs Revenue — Daily</p>
        {loading ? (
          <div className="h-48 animate-pulse bg-white/5 rounded-xl" />
        ) : daily.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data — connect ad accounts and sync</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.07)" />
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={fmtShort} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtMoney(v)} />
              <Area type="monotone" dataKey="spend"   stroke="#6366f1" strokeWidth={2} fill="url(#gSpend)"   name="Spend" dot={false} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#gRevenue)" name="Revenue" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ROAS chart */}
      <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-5">Daily ROAS</p>
        {loading ? (
          <div className="h-40 animate-pulse bg-white/5 rounded-xl" />
        ) : daily.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.07)" />
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => v + "×"} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => v.toFixed(2) + "×"} />
              <Bar dataKey="roas" fill="#f59e0b" radius={[3, 3, 0, 0]} name="ROAS" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Platform Breakdown */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-4">Platform Breakdown</p>
        {channels.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl text-slate-500 text-sm">No channel data yet</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {channels.map((ch: any) => (
              <div key={ch.platform} className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${ch.platform === "META" ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"}`}>{ch.platform}</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "Spend",       value: fmtShort(ch.spend),        color: "text-white" },
                    { label: "Revenue",     value: fmtShort(ch.revenue),      color: "text-emerald-400" },
                    { label: "ROAS",        value: ch.roas.toFixed(2) + "×",  color: "text-amber-400" },
                    { label: "Conversions", value: String(ch.conversions),     color: "text-white" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-1">{label}</p>
                      <p className={`text-lg font-semibold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPageInner />
    </Suspense>
  );
}
