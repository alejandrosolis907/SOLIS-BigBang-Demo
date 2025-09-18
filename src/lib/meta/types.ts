export type MetaLearnerDomainId =
  | "social"
  | "affective"
  | "neuromarketing"
  | "reactionless"
  | "external-propulsion"
  | "sports"
  | "sports-climate"
  | "climate"
  | "meta"
  | "multidomain";

export type DomainEnforcementResult = {
  readonly values: Float32Array;
  readonly violations: number;
};

export interface MetaLearnerAdapter {
  readonly id: MetaLearnerDomainId;
  readonly label: string;
  readonly entryIds: readonly string[];
  readonly horizon: number;
  readonly alpha: number;
  readonly step: number;
  readonly maxCorrection: number;
  readonly minDenominator: number;
  readonly allow: boolean;
  readonly complianceLabel: string;
  readonly normalize: (value: number) => number;
  readonly denormalize: (value: number) => number;
  readonly enforce: (values: Float32Array) => DomainEnforcementResult;
}

export type MetaLearnerMetrics = {
  readonly entryId: string | null;
  readonly domainId: MetaLearnerDomainId | null;
  readonly domainLabel: string | null;
  readonly maeBefore: number | null;
  readonly maeAfter: number | null;
  readonly mapeBefore: number | null;
  readonly mapeAfter: number | null;
  readonly improvement: number | null;
  readonly constraintsOk: boolean | null;
  readonly clipped: boolean;
  readonly violations: number;
  readonly notes: readonly string[];
  readonly applied: boolean;
};

export type MetaLearnerOutcome = MetaLearnerMetrics & {
  readonly corrected: Float32Array | null;
  readonly original: Float32Array | null;
};

