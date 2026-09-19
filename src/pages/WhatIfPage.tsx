import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ChevronRight, AlertTriangle, Zap, Activity } from 'lucide-react';
import type { Intersection, TrafficState } from '../types/traffic';
import type { OptimizationResult } from '../types/optimization';
import { INTERSECTIONS, TRAFFIC_EDGES } from '../data/intersections';
import { SCENARIOS } from '../data/scenarios';
import { applyScenario, applyOptimizedSignals, computeTrafficState } from '../services/mockSimulation';
import { runFullOptimization } from '../services/mockOptimizer';
import TrafficNetwork from '../components/TrafficNetwork';
import MetricCard from '../components/MetricCard';

interface Props {
  onTrafficUpdate?: (state: TrafficState) => void;
  onOptResult?: (r: OptimizationResult) => void;
}

type SimPhase = 'idle' | 'applied' | 'optimizing' | 'done';

export default function WhatIfPage({ onTrafficUpdate, onOptResult }: Props) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [intersections, setIntersections] = useState(INTERSECTIONS);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [steps, setSteps] = useState<Array<{ label: string; status: string }>>([]);
  const [systemNote, setSystemNote] = useState<string>('');

  const scenario = SCENARIOS.find(s => s.id === selectedId);

  const applyScenarioFn = () => {
    if (!scenario) return;
    const newIx = applyScenario(scenario);
    setIntersections(newIx);
    setPhase('applied');
    setOptResult(null);
    setSteps([]);
    setSystemNote(scenario.systemMessage);
    onTrafficUpdate?.(computeTrafficState(newIx, 1));
  };

  const optimizeFn = async () => {
    if (phase !== 'applied') return;
    setPhase('optimizing');
    setSteps([]);
    const result = await runFullOptimization(intersections, s => setSteps(s.map(x => ({ label: x.label, status: x.status }))));
    setOptResult(result);
    onOptResult?.(result);
    const optimized = applyOptimizedSignals(intersections, result.signalConfig);
    setIntersections(optimized);
    onTrafficUpdate?.(computeTrafficState(optimized, 2));
    setPhase('done');
    setSystemNote('Optimization complete. Comparing before/after results.');
  };

  const resetFn = () => {
    setIntersections(INTERSECTIONS);
    setPhase('idle');
    setOptResult(null);
    setSteps([]);
    setSelectedId('');
    setSystemNote('');
    onTrafficUpdate?.(computeTrafficState(INTERSECTIONS, 0));
  };

  const stepDot: Record<string, string> = {
    PENDING: 'bg-slate-700',
    RUNNING: 'bg-amber-400 animate-pulse',
    DONE: 'bg-green-400',
  };

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">What-If Simulator</h1>
          <p className="text-sm text-slate-400">
            Simulate urban traffic events and see how Q-FLOW responds with adaptive signal optimization
          </p>
        </div>

        {/* Scenario grid */}
        <div className="glass rounded-2xl p-6 border border-white/5 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
            1. Choose a Scenario
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedId(s.id); setPhase('idle'); }}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedId === s.id
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/8 hover:border-white/15 hover:bg-white/3'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${selectedId === s.id ? 'text-amber-400' : 'text-white'}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action steps */}
        {selectedId && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-5 border border-white/5 mb-6"
            >
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
                2. Run Simulation
              </h2>

              {systemNote && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/80">{systemNote}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={applyScenarioFn}
                  disabled={phase === 'optimizing'}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    phase === 'idle' || phase === 'done'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                      : 'border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Play size={14} />
                  Apply {scenario?.label}
                </button>

                {phase === 'applied' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={optimizeFn}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-black transition-all"
                  >
                    <Zap size={14} />
                    Run Q-FLOW Optimization
                  </motion.button>
                )}

                {phase === 'optimizing' && (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500/30 text-amber-400 text-sm">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Optimizing...
                  </div>
                )}

                <button
                  onClick={resetFn}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 text-sm transition-all"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>

              {/* Optimization steps */}
              {steps.length > 0 && (
                <div className="mt-4 space-y-2">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${stepDot[step.status]}`} />
                      <p className={`text-xs ${step.status === 'RUNNING' ? 'text-amber-400' : step.status === 'DONE' ? 'text-green-400' : 'text-slate-500'}`}>
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Network */}
          <div className="glass rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Traffic Network
              </h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                phase === 'done' ? 'border-green-500/30 text-green-400 bg-green-500/10'
                : phase === 'applied' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                : 'border-slate-700 text-slate-500'
              }`}>
                {phase === 'done' ? '✓ Optimized' : phase === 'applied' ? scenario?.label ?? '' : 'Baseline'}
              </span>
            </div>
            <TrafficNetwork intersections={intersections} edges={TRAFFIC_EDGES} showTechnical={phase === 'done'} />
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Metrics</h3>
              <div className="space-y-3">
                {intersections.map(ix => {
                  const levelColor: Record<string, string> = {
                    LOW: 'text-green-400', MODERATE: 'text-amber-400', HIGH: 'text-orange-400', CRITICAL: 'text-red-400'
                  };
                  const barColor: Record<string, string> = {
                    LOW: 'bg-green-400', MODERATE: 'bg-amber-400', HIGH: 'bg-orange-400', CRITICAL: 'bg-red-400'
                  };
                  return (
                    <div key={ix.id} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold w-5 ${levelColor[ix.congestionLevel]}`}>{ix.id}</span>
                        <span className="text-slate-400">Q:{ix.queueLength} · W:{ix.waitingTime}s</span>
                        <span className={levelColor[ix.congestionLevel]}>{ix.density}%</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full density-bar ${barColor[ix.congestionLevel]}`} style={{ width: `${ix.density}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Before/After comparison */}
            {optResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4 border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <h3 className="text-sm font-semibold text-green-400">Optimization Results</h3>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    ['Wait Time', `-${optResult.improvements.waitingTimeReduction}%`, 'text-green-400'],
                    ['Queue', `-${optResult.improvements.queueReduction}%`, 'text-green-400'],
                    ['Fuel Est.', `-${optResult.improvements.fuelReductionPct}%`, 'text-amber-400'],
                    ['CO₂ Est.', `-${optResult.improvements.co2ReductionPct}%`, 'text-emerald-400'],
                  ].map(([l, v, c]) => (
                    <div key={l as string} className="flex justify-between">
                      <span className="text-slate-400">{l}</span>
                      <span className={c as string}>{v}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-2 border-t border-white/10">
                  <p className="text-xs text-slate-500 mb-1">QAOA best config:</p>
                  <div className="flex gap-1">
                    {optResult.qaoa.bestConfig.split('').map((b, i) => (
                      <div key={i} className={`w-7 h-7 rounded text-xs flex items-center justify-center font-bold font-mono border ${
                        b === '1' ? 'border-green-500/40 bg-green-500/20 text-green-400' : 'border-slate-600 text-slate-500'
                      }`}>{b}</div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 text-center">Simulation Result — Demo Mode</p>
                </div>
              </motion.div>
            )}

            {/* Scenario explanation */}
            {scenario && phase !== 'idle' && (
              <div className="glass rounded-xl p-4 border border-white/5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Q-FLOW Response</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{scenario.details}</p>
                {phase === 'done' && (
                  <div className="mt-3 space-y-1.5">
                    {['Recalculated route constraints', 'Rebuilt optimization problem', 'Ran QAOA on updated QUBO', 'Applied new signal plan'].map(step => (
                      <div key={step} className="flex items-center gap-1.5 text-xs text-green-400">
                        <span>✓</span> <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
