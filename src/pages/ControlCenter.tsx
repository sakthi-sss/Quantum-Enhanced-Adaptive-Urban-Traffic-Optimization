import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, RefreshCw, Play, Map, Network } from 'lucide-react';
import type { Intersection, TrafficState, EventScenario, SystemStatus } from '../types/traffic';
import type { OptimizationResult, OptimizationStep } from '../types/optimization';
import TrafficNetwork from '../components/TrafficNetwork';
import MapNetwork from '../components/MapNetwork';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import AIAdvisorPanel from '../components/AIAdvisorPanel';
import { SCENARIOS } from '../data/scenarios';
import { applyScenario, applyOptimizedSignals, computeTrafficState, applyGreenCorridor, clearGreenCorridor, estimateEmergencyETA } from '../services/mockSimulation';
import { runFullOptimization } from '../services/mockOptimizer';
import { INTERSECTIONS, TRAFFIC_EDGES, EMERGENCY_ROUTE } from '../data/intersections';



interface Props {
  status: SystemStatus;
  onTrafficUpdate?: (state: TrafficState) => void;
  onOptResult?: (result: OptimizationResult) => void;
}

type Phase = 'idle' | 'optimizing' | 'done' | 'emergency';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ControlCenter({ status, onTrafficUpdate, onOptResult }: Props) {
  const [intersections, setIntersections] = useState<Intersection[]>(INTERSECTIONS);
  const [trafficState, setTrafficState] = useState<TrafficState>(
    computeTrafficState(INTERSECTIONS, 0)

  );
  const [scenario, setScenario] = useState<EventScenario>('NORMAL_TRAFFIC');
  const [phase, setPhase] = useState<Phase>('idle');
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [optSteps, setOptSteps] = useState<OptimizationStep[]>([]);
  const [showTechnical, setShowTechnical] = useState(false);
  const [networkView, setNetworkView] = useState<'diagram' | 'map'>('diagram');
  const [emergencyETA, setEmergencyETA] = useState<{ before: number; after: number } | null>(null);
  const [emergencyProgress, setEmergencyProgress] = useState(0);
  const [systemMsg, setSystemMsg] = useState('System ready. Select a scenario or run optimization.');

  const applyScenarioAndUpdate = (sid: EventScenario) => {
    setScenario(sid);
    const def = SCENARIOS.find(s => s.id === sid)!;
    const newIx = applyScenario(def);
    const newState = computeTrafficState(newIx, trafficState.simulationStep + 1);
    setIntersections(newIx);
    setTrafficState(newState);
    setSystemMsg(def.systemMessage);
    setPhase('idle');
    setOptResult(null);
    setOptSteps([]);
    onTrafficUpdate?.(newState);
  };

  const runOptimization = async () => {
    setPhase('optimizing');
    setOptSteps([]);
    const result = await runFullOptimization(intersections, steps => setOptSteps([...steps]));
    setOptResult(result);
    onOptResult?.(result);

    // Apply optimized signals
    const optimizedIx = applyOptimizedSignals(intersections, result.signalConfig);
    const newState = computeTrafficState(optimizedIx, trafficState.simulationStep + 2);
    setIntersections(optimizedIx);
    setTrafficState(newState);
    onTrafficUpdate?.(newState);
    setPhase('done');
    setSystemMsg('Optimization complete. Signal timings updated. Traffic improving.');
  };


  const simulateEmergency = async () => {
    setPhase('emergency');
    const { etaBefore, etaAfter } = estimateEmergencyETA(intersections, EMERGENCY_ROUTE);
    setEmergencyETA({ before: etaBefore, after: etaAfter });
    setSystemMsg('EMERGENCY: Ambulance dispatched. Calculating green corridor...');
    await new Promise(r => setTimeout(r, 1200));

    // Activate green corridor
    const withCorridor = applyGreenCorridor(intersections, EMERGENCY_ROUTE);
    setIntersections(withCorridor);
    setSystemMsg('GREEN CORRIDOR ACTIVE: S1 → S3 → S4 → City Hospital');

    // Simulate ambulance progress
    for (let p = 0; p <= 100; p += 5) {
      await new Promise(r => setTimeout(r, 150));
      setEmergencyProgress(p);
    }

    await new Promise(r => setTimeout(r, 600));
    // Clear corridor
    const cleared = clearGreenCorridor(withCorridor);
    setIntersections(cleared);
    setSystemMsg('Ambulance arrived. Green corridor cleared. Resuming adaptive control.');
    setPhase('done');
  };

  const resetSimulation = () => {
    setIntersections(INTERSECTIONS);
    setTrafficState(computeTrafficState(INTERSECTIONS, 0));
    setScenario('NORMAL_TRAFFIC');
    setPhase('idle');
    setOptResult(null);
    setOptSteps([]);
    setEmergencyETA(null);
    setEmergencyProgress(0);
    setSystemMsg('Simulation reset. System ready.');
  };

  const stepColors: Record<OptimizationStep['status'], string> = {
    PENDING: 'text-slate-500',
    RUNNING: 'text-amber-400',
    DONE: 'text-green-400',
    ERROR: 'text-red-400',
  };
  const stepDots: Record<OptimizationStep['status'], string> = {
    PENDING: 'bg-slate-700',
    RUNNING: 'bg-amber-400 animate-pulse',
    DONE: 'bg-green-400',
    ERROR: 'bg-red-400',
  };

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Q-FLOW Traffic Control Center</h1>
            <p className="text-sm text-slate-400">Hybrid Quantum-Classical Adaptive Signal Optimization</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="SYSTEM" status="ONLINE" />
            <StatusBadge label={`SUMO ${status.sumo}`} status={status.sumo === 'DEMO' ? 'DEMO' : 'RUNNING'} />
            <StatusBadge label="QISKIT AER" status="SIMULATION" />
            <StatusBadge label="HYBRID OPT" status="ACTIVE" />
          </div>
        </div>

        {/* System message bar */}
        <div className="mb-4 px-4 py-2.5 rounded-lg glass border border-white/5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <p className="text-sm text-slate-300 font-mono">{systemMsg}</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <MetricCard
            label="Avg Wait" value={trafficState.avgWaitingTime} unit="sec"
            icon={<Activity size={16} />} accent="orange"
            trend={optResult ? 'down' : 'neutral'}
            trendLabel={optResult ? `-${optResult.improvements.waitingTimeReduction}%` : undefined}
          />
          <MetricCard
            label="Total Queue" value={trafficState.totalVehicles} unit="veh"
            icon={<Activity size={16} />} accent="red"
            trend={optResult ? 'down' : 'neutral'}
          />
          <MetricCard
            label="Throughput" value={trafficState.throughput} unit="v/m"
            icon={<Zap size={16} />} accent="green"
            trend={optResult ? 'up' : 'neutral'}
          />
          <MetricCard
            label="Congestion" value={
              Math.round(intersections.filter(ix => ix.congestionLevel === 'HIGH' || ix.congestionLevel === 'CRITICAL').length / intersections.length * 100)
            } unit="%"
            icon={<Activity size={16} />} accent="red"
          />
          <MetricCard
            label="Fuel Est." value={trafficState.fuelEstimate} unit="idx"
            icon={<Activity size={16} />} accent="gold"
            sublabel="Simulation est."
          />
          <MetricCard
            label="CO₂ Est." value={trafficState.co2Estimate} unit="idx"
            icon={<Activity size={16} />} accent="cyan"
            sublabel="Simulation est."
          />
          {emergencyETA && (
            <MetricCard
              label="Emrg. ETA" value={formatTime(emergencyETA.after)} unit=""
              icon={<Activity size={16} />} accent="green"
              trendLabel={`-${formatTime(emergencyETA.before - emergencyETA.after)}`}
              trend="down"
            />
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Network + Controls */}
          <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTechnical(false)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${!showTechnical ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Simple Mode
              </button>
              <button
                onClick={() => setShowTechnical(true)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${showTechnical ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Technical Mode
              </button>
            </div>

            {/* Traffic network */}
            <div className="glass rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-200 text-sm uppercase tracking-wide">Live Traffic Network</h2>
                  <span className="text-xs text-slate-500 hidden sm:inline">· Click node for details</span>
                </div>

                {/* View switcher: Roadway Diagram vs OpenStreetMap */}
                <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10 text-xs">
                  <button
                    onClick={() => setNetworkView('diagram')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                      networkView === 'diagram'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Network size={12} />
                    Roadway Diagram
                  </button>
                  <button
                    onClick={() => setNetworkView('map')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                      networkView === 'map'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Map size={12} />
                    OpenStreetMap
                  </button>
                </div>
              </div>

              {networkView === 'map' ? (
                <MapNetwork intersections={intersections} edges={TRAFFIC_EDGES} compact />
              ) : (
                <TrafficNetwork intersections={intersections} edges={TRAFFIC_EDGES} showTechnical={showTechnical} />
              )}
            </div>

            {/* Scenario selector */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">What-If Simulator</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => applyScenarioAndUpdate(s.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${
                      scenario === s.id
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                        : 'border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={runOptimization}
                disabled={phase === 'optimizing' || phase === 'emergency'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  phase === 'optimizing'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-wait'
                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                }`}
              >
                {phase === 'optimizing' ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Zap size={16} />}
                {phase === 'optimizing' ? 'Optimizing...' : 'Run Optimization'}
              </button>

              <button
                onClick={simulateEmergency}
                disabled={phase === 'optimizing' || phase === 'emergency'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  phase === 'emergency'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-wait'
                    : 'border border-red-500/50 text-red-400 hover:bg-red-500/10'
                }`}
              >
                <Play size={16} />
                {phase === 'emergency' ? 'Emergency Active...' : 'Simulate Emergency'}
              </button>

              <button
                onClick={resetSimulation}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all"
              >
                <RefreshCw size={14} />
                Reset
              </button>
            </div>
          </div>

          {/* Right: Optimization panel */}
          <div className="space-y-4">
            {/* Optimization steps */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                Optimization Pipeline
              </h3>
              {optSteps.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Run optimization to see the pipeline.</p>
              ) : (
                <div className="space-y-2">
                  {optSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${stepDots[step.status]}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${stepColors[step.status]}`}>{step.label}</p>
                        {step.status === 'RUNNING' && (
                          <p className="text-xs text-slate-600 truncate">{step.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optimization result */}
            <AnimatePresence>
              {optResult && phase === 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 border border-green-500/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <h3 className="text-sm font-semibold text-green-400">Optimization Complete</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      ['Wait Time', `${optResult.improvements.waitingTimeBefore}s → ${optResult.improvements.waitingTimeAfter}s`, true],
                      ['Queue', `${optResult.improvements.queueBefore} → ${optResult.improvements.queueAfter} veh`, true],
                      ['Throughput', `${optResult.improvements.throughputBefore} → ${optResult.improvements.throughputAfter} v/m`, false],
                      ['Fuel Est.', `-${optResult.improvements.fuelReductionPct}%`, true],
                      ['CO₂ Est.', `-${optResult.improvements.co2ReductionPct}%`, true],
                    ].map(([label, val, isDown]) => (
                      <div key={label as string} className="flex items-center justify-between">
                        <span className="text-slate-400">{label}</span>
                        <span className={isDown ? 'text-green-400' : 'text-cyan-400'}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 text-center">Simulation results — not real-world</p>

                  {showTechnical && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-slate-500 mb-1">QAOA best config:</p>
                      <code className="text-xs text-amber-400 font-mono">{optResult.qaoa.bestConfig}</code>
                      <p className="text-xs text-slate-600 mt-1">Cost: {optResult.qaoa.bestCost.toFixed(3)} · Depth: {optResult.qaoa.circuitDepth}</p>
                      <p className="text-xs text-amber-500/60 mt-1">Qiskit Aer Simulation — Demo Mode</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emergency status */}
            <AnimatePresence>
              {phase === 'emergency' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 border border-red-500/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <h3 className="text-sm font-semibold text-red-400">🚑 Emergency Active</h3>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {['S1', 'S3', 'S4'].map((id, i) => (
                      <div key={id} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${i * 33 < emergencyProgress ? 'bg-green-400' : 'bg-slate-600'}`} />
                        <span className={i * 33 < emergencyProgress ? 'text-green-400' : 'text-slate-500'}>{id} 🟢 GREEN</span>
                      </div>
                    ))}
                  </div>
                  {emergencyETA && (
                    <div className="mt-3 pt-2 border-t border-white/10 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ETA Before:</span>
                        <span className="text-slate-300 line-through">{formatTime(emergencyETA.before)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ETA After:</span>
                        <span className="text-green-400 font-bold">{formatTime(emergencyETA.after)}</span>
                      </div>
                      <p className="text-xs text-slate-600 text-center mt-1">Simulation Result</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Intersection list */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                Intersection Status
              </h3>
              <div className="space-y-2">
                {intersections.map(ix => {
                  const colors: Record<string, string> = {
                    LOW: 'text-green-400', MODERATE: 'text-amber-400',
                    HIGH: 'text-orange-400', CRITICAL: 'text-red-400'
                  };
                  const bars: Record<string, string> = {
                    LOW: 'bg-green-400', MODERATE: 'bg-amber-400',
                    HIGH: 'bg-orange-400', CRITICAL: 'bg-red-400'
                  };
                  return (
                    <div key={ix.id} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-6 ${colors[ix.congestionLevel]}`}>{ix.id}</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full density-bar ${bars[ix.congestionLevel]}`}
                          style={{ width: `${ix.density}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{ix.density}%</span>
                      {ix.isEmergencyActive && <span className="text-xs">🟢</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Advisor */}
            <AIAdvisorPanel
              intersections={intersections}
              optResult={optResult}
              activeScenario={scenario}
              emergencyActive={phase === 'emergency'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
