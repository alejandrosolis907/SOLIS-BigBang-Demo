import React from "react";

export function ResonanceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div style={{border:"1px solid #444", borderRadius:8, padding:8}}>
      <div style={{display:"flex", justifyContent:"space-between"}}>
        <strong>ℜ Resonance</strong>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div style={{height:10, background:"#222", borderRadius:4, overflow:"hidden"}}>
        <div style={{height:"100%", width:`${pct}%`, background:"#6cf"}} />
      </div>
    </div>
  );
}
