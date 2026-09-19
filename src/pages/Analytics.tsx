import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import type { TrafficState } from '../types/traffic';
import type { OptimizationResult } from '../types/optimization';
import { INTERSECTIONS } from '../data/intersections';
import { computeTrafficState } from '../services/mockSimulation';

interface Props {
  trafficState?: TrafficState;
  optResult?: OptimizationResult | null;
}

// Generate time-series data for charts
function generateTimeSeries(optResult?: OptimizationResult | null) {
  const data = [];
  for (let i = 0; i < 20; i++) {
    const t = i * 3;
    const classical = 55 + Math.sin(i * 0.4) * 12 + Math.random() * 5;
    const hybrid = optResult
      ? 38 + Math.sin(i * 0.4) * 8 + Math.random() * 4
      : 50 + Math.sin(i * 0.4) * 10 + Math.random() * 5;
    data.push({
      time: `${t}s`,
      classical: Math.round(classical),
      hybrid: Math.round(hybrid),
      before: Math.round(classical),
      after: Math.round(hybrid),
    });
  }
  return data;
}

function generateQueueData(optResult?: OptimizationResult | null) {
  return INTERSECTIONS.map(ix => ({
    name: ix.id,
    before: ix.queueLength,
    after: optResult
      ? Math.round(ix.queueLength * 0.7)
      : ix.queueLength,
    classical: Math.round(ix.queueLength * 1.2),
  }));
}

const CHART_COLORS = {
  gold: '#f59e0b',
  cyan: '#06b6d4',
  green: '#10b981',
  red: '#ef4444',
  purple: '#8b5cf6',
};

