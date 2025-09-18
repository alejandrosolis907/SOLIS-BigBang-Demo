import React, { useSyncExternalStore } from "react";
import {
  getMetricsSnapshot,
  subscribeMetrics,
  type ConstraintSatisfactionSnapshot,
  type HintsAppliedSnapshot,
} from "../metrics";

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

function formatCount(value: number | null): string {
  if (value === null || value === undefined) {
    return "N/D";
  }
  return value.toString();
}

function formatHints(snapshot: HintsAppliedSnapshot): string {
  const hints = snapshot.hints;
  if (!hints) {
    return "N/D";
  }
  if (hints.length === 0) {
    return "Ninguno";
  }
  return hints.join(", ");
}

export function MetricsPanel({ seed, depth }: MetricsPanelProps) {
  const metrics = useSyncExternalStore(subscribeMetrics, getMetricsSnapshot, getMetricsSnapshot);
  const r2Perimeter = metrics.r2Perimeter;
  const r2Area = metrics.r2Area;
  const boundaryMode = metrics.boundaryMode;
  const constraints: ConstraintSatisfactionSnapshot = metrics.constraintSatisfaction;
  const hints: HintsAppliedSnapshot = metrics.hintsApplied;
  const constraintsOk = constraints.constraintsOk;
  const constraintsFailed = constraints.constraintsFailed;
  const entryForHints = hints.entryId ?? constraints.entryId ?? null;
  const hintsDisplay = formatHints(hints);
  const csvHints =
    hints.hints == null ? "N/D" : hints.hints.length === 0 ? "Ninguno" : hints.hints.join("|");

  const handleExport = () => {
    const timestamp = new Date().toISOString();
    const rows = [
      "seed,depth,R2_perimeter,R2_area,entryId,constraints_ok,constraints_failed,hints,timestamp",
      [
        formatScalar(seed),
        formatScalar(depth),
        r2Perimeter != null ? r2Perimeter.toString() : "N/D",
        r2Area != null ? r2Area.toString() : "N/D",
        entryForHints ?? "N/D",
        constraintsOk != null ? constraintsOk.toString() : "N/D",
        constraintsFailed != null ? constraintsFailed.toString() : "N/D",
        csvHints,
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-400">Limitantes cumplidas</div>
          <div className="text-2xl font-semibold text-slate-100">{formatCount(constraintsOk)}</div>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-400">Limitantes ajustadas</div>
          <div className="text-2xl font-semibold text-slate-100">{formatCount(constraintsFailed)}</div>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-400">Hints aplicados</div>
          <div className="text-sm sm:text-base text-slate-100 break-words">{hintsDisplay}</div>
          <div className="text-xs text-slate-500 mt-1">Φ–𝓛: {formatScalar(entryForHints)}</div>
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
