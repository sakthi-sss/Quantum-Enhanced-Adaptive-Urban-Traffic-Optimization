import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, CheckCircle, Activity, Radio, AlertCircle } from 'lucide-react';
import type { Intersection } from '../types/traffic';
import type { OptimizationResult, OptimizationStep } from '../types/optimization';
import { INTERSECTIONS, TRAFFIC_EDGES, EMERGENCY_ROUTE } from '../data/intersections';
import { runFullOptimization, buildQUBO, runQAOA } from '../services/mockOptimizer';
import { applyScenario, applyOptimizedSignals, computeTrafficState, applyGreenCorridor, clearGreenCorridor, estimateEmergencyETA } from '../services/mockSimulation';
import TrafficNetwork from '../components/TrafficNetwork';
import { SCENARIOS } from '../data/scenarios';

interface Props {
  onOptResult?: (r: OptimizationResult) => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const STEP_DOTS: Record<string, string> = {
  PENDING: 'bg-slate-700',
  RUNNING: 'bg-amber-400 animate-pulse',
  DONE: 'bg-green-400',
  ERROR: 'bg-red-400',
};

const STEP_TEXT: Record<string, string> = {
  PENDING: 'text-slate-500',
  RUNNING: 'text-amber-400 font-semibold',
  DONE: 'text-green-400',
  ERROR: 'text-red-400',
};

export default function OptimizationPage({ onOptResult }: Props) {
  const [intersections, setIntersections] = useState<Intersection[]>(INTERSECTIONS);
  const [phase, setPhase] = useState<'idle' | 'optimizing' | 'done' | 'emergency'>('idle');
  const [optSteps, setOptSteps] = useState<OptimizationStep[]>([]);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyProgress, setEmergencyProgress] = useState(0);
  const [emergencyETA, setEmergencyETA] = useState<{ before: number; after: number } | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('HEAVY_TRAFFIC');
  const [qubo] = useState(() => buildQUBO(INTERSECTIONS));
  const [qaoa] = useState(() => runQAOA(buildQUBO(INTERSECTIONS)));
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const applyScenarioFn = (sid: string) => {
    setSelectedScenario(sid);
    const def = SCENARIOS.find(s => s.id === sid)!;
    setIntersections(applyScenario(def));
    setPhase('idle');
    setOptResult(null);
    setOptSteps([]);
  };

  const runOpt = async () => {
    setPhase('optimizing');
    setOptSteps([]);
    const result = await runFullOptimization(intersections, steps => setOptSteps([...steps]));
    setOptResult(result);
    onOptResult?.(result);
    const optimized = applyOptimizedSignals(intersections, result.signalConfig);
    setIntersections(optimized);
    setPhase('done');
  };

  const triggerEmergency = async () => {
    setPhase('emergency');
    setEmergencyActive(true);
    const { etaBefore, etaAfter } = estimateEmergencyETA(intersections, EMERGENCY_ROUTE);
    setEmergencyETA({ before: etaBefore, after: etaAfter });
    const withCorridor = applyGreenCorridor(intersections, EMERGENCY_ROUTE);
    setIntersections(withCorridor);
    setEmergencyProgress(0);
    for (let p = 0; p <= 100; p += 4) {
      await new Promise(r => setTimeout(r, 120));
      setEmergencyProgress(p);
    }
    const cleared = clearGreenCorridor(withCorridor);
    setIntersections(cleared);
    setEmergencyActive(false);
    setPhase('done');
  };

  const reset = () => {
    setIntersections(INTERSECTIONS);
    setPhase('idle');
    setOptResult(null);
    setOptSteps([]);
    setEmergencyActive(false);
    setEmergencyETA(null);
    setEmergencyProgress(0);
  };

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Optimization & QUBO Technical View</h1>
            <p className="text-sm text-slate-400">SUMO → QUBO → QAOA → Qiskit Aer → Optimized Signals</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">
              QAOA / Qiskit Aer Simulation
            </span>
            <span className="px-2 py-1 rounded border border-slate-600 text-slate-400">
              Demo Mode
            </span>
          </div>
        </div>