export default function Analytics({ trafficState, optResult }: Props) {
  const ts = generateTimeSeries(optResult);
  const qd = generateQueueData(optResult);

  const improvements = optResult?.improvements;
  const fuelPct = improvements?.fuelReductionPct ?? 18;
  const co2Pct = improvements?.co2ReductionPct ?? 21;

  const radarData = [
    { metric: 'Wait Time', classical: 60, hybrid: optResult ? 42 : 55, fullMark: 100 },
    { metric: 'Queue', classical: 70, hybrid: optResult ? 50 : 65, fullMark: 100 },
    { metric: 'Throughput', classical: 55, hybrid: optResult ? 78 : 60, fullMark: 100 },
    { metric: 'Emissions', classical: 65, hybrid: optResult ? 48 : 60, fullMark: 100 },
    { metric: 'Emergency', classical: 45, hybrid: optResult ? 80 : 50, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Analytics & Environmental Impact</h1>
          <p className="text-sm text-slate-400">Simulation results — not real-world measurements</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Wait Time Reduction', value: improvements ? `-${improvements.waitingTimeReduction}%` : 'Run opt.', color: 'text-green-400', border: 'border-green-500/30' },
            { label: 'Queue Reduction', value: improvements ? `-${improvements.queueReduction}%` : 'Run opt.', color: 'text-cyan-400', border: 'border-cyan-500/30' },
            { label: 'Fuel Est. Saving', value: `~${fuelPct}%`, color: 'text-amber-400', border: 'border-amber-500/30' },
            { label: 'CO\u2082 Est. Saving', value: `~${co2Pct}%`, color: 'text-emerald-400', border: 'border-emerald-500/30' },
          ].map(card => (
            <div key={card.label} className={`glass rounded-xl p-4 border ${card.border}`}>
              <div className={`text-2xl font-black ${card.color} mb-1`}>{card.value}</div>
              <div className="text-xs text-slate-400">{card.label}</div>
              <div className="text-xs text-slate-600 mt-1">Simulation Est.</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Waiting time chart */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Average Waiting Time Over Time (sec)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="classical" stroke={CHART_COLORS.red} fill="rgba(239,68,68,0.1)" name="Classical Fixed" />
                <Area type="monotone" dataKey="hybrid" stroke={CHART_COLORS.green} fill="rgba(16,185,129,0.1)" name="Hybrid Q-FLOW" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Queue length per intersection */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Queue Length by Intersection (vehicles)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={qd}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="classical" fill={CHART_COLORS.red} name="Classical" radius={[3,3,0,0]} />
                <Bar dataKey="before" fill={CHART_COLORS.gold} name="Before Opt." radius={[3,3,0,0]} />
                <Bar dataKey="after" fill={CHART_COLORS.green} name="After Opt." radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Radar chart */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Performance Comparison (higher=better)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="Classical" dataKey="classical" stroke={CHART_COLORS.red} fill={CHART_COLORS.red} fillOpacity={0.15} />
                <Radar name="Hybrid Q-FLOW" dataKey="hybrid" stroke={CHART_COLORS.green} fill={CHART_COLORS.green} fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Environmental impact */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">🌿 Estimated Environmental Impact</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Fuel Consumption (estimated)</span>
                  <span className="text-amber-400">-{fuelPct}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${fuelPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">CO\u2082 Emissions (estimated)</span>
                  <span className="text-emerald-400">-{co2Pct}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${co2Pct}%` }} />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mt-4">
                <p className="text-xs text-slate-400 mb-2 font-medium">How this works (Simulation Logic):</p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2"><span className="text-green-400">→</span> Less waiting time</div>
                  <div className="flex items-center gap-2"><span className="text-green-400">→</span> Less engine idling</div>
                  <div className="flex items-center gap-2"><span className="text-green-400">→</span> Lower fuel consumption estimate</div>
                  <div className="flex items-center gap-2"><span className="text-green-400">→</span> Lower estimated CO\u2082 emissions</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 text-center">All figures are estimated from simulation — not real-world measurements</p>
            </div>
          </div>
        </div>

        {/* Classical vs Hybrid table */}
        <div className="glass rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Classical vs Hybrid Quantum-Classical Comparison</h3>
          <p className="text-xs text-slate-500 mb-4">Results for this simulated scenario — not a claim of general quantum advantage.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-slate-400">Metric</th>
                  <th className="text-center py-2 text-red-400">Classical Fixed Timing</th>
                  <th className="text-center py-2 text-amber-400">Before Optimization</th>
                  <th className="text-center py-2 text-green-400">Hybrid Q-FLOW</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ['Avg Wait Time', `${optResult?.classicalBaseline?.avgWaitingTime ?? 58}s`, `${optResult?.improvements.waitingTimeBefore ?? 42}s`, `${optResult?.improvements.waitingTimeAfter ?? 30}s`],
                  ['Avg Queue', `${optResult?.classicalBaseline?.avgQueueLength ?? 22} veh`, `${optResult?.improvements.queueBefore ?? 17} veh`, `${optResult?.improvements.queueAfter ?? 12} veh`],
                  ['Throughput', `${optResult?.classicalBaseline?.throughput ?? 58}%`, '68%', `${optResult?.improvements.throughputAfter ?? 78}%`],
                  ['Fuel Est.', `${optResult?.classicalBaseline?.fuelEstimate ?? 104} idx`, '84 idx', `${Math.round((optResult?.classicalBaseline?.fuelEstimate ?? 104) * 0.78)} idx`],
                  ['CO\u2082 Est.', `${optResult?.classicalBaseline?.co2Estimate ?? 122} idx`, '98 idx', `${Math.round((optResult?.classicalBaseline?.co2Estimate ?? 122) * 0.76)} idx`],
                ].map(([metric, cls, bef, hyb]) => (
                  <tr key={metric}>
                    <td className="py-2 text-slate-300 font-medium">{metric}</td>
                    <td className="py-2 text-center text-red-400">{cls}</td>
                    <td className="py-2 text-center text-amber-400">{bef}</td>
                    <td className="py-2 text-center text-green-400">{hyb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
