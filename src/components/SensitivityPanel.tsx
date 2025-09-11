// src/components/SensitivityPanel.tsx
import React from "react";

type Props = {
  L: number[]; setL: (v:number[])=>void;
  theta: number; setTheta: (v:number)=>void;
  friccion: number; setFriccion: (v:number)=>void;
  feedback: number; setFeedback: (v:number)=>void;
  seed: number; setSeed: (v:number)=>void;
};

export function SensitivityPanel({
  L, setL, theta, setTheta,
  friccion, setFriccion,
  feedback, setFeedback,
  seed, setSeed
}: Props){
  return (
    <div className="border border-slate-700 rounded-xl p-3">
      <strong className="text-sm">𝓛(x) & Parámetros</strong>
      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
        {L.map((w, i) => (
          <label key={i}>L[{i}] {w.toFixed(2)}
            <input className="w-full" type="range" min={0} max={1} step={0.01} value={w}
              onChange={e => {
                const copy = [...L];
                copy[i] = parseFloat(e.target.value);
                const s = Math.hypot(...copy) || 1;
                for (let k = 0; k < copy.length; k++) copy[k] /= s;
                setL(copy);
              }} />
          </label>
        ))}
        <label>θ (umbral ε) {theta.toFixed(2)}
          <input className="w-full" type="range" min={0.5} max={0.99} step={0.01} value={theta}
            onChange={e => setTheta(parseFloat(e.target.value))} />
        </label>
        <label>Fricción {friccion.toFixed(2)}
          <input className="w-full" type="range" min={0} max={0.2} step={0.01} value={friccion}
            onChange={e => setFriccion(parseFloat(e.target.value))} />
        </label>
        <label>Feedback 𝓡ₐ {feedback.toFixed(2)}
          <input className="w-full" type="range" min={0} max={0.1} step={0.005} value={feedback}
            onChange={e => setFeedback(parseFloat(e.target.value))} />
        </label>
        <label>Seed Φ
          <input className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1" type="number" value={seed}
            onChange={e => setSeed(parseInt(e.target.value || "0"))} />
        </label>
      </div>
    </div>
  );
}
