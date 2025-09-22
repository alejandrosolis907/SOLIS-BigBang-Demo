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
    name: 'Vacío cuántico',
    description: 'Configuración base para simulaciones de fluctuaciones del vacío.',
    inputs: {
      energyDensity: {
        label: 'Densidad de energía',
        description: 'Densidad de energía del estado de vacío.',
        unit: 'J/m^3',
        default: 5e-10,
        constraints: { min: 0 },
      },
      fluctuationAmplitude: {
        label: 'Amplitud de fluctuación',
        description: 'Amplitud relativa de las fluctuaciones del vacío.',
        unit: 'adimensional',
        default: 1,
        constraints: { min: 0, max: 20 },
      },
      correlationLength: {
        label: 'Longitud de correlación',
        description: 'Longitud de correlación característica de las fluctuaciones.',
        unit: 'm',
        default: 1e-12,
        constraints: { min: 0 },
      },
    },
  },
  tunneling: {
    id: 'tunneling',
    name: 'Efecto túnel cuántico',
    description: 'Parámetros que describen el túnel de partículas a través de una barrera.',
    inputs: {
      barrierHeight: {
        label: 'Altura de la barrera',
        description: 'Altura de la barrera potencial para los cálculos de túnel.',
        unit: 'eV',
        default: 0.5,
        constraints: { min: 0 },
      },
      barrierWidth: {
        label: 'Ancho de la barrera',
        description: 'Ancho espacial de la barrera potencial.',
        unit: 'nm',
        default: 0.3,
        constraints: { min: 0, max: 10 },
      },
      temperature: {
        label: 'Temperatura',
        description: 'Temperatura ambiente que influye en la probabilidad de túnel.',
        unit: 'K',
        default: 2,
        constraints: { min: 0 },
      },
    },
  },
  nuclear: {
    id: 'nuclear',
    name: 'Fusión nuclear',
    description: 'Espacio de parámetros para estudios de confinamiento de fusión nuclear.',
    inputs: {
      fusionRate: {
        label: 'Tasa de fusión',
        description: 'Eventos de fusión de partículas esperados por segundo.',
        unit: '1/s',
        default: 1e6,
        constraints: { min: 0 },
      },
      confinementTime: {
        label: 'Tiempo de confinamiento',
        description: 'Tiempo de confinamiento promedio de partículas.',
        unit: 's',
        default: 5,
        constraints: { min: 0 },
      },
      plasmaDensity: {
        label: 'Densidad de plasma',
        description: 'Densidad de masa del plasma.',
        unit: 'kg/m^3',
        default: 120,
        constraints: { min: 0 },
      },
    },
  },
  neutrino: {
    id: 'neutrino',
    name: 'Oscilaciones de neutrinos',
    description: 'Parámetros para modelos de oscilación de sabor de neutrinos.',
    inputs: {
      oscillationLength: {
        label: 'Longitud de oscilación',
        description: 'Longitud característica de oscilación.',
        unit: 'km',
        default: 500,
        constraints: { min: 1 },
      },
      massSplitting: {
        label: 'Diferencia de masas',
        description: 'Diferencia de masas al cuadrado entre estados de neutrino.',
        unit: 'eV^2',
        default: 7.5e-5,
        constraints: { min: 0 },
      },
      mixingAngle: {
        label: 'Ángulo de mezcla',
        description: 'Ángulo de mezcla de sabores.',
        unit: 'deg',
        default: 33,
        constraints: { min: 0, max: 90, step: 0.1 },
      },
    },
  },
  'star-formation': {
    id: 'star-formation',
    name: 'Formación estelar',
    description: 'Parámetros macroscópicos que impulsan las tasas de formación estelar.',
    inputs: {
      gasDensity: {
        label: 'Densidad de gas',
        description: 'Densidad de la nube de gas que forma estrellas.',
        unit: 'kg/m^3',
        default: 1e-20,
        constraints: { min: 0 },
      },
      turbulence: {
        label: 'Velocidad turbulenta',
        description: 'Dispersión de velocidad dentro del gas.',
        unit: 'km/s',
        default: 10,
        constraints: { min: 0 },
      },
      metallicity: {
        label: 'Metallicidad',
        description: 'Metallicidad relativa comparada con la solar.',
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
        label: 'Sesgo de cooperación',
        description: 'Inclinación basal hacia cooperación frente a conflicto.',
        unit: 'probabilidad',
        default: 0.55,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      networkDensity: {
        label: 'Densidad de red',
        description: 'Factor normalizado de conectividad/topología social.',
        unit: 'adimensional',
        default: 0.35,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      cognitiveLoad: {
        label: 'Carga cognitiva',
        description: 'Saturación atencional que limita la difusión.',
        unit: 'fracción',
        default: 0.4,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      oxytocinLevel: {
        label: 'Nivel de oxitocina',
        description: 'Respuesta neurobiológica asociada al apego.',
        unit: 'pmol/L',
        default: 85,
        constraints: { min: 0, max: 200 },
      },
      trustIndex: {
        label: 'Índice de confianza',
        description: 'Nivel de confianza/compromiso percibido.',
        unit: 'probabilidad',
        default: 0.65,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      privacyRisk: {
        label: 'Riesgo de privacidad',
        description: 'Presión sobre límites de privacidad y consentimiento.',
        unit: 'fracción',
        default: 0.25,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      stimulusFrequency: {
        label: 'Frecuencia de estímulo',
        description: 'Cadencia de presentación de estímulos persuasivos.',
        unit: 'Hz',
        default: 2,
        constraints: { min: 0, max: 10, step: 0.1 },
      },
      sessionDuration: {
        label: 'Duración de la sesión',
        description: 'Duración de la interacción o campaña.',
        unit: 'minutos',
        default: 35,
        constraints: { min: 5, max: 180, step: 1 },
      },
      ethicalCompliance: {
        label: 'Cumplimiento ético',
        description: 'Cumplimiento con lineamientos éticos y legales.',
        unit: 'fracción',
        default: 0.6,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'reactionless-propulsion': {
    id: 'reactionless-propulsion',
    name: 'Propulsión sin eyección de masa (no permitida)',
    description:
      'Escenario de control que refuerza la conservación del momento en sistemas cerrados.',
    inputs: {
      momentumDemand: {
        label: 'Demanda de momento',
        description: 'Cambio de momento objetivo sin masa de reacción.',
        unit: 'N·s',
        default: 0,
        constraints: { min: 0, max: 1e4 },
      },
      energyInput: {
        label: 'Energía inyectada',
        description: 'Presupuesto de energía inyectada que intenta generar empuje.',
        unit: 'kJ',
        default: 0,
        constraints: { min: 0, max: 1e5 },
      },
      systemClosure: {
        label: 'Cierre del sistema',
        description: 'Factor de cierre (1 = sistema cerrado, 0 = intercambio total).',
        unit: 'fracción',
        default: 1,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'external-propulsion': {
    id: 'external-propulsion',
    name: 'Propulsión con intercambio externo de momento',
    description:
      'Evalúa propulsión por vela o haz que respeta presupuestos externos de momento.',
    inputs: {
      beamPower: {
        label: 'Potencia del haz',
        description: 'Potencia entregada por el haz externo.',
        unit: 'MW',
        default: 5,
        constraints: { min: 0, max: 200 },
      },
      sailArea: {
        label: 'Área de la vela',
        description: 'Área efectiva de la vela o del colector magnético.',
        unit: 'm^2',
        default: 400,
        constraints: { min: 1, max: 1e4 },
      },
      momentumFlux: {
        label: 'Flujo de momento',
        description: 'Flujo de momento intercambiado con el campo externo.',
        unit: 'N/m^2',
        default: 0.25,
        constraints: { min: 0, max: 5, step: 0.01 },
      },
    },
  },
  'sports-prediction': {
    id: 'sports-prediction',
    name: 'Predicción de resultados deportivos',
    description: 'Predicción deportiva probabilística que equilibra varianza y sobreajuste.',
    inputs: {
      priorVariance: {
        label: 'Varianza previa',
        description: 'Varianza de la distribución de desempeño previa.',
        unit: 'adimensional',
        default: 0.18,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      sampleSize: {
        label: 'Tamaño de muestra',
        description: 'Número de partidos u observaciones históricas.',
        unit: 'conteo',
        default: 32,
        constraints: { min: 1, max: 500, integer: true },
      },
      injuryUncertainty: {
        label: 'Incertidumbre por lesiones/moral',
        description: 'Incertidumbre estimada por lesiones o variaciones de moral.',
        unit: 'probabilidad',
        default: 0.22,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'sports-climate': {
    id: 'sports-climate',
    name: 'Desempeño deportivo vs clima',
    description: 'Impactos térmicos y de dinámica de fluidos sobre el desempeño humano.',
    inputs: {
      ambientTemperature: {
        label: 'Temperatura ambiente',
        description: 'Temperatura ambiente durante el desempeño.',
        unit: '°C',
        default: 22,
        constraints: { min: -30, max: 50, step: 0.5 },
      },
      humidity: {
        label: 'Humedad relativa',
        description: 'Humedad relativa que afecta el intercambio de calor.',
        unit: '%',
        default: 60,
        constraints: { min: 0, max: 100, step: 1 },
      },
      acclimatization: {
        label: 'Nivel de aclimatación',
        description: 'Aclimatación fraccional o estrategias de enfriamiento.',
        unit: 'fracción',
        default: 0.55,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'climate-error-learning': {
    id: 'climate-error-learning',
    name: 'Aprendizaje de errores climáticos',
    description: 'Retroalimentaciones de aprendizaje de errores para mejorar la predicción climática.',
    inputs: {
      observationResolution: {
        label: 'Resolución de observación',
        description: 'Resolución espacial de las observaciones asimiladas.',
        unit: 'km',
        default: 60,
        constraints: { min: 1, max: 500, step: 1 },
      },
      modelOrder: {
        label: 'Orden del modelo',
        description: 'Orden o complejidad del modelo predictivo.',
        unit: 'adimensional',
        default: 4,
        constraints: { min: 1, max: 10, integer: true },
      },
      errorMemory: {
        label: 'Memoria del error',
        description: 'Ponderación de errores pasados en las actualizaciones de aprendizaje.',
        unit: 'fracción',
        default: 0.45,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'meta-learning': {
    id: 'meta-learning',
    name: 'Meta-aprendizaje para controlar el efecto mariposa',
    description: 'Controladores de meta-aprendizaje que mitigan inestabilidades del efecto mariposa.',
    inputs: {
      controlGain: {
        label: 'Ganancia de control',
        description: 'Ganancia de retroalimentación aplicada por el controlador.',
        unit: 'adimensional',
        default: 0.9,
        constraints: { min: 0, max: 5, step: 0.01 },
      },
      regularization: {
        label: 'Intensidad de regularización',
        description: 'Regularización estabilizadora para evitar la amplificación del caos.',
        unit: 'fracción',
        default: 0.35,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
      identifiability: {
        label: 'Confianza de identificabilidad',
        description: 'Confianza en la precisión de la identificación del sistema.',
        unit: 'fracción',
        default: 0.6,
        constraints: { min: 0, max: 1, step: 0.01 },
      },
    },
  },
  'multidomain-integration': {
    id: 'multidomain-integration',
    name: 'Integración multidominio Φ→𝓛',
    description:
      'Shared formulations applied across domains with cross-validation and privacy budgets.',
    inputs: {
      domainsCount: {
        label: 'Cantidad de dominios',
        description: 'Número de dominios que comparten la formulación.',
        unit: 'conteo',
        default: 3,
        constraints: { min: 1, max: 12, integer: true },
      },
      scaleVariance: {
        label: 'Varianza de escala',
        description: 'Varianza entre factores de escala específicos de cada dominio.',
        unit: '%',
        default: 12,
        constraints: { min: 0, max: 200, step: 0.5 },
      },
      privacyBudget: {
        label: 'Presupuesto de privacidad',
        description: 'Presupuesto asignado de privacidad diferencial y ética.',
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
