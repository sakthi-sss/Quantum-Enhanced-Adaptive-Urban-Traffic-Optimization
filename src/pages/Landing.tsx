import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, Zap, Activity, Radio, Map, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const PIPELINE_STEPS = [
  { icon: '🚗', label: 'Traffic Data', detail: 'SUMO collects vehicle counts, queue lengths, and densities across all 6 intersections in real time.' },
  { icon: '🏙️', label: 'SUMO Simulation', detail: 'The Simulation of Urban Mobility (SUMO) engine creates a realistic virtual city with dynamic vehicle behavior.' },
  { icon: '📐', label: 'QUBO Formulation', detail: 'Traffic decisions are encoded as binary variables in a Quadratic Unconstrained Binary Optimization problem.' },
  { icon: '⚛️', label: 'QAOA Optimization', detail: 'The Quantum Approximate Optimization Algorithm searches for signal configurations that minimize the QUBO cost.' },
  { icon: '💻', label: 'Qiskit Aer', detail: 'The quantum circuit is simulated using Qiskit\'s Aer simulator — a classical simulator of quantum circuits.' },
  { icon: '🟢', label: 'Optimized Signals', detail: 'The best-cost signal configuration is extracted from the measurement outcomes.' },
  { icon: '🔄', label: 'SUMO Feedback', detail: 'Optimized signal timings are applied back to SUMO, which runs the traffic simulation with the new plan.' },
  { icon: '📊', label: 'Performance Results', detail: 'Q-FLOW measures and displays the improvement in waiting time, queue length, throughput, and emissions.' },
];

const STATS = [
  { value: '6', label: 'Intersections' },
  { value: 'HYBRID', label: 'Optimization' },
  { value: 'GREEN', label: 'Corridor' },
  { value: 'SUMO', label: 'Simulation' },
];

