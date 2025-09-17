import React, { useEffect, useMemo, useState } from "react";
import {
  PHYSICS_REGISTRY,
  getRegistryEntry,
  type ConstraintDefinition,
  type PhysicsRegistryEntry,
} from "../lib/physics/registry";
import { validateParams, type ValidationResult } from "../lib/physics/validators";
import { toEngine, type EngineAdapterResult } from "../lib/physics/adapters";
import { getPresetsForEntry, type PhysicsPreset } from "../lib/physics/presets";

type ParamsPanelProps = {
  onApplySuggestions: (result: EngineAdapterResult) => void;
  lastAppliedResult: EngineAdapterResult | null;
};

type ParamInputs = Record<string, string>;

const formatConstraintNumber = (value: number | undefined): string => {
  if (value === undefined) {
    return "N/D";
  }
  return Number.isInteger(value) ? value.toString() : value.toPrecision(6);
};

const formatBoolean = (value: boolean | undefined): string => {
  if (value === undefined) {
    return "N/D";
  }
  return value ? "Sí" : "No";
};

const formatSuggestionValue = (value: number | string | null): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toPrecision(6);
  }
  return value;
};

const buildDefaultInputs = (entry: PhysicsRegistryEntry): ParamInputs => {
  const defaults: ParamInputs = {};
  Object.entries(entry.inputs).forEach(([key, definition]) => {
    defaults[key] = definition.default.toString();
  });
  return defaults;
};

const sanitizeInputsFromResult = (entry: PhysicsRegistryEntry, result: ValidationResult): ParamInputs => {
  const sanitized: ParamInputs = {};
  Object.keys(entry.inputs).forEach((key) => {
    const value = result.params[key];
    sanitized[key] = value != null ? value.toString() : "";
  });
  return sanitized;
};

