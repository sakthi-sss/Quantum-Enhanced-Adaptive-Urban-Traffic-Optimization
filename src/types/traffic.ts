// Traffic & Intersection Types

export type SignalState = 'NS_GREEN' | 'EW_GREEN' | 'ALL_RED' | 'EMERGENCY';
export type CongestionLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface Intersection {
  id: string;
  label: string;
  x: number;           // SVG canvas x
  y: number;           // SVG canvas y
  lat: number;         // GPS latitude  (for OpenStreetMap)
  lng: number;         // GPS longitude (for OpenStreetMap)
  density: number;            // 0-100% vehicle density
  queueLength: number;        // number of vehicles
  capacity: number;           // road capacity (vehicles)
  currentSignal: SignalState;
  greenDuration: number;      // seconds
  congestionLevel: CongestionLevel;
  waitingTime: number;        // average seconds per vehicle
  throughput: number;         // vehicles/min
  pedestrianDemand: number;   // 0-100% pedestrian crossing demand
  connections: string[];      // connected intersection IDs
  isEmergencyActive: boolean;
  recommendedSignal?: SignalState;
  recommendedGreen?: number;
  reason?: string;
}

export interface TrafficEdge {
  from: string;
  to: string;
  weight: number;
  isGreenCorridor: boolean;
}

export interface TrafficState {
  intersections: Intersection[];
  edges: TrafficEdge[];
  timestamp: number;
  simulationStep: number;
  mode: 'DEMO' | 'SUMO' | 'HYBRID';
  totalVehicles: number;
  avgWaitingTime: number;
  avgQueueLength: number;
  throughput: number;
  fuelEstimate: number;
  co2Estimate: number;
}

export interface SystemStatus {
  sumo: 'ONLINE' | 'OFFLINE' | 'DEMO';
  qiskit: 'ONLINE' | 'OFFLINE' | 'DEMO';
  fastapi: 'ONLINE' | 'OFFLINE';
  mode: 'LIVE' | 'DEMO';
}

export type EventScenario =
  | 'NORMAL_TRAFFIC'
  | 'HEAVY_TRAFFIC'
  | 'ACCIDENT_S3'
  | 'ROAD_CLOSURE_S4'
  | 'EMERGENCY_VEHICLE'
  | 'TRAFFIC_SURGE';
