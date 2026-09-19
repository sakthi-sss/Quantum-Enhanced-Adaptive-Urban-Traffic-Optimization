import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Navigation, Activity, AlertCircle, CheckCircle, Radio } from 'lucide-react';
import type { Intersection } from '../types/traffic';
import type { Ambulance } from '../types/emergency';
import { estimateEmergencyETA } from '../services/mockSimulation';
import { EMERGENCY_ROUTE } from '../data/intersections';

interface Props {
  intersections: Intersection[];
}

const ROUTE_INTERSECTIONS = ['S1', 'S3', 'S4'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AmbulancePage({ intersections }: Props) {
  const [progress, setProgress] = useState(0);          // 0-100 along route
  const [currentNodeIdx, setCurrentNodeIdx] = useState(0);
  const [corridorActive, setCorridorActive] = useState(false);
  const [etaBefore, setEtaBefore] = useState(0);
  const [etaAfter, setEtaAfter] = useState(0);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [status, setStatus] = useState<'STANDBY' | 'EN_ROUTE' | 'ARRIVED'>('STANDBY');
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    const { etaBefore: eb, etaAfter: ea } = estimateEmergencyETA(intersections, EMERGENCY_ROUTE);
    setEtaBefore(eb);
    setEtaAfter(ea);
    setRemainingSecs(eb);
  }, [intersections]);

  const activateCorridor = () => {
    if (corridorActive) return;
    setCorridorActive(true);
    setStatus('EN_ROUTE');
    const { etaBefore: eb, etaAfter: ea } = estimateEmergencyETA(intersections, EMERGENCY_ROUTE);
    setEtaBefore(eb);
    setEtaAfter(ea);
    setRemainingSecs(ea);

    let p = 0;
    intervalRef.current = setInterval(() => {
      p += 1.5;
      setProgress(Math.min(p, 100));
      const nodeIdx = Math.floor((p / 100) * ROUTE_INTERSECTIONS.length);
      setCurrentNodeIdx(Math.min(nodeIdx, ROUTE_INTERSECTIONS.length - 1));
      setRemainingSecs(prev => Math.max(0, prev - 1));
      if (p >= 100) {
        clearInterval(intervalRef.current!);
        setStatus('ARRIVED');
      }
    }, 200);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const routeNodes = [
    { id: 'S1', label: 'S1', name: 'North Gate' },
    { id: 'S3', label: 'S3', name: 'Central Hub' },
    { id: 'S4', label: 'S4', name: 'East Junction' },
    { id: 'HOSP', label: '🏥', name: 'City Hospital' },
  ];

  const getNodeStatus = (i: number) => {
    if (!corridorActive) return 'inactive';
    if (i < currentNodeIdx) return 'passed';
    if (i === currentNodeIdx) return 'current';
    if (i === currentNodeIdx + 1) return 'next';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🚑</span>
              <h1 className="text-2xl font-bold text-white">AMBULANCE-01</h1>
            </div>
            <p className="text-sm text-slate-400">Emergency Response Unit</p>
          </div>
          <div className={`px-4 py-2 rounded-xl border font-bold text-sm flex items-center gap-2 ${
            status === 'ARRIVED'
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
              : corridorActive
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-slate-600 bg-slate-800/50 text-slate-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              status === 'ARRIVED' ? 'bg-blue-400' : corridorActive ? 'bg-green-400' : 'bg-slate-500'
            }`} />
            {status === 'ARRIVED' ? 'DESTINATION REACHED' : corridorActive ? 'GREEN CORRIDOR ACTIVE' : 'STANDBY'}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: ETA + Stats */}
          <div className="space-y-4">
            {/* ETA Card */}
            <div className="glass-strong rounded-2xl p-6 border border-amber-500/20 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Estimated Arrival</p>
              <div className="text-5xl font-black text-amber-400 mb-1 font-mono">
                {corridorActive ? formatTime(remainingSecs) : formatTime(etaBefore)}
              </div>
              {corridorActive && etaBefore !== etaAfter && (
                <div className="text-xs text-slate-500 flex items-center justify-center gap-2 mt-2">
                  <span className="line-through">{formatTime(etaBefore)}</span>
                  <span className="text-green-400">→ {formatTime(etaAfter)}</span>
                  <span className="text-green-400 font-medium">
                    ({formatTime(etaBefore - etaAfter)} saved)
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">Simulation Result</p>
            </div>

            {/* Stats */}
            <div className="glass rounded-xl p-4 border border-white/5 space-y-3">
              {[
                { icon: <Navigation size={14} />, label: 'Destination', value: 'City Hospital' },
                { icon: <MapPin size={14} />, label: 'Distance', value: '4.8 km' },
                { icon: <Activity size={14} />, label: 'Next Stop', value: routeNodes[Math.min(currentNodeIdx + 1, 3)]?.name ?? '—' },
                { icon: <Radio size={14} />, label: 'Signal', value: corridorActive ? '🟢 GREEN' : '⚪ STANDBY' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Dispatch button */}
            {status !== 'ARRIVED' && (
              <button
                onClick={activateCorridor}
                disabled={corridorActive}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  corridorActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-400 text-white animate-pulse-red'
                }`}
              >
                {corridorActive ? '🟢 Corridor Active' : '🚨 Activate Green Corridor'}
              </button>
            )}
          </div>

          {/* Center: Route map */}
          <div className="lg:col-span-2 space-y-4">
            {/* Route visualization */}
            <div className="glass rounded-2xl p-6 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
                Emergency Route
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {routeNodes.map((node, i) => {
                  const ns = getNodeStatus(i);
                  const isHosp = node.id === 'HOSP';
                  return (
                    <div key={node.id} className="flex items-center gap-2 shrink-0">
                      <div className={`flex flex-col items-center gap-1.5`}>
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 ${
                          ns === 'passed' ? 'border-green-400 bg-green-400/20 text-green-400' :
                          ns === 'current' ? 'border-amber-400 bg-amber-400/20 text-amber-400 animate-pulse-gold' :
                          ns === 'next' ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-400' :
                          corridorActive ? 'border-green-400/40 bg-green-400/5 text-green-400/60' :
                          isHosp ? 'border-blue-400/40 bg-blue-400/10 text-blue-400' :
                          'border-slate-600 bg-slate-800/50 text-slate-500'
                        }`}>
                          {ns === 'passed' ? '✓' : node.label}
                        </div>
                        <span className="text-xs text-slate-400 text-center w-16">{node.name}</span>
                        <span className={`text-xs font-bold ${
                          ns === 'passed' ? 'text-green-400' :
                          ns === 'current' ? 'text-amber-400' :
                          corridorActive && !isHosp ? 'text-green-400' :
                          'text-slate-600'
                        }`}>
                          {ns === 'passed' ? '✓ Passed' :
                           ns === 'current' ? '→ Here' :
                           corridorActive && !isHosp ? '🟢 Ready' :
                           isHosp ? '🏥 Dest' : '—'}
                        </span>
                      </div>
                      {i < routeNodes.length - 1 && (
                        <div className={`h-0.5 w-10 transition-all duration-700 ${
                          corridorActive ? 'bg-green-400' : 'bg-slate-700'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              {corridorActive && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>Route Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Corridor status */}
            <div className="glass rounded-xl p-5 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                Corridor Status
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Route calculated', done: true },
                  { label: 'Traffic signals coordinated', done: corridorActive },
                  { label: 'Green corridor activated', done: corridorActive },
                  { label: 'Approaching ' + (routeNodes[Math.min(currentNodeIdx + 1, 3)]?.name ?? 'Hospital'), done: corridorActive && progress > 20 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done
                      ? <CheckCircle size={14} className="text-green-400 shrink-0" />
                      : <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />}
                    <span className={`text-sm ${item.done ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority info */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                <span className="text-red-400 font-medium">Emergency vehicle has priority</span> on the optimized route. All conflicting signals will be held until the ambulance clears each intersection.
              </p>
            </div>

            {status === 'ARRIVED' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-6 rounded-2xl bg-green-500/10 border border-green-500/30"
              >
                <div className="text-4xl mb-2">🏥</div>
                <p className="text-green-400 font-bold text-lg">Destination Reached</p>
                <p className="text-slate-400 text-sm">
                  Time saved: <span className="text-green-400 font-bold">{formatTime(etaBefore - etaAfter)}</span> (simulation estimate)
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
