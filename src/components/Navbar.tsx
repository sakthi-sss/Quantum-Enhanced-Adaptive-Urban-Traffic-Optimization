import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, X, Zap } from 'lucide-react';
import type { SystemStatus } from '../types/traffic';

interface NavbarProps {
  role: 'ambulance' | 'traffic' | null;
  status: SystemStatus;
  onLogout: () => void;
}

export default function Navbar({ role, status, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);



  const isAmbulance = role === 'ambulance';

  const navLinks = isAmbulance ? [
    { to: '/ambulance', label: 'Dashboard' },
    { to: '/emergency', label: 'Emergency' },
  ] : [
    { to: '/control', label: 'Dashboard' },
    { to: '/network', label: 'Live Network' },
    { to: '/emergency', label: 'Emergency' },
    { to: '/optimization', label: 'Optimization' },
    { to: '/whatif', label: 'What-If' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/technical', label: 'Technical' },
  ];

  const statusColor = (s: string) =>
    s === 'ONLINE' ? 'text-green-400' :
    s === 'DEMO' ? 'text-amber-400' :
    'text-red-400';

  const statusDot = (s: string) =>
    s === 'ONLINE' ? 'bg-green-400' :
    s === 'DEMO' ? 'bg-amber-400' :
    'bg-red-400';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/5">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Zap size={16} className="text-amber-400" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-gradient-gold">Q-FLOW</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded transition-all"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Status indicators */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${statusDot(status.fastapi)} animate-pulse`} />
              <span className={statusColor(status.fastapi)}>API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${statusDot(status.sumo)} animate-pulse`} />
              <span className={statusColor(status.sumo)}>SUMO</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${statusDot(status.qiskit)} animate-pulse`} />
              <span className={statusColor(status.qiskit)}>QISKIT</span>
            </div>
          </div>

          {role && (
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded text-xs font-medium border ${
                isAmbulance
                  ? 'border-red-500/40 text-red-400 bg-red-500/10'
                  : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
              }`}>
                {isAmbulance ? '🚑 AMBULANCE' : '🚦 TRAFFIC CTRL'}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-slate-400"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/5 px-4 py-3 flex flex-col gap-2">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className="py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          {role && (
            <button
              onClick={onLogout}
              className="py-2 text-sm text-red-400 text-left"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
