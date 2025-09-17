import {
  getRegistryEntry,
  normalizeEntryId,
  PHYSICS_REGISTRY,
  PhysicsParameterDefinition,
} from './registry';

export interface ValidationResult {
  readonly entryId: string;
  readonly params: Record<string, number>;
  readonly warnings: string[];
}

const clamp = (value: number, min?: number, max?: number): number => {
  let result = value;
  if (typeof min === 'number' && result < min) {
    result = min;
  }
  if (typeof max === 'number' && result > max) {
    result = max;
  }
  return result;
};

const enforceStep = (value: number, step?: number): number => {
  if (!step || step <= 0) {
    return value;
  }
  const stepped = Math.round(value / step) * step;
  return Number(stepped.toPrecision(12));
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sanitizeValue = (
  key: string,
  incoming: unknown,
  definition: PhysicsParameterDefinition,
  warnings: string[],
): number => {
  const { default: fallback, constraints } = definition;
  if (!isFiniteNumber(incoming)) {
    warnings.push(`Parameter "${key}" is invalid; defaulting to ${fallback}.`);
    return fallback;
  }

  let value = incoming;

  if (constraints.integer) {
    const rounded = Math.round(value);
    if (rounded !== value) {
      warnings.push(`Parameter "${key}" rounded to nearest integer (${rounded}).`);
    }
    value = rounded;
  }

  const stepped = enforceStep(value, constraints.step);
  if (stepped !== value) {
    warnings.push(`Parameter "${key}" adjusted to respect step of ${constraints.step}.`);
    value = stepped;
  }

  const clamped = clamp(value, constraints.min, constraints.max);
  if (clamped !== value) {
    const range = `${
      typeof constraints.min === 'number' ? constraints.min : '-∞'
    } to ${typeof constraints.max === 'number' ? constraints.max : '∞'}`;
    warnings.push(`Parameter "${key}" clamped to range ${range}.`);
    value = clamped;
  }

  if (!Number.isFinite(value)) {
    warnings.push(`Parameter "${key}" resolved to a non-finite value; resetting to default.`);
    return fallback;
  }

  return value;
};

export const validateParams = (
  entryId: string,
  params: Record<string, unknown> = {},
): ValidationResult => {
  const normalizedId = normalizeEntryId(entryId);
  const entry = getRegistryEntry(entryId);

  if (!entry) {
    return {
      entryId: normalizedId,
      params: {},
      warnings: [`Unknown physics registry entry: ${entryId}.`],
    };
  }

  const sanitized: Record<string, number> = {};
  const warnings: string[] = [];

  Object.entries(entry.inputs).forEach(([key, definition]) => {
    const value = sanitizeValue(key, params?.[key], definition, warnings);
    sanitized[key] = value;
  });

  Object.keys(params ?? {}).forEach((key) => {
    if (!(key in entry.inputs)) {
      warnings.push(`Parameter "${key}" is not defined for entry ${entry.id}.`);
    }
  });

  return {
    entryId: entry.id,
    params: sanitized,
    warnings,
  };
};

export type RegistryParameterId = keyof typeof PHYSICS_REGISTRY;