        {/* Scenario selector */}
        <div className="glass rounded-xl p-4 border border-white/5 mb-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">1. Select Traffic Scenario</p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.slice(0, 4).map(s => (
              <button
                key={s.id}
                onClick={() => applyScenarioFn(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  selectedScenario === s.id
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_380px] gap-6">
          {/* LEFT: Network + Pipeline Steps */}
          <div className="space-y-5">
            {/* Network */}
            <div className="glass rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">2. Live Traffic State (SUMO Demo)</p>
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  DEMO SIMULATION
                </div>
              </div>
              <TrafficNetwork intersections={intersections} edges={TRAFFIC_EDGES} showTechnical />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={runOpt}
                disabled={phase === 'optimizing' || phase === 'emergency'}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
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
                {phase === 'optimizing' ? 'Running Optimization...' : '3. Run QUBO/QAOA Optimization'}
              </button>

              <button
                onClick={triggerEmergency}
                disabled={phase === 'optimizing' || phase === 'emergency'}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
                  phase === 'emergency'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-wait'
                    : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                }`}
              >
                <Play size={14} />
                {phase === 'emergency' ? 'Emergency Active...' : 'Simulate Emergency'}
              </button>

              <button
                onClick={reset}
                className="px-4 py-3 rounded-xl font-medium text-sm border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all"
              >
                Reset
              </button>
            </div>

            {/* QUBO display */}
            <div className="glass rounded-xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">QUBO Formulation</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="font-mono text-xs space-y-1.5 text-slate-300 bg-black/30 p-4 rounded-lg">
                  <div className="text-slate-500 mb-2">// Decision variables: x_i ∈ {'{'}0,1{'}'}</div>
                  {qubo.variables.map(v => (
                    <div key={v.id}>
                      <span className="text-amber-400">{v.id}</span>
                      {' = '}
                      <span className="text-cyan-400">{v.value}</span>
                      {'  '}
                      <span className="text-slate-500">// {v.intersection}</span>
                    </div>
                  ))}
                  <div className="mt-3 text-slate-500">// Objective: min x^T·Q·x</div>
                  <div className="text-green-400">cost = {qubo.objectiveValue.toFixed(3)}</div>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-slate-400 font-medium mb-2">Penalty Components:</p>
                  {[
                    ['Waiting Time', qubo.penaltyTerms.waitingTime.toFixed(1) + 's', 'text-orange-400'],
                    ['Queue Length', qubo.penaltyTerms.queueLength + ' veh', 'text-red-400'],
                    ['Congestion', qubo.penaltyTerms.congestion.toFixed(0), 'text-amber-400'],
                    ['Emergency', qubo.penaltyTerms.emergencyDelay.toFixed(0), 'text-green-400'],
                    ['Fuel Est.', qubo.penaltyTerms.fuel.toFixed(0) + ' idx', 'text-cyan-400'],
                    ['Pedestrian 🚶', (qubo.penaltyTerms.pedestrianDelay ?? 0).toFixed(0) + ' pts', 'text-sky-400'],
                  ].map(([l, v, c]) => (
                    <div key={l as string} className="flex items-center justify-between">
                      <span className="text-slate-500">{l}</span>
                      <span className={c as string}>{v}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-white/10">
                    <p className="text-slate-600 text-xs">Q matrix: {qubo.variables.length}×{qubo.variables.length}</p>
                    <p className="text-slate-600 text-xs">QUBO offset: {qubo.offset}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QAOA Circuit */}
            <div className="glass rounded-xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">QAOA Circuit (p=2)</h3>
                </div>
                <span className="text-xs text-slate-500">{qubo.variables.length} qubits · Qiskit Aer Simulator</span>
              </div>
              <svg viewBox="0 0 400 190" className="w-full max-h-[200px]">
                {qubo.variables.map((v, i) => (
                  <g key={i}>
                    {/* Qubit label */}
                    <text x={2} y={20 + i * 28} fontSize={9} fill="#94a3b8" fontFamily="monospace">{v.id}</text>
                    {/* Wire */}
                    <line x1={22} y1={16 + i * 28} x2={392} y2={16 + i * 28} stroke="#1e3a5f" strokeWidth={1.5} />
                    {/* |0⟩ */}
                    <text x={24} y={20 + i * 28} fontSize={8} fill="#475569" fontFamily="monospace">|0⟩</text>
                    {/* H gate */}
                    <rect x={44} y={9 + i * 28} width={16} height={14} rx={2} fill="#0f2040" stroke="#06b6d4" strokeWidth={1} />
                    <text x={52} y={20 + i * 28} fontSize={8} fill="#06b6d4" textAnchor="middle" fontFamily="monospace" fontWeight="bold">H</text>
                    {/* Phase sep layer 1 */}
                    <rect x={85} y={9 + i * 28} width={22} height={14} rx={2} fill="#1a0a40" stroke="#8b5cf6" strokeWidth={1} />
                    <text x={96} y={20 + i * 28} fontSize={7} fill="#c4b5fd" textAnchor="middle" fontFamily="monospace">Rz(γ₁)</text>
                    {/* Mixer layer 1 */}
                    <rect x={145} y={9 + i * 28} width={22} height={14} rx={2} fill="#0a1a0a" stroke="#10b981" strokeWidth={1} />
                    <text x={156} y={20 + i * 28} fontSize={7} fill="#6ee7b7" textAnchor="middle" fontFamily="monospace">Rx(β₁)</text>
                    {/* Phase sep layer 2 */}
                    <rect x={205} y={9 + i * 28} width={22} height={14} rx={2} fill="#1a0a40" stroke="#8b5cf6" strokeWidth={1} />
                    <text x={216} y={20 + i * 28} fontSize={7} fill="#c4b5fd" textAnchor="middle" fontFamily="monospace">Rz(γ₂)</text>
                    {/* Mixer layer 2 */}
                    <rect x={265} y={9 + i * 28} width={22} height={14} rx={2} fill="#0a1a0a" stroke="#10b981" strokeWidth={1} />
                    <text x={276} y={20 + i * 28} fontSize={7} fill="#6ee7b7" textAnchor="middle" fontFamily="monospace">Rx(β₂)</text>
                    {/* Measure */}
                    <rect x={325} y={9 + i * 28} width={14} height={14} rx={2} fill="#1a1000" stroke="#f59e0b" strokeWidth={1} />
                    <text x={332} y={20 + i * 28} fontSize={8} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">M</text>
                    {/* Classical bit output */}
                    <line x1={339} y1={16 + i * 28} x2={355} y2={16 + i * 28} stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="3 2" />
                    <text x={358} y={20 + i * 28} fontSize={8} fill="#64748b" fontFamily="monospace">c{i}</text>
                  </g>
                ))}
                {/* CNOT entanglement between adjacent qubits (layer 1) */}
                {[0, 1, 2, 3, 4].map(i => (
                  <g key={`cnot-${i}`}>
                    <circle cx={122} cy={16 + i * 28} r={2.5} fill="#8b5cf6" />
                    <line x1={122} y1={18.5 + i * 28} x2={122} y2={13.5 + (i + 1) * 28} stroke="#8b5cf6" strokeWidth={0.8} strokeDasharray="2 1.5" />
                    <circle cx={122} cy={16 + (i + 1) * 28} r={4} fill="none" stroke="#8b5cf6" strokeWidth={0.8} />
                  </g>
                ))}
                {/* Layer labels */}
                <text x={52} y={185} fontSize={8} fill="#94a3b8" textAnchor="middle">Init</text>
                <text x={96} y={185} fontSize={8} fill="#8b5cf6" textAnchor="middle">Phase 1</text>
                <text x={156} y={185} fontSize={8} fill="#10b981" textAnchor="middle">Mix 1</text>
                <text x={216} y={185} fontSize={8} fill="#8b5cf6" textAnchor="middle">Phase 2</text>
                <text x={276} y={185} fontSize={8} fill="#10b981" textAnchor="middle">Mix 2</text>
                <text x={332} y={185} fontSize={8} fill="#f59e0b" textAnchor="middle">Measure</text>
              </svg>
              <p className="text-xs text-slate-600 mt-2 text-center">
                Illustrative circuit — Qiskit Aer Simulator (Demo Mode) · NOT real quantum hardware
              </p>
            </div>
          </div>

          {/* RIGHT: Pipeline steps + Results */}
          <div className="space-y-4">
            {/* Pipeline progress */}
            <div className="glass rounded-xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                  Optimization Pipeline
                </h3>
              </div>
              {optSteps.length === 0 ? (
                <div className="text-center py-6 text-slate-600">
                  <Activity size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Click "Run QUBO/QAOA Optimization" to begin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {optSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${STEP_DOTS[step.status]}`} />
                      <div className="flex-1">
                        <p className={`text-xs ${STEP_TEXT[step.status]}`}>{step.label}</p>
                        {step.status === 'RUNNING' && (
                          <p className="text-xs text-slate-600 mt-0.5">{step.detail}</p>
                        )}
                        {step.status === 'DONE' && (
                          <p className="text-xs text-slate-600 mt-0.5">{step.detail}</p>
                        )}
                      </div>
                      {step.status === 'DONE' && <CheckCircle size={12} className="text-green-400 mt-1 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QAOA result */}
            <AnimatePresence>
              {optResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-5 border border-green-500/20"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <h3 className="text-sm font-semibold text-green-400">Optimization Complete</h3>
                  </div>

                  {/* Best config */}
                  <div className="bg-black/30 rounded-lg p-3 mb-3 font-mono">
                    <p className="text-xs text-slate-500 mb-1">Best configuration (QAOA output):</p>
                    <div className="flex gap-1">
                      {optResult.qaoa.bestConfig.split('').map((b, i) => (
                        <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold border ${
                          b === '1' ? 'border-green-500/40 bg-green-500/20 text-green-400' : 'border-slate-600 bg-slate-800 text-slate-400'
                        }`}>
                          {b}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {['S1','S2','S3','S4','S5','S6'].map(id => (
                        <div key={id} className="w-8 text-center text-xs text-slate-600 font-mono">{id}</div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-500 mt-2">
                      1 = NS_GREEN · 0 = EW_GREEN · Cost: {optResult.qaoa.bestCost.toFixed(3)}
                    </p>
                  </div>

                  {/* Improvements */}
                  <div className="space-y-2 text-xs mb-3">
                    {[
                      ['Wait Time', `${optResult.improvements.waitingTimeBefore}s → ${optResult.improvements.waitingTimeAfter}s`, `-${optResult.improvements.waitingTimeReduction}%`, 'text-green-400'],
                      ['Queue', `${optResult.improvements.queueBefore} → ${optResult.improvements.queueAfter} veh`, `-${optResult.improvements.queueReduction}%`, 'text-green-400'],
                      ['Throughput', '', `+${optResult.improvements.throughputAfter - optResult.improvements.throughputBefore} v/m`, 'text-cyan-400'],
                      ['Fuel Est.', '', `-${optResult.improvements.fuelReductionPct}%`, 'text-amber-400'],
                      ['CO₂ Est.', '', `-${optResult.improvements.co2ReductionPct}%`, 'text-emerald-400'],
                    ].map(([l, detail, val, c]) => (
                      <div key={l as string} className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400">{l}</span>
                          {detail && <span className="text-slate-600 ml-1">{detail}</span>}
                        </div>
                        <span className={c as string}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Convergence bar */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1.5">QAOA convergence curve:</p>
                    <div className="flex items-end gap-0.5 h-12">
                      {optResult.qaoa.convergence.map((cost, i) => {
                        const min = Math.min(...optResult.qaoa.convergence);
                        const max = Math.max(...optResult.qaoa.convergence);
                        const h = Math.max(4, ((cost - min) / (max - min || 1)) * 44);
                        return (
                          <div key={i} className="flex-1">
                            <div
                              className={`w-full rounded-sm ${i === optResult.qaoa.convergence.length - 1 ? 'bg-green-400' : 'bg-amber-500/50'}`}
                              style={{ height: h }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>Start: {optResult.qaoa.convergence[0]?.toFixed(2)}</span>
                      <span className="text-green-400">Best: {optResult.qaoa.bestCost.toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 text-center">
                    Quantum Backend: Qiskit Aer · Mode: Demo Simulation · Shots: 1024
                  </p>
                  <p className="text-xs text-slate-600 text-center">Simulation results — not real-world data</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emergency result */}
            <AnimatePresence>
              {(phase === 'emergency' || (emergencyETA && phase === 'done')) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass rounded-xl p-5 border ${phase === 'emergency' ? 'border-red-500/30' : 'border-green-500/20'}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🚑</span>
                    <h3 className={`text-sm font-semibold ${phase === 'emergency' ? 'text-red-400' : 'text-green-400'}`}>
                      {phase === 'emergency' ? 'Emergency Active' : 'Green Corridor Complete'}
                    </h3>
                  </div>
                  {phase === 'emergency' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">S1 → S3 → S4</span>
                        <span className="text-green-400">{Math.round(emergencyProgress)}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full transition-all duration-200" style={{ width: `${emergencyProgress}%` }} />
                      </div>
                      <div className="flex gap-2 mt-2">
                        {['S1', 'S3', 'S4'].map((id, i) => (
                          <div key={id} className={`flex-1 py-1.5 rounded text-center text-xs font-bold border ${
                            i * 33 < emergencyProgress ? 'border-green-500/50 bg-green-500/15 text-green-400' : 'border-slate-700 text-slate-600'
                          }`}>
                            {id} {i * 33 < emergencyProgress ? '🟢' : '⚪'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {emergencyETA && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ETA Before:</span>
                        <span className="text-slate-300 line-through">{formatTime(emergencyETA.before)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ETA After:</span>
                        <span className="text-green-400 font-bold">{formatTime(emergencyETA.after)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time Saved:</span>
                        <span className="text-green-400">{formatTime(emergencyETA.before - emergencyETA.after)}</span>
                      </div>
                      <p className="text-slate-600 text-center mt-2">Simulation Result</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Candidate configurations */}
            {optResult && (
              <div className="glass rounded-xl p-4 border border-white/5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Top Candidate Configurations
                </h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {optResult.qaoa.allConfigs.slice(0, 8).map((cfg, i) => (
                    <div
                      key={cfg.config}
                      className={`p-2 rounded-lg border text-center ${
                        i === 0 ? 'border-green-500/40 bg-green-500/10' : 'border-white/8'
                      }`}
                    >
                      <p className="font-mono text-xs font-bold text-amber-400">{cfg.config}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{cfg.cost.toFixed(2)}</p>
                      {i === 0 && <p className="text-xs text-green-400">BEST</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-400/70">
                  <strong className="text-amber-400">Prototype:</strong> Qiskit Aer is a classical simulator of quantum circuits. No real quantum hardware used. No quantum advantage claimed. All metrics are simulation estimates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
