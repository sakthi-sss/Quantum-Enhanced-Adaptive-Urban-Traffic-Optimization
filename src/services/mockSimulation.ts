// Mock SUMO Traffic Simulation Engine
// Provides realistic simulated traffic data when SUMO is unavailable.
// Clearly labeled as "Demo Simulation" throughout.

import { INTERSECTIONS, TRAFFIC_EDGES } from '../data/intersections';
import type { Intersection, TrafficState, TrafficEdge, SignalState, CongestionLevel } from '../types/traffic';
import type { ScenarioDefinition } from '../data/scenarios';

function getCongestionLevel(density: number): CongestionLevel {
  if (density >= 85) return 'CRITICAL';
  if (density >= 65) return 'HIGH';
  if (density >= 40) return 'MODERATE';
  return 'LOW';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Add realistic random noise to simulate traffic dynamics
function addNoise(value: number, scale: number = 0.05): number {
  return value + value * (Math.random() - 0.5) * scale;
}

// Simulate one time step of traffic evolution
export function simulateStep(
  intersections: Intersection[],
  edges: TrafficEdge[],
  optimized = false
): Intersection[] {
  return intersections.map(ix => {
    // Density drifts toward neighbors (traffic propagation)
    const neighbors = ix.connections
      .map(id => intersections.find(n => n.id === id))
      .filter(Boolean) as Intersection[];

    const avgNeighborDensity = neighbors.length > 0
      ? neighbors.reduce((s, n) => s + n.density, 0) / neighbors.length
      : ix.density;

    let newDensity = ix.density + (avgNeighborDensity - ix.density) * 0.08 + (Math.random() - 0.5) * 3;

    // Optimized signals reduce density
    if (optimized) {
      newDensity *= 0.92 + Math.random() * 0.05;
    }

    newDensity = clamp(newDensity, 5, 98);
    const newQueue = Math.round(clamp(addNoise(ix.queueLength, 0.1) * (optimized ? 0.88 : 1.0), 0, ix.capacity));
    const newWait = Math.round(clamp(addNoise(ix.waitingTime, 0.08) * (optimized ? 0.85 : 1.0), 5, 90));
    const newThroughput = Math.round(clamp(addNoise(ix.throughput, 0.08) * (optimized ? 1.12 : 1.0), 2, 30));

    // Pedestrian demand fluctuates ±5% around baseline (time-of-day simulation)
    const currentPedDemand = ix.pedestrianDemand ?? 40;
    const newPedDemand = Math.round(clamp(currentPedDemand + (Math.random() - 0.5) * 6, 5, 99));

    return {
      ...ix,
      density: Math.round(newDensity),
      queueLength: newQueue,
      waitingTime: newWait,
      throughput: newThroughput,
      pedestrianDemand: newPedDemand,
      congestionLevel: getCongestionLevel(newDensity),
    };
  });
}


// Apply a scenario to the baseline intersections
export function applyScenario(scenario: ScenarioDefinition): Intersection[] {
  return INTERSECTIONS.map(ix => {
    const density = clamp(scenario.densityModifiers[ix.id] ?? ix.density, 5, 99);
    const queueLength = scenario.queueModifiers[ix.id] ?? ix.queueLength;
    const capacityDelta = scenario.capacityModifiers[ix.id] ?? 0;
    const capacity = Math.max(10, ix.capacity + capacityDelta);

    return {
      ...ix,
      density,
      queueLength,
      capacity,
      congestionLevel: getCongestionLevel(density),
      waitingTime: Math.round(density * 0.7 + queueLength * 1.2),
      throughput: Math.round(clamp(30 - density * 0.25, 2, 28)),
    };
  });
}

// Apply optimized signal configuration to intersections
export function applyOptimizedSignals(
  intersections: Intersection[],
  signalConfig: Record<string, { signal: string; greenDuration: number; reason: string }>
): Intersection[] {
  return intersections.map(ix => {
    const cfg = signalConfig[ix.id];
    if (!cfg) return ix;
    const newDensity = clamp(ix.density * 0.75, 5, 99);
    return {
      ...ix,
      currentSignal: cfg.signal as SignalState,
      greenDuration: cfg.greenDuration,
      density: Math.round(newDensity),
      queueLength: Math.round(ix.queueLength * 0.72),
      waitingTime: Math.round(ix.waitingTime * 0.68),
      throughput: Math.round(ix.throughput * 1.18),
      congestionLevel: getCongestionLevel(newDensity),
      reason: cfg.reason,
      recommendedSignal: cfg.signal as SignalState,
      recommendedGreen: cfg.greenDuration,
    };
  });
}

// Apply emergency green corridor
export function applyGreenCorridor(
  intersections: Intersection[],
  routeIds: string[]
): Intersection[] {
  return intersections.map(ix => ({
    ...ix,
    isEmergencyActive: routeIds.includes(ix.id),
    currentSignal: routeIds.includes(ix.id) ? 'EMERGENCY' as SignalState : ix.currentSignal,
  }));
}

// Clear emergency corridor
export function clearGreenCorridor(intersections: Intersection[]): Intersection[] {
  return intersections.map(ix => ({
    ...ix,
    isEmergencyActive: false,
    currentSignal: ix.currentSignal === 'EMERGENCY' ? 'NS_GREEN' as SignalState : ix.currentSignal,
  }));
}

// Compute aggregate traffic state
export function computeTrafficState(
  intersections: Intersection[],
  step: number
): TrafficState {
  const totalVehicles = intersections.reduce((s, ix) => s + ix.queueLength, 0);
  const avgWaitingTime = Math.round(
    intersections.reduce((s, ix) => s + ix.waitingTime, 0) / intersections.length
  );
  const avgQueueLength = Math.round(
    intersections.reduce((s, ix) => s + ix.queueLength, 0) / intersections.length
  );
  const throughput = Math.round(
    intersections.reduce((s, ix) => s + ix.throughput, 0) / intersections.length
  );
  const avgDensity = intersections.reduce((s, ix) => s + ix.density, 0) / intersections.length;
  const fuelEstimate = Math.round(avgWaitingTime * 1.8);
  const co2Estimate = Math.round(avgWaitingTime * 2.1);

  return {
    intersections,
    edges: TRAFFIC_EDGES,
    timestamp: Date.now(),
    simulationStep: step,
    mode: 'DEMO',
    totalVehicles,
    avgWaitingTime,
    avgQueueLength,
    throughput,
    fuelEstimate,
    co2Estimate,
  };
}

// Generate emergency travel time estimates
export function estimateEmergencyETA(
  intersections: Intersection[],
  route: string[]
): { etaBefore: number; etaAfter: number } {
  const routeIntersections = route.map(id => intersections.find(ix => ix.id === id)!).filter(Boolean);
  const avgDensity = routeIntersections.reduce((s, ix) => s + ix.density, 0) / routeIntersections.length;
  const avgQueue = routeIntersections.reduce((s, ix) => s + ix.queueLength, 0) / routeIntersections.length;

  // Base travel time + congestion penalty
  const baseSecs = route.length * 55;
  const congestionPenalty = (avgDensity / 100) * 120 + avgQueue * 3;
  const etaBefore = Math.round(baseSecs + congestionPenalty);
  const etaAfter = Math.round(baseSecs * 0.78 + congestionPenalty * 0.28);

  return { etaBefore, etaAfter };
}
