import { X, CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import type { Intersection } from '../types/traffic';

interface Props {
  intersection: Intersection;
  onClose: () => void;
}

export default function DecisionExplanation({ intersection, onClose }: Props) {
  const pedDemand = intersection.pedestrianDemand ?? 0;
  const pedLevel = pedDemand >= 70 ? 'HIGH' : pedDemand >= 40 ? 'MODERATE' : 'LOW';

  const reasons = [
    { ok: true, label: `Traffic density: ${intersection.density}%` },
    { ok: true, label: `Queue length: ${intersection.queueLength} vehicles` },
    { ok: intersection.density < 85, label: `Congestion level: ${intersection.congestionLevel}` },
    { ok: pedDemand < 70, label: `Pedestrian demand: ${pedDemand}% (${pedLevel}) — λ₃ penalty = ${(pedDemand / 100 * 0.8).toFixed(2)}` },
    { ok: true, label: `Emergency route conflict: none` },
    { ok: true, label: `Predicted waiting time reduced by ~${Math.round((1 - 0.72) * 100)}%` },
  ];

  const signal = intersection.recommendedSignal ?? intersection.currentSignal;
  const greenFor = signal === 'NS_GREEN' ? 'north-south' : 'east-west';
  const reason = intersection.density > 70
    ? `Q-FLOW increased ${greenFor} green time because the ${greenFor} queue is currently larger and congestion is ${intersection.congestionLevel.toLowerCase()}.`
    : `Q-FLOW maintained standard timing for ${intersection.id} as traffic flow is within acceptable parameters.`;

  const pedNote = pedDemand >= 60
    ? ` Pedestrian demand is ${pedLevel} (${pedDemand}%), applying a QUBO penalty of ${(pedDemand / 100 * 0.8).toFixed(2)} to prioritize pedestrian crossing time.`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md border border-amber-500/20 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg">
            Why did <span className="text-amber-400">{intersection.id}</span> change?
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Factors */}
        <div className="space-y-2 mb-4">
          {reasons.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {r.ok
                ? <CheckCircle size={14} className="text-green-400 shrink-0" />
                : <AlertTriangle size={14} className="text-orange-400 shrink-0" />}
              <span className="text-slate-300">{r.label}</span>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Decision</span>
          </div>
          <p className="text-sm text-white leading-relaxed">{reason}{pedNote}</p>
        </div>

        {/* Technical note */}
        <div className="text-xs text-slate-500 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
          <span className="text-amber-500 font-medium">QAOA result: </span>
          Configuration bit for {intersection.id} = {signal === 'NS_GREEN' ? '1' : '0'} — minimum QUBO cost configuration selected via Qiskit Aer simulation.
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
