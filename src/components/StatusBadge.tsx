interface StatusBadgeProps {
  label: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEMO' | 'ACTIVE' | 'RUNNING' | 'SIMULATION';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ label, status, size = 'sm' }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    ONLINE: 'border-green-500/40 text-green-400 bg-green-500/10',
    ACTIVE: 'border-green-500/40 text-green-400 bg-green-500/10',
    RUNNING: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
    SIMULATION: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    DEMO: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    OFFLINE: 'border-red-500/40 text-red-400 bg-red-500/10',
  };
  const dotColors: Record<string, string> = {
    ONLINE: 'bg-green-400',
    ACTIVE: 'bg-green-400',
    RUNNING: 'bg-cyan-400',
    SIMULATION: 'bg-amber-400',
    DEMO: 'bg-amber-400',
    OFFLINE: 'bg-red-400',
  };

  const pad = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border font-medium ${colors[status] ?? colors.OFFLINE} ${pad}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status] ?? 'bg-gray-400'} animate-pulse`} />
      {label}
    </span>
  );
}
