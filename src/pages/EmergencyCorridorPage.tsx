import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, AlertTriangle, CheckCircle, MapPin, Clock, Zap, Radio } from 'lucide-react';
import type { Intersection } from '../types/traffic';
import { INTERSECTIONS, TRAFFIC_EDGES } from '../data/intersections';
import { applyGreenCorridor, clearGreenCorridor, estimateEmergencyETA, computeTrafficState } from '../services/mockSimulation';
import TrafficNetwork from '../components/TrafficNetwork';

interface Props {
  intersections?: Intersection[];
}

type Phase = 'idle' | 'calculating' | 'active' | 'clearing' | 'complete';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ROUTE = ['S1', 'S3', 'S4'];
const ROUTE_NAMES: Record<string, string> = {
  S1: 'North Gate Junction',
  S3: 'Central Hub',
  S4: 'East Corridor',
};

const LOG_MESSAGES = [
  { t: 0, msg: '🚨 Emergency call received — Ambulance UNIT-01 dispatched', type: 'alert' },
  { t: 900, msg: '📍 Calculating shortest route using NetworkX graph algorithm...', type: 'info' },
  { t: 1800, msg: '🔍 Analyzing traffic conditions on S1 → S3 → S4 corridor', type: 'info' },
  { t: 2700, msg: '⚛️ Running QAOA optimization for signal priority configuration', type: 'quantum' },
  { t: 3600, msg: '✅ Green corridor computed — 3 intersections affected', type: 'success' },
  { t: 4500, msg: '🟢 S1: Signal phase set to EMERGENCY_GREEN (60s)', type: 'signal' },
  { t: 5400, msg: '🟢 S3: Signal phase set to EMERGENCY_GREEN (60s)', type: 'signal' },
  { t: 6300, msg: '🟢 S4: Signal phase set to EMERGENCY_GREEN (60s)', type: 'signal' },
  { t: 7200, msg: '🚑 UNIT-01 moving through green corridor...', type: 'alert' },
  { t: 12000, msg: '🏥 UNIT-01 arrived at City Hospital', type: 'success' },
  { t: 12600, msg: '🔄 Restoring adaptive traffic control...', type: 'info' },
  { t: 13200, msg: '✅ Normal operation resumed. All signals returned to adaptive mode.', type: 'success' },
];

const LOG_COLORS: Record<string, string> = {
  alert: 'text-red-400',
  info: 'text-slate-300',
  quantum: 'text-purple-400',
  success: 'text-green-400',
  signal: 'text-amber-400',
};

