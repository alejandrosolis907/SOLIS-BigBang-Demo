// src/components/TimelineChart.tsx
import React, { useEffect, useRef } from "react";

export type TimelinePoint = { t: number; resonance: number };

export function TimelineChart({ points }: { points: TimelinePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#38bdf8"; // cyan-400
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const recent = points.slice(-100);
    recent.forEach((p, i) => {
      const x = (i / Math.max(recent.length - 1, 1)) * canvas.width;
      const y = canvas.height - p.resonance * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [points]);

  return (
    <div className="border border-slate-700 rounded-xl p-3">
      <strong className="text-sm">Resonancia reciente</strong>
      <canvas ref={canvasRef} width={300} height={120} className="mt-2" />
    </div>
  );
}
