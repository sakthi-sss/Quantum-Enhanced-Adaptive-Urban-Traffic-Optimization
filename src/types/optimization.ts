// Optimization Types: QUBO, QAOA, Hybrid

export interface QUBOVariable {
  id: string;
  intersection: string;
  description: string;
  value: 0 | 1;
  encoding: string;
}

export interface QUBOMatrix {
  variables: QUBOVariable[];
  Q: number[][];           // QUBO matrix Q[i][j]
  offset: number;
  objectiveValue: number;
  penaltyTerms: {
    waitingTime: number;
    queueLength: number;
    congestion: number;
    emergencyDelay: number;
    fuel: number;
    pedestrianDelay?: number;  // Added: pedestrian demand penalty
  };
}

export interface QAOAParameters {
  numQubits: number;
  numLayers: number;       // p layers
  gammaAngles: number[];   // mixing angles
  betaAngles: number[];    // phase separation angles
  shots: number;           // measurement shots
  backend: string;
}

export interface QAOAResult {
  bestConfig: string;      // binary string e.g. "010110"
  bestCost: number;
  allConfigs: Array<{
    config: string;
    cost: number;
    probability: number;
  }>;
  iterations: number;
  convergence: number[];   // cost per iteration
  circuitDepth: number;
  executionMode: 'QISKIT_AER' | 'DEMO_SIMULATION';
}

export interface OptimizationResult {
  id: string;
  timestamp: number;
  scenario: string;
  qubo: QUBOMatrix;
  qaoa: QAOAResult;
  signalConfig: Record<string, {
    signal: string;
    greenDuration: number;
    reason: string;
  }>;
  improvements: {
    waitingTimeBefore: number;
    waitingTimeAfter: number;
    waitingTimeReduction: number;
    queueBefore: number;
    queueAfter: number;
    queueReduction: number;
    throughputBefore: number;
    throughputAfter: number;
    fuelReductionPct: number;
    co2ReductionPct: number;
  };
  executionSteps: OptimizationStep[];
  classicalBaseline?: ClassicalBaseline;
}

export interface OptimizationStep {
  step: number;
  label: string;
  detail: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
  duration?: number;
}

export interface ClassicalBaseline {
  method: 'FIXED_TIMING' | 'RULE_BASED';
  avgWaitingTime: number;
  avgQueueLength: number;
  throughput: number;
  fuelEstimate: number;
  co2Estimate: number;
}

export interface DecisionExplanation {
  intersection: string;
  change: string;
  reasons: string[];
  metrics: {
    densityBefore: number;
    densityAfter: number;
    queueBefore: number;
    queueAfter: number;
    waitBefore: number;
    waitAfter: number;
  };
  plainEnglish: string;
}
