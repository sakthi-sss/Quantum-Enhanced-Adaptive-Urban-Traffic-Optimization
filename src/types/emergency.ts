// Emergency & Ambulance Types

export type AmbulanceStatus = 'STANDBY' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'RETURNING';
export type CorridorStatus = 'INACTIVE' | 'CALCULATING' | 'ACTIVE' | 'CLEARING';

export interface RouteNode {
  intersectionId: string;
  signalStatus: 'GREEN' | 'RED' | 'CLEARING' | 'APPROACHING';
  arrivalTime: number;    // seconds from now
  greenStartTime: number; // when green activates
  greenEndTime: number;
}

export interface EmergencyRoute {
  id: string;
  ambulanceId: string;
  origin: string;
  destination: string;
  waypoints: string[];    // intersection IDs
  routeNodes: RouteNode[];
  totalDistance: number;  // km
  etaBefore: number;      // seconds without optimization
  etaAfter: number;       // seconds with optimization
  timeSaved: number;
  calculatedAt: number;
}

export interface Ambulance {
  id: string;
  callSign: string;
  status: AmbulanceStatus;
  currentIntersection: string;
  nextIntersection: string;
  destination: string;
  route: EmergencyRoute | null;
  corridorStatus: CorridorStatus;
  speed: number;          // km/h
  progress: number;       // 0-100 along route segment
  distanceRemaining: number;
}

export interface GreenCorridorEvent {
  id: string;
  triggeredAt: number;
  ambulance: Ambulance;
  route: EmergencyRoute;
  affectedIntersections: string[];
  completedAt?: number;
  timeSaved?: number;
}