export function ParamsPanel({ onApplySuggestions, lastAppliedResult }: ParamsPanelProps) {
  const registryEntries = useMemo(() => Object.values(PHYSICS_REGISTRY), []);
  const [selectedEntryId, setSelectedEntryId] = useState(() => registryEntries[0]?.id ?? "");
  const selectedEntry = useMemo(() => {
    if (!selectedEntryId) {
      return registryEntries[0];
    }
    return getRegistryEntry(selectedEntryId) ?? registryEntries[0];
  }, [registryEntries, selectedEntryId]);

  const selectedEntryKey = selectedEntry?.id ?? "";
  const availablePresets = useMemo<readonly PhysicsPreset[]>(() => {
    if (!selectedEntryKey) {
      return [];
    }
    return getPresetsForEntry(selectedEntryKey);
  }, [selectedEntryKey]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    () => availablePresets[0]?.id ?? "",
  );
  const selectedPreset = useMemo<PhysicsPreset | null>(() => {
    if (!availablePresets.length) {
      return null;
    }
    return availablePresets.find((preset) => preset.id === selectedPresetId) ?? null;
  }, [availablePresets, selectedPresetId]);

  const [paramValues, setParamValues] = useState<ParamInputs>(() =>
    selectedEntry ? buildDefaultInputs(selectedEntry) : {},
  );
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }
    setParamValues(buildDefaultInputs(selectedEntry));
    setValidationResult(null);
    setWarnings([]);
  }, [selectedEntry]);

  useEffect(() => {
    setSelectedPresetId((current) => {
      if (!availablePresets.length) {
        return "";
      }
      const exists = availablePresets.some((preset) => preset.id === current);
      return exists ? current : availablePresets[0].id;
    });
  }, [availablePresets]);

  if (!selectedEntry) {
    return null;
  }

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    Object.entries(paramValues).forEach(([key, value]) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        payload[key] = undefined;
        return;
      }
      const numeric = Number(trimmed);
      payload[key] = Number.isFinite(numeric) ? numeric : trimmed;
    });
    return payload;
  };

  const handleValidate = () => {
    const raw = buildPayload();
    const result = validateParams(selectedEntry.id, raw);
    setValidationResult(result);
    setWarnings(result.warnings);
    setParamValues(sanitizeInputsFromResult(selectedEntry, result));
  };

  const handleApply = () => {
    const baseParams = validationResult?.params ?? buildPayload();
    const result = toEngine(selectedEntry.id, baseParams);
    setValidationResult({
      entryId: result.entryId,
      params: result.params,
      warnings: result.warnings,
    });
    setWarnings(result.warnings);
    const sanitizedParams = sanitizeInputsFromResult(selectedEntry, {
      entryId: result.entryId,
      params: result.params,
      warnings: result.warnings,
    });
    setParamValues(sanitizedParams);
    onApplySuggestions(result);
  };

  const handleLoadPreset = () => {
    if (!selectedPreset) {
      return;
    }
    const result = validateParams(selectedPreset.entryId, selectedPreset.params);
    setValidationResult(result);
    setWarnings(result.warnings);
    setParamValues(sanitizeInputsFromResult(selectedEntry, result));
  };

  const renderConstraintDetails = (constraints: ConstraintDefinition) => (
    <dl className="grid grid-cols-2 gap-3 text-xs text-slate-300 mt-2">
      <div>
        <dt className="uppercase tracking-wide text-slate-500">Mínimo</dt>
        <dd className="text-slate-200">{formatConstraintNumber(constraints.min)}</dd>
      </div>
      <div>
        <dt className="uppercase tracking-wide text-slate-500">Máximo</dt>
        <dd className="text-slate-200">{formatConstraintNumber(constraints.max)}</dd>
      </div>
      <div>
        <dt className="uppercase tracking-wide text-slate-500">Step</dt>
        <dd className="text-slate-200">{formatConstraintNumber(constraints.step)}</dd>
      </div>
      <div>
        <dt className="uppercase tracking-wide text-slate-500">Entero</dt>
        <dd className="text-slate-200">{formatBoolean(constraints.integer)}</dd>
      </div>
    </dl>
  );

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-5">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">Panel Φ–𝓛 (parámetros)</h2>
        <p className="text-sm text-slate-400">
          Selecciona un suceso Φ y ajusta sus parámetros antes de validar contra las limitantes 𝓛.
        </p>
        <div>
          <label htmlFor="phi-entry" className="text-sm font-medium text-slate-200">
            Suceso Φ
          </label>
          <select
            id="phi-entry"
            className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={selectedEntry.id}
            onChange={(event) => setSelectedEntryId(event.target.value)}
          >
            {registryEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-2">{selectedEntry.description}</p>
        </div>
        <div>
          <label htmlFor="phi-preset" className="text-sm font-medium text-slate-200">
            Preset
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              id="phi-preset"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedPreset?.id ?? ""}
              onChange={(event) => setSelectedPresetId(event.target.value)}
              disabled={availablePresets.length === 0}
            >
              {availablePresets.length === 0 ? (
                <option value="">Sin presets disponibles</option>
              ) : (
                availablePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLoadPreset}
              disabled={!selectedPreset}
            >
              Cargar preset
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {selectedPreset
              ? selectedPreset.description
              : "Selecciona un preset para precargar parámetros sugeridos."}
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Parámetros Φ</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(selectedEntry.inputs).map(([paramId, definition]) => {
            const inputId = `${selectedEntry.id}-${paramId}`;
            const min = definition.constraints.min;
            const max = definition.constraints.max;
            const step = definition.constraints.step ?? (definition.constraints.integer ? 1 : undefined);
            return (
              <div
                key={paramId}
                className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={inputId} className="text-sm font-medium text-slate-200">
                    {definition.label}
                  </label>
                  <span className="text-xs text-slate-400">
                    {definition.unit ?? "sin unidad"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{definition.description}</p>
                <input
                  id={inputId}
                  type="number"
                  inputMode="decimal"
                  value={paramValues[paramId] ?? ""}
                  onChange={(event) =>
                    setParamValues((prev) => ({ ...prev, [paramId]: event.target.value }))
                  }
                  min={min !== undefined ? min : undefined}
                  max={max !== undefined ? max : undefined}
                  step={step !== undefined ? step : "any"}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Limitantes (𝓛)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(selectedEntry.inputs).map(([paramId, definition]) => (
            <div
              key={`${paramId}-constraints`}
              className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-3"
            >
              <div className="text-sm font-medium text-slate-200">{definition.label}</div>
              {renderConstraintDetails(definition.constraints)}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">Validación</h3>
        {warnings.length === 0 ? (
          <p className="text-xs text-slate-400">Sin advertencias. Usa “Validar” para comprobar límites.</p>
        ) : (
          <ul className="space-y-1 text-xs text-amber-300">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`} className="bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
                {warning}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
          onClick={handleValidate}
        >
          Validar
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm"
          onClick={handleApply}
        >
          Aplicar al simulador (sugerencias)
        </button>
      </div>

      {lastAppliedResult && (
        <section className="space-y-3">
          <header className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-300">Sugerencias guardadas</h3>
            <p className="text-xs text-slate-400">
              Última aplicación para <span className="text-slate-200">{lastAppliedResult.entryId}</span>.
            </p>
          </header>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(lastAppliedResult.suggestions).map(([key, value]) => (
              <div
                key={key}
                className="bg-slate-900/50 border border-slate-800/50 rounded-xl px-3 py-2"
              >
                <div className="text-xs uppercase tracking-wide text-slate-500">{key}</div>
                <div className="text-base text-slate-100">{formatSuggestionValue(value)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
