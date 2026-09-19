/**
 * MapNetwork — OpenStreetMap view with styled roads
 *
 * Road rendering uses a 3-layer casing technique:
 *   1. Dark thick border (road casing)
 *   2. Colored fill (road surface, congestion-tinted)
 *   3. Dashed centre line (lane divider)
 *
 * Emergency corridor gets an animated green overlay.
 */

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Intersection, TrafficEdge } from '../types/traffic';
import { MAP_CENTER, MAP_ZOOM, EMERGENCY_ROUTE } from '../data/intersections';

/* ─── CARTO API Key & Voyager Tile URL ───────────────────────────── */
const CARTO_API_KEY = (import.meta.env.VITE_CARTO_API_KEY as string) || 'cb1_3qww_1_7926dd6c895f8f27d90411cd';
const TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`;

/* ─── Dark-themed popup / tooltip CSS injected once ─────────────── */
const DARK_CSS = `
  .leaflet-container { background:#0a0f1e !important; }
  .qflow-popup .leaflet-popup-content-wrapper {
    background:rgba(8,16,34,0.97);
    border:1px solid rgba(99,102,241,0.3);
    border-radius:12px;
    color:#e2e8f0;
    box-shadow:0 8px 32px rgba(0,0,0,0.7);
    padding:0;
  }
  .qflow-popup .leaflet-popup-content { margin:0; width:auto !important; }
  .qflow-popup .leaflet-popup-tip-container { display:none; }
  .qflow-tooltip-node {
    background:rgba(8,16,34,0.95) !important;
    border:1px solid rgba(99,102,241,0.3) !important;
    border-radius:8px !important;
    color:#e2e8f0 !important;
    font-size:11px !important;
    padding:6px 10px !important;
    box-shadow:0 4px 12px rgba(0,0,0,0.5) !important;
    white-space:nowrap !important;
  }
  .qflow-tooltip-node::before { display:none !important; }
  .qflow-label {
    background:rgba(8,16,34,0.85) !important;
    border:1px solid rgba(251,191,36,0.6) !important;
    border-radius:4px !important;
    box-shadow:0 2px 8px rgba(0,0,0,0.6) !important;
    color:#fbbf24 !important;
    font-weight:800 !important;
    font-size:11px !important;
    padding:1px 5px !important;
  }
  .qflow-label::before { display:none !important; }
`;

/* ─── Colour helpers ─────────────────────────────────────────────── */
function congestionStroke(level: string): string {
  if (level === 'CRITICAL') return '#ef4444';
  if (level === 'HIGH')     return '#f97316';
  if (level === 'MODERATE') return '#f59e0b';
  return '#10b981';
}
function roadFill(maxDensity: number): string {
  if (maxDensity >= 85) return '#7f1d1d';   // deep red
  if (maxDensity >= 65) return '#431407';   // deep orange
  if (maxDensity >= 40) return '#422006';   // deep amber
  return '#0f172a';                          // slate dark
}
function roadSurface(maxDensity: number): string {
  if (maxDensity >= 85) return '#ef4444';
  if (maxDensity >= 65) return '#f97316';
  if (maxDensity >= 40) return '#f59e0b';
  return '#475569';
}

/* ─── Auto-recenter helper ───────────────────────────────────────── */
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

/* ─── Component ──────────────────────────────────────────────────── */
interface Props {
  intersections: Intersection[];
  edges: TrafficEdge[];
  compact?: boolean;   // smaller height for dashboard embed
}

export default function MapNetwork({ intersections, edges, compact = false }: Props) {
  const height = compact ? '420px' : '540px';

  /* id → [lat, lng] lookup */
  const posMap: Record<string, [number, number]> = {};
  intersections.forEach(ix => { posMap[ix.id] = [ix.lat, ix.lng]; });

  /* max density on each edge (drives road colour) */
  function edgeDensity(fromId: string, toId: string) {
    const a = intersections.find(i => i.id === fromId);
    const b = intersections.find(i => i.id === toId);
    return Math.max(a?.density ?? 0, b?.density ?? 0);
  }

  /* unique edges (avoid duplicates from bidirectional list) */
  const uniqueEdges = edges.filter((e, i, arr) =>
    arr.findIndex(x => (x.from === e.from && x.to === e.to) ||
                       (x.from === e.to   && x.to === e.from)) === i
  );

  /* emergency route as [lat,lng] chain */
  const emerPositions: [number, number][] = EMERGENCY_ROUTE
    .map(id => posMap[id])
    .filter(Boolean) as [number, number][];

  const anyEmergency = intersections.some(ix => ix.isEmergencyActive);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10"
         style={{ height }}>

      <style>{DARK_CSS}</style>

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={!compact}
        scrollWheelZoom={!compact}
        dragging={!compact}
      >
        {/* ── CARTO Voyager tile layer with authenticated API key ──────────────── */}
        <TileLayer
          url={TILE_URL}
          subdomains="abcd"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        {/* ══════════════════════════════════════════════════
            STYLED ROADS — 3-layer casing technique
            Layer 1: wide dark casing (road border)
            Layer 2: medium coloured surface (congestion colour)
            Layer 3: thin dashed centre line
           ═══════════════════════════════════════════════ */}
        {uniqueEdges.map((edge) => {
          const a = posMap[edge.from];
          const b = posMap[edge.to];
          if (!a || !b) return null;
          const dens = edgeDensity(edge.from, edge.to);
          const casing  = roadFill(dens);
          const surface = roadSurface(dens);

          return (
            <span key={`road-${edge.from}-${edge.to}`}>
              {/* Layer 1 — casing */}
              <Polyline
                positions={[a, b]}
                pathOptions={{ color: casing, weight: 11, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
              />
              {/* Layer 2 — surface */}
              <Polyline
                positions={[a, b]}
                pathOptions={{ color: surface, weight: 6, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
              />
              {/* Layer 3 — centre lane divider */}
              <Polyline
                positions={[a, b]}
                pathOptions={{ color: '#fbbf24', weight: 1, opacity: 0.3, dashArray: '6 12', lineCap: 'butt' }}
              />
            </span>
          );
        })}

        {/* ══════════════════════════════════════════════════
            EMERGENCY CORRIDOR — animated green road overlay
           ═══════════════════════════════════════════════ */}
        {anyEmergency && emerPositions.length > 1 && (
          <span key="emer-corridor">
            {/* Green road casing */}
            <Polyline
              positions={emerPositions}
              pathOptions={{ color: '#052e16', weight: 14, opacity: 1, lineCap: 'round' }}
            />
            {/* Green fill */}
            <Polyline
              positions={emerPositions}
              pathOptions={{ color: '#10b981', weight: 8, opacity: 0.95, lineCap: 'round' }}
            />
            {/* Animated arrow dashes */}
            <Polyline
              positions={emerPositions}
              pathOptions={{ color: '#4ade80', weight: 3, opacity: 1, dashArray: '12 8', lineCap: 'round' }}
            />
          </span>
        )}

        {/* ══════════════════════════════════════════════════
            INTERSECTION NODES — CircleMarkers
           ═══════════════════════════════════════════════ */}
        {intersections.map(ix => {
          const pos = posMap[ix.id];
          if (!pos) return null;
          const stroke = congestionStroke(ix.congestionLevel);
          const isEmerg = ix.isEmergencyActive;
          const pedPct  = ix.pedestrianDemand ?? 0;
          const nodeR   = compact ? 14 : 18;

          return (
            <CircleMarker
              key={ix.id}
              center={pos}
              radius={isEmerg ? nodeR + 4 : nodeR}
              pathOptions={{
                color: isEmerg ? '#4ade80' : stroke,
                fillColor: isEmerg ? 'rgba(16,185,129,0.35)' : `${stroke}33`,
                fillOpacity: 1,
                weight: isEmerg ? 3.5 : 2.5,
              }}
            >
              {/* Permanent ID label */}
              <Tooltip
                permanent
                direction="center"
                className="qflow-label"
              >
                <span style={{ fontSize: compact ? '10px' : '12px', fontWeight: 800 }}>{ix.id}</span>
              </Tooltip>

              {/* Hover tooltip */}
              <Tooltip
                permanent={false}
                direction="top"
                offset={[0, -(nodeR + 6)]}
                className="qflow-tooltip-node"
              >
                <div>
                  <strong style={{ color: stroke }}>{ix.id}</strong>
                  {' — '}
                  {ix.label.replace(/^S\d+ – /, '')}
                </div>
                <div style={{ marginTop: 2 }}>
                  🚗 {ix.density}% · Q:{ix.queueLength} · ⏱{ix.waitingTime}s
                </div>
                <div style={{ marginTop: 2 }}>🚶 Ped: {pedPct}%</div>
              </Tooltip>

              {/* Click popup */}
              {!compact && (
                <Popup className="qflow-popup" maxWidth={270} closeButton={false}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '12px', padding: '16px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                      <div style={{
                        background: `${stroke}22`, border: `2px solid ${stroke}`,
                        borderRadius: 8, padding: '4px 12px',
                        fontWeight: 800, fontSize: 16, color: stroke,
                      }}>{ix.id}</div>
                      <div>
                        <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
                          {ix.label.replace(/^S\d+ – /, '')}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 10 }}>
                          {ix.lat.toFixed(4)}°N, {ix.lng.toFixed(4)}°E
                        </div>
                      </div>
                    </div>

                    {/* Density bar */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ color: '#94a3b8' }}>Traffic Density</span>
                        <span style={{ color: stroke, fontWeight: 700 }}>{ix.density}%</span>
                      </div>
                      <div style={{ height: 7, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${ix.density}%`, height: '100%', background: stroke, borderRadius: 4 }} />
                      </div>
                    </div>

                    {/* Pedestrian bar */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ color: '#94a3b8' }}>🚶 Pedestrian Demand</span>
                        <span style={{ color: '#22d3ee', fontWeight: 700 }}>{pedPct}%</span>
                      </div>
                      <div style={{ height: 7, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pedPct}%`, height: '100%', background: '#22d3ee', borderRadius: 4 }} />
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {[
                        ['Queue',      `${ix.queueLength} veh`],
                        ['Waiting',    `${ix.waitingTime}s`],
                        ['Throughput', `${ix.throughput} v/min`],
                        ['Green',      `${ix.greenDuration}s`],
                        ['Signal',     ix.currentSignal.replace('_', ' ')],
                        ['Congestion', ix.congestionLevel],
                      ].map(([k, v]) => (
                        <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '5px 8px' }}>
                          <div style={{ color: '#64748b', fontSize: 10 }}>{k}</div>
                          <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* QUBO penalty */}
                    <div style={{ textAlign: 'center', color: '#6366f1', fontSize: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                      Q[i][i] = {(-(ix.density/100*2 + ix.queueLength/ix.capacity*1.5 + pedPct/100*0.8)).toFixed(3)}
                    </div>

                    {/* Emergency */}
                    {isEmerg && (
                      <div style={{ marginTop: 8, textAlign: 'center', color: '#4ade80', fontWeight: 700 }}>
                        🚑 EMERGENCY CORRIDOR ACTIVE
                      </div>
                    )}
                  </div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}

        <MapRecenter center={MAP_CENTER} />
      </MapContainer>

      {/* ── Overlay legend ── */}
      <div
        className="absolute z-[999] glass rounded-xl px-3 py-2 text-xs space-y-1"
        style={{ bottom: compact ? 8 : 16, left: compact ? 8 : 16 }}
      >
        {!compact && <p className="text-slate-300 font-semibold mb-1">Road Congestion</p>}
        {[
          ['#475569', 'Low'],
          ['#f59e0b', 'Moderate'],
          ['#f97316', 'High'],
          ['#ef4444', 'Critical'],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2">
            <div className="w-8 h-2.5 rounded" style={{ background: c }} />
            <span className="text-slate-400">{l}</span>
          </div>
        ))}
        {anyEmergency && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <div className="w-8 h-2.5 rounded" style={{ background: '#10b981' }} />
            <span className="text-green-400">🚑 Emergency</span>
          </div>
        )}
      </div>

      {/* ── City badge ── */}
      <div className="absolute top-3 right-3 z-[999] glass rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-amber-400 font-bold">CARTO Voyager</span>
        <span className="text-slate-400">· Bengaluru</span>
      </div>
    </div>
  );
}
