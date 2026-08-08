"use client";

export type Platform = "" | "META" | "GOOGLE";

const OPTIONS: { key: Platform; label: string }[] = [
  { key: "", label: "All" },
  { key: "META", label: "Meta" },
  { key: "GOOGLE", label: "Google" },
];

export default function PlatformFilter({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  return (
    <div className="flex p-1 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      {OPTIONS.map(({ key, label }) => (
        <button key={key || "all"} onClick={() => onChange(key)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === key ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-white"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}
