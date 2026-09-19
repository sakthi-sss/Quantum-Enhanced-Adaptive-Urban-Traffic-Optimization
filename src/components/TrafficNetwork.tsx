import { useState, useCallback } from 'react';
import type { Intersection, TrafficEdge } from '../types/traffic';
import IntersectionNode from './IntersectionNode';
import DecisionExplanation from './DecisionExplanation';

interface Props {
  intersections: Intersection[];
  edges: TrafficEdge[];
  showTechnical?: boolean;
}

const VIEWBOX = '0 0 640 640';

// Fixed SVG positions for nodes
const POS: Record<string, { x: number; y: number }> = {
  S1: { x: 100, y: 320 },
  S2: { x: 320, y: 100 },
  S3: { x: 320, y: 320 },
  S4: { x: 540, y: 320 },
  S5: { x: 320, y: 460 },
  S6: { x: 320, y: 580 },
};

// Road segment metadata
const ROAD_NAMES: Record<string, string> = {
  'S1-S3': 'West Arterial (Majestic – MG Rd)',
  'S3-S4': 'East Express (MG Rd – Indiranagar)',
  'S2-S3': 'North Boulevard (Shivajinagar – MG Rd)',
  'S3-S5': 'South Trunk (MG Rd – Richmond)',
  'S5-S6': 'South Highway (Richmond – Koramangala)',
};

function getCongestionColor(density: number): string {
  if (density >= 85) return '#ef4444';
  if (density >= 65) return '#f97316';
  if (density >= 40) return '#f59e0b';
  return '#10b981';
}

