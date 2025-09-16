import React, { useState } from "react";

type Props = {
  L: number[];
  setL: (v: number[]) => void;
  theta: number;
  setTheta: (v: number) => void;
  mu: number;
  setMu: (v: number) => void;
  metricsDelta: { dEntropy: number; dDensity: number; dClusters: number };
  onResetMetrics?: () => void;
  alef?: { upperYud: number; vav: number; lowerYud: number; ratio: number };
  oneField?: number[];
  oneMetrics?: { entropy: number; density: number; clusters: number };
};

export function SensitivityPanel({ L, setL, theta, setTheta, mu, setMu, metricsDelta, onResetMetrics, alef, oneField, oneMetrics }: Props) {
  const [showUnified, setShowUnified] = useState(false);
  const setIdx = (i: number, val: number) => {
    const next = [...L];
    next[i] = val;
    setL(next);
  };
  const slider = (label: string, i: number) => (
    <div key={i} style={{display:"grid", gridTemplateColumns:"90px 1fr 60px", gap:8, alignItems:"center"}}>
      <span>{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={L[i]} onChange={e=>setIdx(i, parseFloat(e.target.value))} />
      <code>{L[i].toFixed(2)}</code>
    </div>
  );

  return (
    <div style={{border:"1px solid #444", borderRadius:8, padding:12, display:"grid", gap:10}}>
      <strong>𝓛(x) y Umbral θ</strong>
      {slider("energy", 0)}
      {slider("symmetry", 1)}
      {slider("curvature", 2)}
      <div style={{display:"grid", gridTemplateColumns:"90px 1fr 60px", gap:8, alignItems:"center"}}>
        <span>θ (umbral)</span>
        <input type="range" min={0} max={1} step={0.01} value={theta} onChange={e=>setTheta(parseFloat(e.target.value))} />
        <code>{theta.toFixed(2)}</code>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"90px 1fr 60px", gap:8, alignItems:"center"}}>
        <span>μ (fricción)</span>
        <input type="range" min={0} max={0.5} step={0.01} value={mu} onChange={e=>setMu(parseFloat(e.target.value))} />
        <code>{mu.toFixed(2)}</code>
      </div>
      <small style={{color:"#aaa"}}>Atenúa Φ en cada tic; 𝓛 permanece fija.</small>
      {!showUnified && (
        <>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
            <MiniStat label="Δ Entropía" value={metricsDelta.dEntropy} />
            <MiniStat label="Δ Densidad" value={metricsDelta.dDensity} />
            <MiniStat label="Δ Clusters" value={metricsDelta.dClusters} />
          </div>
          <button onClick={onResetMetrics} style={{justifySelf:"start", padding:"6px 10px"}}>Reiniciar Δ</button>
          {alef && (
            <div
              style={{
                display:"grid",
                gridTemplateColumns:"repeat(4,1fr)",
                gap:8,
                marginTop:8
              }}
            >
              <MiniStat label="Ω (Yud)" value={alef.upperYud} />
              <MiniStat label="Φ∘𝓛 (Vav)" value={alef.vav} />
              <MiniStat label="R (Yud)" value={alef.lowerYud} />
              <MiniStat label="Ω/(Φ∘𝓛)" value={alef.ratio} />
            </div>
          )}
        </>
      )}
      {showUnified && oneField && oneMetrics && (
        <>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
            <MiniStat label="Entropía(U)" value={oneMetrics.entropy} />
            <MiniStat label="Densidad(U)" value={oneMetrics.density} />
            <MiniStat label="Clusters(U)" value={oneMetrics.clusters} />
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8, marginTop:8}}>
            <MiniStat label="Φ̅" value={oneField[0]} />
            <MiniStat label="L1" value={oneField[1]} />
            <MiniStat label="L2" value={oneField[2]} />
            <MiniStat label="L3" value={oneField[3]} />
            <MiniStat label="ℜ̅" value={oneField[4]} />
            <MiniStat label="ε̅" value={oneField[5]} />
            <MiniStat label="R" value={oneField[6]} />
          </div>
        </>
      )}
      <button onClick={()=>setShowUnified(v=>!v)} style={{justifySelf:"start", padding:"6px 10px"}}>
        {showUnified ? "Vista individual" : "Vista unificada"}
      </button>
    </div>
  );
}

function MiniStat({ label, value }: {label:string; value:number}) {
  const color = value > 0 ? "#6f6" : value < 0 ? "#f66" : "#ccc";
  return (
    <div style={{border:"1px solid #333", borderRadius:6, padding:8}}>
      <div style={{fontSize:12, color:"#aaa"}}>{label}</div>
      <div style={{fontWeight:700, color}}>{value.toFixed(3)}</div>
    </div>
  );
}
