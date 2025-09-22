import React from "react";

type HeaderProps = {
  onStartAll: () => void;
  onPauseAll: () => void;
  onResetSoft: () => void;
  onResetHard: () => void;
  onExportCsv: () => void;
  onExportCapture: () => void;
  onOpenExperimentsDoc: () => void;
  onToggleMetrics: () => void;
  onToggleParams: () => void;
  metricsOpen: boolean;
  paramsOpen: boolean;
};

export function Header({
  onStartAll,
  onPauseAll,
  onResetSoft,
  onResetHard,
  onExportCsv,
  onExportCapture,
  onOpenExperimentsDoc,
  onToggleMetrics,
  onToggleParams,
  metricsOpen,
  paramsOpen,
}: HeaderProps) {
  const toggleButtonClassName = (isActive: boolean) =>
    isActive
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
        <button className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700" onClick={onOpenExperimentsDoc}>
          Experimentos
        </button>
        <button
          className={toggleButtonClassName(metricsOpen)}
          onClick={onToggleMetrics}
          aria-pressed={metricsOpen}
          type="button"
        >
          {metricsOpen ? "Cerrar métricas" : "Métricas básicas"}
        </button>
        <button
          className={toggleButtonClassName(paramsOpen)}
          onClick={onToggleParams}
          aria-pressed={paramsOpen}
          type="button"
        >
          {paramsOpen ? "Cerrar Φ–𝓛" : "Panel Φ–𝓛"}
        </button>
      </div>
    </header>
  );
}
