export type AreaLawRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  perimeter: number;
  entropy: number;
};

export type RegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
};

export type AreaLawMetrics = {
  regions: AreaLawRegion[];
  perimeterFit: RegressionResult;
  areaFit: RegressionResult;
};

export type BoundaryEntropyArc = {
  start: number;
  end: number;
  indices: number[];
  entropy: number;
  centerX: number;
  centerY: number;
};

function shannonEntropy(values: number[]): number {
  let total = 0;
  for (const value of values) {
    const positive = value > 0 ? value : 0;
    total += positive;
  }
  if (!isFinite(total) || total <= 0) {
    return 0;
  }
  let entropy = 0;
  for (const value of values) {
    const positive = value > 0 ? value : 0;
    if (positive <= 0) continue;
    const p = positive / total;
    entropy -= p * Math.log(p);
  }
  return entropy;
}

function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0 };
  }
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let covXY = 0;
  let varX = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    covXY += dx * dy;
    varX += dx * dx;
    ssTot += dy * dy;
  }

  const slope = varX > 0 ? covXY / varX : 0;
  const intercept = meanY - slope * meanX;

  if (ssTot === 0) {
    return { slope, intercept, r2: 1 };
  }

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    const diff = ys[i] - predicted;
    ssRes += diff * diff;
  }

  const r2 = 1 - ssRes / ssTot;
  return { slope, intercept, r2: Number.isFinite(r2) ? r2 : 0 };
}

function collectRegionValues(
  field: ArrayLike<number>,
  grid: number,
  x: number,
  y: number,
  width: number,
  height: number,
): number[] {
  const values: number[] = [];
  for (let yy = y; yy < y + height; yy++) {
    for (let xx = x; xx < x + width; xx++) {
      const clampedX = Math.max(0, Math.min(grid - 1, xx));
      const clampedY = Math.max(0, Math.min(grid - 1, yy));
      values.push(field[clampedY * grid + clampedX] ?? 0);
    }
  }
  return values;
}

function buildSampleSizes(grid: number): number[] {
  const base = Math.max(4, Math.floor(grid / 6));
  const sizes = new Set<number>();
  for (let step = base; step <= grid; step += base) {
    sizes.add(Math.max(3, Math.min(grid, step)));
  }
  sizes.add(grid);
  sizes.add(Math.max(3, Math.floor(grid / 2)));
  sizes.add(Math.max(3, Math.floor(grid / 3)));
  sizes.add(Math.max(3, Math.floor(grid / 4)));
  return Array.from(sizes).filter((size) => size >= 3 && size <= grid).sort((a, b) => a - b);
}

type BoundarySample = {
  index: number;
  x: number;
  y: number;
};

function buildBoundarySamples(grid: number): BoundarySample[] {
  if (!Number.isFinite(grid) || grid <= 1) {
    return [];
  }
  const samples: BoundarySample[] = [];
  const limit = grid - 1;
  const push = (x: number, y: number) => {
    samples.push({ index: y * grid + x, x, y });
  };
  for (let x = 0; x <= limit; x++) {
    push(x, 0);
  }
  for (let y = 1; y < limit; y++) {
    push(limit, y);
  }
  if (limit > 0) {
    for (let x = limit; x >= 0; x--) {
      push(x, limit);
    }
    for (let y = limit - 1; y >= 1; y--) {
      push(0, y);
    }
  }
  return samples;
}

export function sampleBoundaryEntropy(
  field: ArrayLike<number>,
  grid: number,
  arcLength?: number,
): BoundaryEntropyArc[] {
  const boundary = buildBoundarySamples(grid);
  const count = boundary.length;
  if (count === 0) {
    return [];
  }
  const effectiveArc = Math.min(
    count,
    Math.max(3, arcLength ?? Math.floor(count / 12) || 3),
  );
  const stride = Math.max(1, Math.floor(effectiveArc / 2));
  const arcs: BoundaryEntropyArc[] = [];
  for (let start = 0; start < count; start += stride) {
    let sumX = 0;
    let sumY = 0;
    const indices: number[] = [];
    const values: number[] = [];
    for (let j = 0; j < effectiveArc; j++) {
      const sample = boundary[(start + j) % count];
      indices.push(sample.index);
      sumX += sample.x;
      sumY += sample.y;
      values.push(field[sample.index] ?? 0);
    }
    const entropy = shannonEntropy(values);
    arcs.push({
      start,
      end: (start + effectiveArc - 1 + count) % count,
      indices,
      entropy,
      centerX: sumX / effectiveArc,
      centerY: sumY / effectiveArc,
    });
  }
  arcs.sort((a, b) => b.entropy - a.entropy);
  return arcs;
}

export function computeAreaLaw(
  field: ArrayLike<number>,
  grid: number,
  sampleLimit = 128,
): AreaLawMetrics {
  if (!Number.isFinite(grid) || grid <= 0) {
    return {
      regions: [],
      perimeterFit: { slope: 0, intercept: 0, r2: 0 },
      areaFit: { slope: 0, intercept: 0, r2: 0 },
    };
  }

  const sizes = buildSampleSizes(grid);
  const regions: AreaLawRegion[] = [];

  for (const width of sizes) {
    for (const height of sizes) {
      if (width > grid || height > grid) continue;
      const strideX = Math.max(1, Math.floor(width / 2));
      const strideY = Math.max(1, Math.floor(height / 2));
      for (let y = 0; y <= grid - height; y += strideY) {
        for (let x = 0; x <= grid - width; x += strideX) {
          const values = collectRegionValues(field, grid, x, y, width, height);
          const entropy = shannonEntropy(values);
          regions.push({
            x,
            y,
            width,
            height,
            area: width * height,
            perimeter: 2 * (width + height),
            entropy,
          });
          if (regions.length >= sampleLimit) break;
        }
        if (regions.length >= sampleLimit) break;
      }
      if (regions.length >= sampleLimit) break;
    }
    if (regions.length >= sampleLimit) break;
  }

  if (regions.length === 0) {
    return {
      regions,
      perimeterFit: { slope: 0, intercept: 0, r2: 0 },
      areaFit: { slope: 0, intercept: 0, r2: 0 },
    };
  }

  const perimeters = regions.map((r) => r.perimeter);
  const areas = regions.map((r) => r.area);
  const entropies = regions.map((r) => r.entropy);

  const perimeterFit = linearRegression(perimeters, entropies);
  const areaFit = linearRegression(areas, entropies);

  return {
    regions,
    perimeterFit,
    areaFit,
  };
}

