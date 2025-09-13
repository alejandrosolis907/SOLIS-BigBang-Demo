import React from "react";

export function ResonanceMeter({ value, time }: { value: number; time?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const tPct = time !== undefined ? Math.max(0, Math.min(1, time)) * 100 : undefined;
  return (
    <div style={{border:"1px solid #444", borderRadius:8, padding:8}}>
      <div style={{display:"flex", justifyContent:"space-between"}}>
        <strong>ℜ Resonance</strong>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div style={{height:10, background:"#222", borderRadius:4, overflow:"hidden"}}>
        <div style={{height:"100%", width:`${pct}%`, background:"#6cf"}} />
      </div>
      {tPct !== undefined && (
        <div style={{display:"flex", justifyContent:"space-between", marginTop:4}}>
          <span>𝓣̅</span>
          <span>{tPct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
