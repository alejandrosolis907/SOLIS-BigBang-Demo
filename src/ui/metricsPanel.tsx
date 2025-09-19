import React from "react";
import type { AreaLawMetrics } from "../metrics";

type MetricsPanelProps = {
  metrics?: AreaLawMetrics | null;
  holographicMode?: boolean;
  title?: string;
};

function formatNumber(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(3);
}

export function MetricsPanel({ metrics, holographicMode, title }: MetricsPanelProps) {
  const perimeterR2 = metrics?.perimeterFit.r2 ?? 0;
  const areaR2 = metrics?.areaFit.r2 ?? 0;
  const samples = metrics?.regions.length ?? 0;
  const highlightPerimeter = holographicMode && perimeterR2 >= areaR2;

  return (
    <div style={{ border: "1px solid #444", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
      <strong>{title ?? "Ley de área holográfica"}</strong>
      <small style={{ color: "#a0aec0" }}>
        Se evalúa la entropía S(A) de subregiones rectangulares del bulk y se ajustan dos regresiones lineales: una con el
        perímetro y otra con el área. Si la holografía domina, la correlación con el perímetro supera claramente a la del área.
      </small>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        <MetricCard
          label="R² — Perímetro"
          value={formatNumber(perimeterR2)}
          accent={highlightPerimeter ? "#34d399" : undefined}
        />
        <MetricCard label="R² — Área" value={formatNumber(areaR2)} accent={!highlightPerimeter ? "#fbbf24" : "#94a3b8"} />
      </div>
      <div style={{ fontSize: 12, color: "#a0aec0" }}>
        Muestras: {samples} &nbsp;|
        &nbsp; α = {formatNumber(metrics?.perimeterFit.slope)} &nbsp; β = {formatNumber(metrics?.areaFit.slope)}
      </div>
      {holographicMode ? (
        <em style={{ color: highlightPerimeter ? "#34d399" : "#fbbf24", fontSize: 12 }}>
          {highlightPerimeter
            ? "Escalado holográfico detectado: S(A) sigue el perímetro."
            : "Advertencia: la correlación con el área supera a la del perímetro."}
        </em>
      ) : (
        <small style={{ color: "#94a3b8" }}>Activa el modo holográfico para contrastar la ley de área.</small>
      )}
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  accent?: string;
};

function MetricCard({ label, value, accent }: MetricCardProps) {
  const color = accent ?? "#f8fafc";
  return (
    <div style={{ border: "1px solid #333", borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 12, color: "#cbd5f5" }}>{label}</div>
      <div style={{ fontWeight: 700, color, fontSize: 18 }}>{value}</div>
    </div>
  );
}

export default MetricsPanel;

