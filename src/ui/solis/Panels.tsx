import React from "react";

const SOLIS = import.meta.env.VITE_UI_MODE_SOLIS_ENABLED === "1";

export function SolisPanels() {
  if (!SOLIS) return null;
  return (
    <aside style={{ position: "fixed", left: 12, top: 60, width: 260, padding: 12, background: "rgba(0,0,0,0.35)", borderRadius: 12 }}>
      <h3>Φ / 𝓛(x) / ℜ / 𝓣 / ε</h3>
      <p>Paneles de control SOLIS (placeholder seguro).</p>
    </aside>
  );
}
