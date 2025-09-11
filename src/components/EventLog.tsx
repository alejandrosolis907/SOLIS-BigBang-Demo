// src/components/EventLog.tsx
import React from "react";

type Evt = { t:number; id:string; r:number };

export function EventLog({ events }: { events: Evt[] }) {
  return (
    <div className="border border-slate-700 rounded-xl p-3">
      <strong className="text-sm">ε Event Log</strong>
      <div className="mt-2 max-h-48 overflow-auto text-xs space-y-1">
        {events.slice().reverse().map((e, idx) => (
          <div key={idx} className="flex justify-between border-b border-slate-800 pb-1">
            <span>T={e.t}</span>
            <span>{e.id}</span>
            <span>ℜ={e.r.toFixed(2)}</span>
          </div>
        ))}
        {events.length===0 && <div className="text-slate-400">Sin eventos aún…</div>}
      </div>
    </div>
  );
}
