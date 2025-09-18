export interface ExperimentHints {
  readonly noise?: number | null;
  readonly damping?: number | null;
  readonly kernel?: string | null;
}

interface BaselineSnapshot {
  noise?: number;
  damping?: number;
  kernelMix?: number;
  preset?: string | null;
}

interface AppliedSnapshot {
  noise: number | null;
  damping: number | null;
  kernel: string | null;
}

interface BridgeRecord {
  baseline: BaselineSnapshot;
  applied: AppliedSnapshot;
}

const STATE_RECORD = new WeakMap<object, BridgeRecord>();

const KERNEL_HINT_MAP: Record<string, { preset?: string; kernelMix?: number; useBaselinePreset?: boolean }> = {
  gaussian: { preset: "smooth", kernelMix: 0 },
  lorentzian: { preset: "rigid", kernelMix: 1 },
  wave: { preset: "entropy", kernelMix: 0.5 },
  exponential: { preset: "smooth", kernelMix: 0.3 },
  adaptive: { kernelMix: 0.6, useBaselinePreset: true },
};

const NUMERIC_SETTERS: Record<string, readonly string[]> = {
  noise: ["setNoise", "setBoundaryNoise", "setBalance"],
  damping: ["setDamping", "setMu", "setFriction"],
  kernelMix: ["setKernelMix", "setBoundaryKernelMix"],
};

const NUMERIC_PROPERTIES: Record<string, readonly string[]> = {
  noise: ["drift", "noise", "boundaryNoise", "balance"],
  damping: ["mu", "damping", "friction"],
  kernelMix: ["kernelMix", "boundaryKernelMix"],
};

const STRING_SETTERS: Record<string, readonly string[]> = {
  kernel: ["setKernel", "setPreset", "setKernelPreset"],
};

const STRING_PROPERTIES: Record<string, readonly string[]> = {
  kernel: ["preset", "kernelPreset"],
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function callSetter(target: Record<string, unknown>, names: readonly string[], value: unknown): boolean {
  for (const name of names) {
    const candidate = target[name];
    if (typeof candidate === "function") {
      try {
        (candidate as (next: unknown) => void).call(target, value);
        return true;
      } catch (error) {
        // ignore setter errors to avoid breaking simulation loop
      }
    }
  }
  return false;
}

function assignNumeric(
  target: Record<string, unknown>,
  names: readonly string[],
  value: number | undefined,
): void {
  if (value === undefined) {
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(target, name)) {
        delete (target as Record<string, unknown>)[name];
        return;
      }
    }
    return;
  }
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(target, name)) {
      (target as Record<string, unknown>)[name] = value;
      return;
    }
  }
  if (names.length) {
    (target as Record<string, unknown>)[names[0]] = value;
  }
}

function assignString(
  target: Record<string, unknown>,
  names: readonly string[],
  value: string | undefined | null,
): void {
  if (!value) {
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(target, name)) {
        delete (target as Record<string, unknown>)[name];
        return;
      }
    }
    return;
  }
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(target, name)) {
      (target as Record<string, unknown>)[name] = value;
      return;
    }
  }
  if (names.length) {
    (target as Record<string, unknown>)[names[0]] = value;
  }
}

function updateNumericValue(
  state: Record<string, unknown>,
  kind: keyof typeof NUMERIC_SETTERS,
  value: number | undefined,
): void {
  const setters = NUMERIC_SETTERS[kind] ?? [];
  const properties = NUMERIC_PROPERTIES[kind] ?? [];
  if (value === undefined) {
    if (!callSetter(state, setters, undefined)) {
      assignNumeric(state, properties, undefined);
    }
    return;
  }
  if (!callSetter(state, setters, value)) {
    assignNumeric(state, properties, value);
  }
}

function updateStringValue(
  state: Record<string, unknown>,
  kind: keyof typeof STRING_SETTERS,
  value: string | null,
): void {
  const setters = STRING_SETTERS[kind] ?? [];
  const properties = STRING_PROPERTIES[kind] ?? [];
  if (!value) {
    if (!callSetter(state, setters, undefined)) {
      assignString(state, properties, undefined);
    }
    return;
  }
  if (!callSetter(state, setters, value)) {
    assignString(state, properties, value);
  }
}

function readNoise(state: Record<string, unknown>): number | undefined {
  if (isFiniteNumber(state.drift)) return state.drift;
  if (isFiniteNumber(state.noise)) return state.noise;
  if (isFiniteNumber(state.boundaryNoise)) return state.boundaryNoise;
  if (isFiniteNumber(state.balance)) return state.balance;
  return undefined;
}

