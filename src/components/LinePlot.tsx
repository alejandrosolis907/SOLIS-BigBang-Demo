import React, { useEffect, useRef, useState } from "react";

type Snapshot = { t: number; energy: number; avgT: number };

export function LinePlot({
  snapshot,
  running,
  onHistory,
  color = "#39c0ba",
  className = "h-24 bg-slate-800",
}: {
  snapshot: Snapshot;
  running: boolean;
  onHistory?: (hist: number[]) => void;
  color?: string;
  className?: string;
}) {
  const [data, setData] = useState<number[]>([]);
  const lastT = useRef(0);

  useEffect(() => {
    if (!running) return; // keep last curve frozen when paused
    if (snapshot.t === 0) {
      setData([]);
      onHistory?.([]);
      lastT.current = 0;
      return;
    }
    if (snapshot.t === lastT.current) return; // no progress
    setData((arr) => {
      const next = [...arr.slice(-29), snapshot.energy];
      onHistory?.(next);
      return next;
    });
    lastT.current = snapshot.t;
  }, [snapshot, running, onHistory]);

  // if only a single sample exists, duplicate it so a horizontal line remains visible
  const plotData = data.length === 1 ? [...data, data[0]] : data;
  if (plotData.length < 2) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`w-full rounded-md ${className}`}
      />
    );
  }

  const min = Math.min(...plotData);
  const max = Math.max(...plotData);
  const mid = (min + max) / 2;
  const half = ((max - min) / 2 || 0.5) * 1.6;
  const lo = mid - half;
  const hi = mid + half;
  const range = hi - lo || 1;
  const points = plotData
    .map((v, i) => `${(i / (plotData.length - 1)) * 100},${(1 - (v - lo) / range) * 100}`)
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