export default function EmergencyCorridorPage({ intersections: propIntersections }: Props) {
  const [localIntersections, setLocalIntersections] = useState(propIntersections ?? INTERSECTIONS);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentNode, setCurrentNode] = useState(0);
  const [etaBefore, setEtaBefore] = useState(0);
  const [etaAfter, setEtaAfter] = useState(0);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [logs, setLogs] = useState<typeof LOG_MESSAGES>([]);
  const [nodeStatus, setNodeStatus] = useState<Record<string, 'waiting' | 'green' | 'passed'>>({
    S1: 'waiting', S3: 'waiting', S4: 'waiting',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const logIntervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const logIndexRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propIntersections) setLocalIntersections(propIntersections);
  }, [propIntersections]);

  useEffect(() => {
    const { etaBefore: eb, etaAfter: ea } = estimateEmergencyETA(localIntersections, ROUTE);
    setEtaBefore(eb);
    setEtaAfter(ea);
  }, [localIntersections]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const simulateEmergency = async () => {
    if (phase !== 'idle' && phase !== 'complete') return;

    // Reset
    setProgress(0);
    setCurrentNode(0);
    setLogs([]);
    logIndexRef.current = 0;
    setNodeStatus({ S1: 'waiting', S3: 'waiting', S4: 'waiting' });

    const ix = propIntersections ?? INTERSECTIONS;
    const { etaBefore: eb, etaAfter: ea } = estimateEmergencyETA(ix, ROUTE);
    setEtaBefore(eb);
    setEtaAfter(ea);
    setRemainingSecs(ea);

    setPhase('calculating');

    // Add log messages progressively
    const startTime = Date.now();
    logIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      while (
        logIndexRef.current < LOG_MESSAGES.length &&
        LOG_MESSAGES[logIndexRef.current].t <= elapsed
      ) {
        setLogs(prev => [...prev, LOG_MESSAGES[logIndexRef.current]]);
        logIndexRef.current++;
      }
    }, 100);

    // Phase: calculating
    await new Promise(r => setTimeout(r, 3600));

    // Phase: activate corridor
    setPhase('active');
    const withCorridor = applyGreenCorridor(ix, ROUTE);
    setLocalIntersections(withCorridor);

    // Activate signals one by one
    await new Promise(r => setTimeout(r, 900));
    setNodeStatus(prev => ({ ...prev, S1: 'green' }));
    await new Promise(r => setTimeout(r, 900));
    setNodeStatus(prev => ({ ...prev, S3: 'green' }));
    await new Promise(r => setTimeout(r, 900));
    setNodeStatus(prev => ({ ...prev, S4: 'green' }));

    // Move ambulance through nodes
    const totalDuration = 7000;
    const stepMs = 60;
    let elapsed = 0;

    intervalRef.current = setInterval(() => {
      elapsed += stepMs;
      const p = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(p);
      setRemainingSecs(prev => Math.max(0, prev - stepMs / 1000));

      // Update current node
      const nodeIdx = Math.floor((p / 100) * ROUTE.length);
      setCurrentNode(Math.min(nodeIdx, ROUTE.length - 1));

      // Mark passed nodes
      if (p > 33) setNodeStatus(prev => ({ ...prev, S1: 'passed' }));
      if (p > 66) setNodeStatus(prev => ({ ...prev, S3: 'passed' }));
      if (p > 90) setNodeStatus(prev => ({ ...prev, S4: 'passed' }));

      if (p >= 100) {
        clearInterval(intervalRef.current!);
        clearInterval(logIntervalRef.current!);
        // Complete remaining logs
        LOG_MESSAGES.forEach(msg => {
          setLogs(prev => {
            if (!prev.find(m => m.msg === msg.msg)) return [...prev, msg];
            return prev;
          });
        });

        // Clear corridor
        setTimeout(() => {
          setPhase('clearing');
          const cleared = clearGreenCorridor(withCorridor);
          setLocalIntersections(cleared);
          setTimeout(() => setPhase('complete'), 1000);
        }, 500);
      }
    }, stepMs);
  };

  const reset = () => {
    clearInterval(intervalRef.current!);
    clearInterval(logIntervalRef.current!);
    setPhase('idle');
    setProgress(0);
    setCurrentNode(0);
    setLogs([]);
    setNodeStatus({ S1: 'waiting', S3: 'waiting', S4: 'waiting' });
    setLocalIntersections(propIntersections ?? INTERSECTIONS);
    logIndexRef.current = 0;
  };

  useEffect(() => () => {
    clearInterval(intervalRef.current!);
    clearInterval(logIntervalRef.current!);
  }, []);

  const nodeColor = (status: 'waiting' | 'green' | 'passed') => {
    if (status === 'green') return 'border-green-500 bg-green-500/20 text-green-400';
    if (status === 'passed') return 'border-green-600/50 bg-green-600/10 text-green-600';
    return 'border-slate-700 bg-slate-800/50 text-slate-500';
  };

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🚑 Emergency Green Corridor
            </h1>
            <p className="text-sm text-slate-400">
              NetworkX route planning + QAOA signal optimization for emergency vehicles
            </p>
          </div>
          <div className="flex items-center gap-2">
            {phase === 'active' && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="px-3 py-1.5 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 text-xs font-bold"
              >
                🚨 EMERGENCY ACTIVE
              </motion.div>
            )}
            {phase === 'complete' && (
              <div className="px-3 py-1.5 rounded-lg border border-green-500/50 bg-green-500/10 text-green-400 text-xs font-bold">
                ✓ MISSION COMPLETE
              </div>
            )}
          </div>
        </div>

        {/* ETA comparison */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass rounded-xl p-5 border border-red-500/20 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Without Optimization</p>
            <p className="text-4xl font-black text-red-400 font-mono">{formatTime(etaBefore)}</p>
            <p className="text-xs text-slate-500 mt-1">Standard traffic signals</p>
          </div>
          <div className={`glass rounded-xl p-5 border text-center transition-all duration-500 ${
            phase === 'active' || phase === 'complete' ? 'border-green-500/40 glow-green' : 'border-green-500/20'
          }`}>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">With Green Corridor</p>
            <p className={`text-4xl font-black font-mono transition-all ${
              phase === 'active' ? 'text-green-400' : 'text-green-500/60'
            }`}>
              {phase === 'active' ? formatTime(Math.max(0, remainingSecs)) : formatTime(etaAfter)}
            </p>
            <p className="text-xs text-green-400/70 mt-1">
              {phase === 'idle' ? 'Q-FLOW optimized estimate' : `${formatTime(etaBefore - etaAfter)} saved`}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">Simulation Result</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Left: Network + Route */}
          <div className="space-y-5">
            {/* Network */}
            <div className="glass rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                Traffic Network — {phase === 'active' ? '🟢 Corridor Active' : phase === 'complete' ? '✓ Restored' : 'Normal Mode'}
              </h3>
              <TrafficNetwork intersections={localIntersections} edges={TRAFFIC_EDGES} />
            </div>

            {/* Route timeline */}
            <div className="glass rounded-xl p-5 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
                Emergency Route — S1 → S3 → S4 → 🏥 City Hospital
              </h3>

              {/* Progress bar */}
              {phase !== 'idle' && (
                <div className="mb-4">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.06 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                    <span>Start</span>
                    <span>🚑 {Math.round(progress)}%</span>
                    <span>🏥 Hospital</span>
                  </div>
                </div>
              )}

              {/* Node status */}
              <div className="flex items-center gap-2">
                {/* Origin */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-10 h-10 rounded-lg border border-slate-600 bg-slate-800 flex items-center justify-center text-slate-500 text-xs font-bold">
                    AMB
                  </div>
                  <span className="text-xs text-slate-500">Dispatch</span>
                </div>
                <div className={`h-0.5 flex-1 ${progress > 5 ? 'bg-green-400' : 'bg-slate-700'} transition-all duration-500`} />

                {ROUTE.map((id, i) => (
                  <div key={id} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-500 ${nodeColor(nodeStatus[id])}`}>
                        <span className="font-bold text-sm">{id}</span>
                        <span className="text-xs mt-0.5">
                          {nodeStatus[id] === 'green' ? '🟢' : nodeStatus[id] === 'passed' ? '✓' : '⚪'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 text-center w-16">{ROUTE_NAMES[id]}</span>
                    </div>
                    {i < ROUTE.length - 1 && (
                      <div className={`h-0.5 w-8 transition-all duration-700 ${
                        nodeStatus[ROUTE[i+1]] !== 'waiting' ? 'bg-green-400' : 'bg-slate-700'
                      }`} />
                    )}
                  </div>
                ))}

                <div className={`h-0.5 flex-1 ${phase === 'complete' ? 'bg-green-400' : 'bg-slate-700'} transition-all duration-500`} />
                {/* Hospital */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl transition-all ${
                    phase === 'complete' ? 'border-green-500/50 bg-green-500/10' : 'border-blue-500/30 bg-blue-500/10'
                  }`}>
                    🏥
                  </div>
                  <span className="text-xs text-slate-400 text-center w-16">City Hospital</span>
                </div>
              </div>

              {phase === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20"
                >
                  <p className="text-green-400 font-bold text-sm">✅ Ambulance reached hospital</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Time saved: <span className="text-green-400 font-bold">{formatTime(etaBefore - etaAfter)}</span> — Simulation result
                  </p>
                </motion.div>
              )}
            </div>

            {/* Trigger button */}
            <div className="flex gap-3">
              <button
                onClick={simulateEmergency}
                disabled={phase === 'calculating' || phase === 'active' || phase === 'clearing'}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex-1 justify-center ${
                  phase === 'idle' || phase === 'complete'
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-wait'
                }`}
              >
                {phase === 'idle' || phase === 'complete'
                  ? <><Play size={16} /> SIMULATE EMERGENCY</>
                  : <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{phase === 'calculating' ? 'Calculating Route...' : 'Emergency Active...'}</>
                }
              </button>
              {(phase === 'active' || phase === 'complete') && (
                <button onClick={reset} className="px-4 py-3.5 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 text-sm transition-all">
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Right: System log */}
          <div className="space-y-4">
            {/* System log */}
            <div className="glass rounded-xl p-4 border border-white/5 h-full max-h-[520px] flex flex-col">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide flex items-center gap-2 shrink-0">
                <Radio size={12} className="text-cyan-400" />
                System Log
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-slate-600">
                    <AlertTriangle size={20} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Press "Simulate Emergency" to begin.</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2"
                    >
                      <span className="text-slate-600 text-xs font-mono shrink-0 mt-0.5">
                        {String(Math.floor(log.t / 1000)).padStart(2, '0')}s
                      </span>
                      <p className={`text-xs leading-relaxed ${LOG_COLORS[log.type]}`}>{log.msg}</p>
                    </motion.div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Technical breakdown */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                Technical Pipeline
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { icon: '📍', label: 'Route Planning', tech: 'NetworkX Dijkstra', done: phase !== 'idle' },
                  { icon: '📊', label: 'Traffic Analysis', tech: 'SUMO TraCI (Demo)', done: phase !== 'idle' },
                  { icon: '⚛️', label: 'Signal Optimization', tech: 'QAOA / Qiskit Aer', done: phase === 'active' || phase === 'complete' || phase === 'clearing' },
                  { icon: '🟢', label: 'Green Corridor', tech: 'Signal Override API', done: phase === 'active' || phase === 'complete' || phase === 'clearing' },
                  { icon: '🔄', label: 'Adaptive Restore', tech: 'Auto after clearance', done: phase === 'complete' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <div className="flex-1">
                      <span className={item.done ? 'text-white' : 'text-slate-500'}>{item.label}</span>
                      <span className="text-slate-600 ml-1 text-xs">({item.tech})</span>
                    </div>
                    {item.done ? (
                      <CheckCircle size={12} className="text-green-400 shrink-0" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-slate-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
