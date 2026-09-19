import type { EventScenario } from '../types/traffic';

export interface ScenarioDefinition {
  id: EventScenario;
  label: string;
  icon: string;
  description: string;
  densityModifiers: Record<string, number>;
  queueModifiers: Record<string, number>;
  capacityModifiers: Record<string, number>;
  details: string;
  systemMessage: string;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'NORMAL_TRAFFIC',
    label: 'Normal Traffic',
    icon: '🚗',
    description: 'Standard traffic conditions across all intersections.',
    densityModifiers: { S1: 45, S2: 72, S3: 55, S4: 55, S5: 68, S6: 30 },
    queueModifiers: { S1: 11, S2: 18, S3: 14, S4: 14, S5: 17, S6: 8 },
    capacityModifiers: {},
    details: 'Baseline traffic flow with standard signal timing.',
    systemMessage: 'Normal traffic conditions active. All intersections operating within nominal parameters.',
  },
  {
    id: 'HEAVY_TRAFFIC',
    label: 'Heavy Traffic',
    icon: '🚦',
    description: 'Peak-hour congestion — all intersections under heavy load.',
    densityModifiers: { S1: 78, S2: 88, S3: 96, S4: 82, S5: 91, S6: 65 },
    queueModifiers: { S1: 22, S2: 28, S3: 32, S4: 24, S5: 29, S6: 18 },
    capacityModifiers: {},
    details: 'Peak-hour heavy traffic detected across the network.',
    systemMessage: 'Heavy traffic event triggered. All intersections approaching capacity. Optimization recommended.',
  },
  {
    id: 'ACCIDENT_S3',
    label: 'Accident at S3',
    icon: '⚠️',
    description: 'Vehicle accident reduces S3 capacity by 60%.',
    densityModifiers: { S1: 62, S2: 79, S3: 95, S4: 71, S5: 84, S6: 48 },
    queueModifiers: { S1: 18, S2: 23, S3: 40, S4: 19, S5: 25, S6: 12 },
    capacityModifiers: { S3: -30 },
    details: 'Accident at intersection S3 has reduced capacity significantly. Traffic backing up on all approaches.',
    systemMessage: 'INCIDENT: Vehicle accident detected at S3. Capacity reduced to 40%. Rerouting optimization initiated.',
  },
  {
    id: 'ROAD_CLOSURE_S4',
    label: 'Road Closure at S4',
    icon: '🚧',
    description: 'S4 closed for maintenance. Traffic reroutes through S3.',
    densityModifiers: { S1: 55, S2: 75, S3: 98, S4: 10, S5: 79, S6: 55 },
    queueModifiers: { S1: 14, S2: 21, S3: 45, S4: 2, S5: 22, S6: 15 },
    capacityModifiers: { S4: -45 },
    details: 'S4 is closed. All east-bound traffic being redirected through S3 and S5.',
    systemMessage: 'CLOSURE: S4 road closure in effect. Rerouting through S3-S5 corridor. High congestion expected.',
  },
  {
    id: 'EMERGENCY_VEHICLE',
    label: 'Emergency Vehicle',
    icon: '🚑',
    description: 'Emergency vehicle dispatch — green corridor required.',
    densityModifiers: { S1: 60, S2: 74, S3: 88, S4: 58, S5: 72, S6: 35 },
    queueModifiers: { S1: 16, S2: 20, S3: 26, S4: 16, S5: 20, S6: 9 },
    capacityModifiers: {},
    details: 'Emergency vehicle dispatched. Green corridor activated on priority route.',
    systemMessage: 'EMERGENCY: Ambulance UNIT-01 dispatched. Green corridor being activated on S1→S3→S4 route.',
  },
  {
    id: 'TRAFFIC_SURGE',
    label: 'Sudden Traffic Surge',
    icon: '📈',
    description: 'Large event causes sudden vehicle surge from S6 direction.',
    densityModifiers: { S1: 51, S2: 67, S3: 88, S4: 61, S5: 92, S6: 95 },
    queueModifiers: { S1: 13, S2: 19, S3: 28, S4: 17, S5: 31, S6: 38 },
    capacityModifiers: {},
    details: 'Sudden vehicle surge from south (S6) direction due to large event dispersal.',
    systemMessage: 'SURGE: Sudden traffic surge detected from S6. Event dispersal pattern identified. Adaptive optimization engaged.',
  },
];
