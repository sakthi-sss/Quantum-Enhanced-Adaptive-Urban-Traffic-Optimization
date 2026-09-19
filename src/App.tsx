import { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import LoginPage from './pages/LoginPage';
import AmbulancePage from './pages/AmbulancePage';
import ControlCenter from './pages/ControlCenter';
import Analytics from './pages/Analytics';
import Technical from './pages/Technical';
import NetworkPage from './pages/NetworkPage';
import OptimizationPage from './pages/OptimizationPage';
import EmergencyCorridorPage from './pages/EmergencyCorridorPage';
import WhatIfPage from './pages/WhatIfPage';
import { checkBackendHealth, getSystemStatus } from './services/api';
import { INTERSECTIONS } from './data/intersections';
import { computeTrafficState } from './services/mockSimulation';
import type { SystemStatus, TrafficState } from './types/traffic';
import type { OptimizationResult } from './types/optimization';

export default function App() {
  const [role, setRole] = useState<'ambulance' | 'traffic' | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(getSystemStatus(false));
  const [trafficState, setTrafficState] = useState<TrafficState>(
    computeTrafficState(INTERSECTIONS, 0)
  );
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then(online => {
      setSystemStatus(getSystemStatus(online));
    });
  }, []);

  const handleLogout = () => {
    setRole(null);
  };

  const handleTrafficUpdate = (state: TrafficState) => {
    setTrafficState(state);
  };

  const handleOptResult = (result: OptimizationResult) => {
    setOptResult(result);
  };

  // Guard for authenticated routes
  const guard = (el: ReactNode, requiredRole?: 'ambulance' | 'traffic') => {
    if (!role) return <Navigate to="/login" />;
    if (requiredRole && role !== requiredRole) return <Navigate to="/login" />;
    return el;
  };

  return (
    <BrowserRouter>
      <Navbar role={role} status={systemStatus} onLogout={handleLogout} />
      <Routes>
        {/* ── Public ─────────────────────────────────── */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage onLogin={setRole} />} />

        {/* ── Ambulance ──────────────────────────────── */}
        <Route
          path="/ambulance"
          element={guard(
            <AmbulancePage intersections={trafficState.intersections} />,
            'ambulance'
          )}
        />

        {/* ── Traffic Control ────────────────────────── */}
        <Route
          path="/control"
          element={guard(
            <ControlCenter
              status={systemStatus}
              onTrafficUpdate={handleTrafficUpdate}
              onOptResult={handleOptResult}
            />,
            'traffic'
          )}
        />

        {/* ── Shared pages (both roles) ──────────────── */}
        <Route
          path="/network"
          element={guard(<NetworkPage intersections={trafficState.intersections} />)}
        />
        <Route
          path="/analytics"
          element={guard(<Analytics trafficState={trafficState} optResult={optResult} />)}
        />
        <Route
          path="/technical"
          element={guard(<Technical optResult={optResult} />)}
        />
        <Route
          path="/optimization"
          element={guard(<OptimizationPage onOptResult={handleOptResult} />)}
        />

        <Route
          path="/whatif"
          element={guard(
            <WhatIfPage onTrafficUpdate={handleTrafficUpdate} onOptResult={handleOptResult} />,
            'traffic'
          )}
        />

        {/* ── Emergency ─────────────────────────────── */}
        <Route
          path="/emergency"
          element={
            role === 'ambulance'
              ? <AmbulancePage intersections={trafficState.intersections} />
              : role === 'traffic'
              ? <EmergencyCorridorPage intersections={trafficState.intersections} />
              : <Navigate to="/login" />
          }
        />

        {/* ── Fallback ───────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