function readDamping(state: Record<string, unknown>): number | undefined {
  if (isFiniteNumber(state.mu)) return state.mu;
  if (isFiniteNumber(state.damping)) return state.damping;
  if (isFiniteNumber(state.friction)) return state.friction;
  return undefined;
}

function readKernelMix(state: Record<string, unknown>): number | undefined {
  if (isFiniteNumber(state.kernelMix)) return state.kernelMix;
  if (isFiniteNumber(state.boundaryKernelMix)) return state.boundaryKernelMix;
  return undefined;
}

function readKernelPreset(state: Record<string, unknown>): string | undefined {
  if (typeof state.preset === "string" && state.preset) return state.preset;
  if (typeof state.kernelPreset === "string" && state.kernelPreset) return state.kernelPreset;
  return undefined;
}

function applyKernelMapping(
  state: Record<string, unknown>,
  kernel: string,
  baseline: BaselineSnapshot,
): void {
  const mapping = KERNEL_HINT_MAP[kernel];
  if (!mapping) return;

  if (typeof mapping.kernelMix === "number") {
    updateNumericValue(state, "kernelMix", clamp01(mapping.kernelMix));
  }

  if (mapping.preset) {
    updateStringValue(state, "kernel", mapping.preset);
  } else if (mapping.useBaselinePreset && baseline.preset) {
    updateStringValue(state, "kernel", baseline.preset);
  }
}

function ensureRecord(state: Record<string, unknown>): BridgeRecord {
  let record = STATE_RECORD.get(state);
  if (!record) {
    record = {
      baseline: {
        noise: readNoise(state),
        damping: readDamping(state),
        kernelMix: readKernelMix(state),
        preset: readKernelPreset(state) ?? null,
      },
      applied: { noise: null, damping: null, kernel: null },
    };
    STATE_RECORD.set(state, record);
  }
  return record;
}

function normalizeHints(hints: ExperimentHints | null | undefined): AppliedSnapshot {
  const noise = hints?.noise;
  const damping = hints?.damping;
  const kernel = hints?.kernel;
  return {
    noise: isFiniteNumber(noise) ? noise : null,
    damping: isFiniteNumber(damping) ? damping : null,
    kernel: typeof kernel === "string" && kernel.trim() ? kernel.trim().toLowerCase() : null,
  };
}

export function applyExperimentHints(
  state: Record<string, unknown> | null | undefined,
  hints: ExperimentHints | null | undefined,
): void {
  if (!state) return;

  const record = ensureRecord(state);
  const normalized = normalizeHints(hints);

  // Track baseline when no hint is active.
  if (normalized.noise === null && record.applied.noise === null) {
    record.baseline.noise = readNoise(state);
  }
  if (normalized.damping === null && record.applied.damping === null) {
    record.baseline.damping = readDamping(state);
  }
  if (normalized.kernel === null && record.applied.kernel === null) {
    record.baseline.kernelMix = readKernelMix(state);
    record.baseline.preset = readKernelPreset(state) ?? record.baseline.preset ?? null;
  }

  // Apply noise hint
  if (normalized.noise !== null) {
    if (record.applied.noise === null) {
      record.baseline.noise = readNoise(state);
    }
    if (record.applied.noise !== normalized.noise) {
      updateNumericValue(state, "noise", normalized.noise);
      record.applied.noise = normalized.noise;
    }
  } else if (record.applied.noise !== null) {
    updateNumericValue(state, "noise", record.baseline.noise);
    record.applied.noise = null;
  }

  // Apply damping hint
  if (normalized.damping !== null) {
    if (record.applied.damping === null) {
      record.baseline.damping = readDamping(state);
    }
    if (record.applied.damping !== normalized.damping) {
      updateNumericValue(state, "damping", clamp01(normalized.damping));
      record.applied.damping = normalized.damping;
    }
  } else if (record.applied.damping !== null) {
    updateNumericValue(state, "damping", record.baseline.damping);
    record.applied.damping = null;
  }

  // Apply kernel hint
  if (normalized.kernel) {
    if (record.applied.kernel === null) {
      record.baseline.kernelMix = readKernelMix(state);
      record.baseline.preset = readKernelPreset(state) ?? record.baseline.preset ?? null;
    }
    if (record.applied.kernel !== normalized.kernel) {
      applyKernelMapping(state, normalized.kernel, record.baseline);
      record.applied.kernel = normalized.kernel;
    }
  } else if (record.applied.kernel !== null) {
    updateNumericValue(state, "kernelMix", record.baseline.kernelMix);
    updateStringValue(state, "kernel", record.baseline.preset ?? null);
    record.applied.kernel = null;
  }
}
