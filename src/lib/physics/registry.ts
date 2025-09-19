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
  'human-behavior-mechanisms': {
    id: 'human-behavior-mechanisms',
    name: 'Mecanismos del comportamiento humano',
    description:
      'Integra cooperación social, vínculos afectivos y estímulos neuromarketing bajo límites atencionales y éticos.',
    inputs: {
      cooperationBias: {
        label: 'Cooperation Bias',
        description: 'Inclinación basal hacia cooperación frente a conflicto.',
        unit: 'probability',
        default: 0.55,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      networkDensity: {
        label: 'Network Density',
        description: 'Factor normalizado de conectividad/topología social.',
        unit: 'dimensionless',
        default: 0.35,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      cognitiveLoad: {
        label: 'Cognitive Load',
        description: 'Saturación atencional que limita la difusión.',
        unit: 'fraction',
        default: 0.4,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      oxytocinLevel: {
        label: 'Oxytocin Level',
        description: 'Respuesta neurobiológica asociada al apego.',
        unit: 'pmol/L',
        default: 85,
        constraints: { min: 0, max: 200 },
      },
      trustIndex: {
        label: 'Trust Index',
        description: 'Nivel de confianza/compromiso percibido.',
        unit: 'probability',
        default: 0.65,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      privacyRisk: {
        label: 'Privacy Risk',
        description: 'Presión sobre límites de privacidad y consentimiento.',
        unit: 'fraction',
        default: 0.25,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      stimulusFrequency: {
        label: 'Stimulus Frequency',
        description: 'Cadencia de presentación de estímulos persuasivos.',
        unit: 'Hz',
        default: 2,
        constraints: { min: 0, max: 10, step: 0.1 },
      },
      sessionDuration: {
        label: 'Session Duration',
        description: 'Duración de la interacción o campaña.',
        unit: 'minutes',
        default: 35,
        constraints: { min: 5, max: 180, step: 1 },
      },
      ethicalCompliance: {
        label: 'Ethical Compliance',
        description: 'Cumplimiento con lineamientos éticos y legales.',
        unit: 'fraction',
        default: 0.6,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'reactionless-propulsion': {
    id: 'reactionless-propulsion',
    name: 'Reactionless Propulsion (Not Permitted)',
    description:
      'Control scenario that enforces momentum conservation in closed systems.',
    inputs: {
      momentumDemand: {
        label: 'Momentum Demand',
        description: 'Target momentum change without reaction mass.',
        unit: 'N·s',
        default: 0,
        constraints: { min: 0, max: 1e4 },
      },
      energyInput: {
        label: 'Energy Input',
        description: 'Injected energy budget attempting to drive thrust.',
        unit: 'kJ',
        default: 0,
        constraints: { min: 0, max: 1e5 },
      },
      systemClosure: {
        label: 'System Closure',
        description: 'Closure factor (1 = sistema cerrado, 0 = intercambio total).',
        unit: 'fraction',
        default: 1,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'external-propulsion': {
    id: 'external-propulsion',
    name: 'External Momentum Exchange Propulsion',
    description:
      'Evaluates sail/beam-driven propulsion obeying external momentum budgets.',
    inputs: {
      beamPower: {
        label: 'Beam Power',
        description: 'Power delivered by the external beam.',
        unit: 'MW',
        default: 5,
        constraints: { min: 0, max: 200 },
      },
      sailArea: {
        label: 'Sail Area',
        description: 'Effective area of the sail or magnetic scoop.',
        unit: 'm^2',
        default: 400,
        constraints: { min: 1, max: 1e4 },
      },
      momentumFlux: {
        label: 'Momentum Flux',
        description: 'Momentum flux exchanged with the external field.',
        unit: 'N/m^2',
        default: 0.25,
        constraints: { min: 0, max: 5, step: 0.01 },
      },
    },
  },
  'sports-prediction': {
    id: 'sports-prediction',
    name: 'Sports Outcome Prediction',
    description: 'Probabilistic sports prediction balancing variance and overfitting.',
    inputs: {
      priorVariance: {
        label: 'Prior Variance',
        description: 'Variance of prior performance distribution.',
        unit: 'dimensionless',
        default: 0.18,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      sampleSize: {
        label: 'Sample Size',
        description: 'Number of historical games/observations.',
        unit: 'count',
        default: 32,
        constraints: { min: 1, max: 500, integer: true },
      },
      injuryUncertainty: {
        label: 'Injury/Morale Uncertainty',
        description: 'Estimated uncertainty due to injuries or morale swings.',
        unit: 'probability',
        default: 0.22,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'sports-climate': {
    id: 'sports-climate',
    name: 'Sports Performance vs Climate',
    description: 'Thermal and fluid-dynamics impacts on human performance.',
    inputs: {
      ambientTemperature: {
        label: 'Ambient Temperature',
        description: 'Ambient temperature during performance.',
        unit: '°C',
        default: 22,
        constraints: { min: -30, max: 50, step: 0.5 },
      },
      humidity: {
        label: 'Relative Humidity',
        description: 'Relative humidity affecting heat exchange.',
        unit: '%',
        default: 60,
        constraints: { min: 0, max: 100, step: 1 },
      },
      acclimatization: {
        label: 'Acclimatization Level',
        description: 'Fractional acclimatization or cooling strategies.',
        unit: 'fraction',
        default: 0.55,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'climate-error-learning': {
    id: 'climate-error-learning',
    name: 'Climate Error Learning',
    description: 'Error-learning feedbacks for climate prediction improvements.',
    inputs: {
      observationResolution: {
        label: 'Observation Resolution',
        description: 'Spatial resolution of observations assimilated.',
        unit: 'km',
        default: 60,
        constraints: { min: 1, max: 500, step: 1 },
      },
      modelOrder: {
        label: 'Model Order',
        description: 'Order/complexity of the predictive model.',
        unit: 'dimensionless',
        default: 4,
        constraints: { min: 1, max: 10, integer: true },
      },
      errorMemory: {
        label: 'Error Memory',
        description: 'Weighting of past errors in learning updates.',
        unit: 'fraction',
        default: 0.45,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'meta-learning': {
    id: 'meta-learning',
    name: 'Meta-Learning for Butterfly Control',
    description: 'Meta-learning controllers mitigating butterfly-effect instabilities.',
    inputs: {
      controlGain: {
        label: 'Control Gain',
        description: 'Feedback gain applied by the controller.',
        unit: 'dimensionless',
        default: 0.9,
        constraints: { min: 0, max: 5, step: 0.01 },
      },
      regularization: {
        label: 'Regularization Strength',
        description: 'Stabilizing regularization to prevent chaos amplification.',
        unit: 'fraction',
        default: 0.35,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      identifiability: {
        label: 'Identifiability Confidence',
        description: 'Confidence in system identification accuracy.',
        unit: 'fraction',
        default: 0.6,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'multidomain-integration': {
    id: 'multidomain-integration',
    name: 'Multidomain Φ→𝓛 Integration',
    description:
      'Shared formulations applied across domains with cross-validation and privacy budgets.',
    inputs: {
      domainsCount: {
        label: 'Domains Count',
        description: 'Number of domains sharing the formulation.',
        unit: 'count',
        default: 3,
        constraints: { min: 1, max: 12, integer: true },
      },
      scaleVariance: {
        label: 'Scale Variance',
        description: 'Variance between domain-specific scaling factors.',
        unit: '%',
        default: 12,
        constraints: { min: 0, max: 200, step: 0.5 },
      },
      privacyBudget: {
        label: 'Privacy Budget',
        description: 'Differential privacy/ethics budget allocated.',
        unit: 'ε',
        default: 0.25,
        constraints: { min: 0.05, max: 1, step: 0.01 },
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
