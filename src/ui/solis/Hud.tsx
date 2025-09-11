import React from "react";

const SOLIS = import.meta.env.VITE_UI_MODE_SOLIS_ENABLED === "1";

export function SolisHud() {
  if (!SOLIS) return null;
  return (
    <div style={{ position: "fixed", bottom: 12, right: 12, padding: 8, background: "rgba(0,0,0,0.35)", borderRadius: 8 }}>
      <small>HUD SOLIS — Telemetría (placeholder)</small>
    </div>
  );
}
