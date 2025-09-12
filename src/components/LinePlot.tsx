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
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${(1 - (v - min) / range) * 100}`)
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
