"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export default function ReportsPage() {
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [brands, setBrands]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/sync-jobs").catch(() => ({ data: [] })),
      api.get("/brands/overview").catch(() => ({ data: [] })),
    ]).then(([j, b]) => {
      setSyncJobs(j.data || []);
      setBrands(b.data || []);
      setLoading(false);
    });
  }, []);

  const statusIcon = (s: string) => {
    if (s === "completed") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (s === "failed")    return <XCircle className="w-4 h-4 text-red-400" />;
    if (s === "running")   return <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const totalSpend   = brands.reduce((s: number, b: any) => s + (b.spend || 0), 0);
  const totalRevenue = brands.reduce((s: number, b: any) => s + (b.revenue || 0), 0);
  const avgRoas      = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const fmt = (v: number) =>
    v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
    : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
    : `₹${Math.round(v).toLocaleString("en-IN")}`;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-white">📋 Reports & Monitoring</h1>
        <p className="text-slate-500 mt-1">Performance summary, sync history, and alerts</p>
      </div>

      {/* Summary KPIs */}
      <div>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Performance Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)
          ) : [
            { label: "Total Spend",   value: fmt(totalSpend) },
            { label: "Total Revenue", value: fmt(totalRevenue) },
            { label: "Avg ROAS",      value: avgRoas.toFixed(2) + "×" },
            { label: "Active Brands", value: String(brands.length) },
          ].map(({ label, value }) => (
            <div key={label} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
              <p className="text-2xl font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Performance */}
      <div>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Brand Performance</h2>
        <div className="space-y-2">
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)
          ) : brands.length === 0 ? (
            <div className="py-10 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl">No brands yet</div>
          ) : brands.map((b: any, i: number) => (
            <div key={b.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-6">#{i + 1}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-medium shrink-0"
                  style={{ backgroundColor: b.color || "#6366f1" }}>
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="font-medium text-slate-200">{b.name}</p>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Spend</p>
                  <p className="text-slate-300 font-medium">{fmt(b.spend || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Revenue</p>
                  <p className="text-emerald-400 font-medium">{fmt(b.revenue || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">ROAS</p>
                  <p className="text-indigo-400 font-medium">{(b.roas || 0).toFixed(2)}×</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Jobs */}
      <div>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Sync History</h2>
        {syncJobs.length === 0 ? (
          <div className="py-10 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl text-sm">
            No sync jobs yet — use Sync buttons on the Overview page
          </div>
        ) : (
          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Platform", "Account", "Status", "Rows Synced", "Time"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {syncJobs.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${r.platform === "META" ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"}`}>{r.platform}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.account_id}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon(r.status)}
                        <span className={`text-xs font-medium ${r.status === "completed" ? "text-emerald-400" : r.status === "failed" ? "text-red-400" : "text-slate-400"}`}>
                          {r.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{r.rows_synced?.toLocaleString() || "—"}</td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
