"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Zap, TrendingUp, TrendingDown, Tag } from "lucide-react";
import api from "@/lib/api";
import DateRangePicker, { defaultRange, type DateRange } from "@/components/DateRangePicker";

const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");

export default function OverviewPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const fetchBrands = async (from: string, to: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/brands/overview?date_from=${from}&date_to=${to}`);
      setBrands(data || []);
    } catch { setBrands([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBrands(dateRange.from, dateRange.to); }, [dateRange.from, dateRange.to]);

  const handleSync = async (type: "recent" | "history") => {
    setSyncing(true); setSyncMsg("");
    try {
      if (type === "history") {
        await api.post("/dashboard/sync-history?days=90");
        setSyncMsg("✅ 90-day history synced.");
      } else {
        await api.post("/dashboard/sync-recent");
        setSyncMsg("✅ Recent data synced.");
      }
      fetchBrands(dateRange.from, dateRange.to);
    } catch { setSyncMsg("❌ Sync failed — check platform connections in Settings"); }
    finally { setSyncing(false); }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-white tracking-tight">Command Center</h1>
          <p className="text-slate-500 mt-1 font-medium">
            {brands.length} brand{brands.length !== 1 ? "s" : ""} · <span className="text-indigo-400">{dateRange.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <div className="flex p-1 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-white"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </button>
            <button onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-white"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
            </button>
          </div>

          <button onClick={() => fetchBrands(dateRange.from, dateRange.to)}
            className="p-2.5 rounded-xl border transition-all text-slate-400 hover:text-white hover:bg-white/5"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => handleSync("recent")} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium text-white transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Recent"}
          </button>
          <button onClick={() => handleSync("history")} disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 font-medium text-sm">
            <Zap className={`w-4 h-4 fill-current ${syncing ? "animate-pulse" : ""}`} />
            {syncing ? "Syncing..." : "Sync History"}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${syncMsg.startsWith("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {syncMsg}
        </div>
      )}

      {/* Brands */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl animate-pulse bg-white/5 border border-white/5" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
          <Tag className="w-6 h-6 text-indigo-400 shrink-0" />
          <div>
            <p className="font-medium text-indigo-400">No brands configured</p>
            <p className="text-xs text-slate-500 mt-0.5">Go to Brand Manager to create brands and map ad accounts.</p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {brands.map((b) => {
            const roas = b.roas ?? 0;
            const roasOk = roas >= (b.target_roas || 0);
            return (
              <div key={b.id} className="text-left p-5 rounded-2xl border bg-white/5 border-white/5 hover:border-indigo-500/50 hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={() => router.push(`/brands/${b.id}`)}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: b.color || "#6366f1" }}>
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm truncate">{b.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{b.industry || "—"}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    {roasOk ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-amber-500" />}
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Spend",   value: fmtMoney(b.spend ?? 0),   className: "text-white" },
                    { label: "Revenue", value: fmtMoney(b.revenue ?? 0), className: "text-emerald-400" },
                  ].map(({ label, value, className }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wider">{label}</span>
                      <span className={`text-sm font-medium ${className}`}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg -mx-2 px-2">
                    <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wider">ROAS</span>
                    <span className={`text-sm font-medium ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>{roas.toFixed(2)}×</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-lg ${roasOk ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {roasOk ? "On Target" : "Below Target"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">{b.accounts?.length || 0} acct{b.accounts?.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                {["Brand", "Status", "Spend", "Revenue", "Target ROAS", "Current ROAS"].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] text-slate-500 uppercase font-bold tracking-wider ${["Spend", "Revenue", "Target ROAS", "Current ROAS"].includes(h) ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {brands.map((b) => {
                const roas = b.roas ?? 0;
                const roasOk = roas >= (b.target_roas || 0);
                return (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/brands/${b.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium text-[10px] shrink-0 shadow-sm"
                          style={{ backgroundColor: b.color || "#6366f1" }}>
                          {b.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{b.name}</p>
                          <p className="text-[10px] text-slate-500">{b.industry || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${roasOk ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${roasOk ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {roasOk ? "On Target" : "Below Target"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right"><p className="text-sm font-medium text-white">{fmtMoney(b.spend ?? 0)}</p></td>
                    <td className="px-6 py-4 text-right"><p className="text-sm font-semibold text-emerald-400">{fmtMoney(b.revenue ?? 0)}</p></td>
                    <td className="px-6 py-4 text-right"><p className="text-sm font-medium text-slate-400">{(b.target_roas || 0).toFixed(1)}×</p></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-sm font-bold ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>{roas.toFixed(2)}×</span>
                        {roasOk ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
