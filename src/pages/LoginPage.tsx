import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (role: 'ambulance' | 'traffic') => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [role, setRole] = useState<'ambulance' | 'traffic' | null>(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!role) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    onLogin(role);
    navigate(role === 'ambulance' ? '/ambulance' : '/control');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050810] circuit-bg px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/4 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Zap size={20} className="text-amber-400" />
            </div>
            <span className="text-3xl font-black text-gradient-gold">Q-FLOW</span>
          </div>
          <p className="text-slate-400 text-sm">Smart Emergency & Traffic Network</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 border border-white/8">
          <h2 className="text-xl font-bold text-white mb-1">Welcome Back</h2>
          <p className="text-slate-400 text-sm mb-6">Choose your role to continue</p>

          {/* Role selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              {
                id: 'ambulance' as const,
                icon: '🚑',
                label: 'Ambulance',
                sublabel: 'Emergency Response',
                border: 'border-red-500/50 bg-red-500/10',
                inactive: 'border-white/10 hover:border-red-500/30',
              },
              {
                id: 'traffic' as const,
                icon: '🚦',
                label: 'Traffic Control',
                sublabel: 'City Operations',
                border: 'border-amber-500/50 bg-amber-500/10',
                inactive: 'border-white/10 hover:border-amber-500/30',
              },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                  role === r.id ? r.border : r.inactive
                }`}
              >
                <span className="text-3xl">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-xs text-slate-500">{r.sublabel}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="space-y-3 mb-6">
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="User ID / Email"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Demo note */}
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400/80">
              Demo Access — No real authentication. Any credentials accepted.
            </p>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={!role || loading}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              role && !loading
                ? 'bg-amber-500 hover:bg-amber-400 text-black glow-gold'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authenticating...
              </span>
            ) : 'LOGIN'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
