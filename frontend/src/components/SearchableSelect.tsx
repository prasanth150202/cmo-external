"use client";
import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

export type SearchableSelectOption = { value: string; label: string };

export default function SearchableSelect({ options, value, onChange, placeholder, disabled }: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = options.find(o => o.value === value);
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-indigo-500 text-left disabled:opacity-50">
        <span className="truncate">{selected ? selected.label : <span className="text-slate-600 font-normal">{placeholder || "Select..."}</span>}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#12141c" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search accounts..."
              className="w-full bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500">No matching accounts</div>
            ) : (
              filtered.map(o => (
                <button key={o.value} type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                    o.value === value ? "bg-indigo-500/10 text-indigo-400" : "text-slate-200 hover:bg-white/5"
                  }`}>
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
