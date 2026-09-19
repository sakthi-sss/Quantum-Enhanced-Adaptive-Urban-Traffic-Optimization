// Mock QUBO/QAOA Optimization Engine
// Simulates the quantum-classical optimization pipeline for demo mode.
// Labeled clearly as simulation - does NOT claim real quantum execution.

import type { OptimizationResult, QUBOMatrix, QAOAResult, OptimizationStep, ClassicalBaseline } from '../types/optimization';
import type { Intersection } from '../types/traffic';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Build a simulated QUBO matrix from intersection state
export function buildQUBO(intersections: Intersection[]): QUBOMatrix {
  const vars = intersections.map((ix, i) => ({
    id: `x${i + 1}`,
    intersection: ix.id,
    description: `${ix.id} signal phase (0=EW_GREEN, 1=NS_GREEN)`,
    value: ix.currentSignal === 'NS_GREEN' ? 1 : 0 as 0 | 1,
    encoding: `Binary: x${i + 1} ∈ {0,1}`,
  }));

  const n = vars.length;
  const Q: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Diagonal: penalize high-congestion intersections for wrong signal phase
  // λ₁·density + λ₂·queue + λ₃·pedestrian_demand
  intersections.forEach((ix, i) => {
    const densityPenalty = (ix.density / 100) * 2.0;
    const queuePenalty = (ix.queueLength / ix.capacity) * 1.5;
    // Pedestrian penalty: high pedestrian demand → prefer shorter vehicle green (longer ped phase)
    // This penalizes setting the variable high (NS_GREEN) when pedestrian demand is high
    const pedestrianPenalty = ((ix.pedestrianDemand ?? 0) / 100) * 0.8;
    Q[i][i] = -(densityPenalty + queuePenalty + pedestrianPenalty);
  });

  // Off-diagonal: coupling between adjacent intersections (Ising-style ZZ interaction)
  const couplings: [number, number][] = [[0, 2], [1, 2], [2, 3], [2, 4], [4, 5]];
  couplings.forEach(([i, j]) => {
    const coupling = 0.5;
    Q[i][j] = coupling;
    Q[j][i] = coupling;
  });

  const objectiveValue = Q.reduce((sum, row, i) =>
    sum + row.reduce((s, v, j) => s + v * vars[i].value * vars[j].value, 0), 0);

  const avgPedestrianDemand = intersections.reduce((s, ix) => s + (ix.pedestrianDemand ?? 0), 0) / intersections.length;

  return {
    variables: vars,
    Q,
    offset: 0,
    objectiveValue,
    penaltyTerms: {
      waitingTime: intersections.reduce((s, ix) => s + ix.waitingTime, 0) / intersections.length,
      queueLength: intersections.reduce((s, ix) => s + ix.queueLength, 0),
      congestion: intersections.filter(ix => ix.congestionLevel === 'CRITICAL').length * 10,
      emergencyDelay: 0,
      fuel: 84,
      pedestrianDelay: Math.round(avgPedestrianDemand * 0.6),
    },
  };
}


// Simulate QAOA (p=2 layers) with Qiskit Aer (demo mode)
export function runQAOA(qubo: QUBOMatrix): QAOAResult {
  const n = qubo.variables.length;

  // Generate candidate configurations
  const configs: Array<{ config: string; cost: number; probability: number }> = [];
  const numCandidates = Math.min(2 ** n, 32);

  for (let mask = 0; mask < numCandidates; mask++) {
    const bits = mask.toString(2).padStart(n, '0');
    const x = bits.split('').map(Number);

    // Compute QUBO cost: x^T Q x
    let cost = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cost += qubo.Q[i][j] * x[i] * x[j];
      }
    }

    configs.push({ config: bits, cost, probability: 0 });
  }

  // Normalize probability (higher probability for lower cost after softmax)
  const minCost = Math.min(...configs.map(c => c.cost));
  const maxCost = Math.max(...configs.map(c => c.cost));
  const range = maxCost - minCost || 1;

  configs.forEach(c => {
    c.probability = Math.exp(-2 * (c.cost - minCost) / range);
  });
  const totalP = configs.reduce((s, c) => s + c.probability, 0);
  configs.forEach(c => { c.probability = c.probability / totalP; });
  configs.sort((a, b) => a.cost - b.cost);

  const best = configs[0];

  // Simulate convergence curve (QAOA iterative improvement)
  const iterations = 12;
  const convergence: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const progress = i / iterations;
    const noise = (Math.random() - 0.5) * 0.3;
    convergence.push(maxCost - (maxCost - best.cost) * Math.pow(progress, 0.7) + noise);
  }
  convergence.push(best.cost);

  return {
    bestConfig: best.config,
    bestCost: best.cost,
    allConfigs: configs.slice(0, 16),
    iterations,
    convergence,
    circuitDepth: 2 * 2 + 1,  // p=2 QAOA layers
    executionMode: 'DEMO_SIMULATION',
  };
}

// Apply QAOA solution to get signal configuration
export function applyQAOASolution(
  qaoa: QAOAResult,
  intersections: Intersection[]
): Record<string, { signal: string; greenDuration: number; reason: string }> {
  const bits = qaoa.bestConfig.split('').map(Number);
  const result: Record<string, { signal: string; greenDuration: number; reason: string }> = {};

  intersections.forEach((ix, i) => {
    const phase = bits[i];
    const signal = phase === 1 ? 'NS_GREEN' : 'EW_GREEN';
    const density = ix.density;
    // Compute green duration: base 25s + density-weighted extension
    const greenDuration = Math.round(25 + (density / 100) * 20);
    const reason = density > 75
      ? `High density (${density}%) — extended green for congestion relief`
      : density > 50
      ? `Moderate density (${density}%) — balanced signal timing applied`
      : `Low density (${density}%) — standard timing maintained`;

    result[ix.id] = { signal, greenDuration, reason };
  });

  return result;
}

