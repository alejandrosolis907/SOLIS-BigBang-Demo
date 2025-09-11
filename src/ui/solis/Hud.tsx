import React from "react";

export function SolisHud() {
  if (process.env.UI_MODE_SOLIS_ENABLED !== "1") return null;
  return (
    <div style={{ position: "fixed", bottom: 12, right: 12, padding: 8, background: "rgba(0,0,0,0.35)", borderRadius: 8 }}>
      <small>HUD SOLIS — Telemetría (placeholder)</small>
    </div>
  );
}
