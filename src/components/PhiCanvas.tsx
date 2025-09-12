import React, { useEffect, useRef } from "react";

const PALETTES: string[][] = [
  ["#7dd3fc","#a78bfa","#f0abfc","#f472b6","#60a5fa"],
  ["#fef08a","#fca5a5","#fdba74","#f97316","#fde68a"],
  ["#34d399","#22d3ee","#38bdf8","#a7f3d0","#f5d0fe"],
  ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6"],
];

export function PhiCanvas({
  possibilities,
  timeline,
  t,
  paletteIndex = 0,
  className = "h-48",
}: {
  possibilities: { energy: number; symmetry: number; curvature: number }[];
  timeline: { t: number; score: number }[];
  t: number;
  paletteIndex?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = ref.current!;
    const ctx = cvs.getContext("2d")!;
    const W = (cvs.width = cvs.clientWidth);
    const H = (cvs.height = cvs.clientHeight);

    // Background gradient inspired by multiverse palettes
    const pal = PALETTES[paletteIndex % PALETTES.length];
    const grad = ctx.createLinearGradient(0, 0, W, H);
    pal.forEach((c, i) => grad.addColorStop(i / (pal.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Golden spiral particles (Φ fluctuations)
    const golden = Math.PI * (3 - Math.sqrt(5));
    possibilities.forEach((p, i) => {
      const r = 20 + p.energy * 60 + 2 * Math.sin(t * 0.05 + i);
      const ang = i * golden + t * 0.02 + p.symmetry * 4;
      const x = W / 2 + r * Math.cos(ang);
      const y = H / 2 + r * Math.sin(ang);
      const hue = (p.energy * 180 + p.symmetry * 180) % 360;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${hue},80%,60%,0.85)`;
      ctx.shadowColor = `hsla(${hue},100%,70%,0.9)`;
      ctx.shadowBlur = 10;
      ctx.arc(x, y, 2 + 2 * Math.abs(p.curvature), 0, Math.PI * 2);
      ctx.fill();
    });

    // ε event pulses
    ctx.shadowBlur = 0;
    for (const e of timeline.slice(-8)) {
      const phase = (t - e.t) * 0.05;
      if (phase < 0) continue; // ignore events from future frames after resume
      const alpha = Math.max(0, 0.6 - phase * 0.08);
      if (alpha <= 0) continue;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1 + 2 * (1 - alpha);
      const cx = (e.score * 997) % W;
      const cy = (e.score * 661) % H;
      ctx.beginPath();
      const radius = 12 + phase * 12;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [possibilities, timeline, t, paletteIndex]);

  return <canvas ref={ref} className={`w-full rounded-xl ${className}`} />;
}

