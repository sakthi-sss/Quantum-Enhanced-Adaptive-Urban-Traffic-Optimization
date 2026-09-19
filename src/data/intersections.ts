import type { Intersection, TrafficEdge } from '../types/traffic';

// Network topology (SVG canvas coordinates for 800×600 diagram)
//
//         S2(300,80)
//          |
//  S1(100,260)---S3(300,260)---S4(500,260)
//                  |
//                S5(300,420)
//                  |
//                S6(300,560)
//
// GPS coordinates: Bengaluru (Bangalore) urban core — real street intersections
// Map centre: ~12.9716° N, 77.5946° E (MG Road / Brigade Road corridor)
//
// Intersection zone descriptions:
//   S1 — Majestic Bus Terminal (West hub)
//   S2 — Shivajinagar Signal (North)
//   S3 — MG Road / Brigade Junction (Central hub)
//   S4 — Indiranagar 100ft Road (East)
//   S5 — Residency Road / Richmond Circle (South-Centre)
//   S6 — Koramangala / Forum Mall Gate (South)

export const INTERSECTIONS: Intersection[] = [
  {
    id: 'S1',
    label: 'S1 – Majestic',
    x: 100, y: 260,
    lat: 12.9767, lng: 77.5713,   // Majestic Bus Terminal
    density: 45,
    queueLength: 11,
    capacity: 50,
    currentSignal: 'EW_GREEN',
    greenDuration: 30,
    congestionLevel: 'LOW',
    waitingTime: 28,
    throughput: 18,
    pedestrianDemand: 35,
    connections: ['S3'],
    isEmergencyActive: false,
  },
  {
    id: 'S2',
    label: 'S2 – Shivajinagar',
    x: 300, y: 80,
    lat: 12.9850, lng: 77.5976,   // Shivajinagar Bus Stop signal
    density: 72,
    queueLength: 18,
    capacity: 50,
    currentSignal: 'NS_GREEN',
    greenDuration: 35,
    congestionLevel: 'MODERATE',
    waitingTime: 42,
    throughput: 14,
    pedestrianDemand: 62,
    connections: ['S3'],
    isEmergencyActive: false,
  },
  {
    id: 'S3',
    label: 'S3 – MG Road Hub',
    x: 300, y: 260,
    lat: 12.9757, lng: 77.6011,   // MG Road / Brigade Road junction
    density: 91,
    queueLength: 24,
    capacity: 50,
    currentSignal: 'NS_GREEN',
    greenDuration: 42,
    congestionLevel: 'CRITICAL',
    waitingTime: 68,
    throughput: 8,
    pedestrianDemand: 80,
    connections: ['S1', 'S2', 'S4', 'S5'],
    isEmergencyActive: false,
    recommendedSignal: 'NS_GREEN',
    recommendedGreen: 42,
    reason: 'High north-south queue detected.',
  },
  {
    id: 'S4',
    label: 'S4 – Indiranagar',
    x: 500, y: 260,
    lat: 12.9757, lng: 77.6410,   // Indiranagar 100ft Road signal
    density: 55,
    queueLength: 14,
    capacity: 50,
    currentSignal: 'EW_GREEN',
    greenDuration: 28,
    congestionLevel: 'MODERATE',
    waitingTime: 35,
    throughput: 16,
    pedestrianDemand: 45,
    connections: ['S3'],
    isEmergencyActive: false,
  },
  {
    id: 'S5',
    label: 'S5 – Residency Rd',
    x: 300, y: 420,
    lat: 12.9673, lng: 77.6011,   // Richmond Circle / Residency Road
    density: 68,
    queueLength: 17,
    capacity: 50,
    currentSignal: 'NS_GREEN',
    greenDuration: 33,
    congestionLevel: 'MODERATE',
    waitingTime: 38,
    throughput: 15,
    pedestrianDemand: 55,
    connections: ['S3', 'S6'],
    isEmergencyActive: false,
  },
  {
    id: 'S6',
    label: 'S6 – Koramangala',
    x: 300, y: 560,
    lat: 12.9352, lng: 77.6011,   // Koramangala / Forum Mall gate
    density: 30,
    queueLength: 8,
    capacity: 50,
    currentSignal: 'EW_GREEN',
    greenDuration: 25,
    congestionLevel: 'LOW',
    waitingTime: 18,
    throughput: 22,
    pedestrianDemand: 20,
    connections: ['S5'],
    isEmergencyActive: false,
  },
];

export const TRAFFIC_EDGES: TrafficEdge[] = [
  { from: 'S1', to: 'S3', weight: 1, isGreenCorridor: false },
  { from: 'S2', to: 'S3', weight: 1, isGreenCorridor: false },
  { from: 'S3', to: 'S4', weight: 1, isGreenCorridor: false },
  { from: 'S3', to: 'S5', weight: 1, isGreenCorridor: false },
  { from: 'S5', to: 'S6', weight: 1, isGreenCorridor: false },
];

// Emergency route: Majestic → MG Road → Indiranagar → City Hospital (beyond S4)
export const EMERGENCY_ROUTE = ['S1', 'S3', 'S4'];
export const HOSPITAL_LABEL  = 'City Hospital';

// Map centre for Leaflet initial view
export const MAP_CENTER: [number, number] = [12.9660, 77.6011];
export const MAP_ZOOM = 13;
