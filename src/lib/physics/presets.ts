import { normalizeEntryId } from "./registry";

export interface PhysicsPreset {
  readonly id: string;
  readonly entryId: string;
  readonly name: string;
  readonly description: string;
  readonly params: Record<string, number>;
}

interface PhysicsPresetDefinition {
  readonly id: string;
  readonly entryId: string;
  readonly name: string;
  readonly description: string;
  readonly params: Record<string, number>;
}

const definePreset = (definition: PhysicsPresetDefinition): PhysicsPreset => ({
  ...definition,
  entryId: normalizeEntryId(definition.entryId),
});

const PRESET_DEFINITIONS: readonly PhysicsPresetDefinition[] = [
  {
    id: "vacuum_lab_low",
    entryId: "vacuum",
    name: "Vacío de laboratorio (bajo ruido)",
    description:
      "Condiciones representativas de cámaras de vacío experimentales con fluctuaciones moderadas.",
    params: {
      energyDensity: 2e-10,
      fluctuationAmplitude: 0.8,
      correlationLength: 5e-13,
    },
  },
  {
    id: "vacuum_cosmic_baseline",
    entryId: "vacuum",
    name: "Vacío cósmico (basal)",
    description:
      "Configuración alineada con la densidad de energía promedio del vacío cosmológico.",
    params: {
      energyDensity: 5e-10,
      fluctuationAmplitude: 1.5,
      correlationLength: 2e-12,
    },
  },
  {
    id: "vacuum_high_fluctuation",
    entryId: "vacuum",
    name: "Vacío excitado (alta fluctuación)",
    description:
      "Escenario para analizar estados con amplitudes de fluctuación elevadas y correlación extendida.",
    params: {
      energyDensity: 8e-10,
      fluctuationAmplitude: 9.5,
      correlationLength: 8e-12,
    },
  },
  {
    id: "tunnel_electron_nm",
    entryId: "tunneling",
    name: "Túnel electrón (nanoestructura)",
    description:
      "Modelo para electrones atravesando barreras nanométricas a temperatura criogénica.",
    params: {
      barrierHeight: 0.25,
      barrierWidth: 1,
      temperature: 4,
    },
  },
  {
    id: "tunnel_superconductor_gap",
    entryId: "tunneling",
    name: "Brecha superconductora",
    description:
      "Ajustes para estudiar túnel a través de brechas superconductoras con barreras delgadas.",
    params: {
      barrierHeight: 1.4,
      barrierWidth: 0.45,
      temperature: 0.3,
    },
  },
  {
    id: "tunnel_quantum_dot",
    entryId: "tunneling",
    name: "Punto cuántico activo",
    description:
      "Parámetros típicos de tunelamiento en puntos cuánticos operando a temperatura intermedia.",
    params: {
      barrierHeight: 0.8,
      barrierWidth: 2.5,
      temperature: 25,
    },
  },
  {
    id: "fusion_tokamak_startup",
    entryId: "nuclear",
    name: "Tokamak (fase de arranque)",
    description:
      "Escenario para plasma confinado magnéticamente durante las primeras fases de ignición.",
    params: {
      fusionRate: 2e5,
      confinementTime: 1.5,
      plasmaDensity: 80,
    },
  },
  {
    id: "fusion_core_sunlike",
    entryId: "nuclear",
    name: "Núcleo estelar tipo solar",
    description:
      "Aproximación de condiciones centrales para estrellas semejantes al Sol.",
    params: {
      fusionRate: 4e26,
      confinementTime: 0.2,
      plasmaDensity: 150,
    },
  },
  {
    id: "fusion_inertial_pulse",
    entryId: "nuclear",
    name: "Pulso de confinamiento inercial",
    description:
      "Perfil para cápsulas de fusión con confinamiento por láser de corta duración.",
    params: {
      fusionRate: 5e8,
      confinementTime: 5e-4,
      plasmaDensity: 520,
    },
  },
  {
    id: "neutrino_solar_baseline",
    entryId: "neutrino",
    name: "Oscilaciones solares",
    description:
      "Parámetros estándar para el análisis de neutrinos provenientes del Sol.",
    params: {
      oscillationLength: 1.496e5,
      massSplitting: 7.4e-5,
      mixingAngle: 33,
    },
  },
  {
    id: "neutrino_reactor_short",
    entryId: "neutrino",
    name: "Reactor (corto alcance)",
    description:
      "Condiciones para experimentos de neutrinos de reactor a baselines cortos.",
    params: {
      oscillationLength: 1.5,
      massSplitting: 2.4e-3,
      mixingAngle: 8.5,
    },
  },
  {
    id: "neutrino_atmospheric_long",
    entryId: "neutrino",
    name: "Atmosféricos (larga distancia)",
    description:
      "Configuración para trayectorias largas en oscilaciones atmosféricas.",
    params: {
      oscillationLength: 1e3,
      massSplitting: 2.5e-3,
      mixingAngle: 45,
    },
  },
  {
    id: "starcloud_quiescent",
    entryId: "star-formation",
    name: "Nube molecular tranquila",
    description:
      "Parámetros para regiones con formación estelar débil y turbulencia reducida.",
    params: {
      gasDensity: 5e-21,
      turbulence: 5,
      metallicity: 0.015,
    },
  },
  {
    id: "starburst_dwarf",
    entryId: "star-formation",
    name: "Brotes estelares en enanas",
    description:
      "Modelo para galaxias enanas con episodios intensos de formación estelar.",
    params: {
      gasDensity: 8e-20,
      turbulence: 20,
      metallicity: 0.005,
    },
  },
  {
    id: "giant_molecular_core",
    entryId: "star-formation",
    name: "Núcleo molecular gigante",
    description:
      "Condiciones densas típicas de núcleos masivos en vías de colapso.",
    params: {
      gasDensity: 2e-19,
      turbulence: 12,
      metallicity: 0.03,
    },
  },
] as const;

const presetsByEntry: Record<string, PhysicsPreset[]> = {};
const presetIndex: Record<string, PhysicsPreset> = {};

PRESET_DEFINITIONS.forEach((definition) => {
  const preset = definePreset(definition);
  if (!presetsByEntry[preset.entryId]) {
    presetsByEntry[preset.entryId] = [];
  }
  presetsByEntry[preset.entryId].push(preset);
  presetIndex[preset.id] = preset;
});

Object.values(presetsByEntry).forEach((presets) => {
  presets.sort((a, b) => a.name.localeCompare(b.name, "es"));
});

export const PHYSICS_PRESETS: Record<string, readonly PhysicsPreset[]> = presetsByEntry;

export const getPresetsForEntry = (entryId: string): readonly PhysicsPreset[] => {
  const normalized = normalizeEntryId(entryId);
  return PHYSICS_PRESETS[normalized] ?? [];
};

export const getPresetById = (presetId: string): PhysicsPreset | undefined =>
  presetIndex[presetId];
