import React from "react";
import { getBoundaryMode, getR2Area, getR2Perimeter } from "../metrics";

type MetricsPanelProps = {
  seed?: number | string | null;
  depth?: number | string | null;
};

function formatR2(value: number | null): string {
  if (value == null) {
    return "N/D";
  }
  return value.toFixed(3);
}

function formatBoundary(value: boolean | null): string {
  if (value == null) {
    return "N/D";
  }
  return value ? "ON" : "OFF";
}

function formatScalar(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "N/D";
  }
  return typeof value === "number" ? value.toString() : value;
}

export function MetricsPanel({ seed, depth }: MetricsPanelProps) {
  const r2Perimeter = getR2Perimeter();
  const r2Area = getR2Area();
  const boundaryMode = getBoundaryMode();

  const handleExport = () => {
    const timestamp = new Date().toISOString();
    const rows = [
      "seed,depth,R2_perimeter,R2_area,timestamp",
      [
        formatScalar(seed),
        formatScalar(depth),
        r2Perimeter != null ? r2Perimeter.toString() : "N/D",
        r2Area != null ? r2Area.toString() : "N/D",
        timestamp,
      ].join(","),
    ];

    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `metricas-experimentos-${timestamp.replace(/[:.]/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Métricas básicas</h2>
        <p className="text-sm text-slate-400">Lectura de indicadores actuales del sistema.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-400">R² (perímetro)</div>
          <div className="text-2xl font-semibold text-slate-100">{formatR2(r2Perimeter)}</div>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-400">R² (área)</div>
          <div className="text-2xl font-semibold text-slate-100">{formatR2(r2Area)}</div>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-400">Boundary Mode</div>
          <div className="text-2xl font-semibold text-slate-100">{formatBoundary(boundaryMode)}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/40">
          <div className="text-xs uppercase tracking-wide text-slate-500">Seed base</div>
          <div className="text-base text-slate-100">{formatScalar(seed)}</div>
        </div>
        <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/40">
          <div className="text-xs uppercase tracking-wide text-slate-500">Profundidad (depth)</div>
          <div className="text-base text-slate-100">{formatScalar(depth)}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
          onClick={handleExport}
          type="button"
        >
          Exportar CSV (experimentos)
        </button>
      </div>
    </section>
  );
}