export default function TrafficNetwork({ intersections, edges, showTechnical }: Props) {
  const [selected, setSelected] = useState<Intersection | null>(null);

  const handleNodeClick = useCallback((ix: Intersection) => {
    setSelected(ix);
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
  }, []);

  // Filter unique undirected roadway segments
  const uniqueEdges = edges.filter((e, i, arr) =>
    arr.findIndex(x => (x.from === e.from && x.to === e.to) ||
                       (x.from === e.to && x.to === e.from)) === i
  );

  const isAnyEmergency = intersections.some(ix => ix.isEmergencyActive);

  return (
    <div className="relative w-full">
      <svg
        viewBox={VIEWBOX}
        className="w-full max-h-[560px]"
        style={{ background: 'transparent' }}
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* Subtle blueprint grid */}
          <pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(6,182,212,0.035)" strokeWidth="0.5" />
          </pattern>

          {/* Road asphalt texture pattern */}
          <pattern id="asphalt-grain" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#141d2e" />
            <circle cx="2" cy="2" r="0.8" fill="#1e293b" />
            <circle cx="6" cy="6" r="0.8" fill="#0f172a" />
          </pattern>

          {/* Glow filters */}
          <filter id="corridor-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="amber-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Marker definition for emergency chevrons */}
          <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 7 5 L 0 9 z" fill="#4ade80" />
          </marker>
        </defs>

        {/* Background Grid */}
        <rect width="640" height="640" fill="url(#city-grid)" />

        {/* ══════════════════════════════════════════════════════════════
            REALISTIC URBAN ROADWAYS (Asphalt, Shoulders, Lane Dividers)
           ══════════════════════════════════════════════════════════════ */}
        {uniqueEdges.map((edge, i) => {
          const from = POS[edge.from];
          const to = POS[edge.to];
          if (!from || !to) return null;

          const fromIx = intersections.find(ix => ix.id === edge.from);
          const toIx = intersections.find(ix => ix.id === edge.to);
          const maxDensity = Math.max(fromIx?.density ?? 0, toIx?.density ?? 0);
          const congColor = getCongestionColor(maxDensity);
          const isGreen = edge.isGreenCorridor || (isAnyEmergency && ((edge.from === 'S1' && edge.to === 'S3') || (edge.from === 'S3' && edge.to === 'S4')));

          const keyId = `${edge.from}-${edge.to}`;
          const roadName = ROAD_NAMES[keyId] || ROAD_NAMES[`${edge.to}-${edge.from}`] || 'Urban Arterial';

          // Orientation math for crosswalks & lane offsets
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const isHorizontal = Math.abs(dx) > Math.abs(dy);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <g key={`roadway-${keyId}-${i}`}>
              {/* 1. Road Curb / Shoulder (Dark outer edge) */}
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="#090e17"
                strokeWidth={36}
                strokeLinecap="round"
              />

              {/* 2. Concrete Curb Edge Lip */}
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="#334155"
                strokeWidth={32}
                strokeLinecap="round"
              />

              {/* 3. Asphalt Road Surface */}
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="url(#asphalt-grain)"
                strokeWidth={26}
                strokeLinecap="round"
              />

              {/* 4. Congestion Live Heat-Band Overlay */}
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke={congColor}
                strokeWidth={18}
                strokeOpacity={0.22}
                strokeLinecap="round"
              />

              {/* 5. Emergency Green Corridor Active Overlay */}
              {isGreen && (
                <g filter="url(#corridor-glow)">
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke="#052e16"
                    strokeWidth={26}
                    strokeLinecap="round"
                  />
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke="#10b981"
                    strokeWidth={18}
                    strokeOpacity={0.65}
                    strokeLinecap="round"
                  />
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke="#4ade80"
                    strokeWidth={4}
                    strokeDasharray="12 8"
                    className="road-corridor-flow"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* 6. Broken Yellow Center Lane Divider */}
              {!isGreen && (
                <line
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke="#fbbf24"
                  strokeWidth={1.8}
                  strokeDasharray="6 8"
                  strokeOpacity={0.55}
                  className="road-lane-flow"
                />
              )}

              {/* 7. Pedestrian Zebra Crosswalks at Junction Entrances */}
              {isHorizontal ? (
                <>
                  {/* West Crosswalk near 'from' (offset x+36) */}
                  <g opacity="0.45">
                    {[-10, -5, 0, 5, 10].map(offsetY => (
                      <line
                        key={`cw-from-${offsetY}`}
                        x1={from.x + 36}
                        y1={from.y + offsetY}
                        x2={from.x + 44}
                        y2={from.y + offsetY}
                        stroke="#f8fafc"
                        strokeWidth={2.5}
                      />
                    ))}
                  </g>
                  {/* East Crosswalk near 'to' (offset x-44) */}
                  <g opacity="0.45">
                    {[-10, -5, 0, 5, 10].map(offsetY => (
                      <line
                        key={`cw-to-${offsetY}`}
                        x1={to.x - 44}
                        y1={to.y + offsetY}
                        x2={to.x - 36}
                        y2={to.y + offsetY}
                        stroke="#f8fafc"
                        strokeWidth={2.5}
                      />
                    ))}
                  </g>
                </>
              ) : (
                <>
                  {/* North Crosswalk near 'from' (offset y+36) */}
                  <g opacity="0.45">
                    {[-10, -5, 0, 5, 10].map(offsetX => (
                      <line
                        key={`cw-v-from-${offsetX}`}
                        x1={from.x + offsetX}
                        y1={from.y + 36}
                        x2={from.x + offsetX}
                        y2={from.y + 44}
                        stroke="#f8fafc"
                        strokeWidth={2.5}
                      />
                    ))}
                  </g>
                  {/* South Crosswalk near 'to' (offset y-44) */}
                  <g opacity="0.45">
                    {[-10, -5, 0, 5, 10].map(offsetX => (
                      <line
                        key={`cw-v-to-${offsetX}`}
                        x1={to.x + offsetX}
                        y1={to.y - 44}
                        x2={to.x + offsetX}
                        y2={to.y - 36}
                        stroke="#f8fafc"
                        strokeWidth={2.5}
                      />
                    ))}
                  </g>
                </>
              )}

              {/* 8. Road Name Badge along roadway */}
              <g transform={`translate(${midX}, ${isHorizontal ? midY - 18 : midY})`}>
                <rect
                  x={isHorizontal ? -64 : 16}
                  y={isHorizontal ? -9 : -9}
                  width={isHorizontal ? 128 : 130}
                  height={17}
                  rx={4}
                  fill="rgba(8,16,34,0.85)"
                  stroke={isGreen ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={0.8}
                />
                <text
                  x={isHorizontal ? 0 : 81}
                  y={isHorizontal ? 3 : 3}
                  textAnchor="middle"
                  fontSize={7.5}
                  fontWeight={600}
                  fill={isGreen ? '#4ade80' : '#94a3b8'}
                >
                  {roadName}
                </text>
              </g>

              {/* 9. Animated Traffic Particles (Simulated moving vehicles) */}
              <circle r={3} fill="#38bdf8" opacity="0.85">
                <animateMotion
                  path={`M ${from.x} ${isHorizontal ? from.y - 6 : from.y} L ${to.x} ${isHorizontal ? to.y - 6 : to.y}`}
                  dur={`${Math.max(4, 12 - (maxDensity / 10))}s`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle r={2.5} fill="#fbbf24" opacity="0.8">
                <animateMotion
                  path={`M ${to.x} ${isHorizontal ? to.y + 6 : to.y} L ${from.x} ${isHorizontal ? from.y + 6 : from.y}`}
                  dur={`${Math.max(5, 14 - (maxDensity / 10))}s`}
                  repeatCount="indefinite"
                />
              </circle>

              {/* Emergency vehicle beacon along green corridor */}
              {isGreen && (
                <g>
                  <circle r={5} fill="#ef4444">
                    <animateMotion
                      path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                      dur="2.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r={9} fill="none" stroke="#22d3ee" strokeWidth={1.5} opacity="0.7">
                    <animateMotion
                      path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                      dur="2.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              )}
            </g>
          );
        })}

        {/* ══════════════════════════════════════════════════════════════
            INTERSECTION NODES (Rendered on top of roads)
           ══════════════════════════════════════════════════════════════ */}
        {intersections.map(ix => {
          const pos = POS[ix.id];
          if (!pos) return null;
          return (
            <IntersectionNode
              key={ix.id}
              intersection={ix}
              x={pos.x}
              y={pos.y}
              showTechnical={showTechnical}
              onClick={() => handleNodeClick(ix)}
            />
          );
        })}
      </svg>

      {/* Decision explanation modal */}
      {selected && (
        <DecisionExplanation
          intersection={selected}
          onClose={handleClose}
        />
      )}

      {/* Roadway Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-300">Live Roadways:</span>
          {[
            ['#10b981', 'Low (Flowing)'],
            ['#f59e0b', 'Moderate'],
            ['#f97316', 'Heavy'],
            ['#ef4444', 'Congested'],
          ].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-5 h-2 rounded-sm border border-slate-700" style={{ backgroundColor: c }} />
              <span className="text-[11px]">{l}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-2 rounded bg-green-950 border border-green-400/80" />
            <span className="text-green-400 text-[11px] font-medium">🚑 Emergency Corridor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(k => (
                <div key={k} className="w-1 h-2 bg-slate-200 opacity-60 rounded-xs" />
              ))}
            </div>
            <span className="text-slate-400 text-[11px]">Zebra Crosswalk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="10" viewBox="0 0 12 10">
              <path d="M 6 1 A 5 5 0 0 1 11 6" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            <span className="text-cyan-400 text-[11px]">🚶 Pedestrian</span>
          </div>
        </div>
      </div>
    </div>
  );
}
