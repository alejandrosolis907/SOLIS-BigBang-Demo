import React from "react";

export function LinePlot({
  data,
  color = "#39c0ba",
  className = "h-24 bg-slate-800",
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  if (data.length < 2) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`w-full rounded-md ${className}`}
      />
    );
  }
  // determine dynamic range and extend it by 60% so the waveform fits with
  // additional headroom when zoomed out
  const min = Math.min(...data);
  const max = Math.max(...data);
  const mid = (min + max) / 2;
  const half = ((max - min) / 2 || 0.5) * 1.6; // 60% zoom-out
  const lo = mid - half;
  const hi = mid + half;
  const range = hi - lo || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${(1 - (v - lo) / range) * 100}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full rounded-md ${className}`}
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}
