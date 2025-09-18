export interface ConstraintDefinition {
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  readonly step?: number;
}

export interface PhysicsParameterDefinition {
  readonly label: string;
  readonly description: string;
  readonly unit: string | null;
  readonly default: number;
  readonly constraints: ConstraintDefinition;
}

export interface PhysicsRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: Record<string, PhysicsParameterDefinition>;
}

export const normalizeEntryId = (entryId: string): string =>
  entryId.trim().toLowerCase().replace(/\s+/g, '-');

export const PHYSICS_REGISTRY: Record<string, PhysicsRegistryEntry> = {
  vacuum: {
    id: 'vacuum',
    name: 'Quantum Vacuum',
    description: 'Baseline configuration for vacuum fluctuation simulations.',
    inputs: {
      energyDensity: {
        label: 'Energy Density',
        description: 'Energy density of the vacuum state.',
        unit: 'J/m^3',
        default: 5e-10,
        constraints: { min: 0 },
      },
      fluctuationAmplitude: {
        label: 'Fluctuation Amplitude',
        description: 'Relative amplitude of vacuum fluctuations.',
        unit: 'dimensionless',
        default: 1,
        constraints: { min: 0, max: 20 },
      },
      correlationLength: {
        label: 'Correlation Length',
        description: 'Characteristic correlation length for fluctuations.',
        unit: 'm',
        default: 1e-12,
        constraints: { min: 0 },
      },
    },
  },
  tunneling: {
    id: 'tunneling',
    name: 'Quantum Tunneling',
    description: 'Parameters describing particle tunneling through a barrier.',
    inputs: {
      barrierHeight: {
        label: 'Barrier Height',
        description: 'Potential barrier height for tunneling calculations.',
        unit: 'eV',
        default: 0.5,
        constraints: { min: 0 },
      },
      barrierWidth: {
        label: 'Barrier Width',
        description: 'Spatial width of the potential barrier.',
        unit: 'nm',
        default: 0.3,
        constraints: { min: 0, max: 10 },
      },
      temperature: {
        label: 'Temperature',
        description: 'Ambient temperature influencing tunneling probability.',
        unit: 'K',
        default: 2,
        constraints: { min: 0 },
      },
    },
  },
  nuclear: {
    id: 'nuclear',
    name: 'Nuclear Fusion',
    description: 'Parameter space for nuclear fusion confinement studies.',
    inputs: {
      fusionRate: {
        label: 'Fusion Rate',
        description: 'Expected particle fusion events per second.',
        unit: '1/s',
        default: 1e6,
        constraints: { min: 0 },
      },
      confinementTime: {
        label: 'Confinement Time',
        description: 'Average particle confinement time.',
        unit: 's',
        default: 5,
        constraints: { min: 0 },
      },
      plasmaDensity: {
        label: 'Plasma Density',
        description: 'Mass density of the plasma.',
        unit: 'kg/m^3',
        default: 120,
        constraints: { min: 0 },
      },
    },
  },
  neutrino: {
    id: 'neutrino',
    name: 'Neutrino Oscillations',
    description: 'Parameters for neutrino flavor oscillation models.',
    inputs: {
      oscillationLength: {
        label: 'Oscillation Length',
        description: 'Characteristic oscillation length.',
        unit: 'km',
        default: 500,
        constraints: { min: 1 },
      },
      massSplitting: {
        label: 'Mass Splitting',
        description: 'Squared mass difference between neutrino states.',
        unit: 'eV^2',
        default: 7.5e-5,
        constraints: { min: 0 },
      },
      mixingAngle: {
        label: 'Mixing Angle',
        description: 'Flavor mixing angle.',
        unit: 'deg',
        default: 33,
        constraints: { min: 0, max: 90, step: 0.1 },
      },
    },
  },
  'star-formation': {
    id: 'star-formation',
    name: 'Star Formation',
    description: 'Macroscopic parameters driving star formation rates.',
    inputs: {
      gasDensity: {
        label: 'Gas Density',
        description: 'Density of the star-forming gas cloud.',
        unit: 'kg/m^3',
        default: 1e-20,
        constraints: { min: 0 },
      },
      turbulence: {
        label: 'Turbulence Velocity',
        description: 'Velocity dispersion within the gas.',
        unit: 'km/s',
        default: 10,
        constraints: { min: 0 },
      },
      metallicity: {
        label: 'Metallicity',
        description: 'Relative metallicity compared to solar.',
        unit: 'Z/Zsun',
        default: 0.02,
        constraints: { min: 0, max: 1 },
      },
    },
  },
};

export const getRegistryEntry = (
  entryId: string,
): PhysicsRegistryEntry | undefined => {
  const normalized = normalizeEntryId(entryId);
  return PHYSICS_REGISTRY[normalized];
};

export type PhysicsRegistry = typeof PHYSICS_REGISTRY;
