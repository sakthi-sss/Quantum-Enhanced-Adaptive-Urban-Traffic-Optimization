interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  accent?: 'gold' | 'cyan' | 'green' | 'red' | 'orange';
  sublabel?: string;
}

export default function MetricCard({
  label, value, unit, icon, trend, trendLabel, accent = 'cyan', sublabel
}: MetricCardProps) {
  const accentBorder: Record<string, string> = {
    gold: 'border-amber-500/30 hover:border-amber-500/60',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/60',
    green: 'border-green-500/30 hover:border-green-500/60',
    red: 'border-red-500/30 hover:border-red-500/60',
    orange: 'border-orange-500/30 hover:border-orange-500/60',
  };
  const accentText: Record<string, string> = {
    gold: 'text-amber-400',
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    red: 'text-red-400',
    orange: 'text-orange-400',
  };

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };
  const trendIcons = { up: '↑', down: '↓', neutral: '→' };

  return (
    <div className={`glass rounded-xl p-4 border transition-all duration-300 ${accentBorder[accent]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/5 ${accentText[accent]}`}>
          {icon}
        </div>
        {trend && trendLabel && (
          <span className={`text-xs font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]} {trendLabel}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${accentText[accent]}`}>{value}</span>
          {unit && <span className="text-xs text-slate-400">{unit}</span>}
        </div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
      </div>
    </div>
  );
}
