import React from "react";

type HeaderProps = {
  onStartAll: () => void;
  onPauseAll: () => void;
  onResetSoft: () => void;
  onResetHard: () => void;
  onExportCsv: () => void;
  onExportCapture: () => void;
  onToggleExperiments: () => void;
  experimentsOpen: boolean;
};

export function Header({
  onStartAll,
  onPauseAll,
  onResetSoft,
  onResetHard,
  onExportCsv,
  onExportCapture,
  onToggleExperiments,
  experimentsOpen,
}: HeaderProps) {
  const experimentsButtonClassName = experimentsOpen
    ? "px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500"
    : "px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700";

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
      <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">BigBangSim — Φ ∘ 𝓛(x) → R</h1>
      <div className="flex flex-wrap justify-center sm:justify-end gap-2">
        <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={onStartAll}>
          Iniciar todo
        </button>
        <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={onPauseAll}>
          Pausar todo
        </button>
        <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={onResetSoft}>
          Reset 𝓣/R
        </button>
        <button className="px-3 py-1 rounded-xl bg-indigo-700 hover:bg-indigo-600" onClick={onResetHard}>
          Big Bang ♻︎
        </button>
        <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={onExportCsv}>
          Exportar CSV
        </button>
        <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={onExportCapture}>
          Exportar captura
        </button>
        <button
          className={experimentsButtonClassName}
          onClick={onToggleExperiments}
          aria-pressed={experimentsOpen}
          type="button"
        >
          {experimentsOpen ? "Cerrar mapa Φ ∘ 𝓛(x)" : "Mapa Φ ∘ 𝓛(x)"}
        </button>
      </div>
    </header>
  );
}
