import { useState } from 'react';
import type { Intersection, CongestionLevel } from '../types/traffic';

interface Props {
  intersection: Intersection;
  x: number;
  y: number;
  showTechnical?: boolean;
  onClick: () => void;
}

function congestionColor(level: CongestionLevel): string {
  switch (level) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH':     return '#f97316';
    case 'MODERATE': return '#f59e0b';
    case 'LOW':      return '#10b981';
  }
}

function congestionBg(level: CongestionLevel): string {
  switch (level) {
    case 'CRITICAL': return 'rgba(239,68,68,0.15)';
    case 'HIGH':     return 'rgba(249,115,22,0.12)';
    case 'MODERATE': return 'rgba(245,158,11,0.12)';
    case 'LOW':      return 'rgba(16,185,129,0.12)';
  }
}

// SVG arc for pedestrian demand (clockwise from 12 o'clock)
function pedArc(r: number, pct: number): string {
  if (pct <= 0.01) return '';
  const capped = Math.min(pct, 0.999);
  const angle  = capped * 2 * Math.PI;
  const ex     = r * Math.sin(angle);
  const ey     = -r * Math.cos(angle);
  return `M 0 ${-r} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${ex} ${ey}`;
}

export default function IntersectionNode({ intersection: ix, x, y, showTechnical, onClick }: Props) {
  // Local hover state — drives SVG attribute changes, NO CSS transform
  const [hovered, setHovered] = useState(false);

  const BASE_R   = 28;
  const HOVER_R  = 31;          // Grow the circle radius on hover — no transform needed
  const r        = hovered ? HOVER_R : BASE_R;

  const color  = ix.isEmergencyActive ? '#10b981' : congestionColor(ix.congestionLevel);
  const bg     = ix.isEmergencyActive ? 'rgba(16,185,129,0.2)' : congestionBg(ix.congestionLevel);
  const ped    = ix.pedestrianDemand ?? 0;
  const padArcR = r + 8;

  // Invisible hit area — slightly larger than node, catches hover reliably
  const HIT_R = BASE_R + 14;

  return (
    // The <g> has ONLY translate — no CSS class that adds scale/transform
    <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}>

      {/* ── Invisible hit-area for reliable hover/click (no pointer gap) ── */}
      <circle
        r={HIT_R}
        fill="transparent"
        stroke="none"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        style={{ pointerEvents: 'all' }}
      />

      {/* ── Pulse ring (critical / emergency) — animates opacity only ── */}
      {(ix.congestionLevel === 'CRITICAL' || ix.isEmergencyActive) && (
        <circle
          r={38}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          className="svg-pulse-ring"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* ── Pedestrian demand arc (cyan, outside node) ── */}
      {ped > 5 && (
        <path
          d={pedArc(padArcR, ped / 100)}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={hovered ? 3 : 2.5}
          strokeOpacity={0.6}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* ── Outer dashed ring ── */}
      <circle
        r={r + 4}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeOpacity={hovered ? 0.7 : 0.4}
        strokeDasharray="4 3"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── Main circle — radius expands on hover (no transform) ── */}
      <circle
        r={r}
        fill={bg}
        stroke={color}
        strokeWidth={hovered ? 2.8 : 2}
        filter={hovered ? `drop-shadow(0 0 8px ${color}66)` : undefined}
        style={{
          transition: 'r 0.15s ease, stroke-width 0.15s ease',
          pointerEvents: 'none',
        }}
      />

      {/* ── Labels (pointer-events:none so they don't interfere with hit area) ── */}
      <text
        y={-8}
        textAnchor="middle"
        fontSize={hovered ? 13 : 12}
        fontWeight={700}
        fill={color}
        style={{ pointerEvents: 'none', transition: 'font-size 0.15s ease' }}
      >
        {ix.id}
      </text>
      <text y={6} textAnchor="middle" fontSize={10} fill="#e2e8f0" style={{ pointerEvents: 'none' }}>
        {ix.density}%
      </text>
      <text y={18} textAnchor="middle" fontSize={9} fill="#94a3b8" style={{ pointerEvents: 'none' }}>
        Q:{ix.queueLength}
      </text>

      {/* ── Emergency indicator ── */}
      {ix.isEmergencyActive && (
        <text y={-22} textAnchor="middle" fontSize={13} style={{ pointerEvents: 'none' }}>🚑</text>
      )}

      {/* ── Hover tooltip bubble ── */}
      {hovered && (
        <g style={{ pointerEvents: 'none' }}>
          <rect x={BASE_R + 10} y={-24} width={86} height={hovered && showTechnical ? 52 : 46} rx={5}
            fill="rgba(8,16,34,0.95)" stroke="rgba(99,102,241,0.35)" strokeWidth={0.8}
          />
          <text x={BASE_R + 53} y={-12} textAnchor="middle" fontSize={7.5} fill="#a5b4fc">
            {ix.currentSignal.replace('_', ' ')}
          </text>
          <text x={BASE_R + 53} y={-2} textAnchor="middle" fontSize={7.5} fill="#94a3b8">
            Wait {ix.waitingTime}s · Q{ix.queueLength}
          </text>
          <text x={BASE_R + 53} y={8} textAnchor="middle" fontSize={7} fill="#22d3ee">
            🚶 ped {ped}%
          </text>
          <text x={BASE_R + 53} y={18} textAnchor="middle" fontSize={6.5} fill="#6366f1">
            click for details
          </text>
        </g>
      )}

      {/* ── Technical overlay (when showTechnical is true and not hovering) ── */}
      {showTechnical && !hovered && (
        <g style={{ pointerEvents: 'none' }}>
          <rect x={BASE_R + 6} y={-18} width={70} height={38} rx={4}
            fill="rgba(10,22,40,0.92)" stroke="rgba(6,182,212,0.25)" strokeWidth={0.8}
          />
          <text x={BASE_R + 41} y={-7} textAnchor="middle" fontSize={7.5} fill="#06b6d4">
            {ix.currentSignal.replace('_', ' ')}
          </text>
          <text x={BASE_R + 41} y={3.5} textAnchor="middle" fontSize={7.5} fill="#94a3b8">
            {ix.greenDuration}s green
          </text>
          <text x={BASE_R + 41} y={13} textAnchor="middle" fontSize={7} fill="#22d3ee">
            🚶 ped {ped}%
          </text>
        </g>
      )}
    </g>
  );
}
