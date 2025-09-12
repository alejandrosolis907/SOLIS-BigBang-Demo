import React from "react";

const sharpenPreset = [0, -1, 0, -1, 5, -1, 0, -1, 0];
const smoothPreset = [
  0.07, 0.12, 0.07,
  0.12, 0.26, 0.12,
  0.07, 0.12, 0.07,
];

export function KernelEditor({ kernel, setKernel }: { kernel: number[]; setKernel: (k: number[]) => void; }) {
  const change = (i: number, val: number) => {
    const next = [...kernel];
    next[i] = val;
    setKernel(next);
  };
  const normalize = () => {
    const sum = kernel.reduce((a, b) => a + b, 0) || 1;
    setKernel(kernel.map((v) => v / sum));
  };
  return (
    <div className="bg-slate-900/70 rounded-2xl p-4 space-y-4">
      <h2 className="font-semibold">Editor de 𝓛(x) — kernel 3×3</h2>
      <div className="grid grid-cols-3 gap-2">
        {kernel.map((v, i) => (
          <input
            key={i}
            type="number"
            step="0.01"
            value={v}
            onChange={(e) => change(i, parseFloat(e.target.value))}
            className="w-full rounded-md bg-slate-800 p-1 text-sm"
          />
        ))}
      </div>
      <div className="flex gap-2 flex-wrap text-sm">
        <button className="px-2 py-1 rounded-md bg-slate-800" onClick={normalize}>Normalizar</button>
        <button className="px-2 py-1 rounded-md bg-slate-800" onClick={() => setKernel(sharpenPreset)}>Afilado</button>
        <button className="px-2 py-1 rounded-md bg-slate-800" onClick={() => setKernel(smoothPreset)}>Suavizado</button>
      </div>
    </div>
  );
}
