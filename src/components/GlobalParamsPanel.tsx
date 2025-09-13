import React from "react";

export function GlobalParamsPanel({
  seedBase,
  setSeedBase,
  speed,
  setSpeed,
  grid,
  setGrid,
  balance,
  setBalance,
  mu,
  setMu,
}: {
  seedBase: number;
  setSeedBase: (v: number) => void;
  speed: number;
  setSpeed: (v: number) => void;
  grid: number;
  setGrid: (v: number) => void;
  balance: number;
  setBalance: (v: number) => void;
  mu: number;
  setMu: (v: number) => void;
}) {
  return (
    <div className="bg-slate-900/70 rounded-2xl p-4 space-y-4">
      <h2 className="font-semibold">Parámetros globales</h2>
      <label className="block text-sm">
        Semilla base
        <input
          type="number"
          className="mt-1 w-full rounded-md bg-slate-800 p-1"
          value={seedBase}
          onChange={(e) => setSeedBase(parseInt(e.target.value) || 0)}
        />
      </label>
      <label className="block text-sm">
        Grid
        <input
          type="number"
          className="mt-1 w-full rounded-md bg-slate-800 p-1"
          value={grid}
          onChange={(e) => setGrid(parseInt(e.target.value) || 0)}
        />
      </label>
      <label className="block text-sm">
        Velocidad 𝓣
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          className="w-full"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
        />
        <div className="text-xs mt-1">{speed.toFixed(1)}x</div>
      </label>
      <label className="block text-sm">
        Balance Ω/Φ
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          className="w-full"
          value={balance}
          onChange={(e) => setBalance(parseFloat(e.target.value))}
        />
        <div className="text-xs mt-1">{balance.toFixed(2)}</div>
      </label>
      <label className="block text-sm">
        Fricción μ
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          className="w-full"
          value={mu}
          onChange={(e) => setMu(parseFloat(e.target.value))}
        />
        <div className="text-xs mt-1">{mu.toFixed(2)}</div>
      </label>
    </div>
  );
}
