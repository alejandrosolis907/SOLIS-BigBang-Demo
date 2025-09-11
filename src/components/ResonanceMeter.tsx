// src/components/ResonanceMeter.tsx
import React from "react";

export function ResonanceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="border border-slate-700 rounded-xl p-3">
      <div className="flex items-center justify-between text-sm mb-2">
        <strong>ℜ Resonancia</strong>
        <span>{(pct*100).toFixed(1)}%</span>
      </div>
      <div className="h-3 bg-slate-800 rounded">
        <div className="h-3 rounded" style={{ width: `${pct*100}%`, background: "linear-gradient(90deg, #60a5fa, #a78bfa)" }} />
      </div>
    </div>
  );
}