export default function Landing() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!autoPlay) return;
    intervalRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % PIPELINE_STEPS.length);
    }, 2200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoPlay]);

  const handleStepClick = (i: number) => {
    setAutoPlay(false);
    setActiveStep(i);
  };

  return (
    <div className="min-h-screen bg-[#050810] circuit-bg text-white">
      {/* Navbar spacer */}
      <div className="h-16" />

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 text-center overflow-hidden">
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/5 blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px]" />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Hackathon Demo — Simulation Mode
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-7xl md:text-9xl font-black tracking-tighter mb-4"
        >
          <span className="text-gradient-gold">Q-FLOW</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl font-light text-slate-300 mb-3"
        >
          Smarter Signals. Faster Emergencies. Cleaner Cities.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm md:text-base text-slate-500 max-w-xl mb-10"
        >
          Hybrid quantum-classical optimization for adaptive urban traffic networks.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <Link
            to="/login"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all duration-200 glow-gold"
          >
            <Play size={16} />
            Run City Simulation
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/20 hover:border-cyan-500/50 text-white hover:text-cyan-400 font-medium text-sm transition-all"
          >
            Launch Control Center
            <ArrowRight size={16} />
          </Link>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl"
        >
          {STATS.map(s => (
            <div key={s.value} className="text-center">
              <div className="text-2xl font-black text-gradient-gold">{s.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-600 animate-bounce">
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ── PROBLEM STATEMENT ── */}
      <section className="py-24 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-cyan-400 uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Urban traffic is hard to optimize</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Cities have constantly changing traffic conditions. Traditional fixed signal timings cannot always react to sudden changes.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ['⚡', 'Sudden Congestion', 'Unexpected vehicle surges block intersections within minutes.'],
            ['🚑', 'Emergency Delays', 'Fixed signals can add minutes to ambulance travel times.'],
            ['🌫️', 'Idle Emissions', 'Long queues mean idling engines — wasted fuel and higher CO₂.'],
          ].map(([icon, title, desc]) => (
            <div key={title as string} className="glass rounded-xl p-5 border border-white/5">
              <div className="text-2xl mb-3">{icon}</div>
              <div className="font-semibold text-white text-sm mb-1">{title}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS — PIPELINE ── */}
      <section className="py-20 px-4 bg-[#070d1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-amber-400 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Q-FLOW Optimization Loop</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              A continuous feedback loop from traffic data to optimized signal decisions — powered by SUMO, QUBO, and QAOA.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_1.5fr] gap-8 items-start">
            {/* Step list */}
            <div className="space-y-1.5">
              {PIPELINE_STEPS.map((step, i) => (
                <button
                  key={i}
                  onClick={() => handleStepClick(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeStep === i
                      ? 'bg-amber-500/10 border border-amber-500/30 text-white'
                      : 'hover:bg-white/5 text-slate-400'
                  }`}
                >
                  <span className="text-lg shrink-0">{step.icon}</span>
                  <span className={`text-sm font-medium ${activeStep === i ? 'text-amber-400' : ''}`}>{step.label}</span>
                  {i < PIPELINE_STEPS.length - 1 && activeStep !== i && (
                    <ArrowRight size={12} className="ml-auto text-slate-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Active step detail */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-strong rounded-2xl p-8 border border-amber-500/15 min-h-[280px] flex flex-col justify-center"
              >
                <div className="text-5xl mb-6">{PIPELINE_STEPS[activeStep].icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Step {activeStep + 1}: {PIPELINE_STEPS[activeStep].label}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {PIPELINE_STEPS[activeStep].detail}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="flex gap-1">
                    {PIPELINE_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          i === activeStep ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span>{activeStep + 1} / {PIPELINE_STEPS.length}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── WHY OUR APPROACH ── */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-cyan-400 uppercase tracking-widest mb-3">Our Approach</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">More than a dashboard</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Q-FLOW does not simply show traffic. It makes and explains traffic-control decisions.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {[
            ['⚛️', 'Hybrid Optimization', 'Combines QUBO formulation with QAOA quantum-inspired search and classical post-processing.'],
            ['🚑', 'Emergency Corridor', 'Dynamically calculates and activates green corridors for emergency vehicles.'],
            ['🤔', 'Explainable Decisions', 'Every signal change comes with a plain-language explanation of why it was made.'],
            ['🔄', 'Closed-Loop Control', 'Optimized signals feed back into the simulation, measuring real improvement.'],
            ['📊', 'Classical Comparison', 'Results are compared against fixed-timing classical baseline — honestly.'],
            ['🌿', 'Environmental Impact', 'Estimates fuel and CO₂ savings from reduced idling — clearly labeled as simulation.'],
          ].map(([icon, title, desc]) => (
            <div key={title as string} className="glass rounded-xl p-5 border border-white/5 hover:border-amber-500/20 transition-colors">
              <div className="text-2xl mb-3">{icon}</div>
              <div className="font-semibold text-white text-sm mb-1">{title}</div>
              <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        <div className="glass-strong rounded-2xl p-6 border border-amber-500/20 text-center">
          <p className="text-slate-300 text-sm mb-1">Technical core:</p>
          <p className="text-gradient-gold font-mono text-lg font-bold">
            SUMO × QUBO × QAOA × Adaptive Signals
          </p>
          <p className="text-xs text-slate-500 mt-2">Prototype / Hackathon Demo — Simulation Results</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-4 text-center bg-[#070d1a]">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to see it in action?</h2>
        <p className="text-slate-400 mb-8">From traffic data to optimized decisions.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-base transition-all glow-gold"
        >
          Run the City Simulation →
        </Link>
        <p className="text-xs text-slate-600 mt-6">
          Demo Access — No real authentication required • All results are simulation estimates
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        <span className="text-gradient-gold font-bold">Q-FLOW</span> • Hybrid Quantum-Classical Adaptive Urban Traffic Optimization Platform
        <br />
        SUMO | QUBO | QAOA | Qiskit Aer | FastAPI | React — Hackathon Prototype
      </footer>
    </div>
  );
}
