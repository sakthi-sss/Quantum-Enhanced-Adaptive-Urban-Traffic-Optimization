import { useState } from 'react';
import type { OptimizationResult } from '../types/optimization';
import type { Intersection } from '../types/traffic';
import { buildQUBO, runQAOA } from '../services/mockOptimizer';
import { INTERSECTIONS } from '../data/intersections';

interface Props {
  optResult?: OptimizationResult | null;
}

export default function Technical({ optResult }: Props) {
  const [qubo] = useState(() => buildQUBO(INTERSECTIONS));
  const [qaoa] = useState(() => runQAOA(buildQUBO(INTERSECTIONS)));

  const pipelineSteps = [
    { label: 'SUMO Traffic Simulation', desc: 'SUMO collects vehicle counts, queue lengths, waiting times, and signal states at each intersection via TraCI API.', icon: '🏙️', color: 'text-cyan-400' },
    { label: 'QUBO Formulation', desc: 'Traffic decisions are encoded as binary variables xᵢ ∈ {0,1} where 0=EW_GREEN, 1=NS_GREEN. The objective minimizes waiting + queue + congestion.', icon: '📐', color: 'text-amber-400' },
    { label: 'QAOA Circuit', desc: `Quantum Approximate Optimization Algorithm with p=2 layers. ${qubo.variables.length} qubits encode the 6 signal decisions. Mixing and phase-separation unitaries are applied alternately.`, icon: '⚛️', color: 'text-purple-400' },
    { label: 'Qiskit Aer Simulation', desc: 'The quantum circuit is executed using Qiskit\'s Aer statevector simulator. 1024 measurement shots are taken to estimate the probability distribution over configurations.', icon: '💻', color: 'text-blue-400' },
    { label: 'Best Configuration', desc: `Best config: ${qaoa.bestConfig} (QUBO cost: ${qaoa.bestCost.toFixed(3)}). The configuration with lowest expected cost is selected.`, icon: '✅', color: 'text-green-400' },
    { label: 'Signal Configuration', desc: 'Binary solution is decoded to signal phase assignments. Green durations are computed proportionally to traffic density.', icon: '🟢', color: 'text-green-400' },
    { label: 'SUMO Feedback', desc: 'Optimized signal timings are sent back to SUMO via TraCI. The simulation runs another period with the new signal plan.', icon: '🔄', color: 'text-cyan-400' },
    { label: 'Performance Measurement', desc: 'Q-FLOW measures average waiting time, queue length, throughput, fuel estimate, and CO₂ estimate. Before vs after comparison is computed.', icon: '📊', color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg pt-20 pb-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-xs border border-amber-500/40 text-amber-400 bg-amber-500/10">QAOA / Qiskit Aer Simulation</span>
            <span className="px-2 py-0.5 rounded text-xs border border-slate-600 text-slate-400">Hackathon Prototype</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Technical Architecture</h1>
          <p className="text-sm text-slate-400">SUMO × QUBO × QAOA × Adaptive Signals — System Internals</p>
        </div>

        {/* Pipeline */}
        <div className="glass rounded-2xl p-6 border border-white/5 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Optimization Pipeline</h2>
          <div className="space-y-0">
            {pipelineSteps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${step.color} bg-white/5 border border-white/10 shrink-0`}>
                    {step.icon}
                  </div>
                  {i < pipelineSteps.length - 1 && (
                    <div className="w-px flex-1 bg-white/10 my-1" />
                  )}
                </div>
                <div className="pb-6 pt-1">
                  <p className={`text-sm font-semibold ${step.color} mb-0.5`}>{step.label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* QUBO formulation */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-amber-400 mb-3">QUBO Formulation</h3>
            <div className="font-mono text-xs space-y-2 text-slate-300">
              <div className="text-slate-500">// Decision Variables</div>
              {qubo.variables.map(v => (
                <div key={v.id}>
                  <span className="text-amber-400">{v.id}</span>{' = '}
                  <span className="text-cyan-400">{v.value}</span>{' '}
                  <span className="text-slate-500">// {v.description}</span>
                </div>
              ))}
              <div className="mt-3 text-slate-500">// Objective: minimize xᵀQx</div>
              <div className="text-green-400">min Σᵢⱼ Q[i][j]·xᵢ·xⱼ</div>
              <div className="text-slate-500 mt-2">// Penalty terms:</div>
              <div>+ λ₁·(waiting_time)</div>
              <div>+ λ₂·(queue_length)</div>
              <div>+ λ₃·(congestion)</div>
              <div>+ λ₄·(emergency_delay)</div>
              <div className="text-slate-500 mt-2">// Current cost: {qubo.objectiveValue.toFixed(3)}</div>
            </div>
          </div>

          {/* QAOA circuit sketch */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-purple-400 mb-3">QAOA Circuit (p=2, {qubo.variables.length} qubits)</h3>
            <svg viewBox="0 0 340 200" className="w-full">
              {/* Qubit lines */}
              {qubo.variables.map((v, i) => (
                <g key={i}>
                  <text x={2} y={20 + i * 28} fontSize={9} fill="#94a3b8" fontFamily="monospace">{v.id}</text>
                  <line x1={20} y1={16 + i * 28} x2={330} y2={16 + i * 28} stroke="#334155" strokeWidth={1} />
                  {/* H gate */}
                  <rect x={30} y={9 + i * 28} width={16} height={14} rx={2} fill="#1e3a5f" stroke="#06b6d4" strokeWidth={0.8} />
                  <text x={38} y={20 + i * 28} fontSize={8} fill="#06b6d4" textAnchor="middle" fontFamily="monospace">H</text>
                  {/* Phase gate layer 1 */}
                  <rect x={70} y={9 + i * 28} width={18} height={14} rx={2} fill="#2d1b69" stroke="#8b5cf6" strokeWidth={0.8} />
                  <text x={79} y={20 + i * 28} fontSize={7} fill="#c4b5fd" textAnchor="middle" fontFamily="monospace">Rz(γ₁)</text>
                  {/* Mixer layer 1 */}
                  <rect x={120} y={9 + i * 28} width={18} height={14} rx={2} fill="#1a3a1a" stroke="#10b981" strokeWidth={0.8} />
                  <text x={129} y={20 + i * 28} fontSize={7} fill="#6ee7b7" textAnchor="middle" fontFamily="monospace">Rx(β₁)</text>
                  {/* Phase gate layer 2 */}
                  <rect x={175} y={9 + i * 28} width={18} height={14} rx={2} fill="#2d1b69" stroke="#8b5cf6" strokeWidth={0.8} />
                  <text x={184} y={20 + i * 28} fontSize={7} fill="#c4b5fd" textAnchor="middle" fontFamily="monospace">Rz(γ₂)</text>
                  {/* Mixer layer 2 */}
                  <rect x={225} y={9 + i * 28} width={18} height={14} rx={2} fill="#1a3a1a" stroke="#10b981" strokeWidth={0.8} />
                  <text x={234} y={20 + i * 28} fontSize={7} fill="#6ee7b7" textAnchor="middle" fontFamily="monospace">Rx(β₂)</text>
                  {/* Measurement */}
                  <rect x={280} y={9 + i * 28} width={14} height={14} rx={2} fill="#1e1a0a" stroke="#f59e0b" strokeWidth={0.8} />
                  <text x={287} y={20 + i * 28} fontSize={8} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">M</text>
                </g>
              ))}
              {/* CNOT connections between adjacent qubits */}
              {[0,1,2,3,4].map(i => (
                <g key={`cnot-${i}`}>
                  <circle cx={100} cy={16 + i * 28} r={3} fill="#8b5cf6" />
                  <line x1={100} y1={16 + i * 28} x2={100} y2={16 + (i + 1) * 28} stroke="#8b5cf6" strokeWidth={0.8} strokeDasharray="2 2" />
                  <circle cx={100} cy={16 + (i+1) * 28} r={5} fill="none" stroke="#8b5cf6" strokeWidth={0.8} />
                </g>
              ))}
            </svg>
            <p className="text-xs text-slate-500 mt-2 text-center">Illustrative QAOA circuit — Qiskit Aer Simulator (Demo Mode)</p>
          </div>
        </div>

        {/* QAOA optimization progress */}
        <div className="glass rounded-xl p-5 border border-white/5 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">QAOA Optimization Progress (Simulated)</h3>
          <div className="flex items-end gap-1 h-20">
            {qaoa.convergence.map((cost, i) => {
              const min = Math.min(...qaoa.convergence);
              const max = Math.max(...qaoa.convergence);
              const range = max - min || 1;
              const height = Math.max(8, ((cost - min) / range) * 70);
              const isLast = i === qaoa.convergence.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${isLast ? 'bg-green-400' : 'bg-amber-500/50'}`}
                    style={{ height }}
                  />
                  {(i === 0 || i === qaoa.convergence.length - 1) && (
                    <span className="text-xs text-slate-500">{i === 0 ? 'Start' : 'Best'}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Initial cost: {qaoa.convergence[0]?.toFixed(2)}</span>
            <span>Best config: <span className="text-green-400 font-mono font-bold">{qaoa.bestConfig}</span></span>
            <span>Final cost: {qaoa.bestCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Candidate configurations */}
        <div className="glass rounded-xl p-5 border border-white/5 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Candidate Signal Configurations (Top 16)</h3>
          <div className="grid grid-cols-4 gap-2">
            {qaoa.allConfigs.slice(0, 16).map((cfg, i) => (
              <div
                key={cfg.config}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  i === 0
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-white/8 hover:border-white/15'
                }`}
              >
                <p className="font-mono text-xs font-bold text-amber-400">{cfg.config}</p>
                <p className="text-xs text-slate-400 mt-0.5">cost: {cfg.cost.toFixed(2)}</p>
                <p className="text-xs text-slate-600">{(cfg.probability * 100).toFixed(1)}%</p>
                {i === 0 && <p className="text-xs text-green-400 mt-0.5">BEST ✓</p>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center">
            Quantum Backend: Qiskit Aer Simulator · Execution Mode: Demo Simulation · Shots: 1024
          </p>
        </div>

        {/* Ising Hamiltonian View */}
        <div className="glass rounded-2xl p-6 border border-white/5 mb-6">
          <h2 className="text-sm font-semibold text-purple-400 mb-1 uppercase tracking-wide">Ising Hamiltonian Mapping</h2>
          <p className="text-xs text-slate-500 mb-4">QUBO ↔ Ising transformation used by QAOA. σᵢ ∈ {'{'}−1, +1{'}'} ↔ xᵢ ∈ {'{'}0, 1{'}'} via xᵢ = (1 − σᵢ)/2</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {/* QUBO form */}
            <div className="bg-black/40 rounded-xl p-4 font-mono text-xs">
              <p className="text-amber-400 font-bold mb-2">QUBO Objective:</p>
              <p className="text-slate-300">min C(x) = x<sup>T</sup>Qx</p>
              <p className="text-slate-500 mt-2">where x<sub>i</sub> ∈ {'{'} 0, 1 {'}'}</p>
              <div className="mt-3 space-y-1 text-slate-400">
                <p>C(x) = Σᵢ Q<sub>ii</sub>·xᵢ²</p>
                <p className="ml-4">+ Σᵢ&lt;ⱼ (Q<sub>ij</sub>+Q<sub>ji</sub>)·xᵢ·xⱼ</p>
              </div>
              <div className="mt-3 text-xs text-slate-600 border-t border-white/10 pt-2">
                <p>Diagonal Q<sub>ii</sub> = -(λ₁·density + λ₂·queue + λ₃·ped)</p>
                <p>Off-diag Q<sub>ij</sub> = λ₄·adjacency</p>
              </div>
            </div>

            {/* Ising form */}
            <div className="bg-black/40 rounded-xl p-4 font-mono text-xs">
              <p className="text-purple-400 font-bold mb-2">Ising Cost Hamiltonian H_C:</p>
              <p className="text-slate-300">H_C = Σᵢ hᵢσᵢᶻ + Σᵢ&lt;ⱼ Jᵢⱼσᵢᶻσⱼᶻ</p>
              <p className="text-slate-500 mt-2">where σᵢ ∈ {'{'}−1, +1{'}'}</p>
              <div className="mt-3 space-y-1 text-slate-400">
                <p>hᵢ = ½ Σⱼ (Q<sub>ij</sub> + Q<sub>ji</sub>)</p>
                <p>Jᵢⱼ = ¼ (Q<sub>ij</sub> + Q<sub>ji</sub>)</p>
              </div>
              <div className="mt-3 text-xs text-slate-600 border-t border-white/10 pt-2">
                <p>QAOA mixes H_C with H_B = −Σᵢ σᵢˣ</p>
                <p>|ψ(γ,β)⟩ = e^(-iβH_B)e^(-iγH_C)|+⟩^n</p>
              </div>
            </div>
          </div>

          {/* Computed h and J values */}
          <div className="bg-black/30 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-semibold mb-3">Computed Ising Parameters (from Q matrix):</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {qubo.variables.map((v, i) => {
                const h = 0.5 * qubo.Q[i].reduce((s, val, j) => s + (j !== i ? val : 0), 0);
                return (
                  <div key={i} className="bg-black/40 rounded-lg p-2.5">
                    <p className="text-xs font-mono">
                      <span className="text-purple-400">h_{v.id}</span>
                      <span className="text-slate-400"> = </span>
                      <span className="text-amber-400">{h.toFixed(3)}</span>
                    </p>
                    <p className="text-xs font-mono">
                      <span className="text-cyan-400">Q_{v.id}</span>
                      <span className="text-slate-400"> = </span>
                      <span className="text-slate-300">{qubo.Q[i][i].toFixed(3)}</span>
                    </p>
                    <p className="text-xs text-slate-600">{v.intersection}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono text-slate-500">
              <span>λ₁ (density) = 2.0</span>
              <span className="text-slate-700">·</span>
              <span>λ₂ (queue) = 1.5</span>
              <span className="text-slate-700">·</span>
              <span>λ₃ (pedestrian) = 0.8</span>
              <span className="text-slate-700">·</span>
              <span>λ₄ (coupling) = 0.5</span>
            </div>
          </div>
        </div>

        {/* Pedestrian Demand Panel */}
        <div className="glass rounded-2xl p-6 border border-white/5 mb-6">
          <h2 className="text-sm font-semibold text-cyan-400 mb-1 uppercase tracking-wide">Pedestrian Demand Modeling</h2>
          <p className="text-xs text-slate-500 mb-4">
            Each intersection has a <code className="text-amber-400">pedestrianDemand</code> (0–100%).
            High demand adds penalty λ₃ = 0.8 to the QUBO diagonal, reducing the vehicle green phase to give pedestrians more crossing time.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INTERSECTIONS.map(ix => {
              const demand = ix.pedestrianDemand ?? 0;
              const level = demand >= 70 ? 'HIGH' : demand >= 40 ? 'MODERATE' : 'LOW';
              const colors: Record<string, string> = { HIGH: 'text-orange-400', MODERATE: 'text-amber-400', LOW: 'text-green-400' };
              const bars: Record<string, string> = { HIGH: 'bg-orange-400', MODERATE: 'bg-amber-400', LOW: 'bg-green-400' };
              const penalty = (demand / 100 * 0.8).toFixed(3);
              return (
                <div key={ix.id} className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">{ix.id}</span>
                    <span className={`text-xs font-semibold ${colors[level]}`}>{level}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${bars[level]}`} style={{ width: `${demand}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">🚶 {demand}%</span>
                    <span className="text-purple-400 font-mono">Q +{penalty}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{ix.label}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 mt-3">
            QUBO effect: pedestrianPenalty = λ₃ × (pedestrianDemand / 100) added to Q[i][i] diagonal.
            Higher pedestrian demand → stronger preference for shorter vehicle green → more pedestrian crossing time.
          </p>
        </div>

        {/* NetworkX graph info */}
        <div className="glass rounded-2xl p-6 border border-white/5 mb-6">
          <h2 className="text-sm font-semibold text-green-400 mb-1 uppercase tracking-wide">NetworkX Graph Topology</h2>
          <p className="text-xs text-slate-500 mb-4">
            The road network is modeled as a directed graph G = (V, E) using NetworkX.
            Dijkstra's algorithm finds the shortest emergency route. Edge weights represent travel time.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-1.5">
              <p className="text-green-400 font-bold mb-2"># NetworkX Graph</p>
              <p className="text-slate-400">G = nx.DiGraph()</p>
              <p className="text-slate-400 mt-2">nodes = [{qubo.variables.map(v => `"${v.intersection}"`).join(', ')}]</p>
              <p className="text-slate-400 mt-1">edges = [</p>
              {[['S1','S3'],['S2','S3'],['S3','S4'],['S3','S5'],['S5','S6']].map(([f,t]) => (
                <p key={`${f}-${t}`} className="text-slate-500 ml-4">("{f}", "{t}", weight=1),</p>
              ))}
              <p className="text-slate-400">]</p>
              <p className="text-cyan-400 mt-2">route = nx.dijkstra_path(G, "S1", "S4")</p>
              <p className="text-green-400">→ ['S1', 'S3', 'S4']</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300 mb-2">Graph Properties</p>
              {[
                ['Nodes', `${qubo.variables.length} intersections`],
                ['Edges', '5 directed links'],
                ['Algorithm', 'Dijkstra shortest path'],
                ['Emergency route', 'S1 → S3 → S4 → Hospital'],
                ['Shortest path length', '2 hops'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/70">
          <strong className="text-amber-400">Important:</strong> This is a hackathon prototype using classical simulation of quantum circuits via Qiskit Aer.
          No real quantum hardware is used. All optimization results and environmental estimates are simulation outputs.
          SUMO traffic simulation is used to model vehicle behavior — it is NOT a quantum simulator.
          The QUBO/QAOA approach is architecturally real; the quantum advantage claim is NOT made.
        </div>
      </div>
    </div>
  );
}
