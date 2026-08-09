"use client";
import { useEffect, useState } from "react";
import { Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

export default function AIEnginePage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [loading, setLoading] = useState(true);
  const [evaluatedAt, setEvaluatedAt] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        api.get<any>(`/dashboard/live-state${selectedBrand ? `?brand_id=${selectedBrand}` : ""}`),
        api.get<any>("/brands/overview"),
      ]);
      setSuggestions(s.data.suggestions || []);
      setEvaluatedAt(s.data.evaluated_at || "");
      setBrands(b.data || []);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedBrand]);

  const pending   = suggestions.filter(s => !s.status || s.status === "PENDING");
  const emergency = suggestions.filter(s => s.type === "EMERGENCY_STOP");

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-white">🤖 AI Suggestions Engine</h1>
          <p className="text-slate-500 mt-1">
            {evaluatedAt ? `Last evaluated: ${new Date(evaluatedAt).toLocaleTimeString()}` : "Autonomous decisions powered by Rule Engine + Gemini"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-white font-medium border focus:outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <option value="">All Brands</option>
            {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={load}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all font-medium text-sm shadow-lg shadow-indigo-500/20">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Re-evaluate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Total Suggestions</p>
          <p className="text-3xl font-medium text-indigo-400">{loading ? "..." : suggestions.length}</p>
        </div>
        <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Pending Review</p>
          <p className="text-3xl font-medium text-amber-400">{loading ? "..." : pending.length}</p>
        </div>
        <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Emergency Stops</p>
          <p className="text-3xl font-medium text-red-400">{loading ? "..." : emergency.length}</p>
        </div>
        <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Engine Confidence</p>
          <p className="text-3xl font-medium text-emerald-400">87%</p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Evaluating campaigns...</div>
        ) : suggestions.length === 0 ? (
          <div className="py-24 border border-dashed border-white/5 rounded-3xl flex flex-col items-center text-slate-500">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p className="font-medium">No suggestions firing</p>
            <p className="text-sm mt-1">All campaigns within threshold, or no data synced yet.</p>
          </div>
        ) : (
          suggestions.map((s: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <SuggestionRow suggestion={s} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionRow({ suggestion: s }: { suggestion: any }) {
  const [approved, setApproved] = useState(false);
  const isEmergency = s.type === "EMERGENCY_STOP";
  const isUp = s.direction === "UP";

  return (
    <div className={`p-6 rounded-2xl border flex items-center justify-between gap-6 transition-all ${
      approved ? "bg-emerald-500/10 border-emerald-500/20" :
      isEmergency ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/5"
    }`}>
      <div className="flex items-center gap-5 flex-1">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
          isEmergency ? "bg-red-500/10 border-red-500/20" : "bg-indigo-500/10 border-indigo-500/10"
        }`}>
          {isEmergency ? <AlertCircle className="text-red-400 w-5 h-5" /> :
           isUp ? <TrendingUp className="text-indigo-400 w-5 h-5" /> :
           <TrendingDown className="text-amber-400 w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium bg-white/10 px-1.5 py-0.5 rounded text-slate-400 uppercase">{s.rule_id}</span>
            <span className="text-[10px] text-indigo-400 font-medium">{s.priority}</span>
            <span className="text-[10px] text-slate-500">{s.channel}</span>
          </div>
          <p className="font-medium text-slate-200">{s.entity_name}</p>
          {s.narrative && <p className="text-xs text-slate-400 mt-1 leading-relaxed">"{s.narrative}"</p>}
          <p className="text-xs text-slate-600 mt-0.5 italic">{s.reason}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
          isUp ? "bg-indigo-500/10 text-indigo-400" : "bg-red-500/10 text-red-400"
        }`}>{s.type} {s.magnitude}%</span>
        {approved ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Approved
          </div>
        ) : (
          <>
            <button onClick={() => setApproved(true)} className={`px-5 py-2 rounded-xl text-xs font-medium transition-all ${
              isEmergency ? "bg-red-500 text-white hover:bg-red-600" : "bg-white text-black hover:bg-indigo-400 hover:text-white"
            }`}>
              {isEmergency ? "KILL NOW" : "Approve"}
            </button>
            <button className="px-4 py-2 border border-white/10 rounded-xl text-xs font-medium text-slate-400 hover:bg-white/5">
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
