export interface SearchSource {
  title: string;
  uri: string;
}

export interface ResearchResult {
  markdown: string;
  sources: SearchSource[];
}

export interface SimulationParams {
  beta0: number; // Intercept
  beta1: number; // Feedback coefficient
  steps: number;
  initialValue: number;
  threshold: number;
  numTrials: number; // Batch size for Monte Carlo
}

export interface SimulationDataPoint {
  t: number;
  Xt: number;
  lambda: number;
  runningMean: number; // Sn/n
  isRare?: boolean;
}

export interface BatchResult {
  estimatedProb: number;
  variance: number;
  confidenceInterval: [number, number];
  totalHits: number;
  effectiveSampleSize?: number;
}