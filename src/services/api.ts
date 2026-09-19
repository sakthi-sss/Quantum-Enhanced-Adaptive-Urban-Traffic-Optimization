// API Service Layer
// Attempts to connect to FastAPI backend; falls back to demo simulation automatically.

import type { TrafficState, SystemStatus } from '../types/traffic';
import type { OptimizationResult } from '../types/optimization';

const API_BASE = '/api';
const TIMEOUT = 3000;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    throw new Error('API unavailable');
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchNetworkState(): Promise<TrafficState | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/network`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchTrafficState(): Promise<TrafficState | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/traffic`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function postOptimize(payload: object): Promise<OptimizationResult | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function postEmergency(payload: object): Promise<object | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function postSimulationStart(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/simulation/start`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function postSimulationReset(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/simulation/reset`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchMetrics(): Promise<object | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/metrics`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getSystemStatus(backendOnline: boolean): SystemStatus {
  return {
    sumo: backendOnline ? 'ONLINE' : 'DEMO',
    qiskit: backendOnline ? 'ONLINE' : 'DEMO',
    fastapi: backendOnline ? 'ONLINE' : 'OFFLINE',
    mode: backendOnline ? 'LIVE' : 'DEMO',
  };
}
