import React, { useEffect, useRef, useState } from "react";
import type { Snapshot } from "./PhiCanvas";

export function LinePlot({
  snapshot,
  onHistory,
  color = "#39c0ba",
  className = "h-24 bg-slate-800",
}: {
  snapshot: Snapshot;
  onHistory?: (hist: number[]) => void;
  color?: string;
  className?: string;
}) {
  const [data, setData] = useState<number[]>([]);
  const lastT = useRef(0);

  useEffect(() => {
    if (snapshot.t === 0) {
      setData([]);
      onHistory?.([]);
      lastT.current = 0;
      return;
    }
    if (snapshot.t === lastT.current) return; // paused or no progress
    setData((arr) => {
      const next = [...arr.slice(-29), snapshot.energy];
      onHistory?.(next);
      return next;
    });
    lastT.current = snapshot.t;
  }, [snapshot, onHistory]);

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
  const mid = (min + max) / 2;
  const half = ((max - min) / 2 || 0.5) * 1.6;
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