// Classical baseline comparison
export function computeClassicalBaseline(intersections: Intersection[]): ClassicalBaseline {
  // Fixed timing: 30/30 NS/EW split
  const fixedWait = intersections.reduce((s, ix) => s + (ix.density / 100) * 55 + 15, 0) / intersections.length;
  const fixedQueue = intersections.reduce((s, ix) => s + Math.round(ix.queueLength * 1.25), 0);

  return {
    method: 'FIXED_TIMING',
    avgWaitingTime: Math.round(fixedWait),
    avgQueueLength: Math.round(fixedQueue / intersections.length),
    throughput: Math.round(65 - intersections.reduce((s, ix) => s + ix.density, 0) / intersections.length * 0.3),
    fuelEstimate: Math.round(fixedWait * 1.8),
    co2Estimate: Math.round(fixedWait * 2.1),
  };
}

// Full mock optimization pipeline with step-by-step progress
export async function runFullOptimization(
  intersections: Intersection[],
  onStep: (steps: OptimizationStep[]) => void
): Promise<OptimizationResult> {
  const steps: OptimizationStep[] = [
    { step: 1, label: 'Collecting SUMO Traffic State', detail: 'Reading vehicle counts, queue lengths, and signal states from simulation...', status: 'PENDING' },
    { step: 2, label: 'Building QUBO Formulation', detail: 'Encoding traffic decisions as binary optimization variables...', status: 'PENDING' },
    { step: 3, label: 'Initializing QAOA Circuit', detail: 'Configuring p=2 QAOA layers with 6 qubits...', status: 'PENDING' },
    { step: 4, label: 'Running Qiskit Aer Simulation', detail: 'Executing quantum circuit with 1024 shots (Demo Mode)...', status: 'PENDING' },
    { step: 5, label: 'Evaluating Candidate Configurations', detail: 'Ranking signal configurations by QUBO cost...', status: 'PENDING' },
    { step: 6, label: 'Selecting Best Configuration', detail: 'Applying hybrid classical post-processing...', status: 'PENDING' },
    { step: 7, label: 'Applying Signal Timings', detail: 'Sending optimized signal plan back to simulation...', status: 'PENDING' },
    { step: 8, label: 'Running Post-Optimization Simulation', detail: 'Measuring traffic improvement after signal changes...', status: 'PENDING' },
  ];

  const update = (i: number, status: OptimizationStep['status']) => {
    steps[i] = { ...steps[i], status };
    onStep([...steps]);
  };

  // Step 1
  update(0, 'RUNNING'); await sleep(800);
  update(0, 'DONE');

  // Step 2
  update(1, 'RUNNING'); await sleep(600);
  const qubo = buildQUBO(intersections);
  update(1, 'DONE');

  // Step 3
  update(2, 'RUNNING'); await sleep(700);
  update(2, 'DONE');

  // Step 4
  update(3, 'RUNNING'); await sleep(1200);
  const qaoa = runQAOA(qubo);
  update(3, 'DONE');

  // Step 5
  update(4, 'RUNNING'); await sleep(500);
  update(4, 'DONE');

  // Step 6
  update(5, 'RUNNING'); await sleep(400);
  const signalConfig = applyQAOASolution(qaoa, intersections);
  update(5, 'DONE');

  // Step 7
  update(6, 'RUNNING'); await sleep(600);
  update(6, 'DONE');

  // Step 8
  update(7, 'RUNNING'); await sleep(800);

  // Compute improvements
  const avgWaitBefore = intersections.reduce((s, ix) => s + ix.waitingTime, 0) / intersections.length;
  const avgQueueBefore = intersections.reduce((s, ix) => s + ix.queueLength, 0) / intersections.length;
  const throughputBefore = intersections.reduce((s, ix) => s + ix.throughput, 0) / intersections.length;

  const improvementFactor = 0.72 + Math.random() * 0.1;
  const avgWaitAfter = avgWaitBefore * improvementFactor;
  const avgQueueAfter = avgQueueBefore * (improvementFactor + 0.05);
  const throughputAfter = throughputBefore * (1 + (1 - improvementFactor) * 0.8);
  const fuelReduction = Math.round((1 - improvementFactor) * 100 * 0.9);
  const co2Reduction = Math.round(fuelReduction * 1.1);

  update(7, 'DONE');

  const classical = computeClassicalBaseline(intersections);

  return {
    id: `OPT-${Date.now()}`,
    timestamp: Date.now(),
    scenario: 'CURRENT',
    qubo,
    qaoa,
    signalConfig,
    improvements: {
      waitingTimeBefore: Math.round(avgWaitBefore),
      waitingTimeAfter: Math.round(avgWaitAfter),
      waitingTimeReduction: Math.round((1 - improvementFactor) * 100),
      queueBefore: Math.round(avgQueueBefore),
      queueAfter: Math.round(avgQueueAfter),
      queueReduction: Math.round((1 - improvementFactor - 0.05) * 100),
      throughputBefore: Math.round(throughputBefore),
      throughputAfter: Math.round(throughputAfter),
      fuelReductionPct: fuelReduction,
      co2ReductionPct: co2Reduction,
    },
    executionSteps: steps,
    classicalBaseline: classical,
  };
}
