import React from "react";

export function LinePlot({ data }: { data: number[] }) {
  if (data.length < 2) {
    return <svg viewBox="0 0 100 100" className="w-full h-24 bg-slate-800 rounded-md" />;
  }
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${(1 - v) * 100}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full h-24 bg-slate-800 rounded-md" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#6cf" strokeWidth={2} />
    </svg>
  );
}
