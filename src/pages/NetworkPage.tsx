import { useState } from 'react';
import type { Intersection } from '../types/traffic';
import TrafficNetwork from '../components/TrafficNetwork';
import MapNetwork from '../components/MapNetwork';
import { TRAFFIC_EDGES } from '../data/intersections';
import { Info, Map, Network } from 'lucide-react';

interface Props {
  intersections: Intersection[];
}

const CONGESTION_LABELS: Record<string, string> = {
  LOW: 'LOW — Normal flow',
  MODERATE: 'MODERATE — Some queuing',
  HIGH: 'HIGH — Significant queuing',
  CRITICAL: 'CRITICAL — Severe congestion',
};

export default function NetworkPage({ intersections }: Props) {
  const [selected, setSelected] = useState<Intersection | null>(null);
  const [view, setView] = useState<'map' | 'svg'>('map');

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Traffic Network</h1>
            <p className="text-sm text-slate-400">
              {view === 'map'
                ? 'OpenStreetMap — Bengaluru, Karnataka · Click any marker for full details'
                : 'SVG diagram — click any node for details & QUBO decision'}
            </p>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 glass rounded-xl p-1 border border-white/8">
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'map'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map size={14} />
              OpenStreetMap
            </button>
            <button
              onClick={() => setView('svg')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'svg'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network size={14} />
              Network Diagram
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_290px] gap-6">

          {/* Main view */}
          <div>
            {view === 'map' ? (
              <MapNetwork
                intersections={intersections}
                edges={TRAFFIC_EDGES}
              />
            ) : (
              <div className="glass rounded-2xl p-4 border border-white/5">
                <TrafficNetwork
                  intersections={intersections}
                  edges={TRAFFIC_EDGES}
                  showTechnical
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Selected intersection detail */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                Intersection Details
              </h3>
              {selected ? (
                <div className="space-y-3">
                  <div className="text-center mb-2">
                    <div className="text-3xl font-black text-amber-400">{selected.id}</div>
                    <div className="text-xs text-slate-400">{selected.label}</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {selected.lat.toFixed(4)}°N, {selected.lng.toFixed(4)}°E
                    </div>
                  </div>

                  {/* Density bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Traffic Density</span>
                      <span className="text-white font-semibold">{selected.density}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          selected.congestionLevel === 'CRITICAL' ? 'bg-red-400' :
                          selected.congestionLevel === 'HIGH' ? 'bg-orange-400' :
                          selected.congestionLevel === 'MODERATE' ? 'bg-amber-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${selected.density}%` }}
                      />
                    </div>
                  </div>

                  {/* Pedestrian bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">🚶 Ped Demand</span>
                      <span className="text-cyan-400 font-semibold">{selected.pedestrianDemand}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${selected.pedestrianDemand}%` }} />
                    </div>
                  </div>

                  {[
                    ['Queue', `${selected.queueLength} vehicles`],
                    ['Capacity', `${selected.capacity} max`],
                    ['Current Signal', selected.currentSignal.replace('_', ' ')],
                    ['Green Duration', `${selected.greenDuration}s`],
                    ['Waiting Time', `${selected.waitingTime}s avg`],
                    ['Throughput', `${selected.throughput} v/min`],
                    ['Congestion', CONGESTION_LABELS[selected.congestionLevel]],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-slate-500">{l}</span>
                      <span className="text-xs text-white text-right">{v}</span>
                    </div>
                  ))}

                  {selected.recommendedSignal && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs text-cyan-400 mb-1">Q-FLOW Recommends:</p>
                      <p className="text-xs text-white">
                        {selected.recommendedSignal.replace('_', ' ')} — {selected.recommendedGreen}s
                      </p>
                      {selected.reason && (
                        <p className="text-xs text-slate-500 mt-1">{selected.reason}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setSelected(null)}
                    className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors pt-1"
                  >
                    Clear selection
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-slate-600">
                  <Info size={20} />
                  <p className="text-xs text-center">
                    {view === 'map'
                      ? 'Click a marker on the map to view intersection details'
                      : 'Click an intersection in the diagram'}
                  </p>
                </div>
              )}
            </div>

            {/* All intersections list */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                All Intersections
              </h3>
              <div className="space-y-2">
                {intersections.map(ix => {
                  const colors: Record<string, string> = {
                    LOW: 'text-green-400', MODERATE: 'text-amber-400',
                    HIGH: 'text-orange-400', CRITICAL: 'text-red-400',
                  };
                  const bars: Record<string, string> = {
                    LOW: 'bg-green-400', MODERATE: 'bg-amber-400',
                    HIGH: 'bg-orange-400', CRITICAL: 'bg-red-400',
                  };
                  return (
                    <button
                      key={ix.id}
                      onClick={() => setSelected(ix)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all hover:bg-white/5 ${
                        selected?.id === ix.id ? 'bg-white/5 border border-white/10' : ''
                      }`}
                    >
                      <span className={`text-xs font-bold w-5 ${colors[ix.congestionLevel]}`}>{ix.id}</span>
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bars[ix.congestionLevel]}`}
                               style={{ width: `${ix.density}%` }} />
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {ix.label.replace(/^S\d+ – /, '')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">{ix.density}%</div>
                        <div className="text-xs text-cyan-600">🚶{ix.pedestrianDemand}%</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
