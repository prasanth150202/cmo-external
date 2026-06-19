"use client";
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type DateRange = { from: string; to: string; label: string };

function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function today() { return fmt(new Date()); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); }
function startOfMonth() { const d = new Date(); return fmt(new Date(d.getFullYear(), d.getMonth(), 1)); }
function startOfLastMonth() { const d = new Date(); return fmt(new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
function endOfLastMonth() { const d = new Date(); return fmt(new Date(d.getFullYear(), d.getMonth(), 0)); }

export const PRESETS = [
  { label: "Today",        from: () => today(),            to: () => today() },
  { label: "Yesterday",    from: () => daysAgo(1),         to: () => daysAgo(1) },
  { label: "Last 7 Days",  from: () => daysAgo(6),         to: () => today() },
  { label: "Last 14 Days", from: () => daysAgo(13),        to: () => today() },
  { label: "Last 30 Days", from: () => daysAgo(29),        to: () => today() },
  { label: "Last 90 Days", from: () => daysAgo(89),        to: () => today() },
  { label: "This Month",   from: () => startOfMonth(),     to: () => today() },
  { label: "Last Month",   from: () => startOfLastMonth(), to: () => endOfLastMonth() },
];

export function defaultRange(): DateRange {
  return { from: daysAgo(6), to: today(), label: "Last 7 Days" };
}

export default function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyPreset = (p: (typeof PRESETS)[0]) => {
    const from = p.from(), to = p.to();
    onChange({ from, to, label: p.label });
    setCustomFrom(from); setCustomTo(to);
    setShowCustom(false); setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    onChange({ from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` });
    setOpen(false);
  };

  const isCustomActive = !PRESETS.find(p => p.label === value.label);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium text-white select-none transition-all hover:bg-white/5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="max-w-[180px] truncate">{value.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="p-2 space-y-0.5">
            {PRESETS.map(p => {
              const active = value.label === p.label;
              return (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}>
                  <span>{p.label}</span>
                  {active && <span className="text-[10px] font-mono text-indigo-400/70">{value.from.slice(5)} → {value.to.slice(5)}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setShowCustom(s => !s)}
              className={`w-full flex items-center justify-between px-5 py-3 text-sm font-medium transition-all ${
                showCustom || isCustomActive ? "text-indigo-400 bg-indigo-500/5" : "text-slate-400 hover:bg-white/5"
              }`}>
              <span className="flex items-center gap-2">
                Custom Range
                {isCustomActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustom ? "rotate-180" : ""}`} />
            </button>
            {showCustom && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: "From", val: customFrom, onChange: setCustomFrom, max: customTo || today(), min: undefined },
                    { label: "To",   val: customTo,   onChange: setCustomTo,   max: today(),              min: customFrom }
                  ].map(({ label, val, onChange: oc, max, min }) => (
                    <div key={label}>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5 block">{label}</label>
                      <input type="date" value={val} max={max} min={min} onChange={e => oc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)" }} />
                    </div>
                  ))}
                </div>
                {customFrom && customTo && customFrom > customTo && (
                  <p className="text-[11px] text-red-400 font-medium">"From" must be before "To"</p>
                )}
                <button onClick={applyCustom} disabled={!customFrom || !customTo || customFrom > customTo}
                  className="w-full py-2.5 bg-indigo-500 rounded-xl text-white text-xs font-medium uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-40">
                  Apply Range
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
