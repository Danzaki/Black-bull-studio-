'use client';

import { useMemo } from 'react';

export type Bubble = { id: string; label: string; sub?: string; value: number; fill: string; stroke: string };
type P = { x: number; y: number; r: number };

const W = 360;

function layout(values: number[], H: number, rMin: number, rMax: number): (P | null)[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  let out: (P | null)[] = [];
  let scale = 1;
  for (let attempt = 0; attempt < 10; attempt++) {
    const rs = values.map((v) => (rMin + (rMax - rMin) * (span > 0 ? (v - min) / span : 0.5)) * scale);
    const order = rs.map((_, i) => i).sort((a, b) => rs[b] - rs[a]);
    out = new Array(rs.length).fill(null);
    const placed: P[] = [];
    let ok = true;
    for (const i of order) {
      const r = rs[i];
      let spot: P | null = null;
      for (let t = 0; t < 1600; t++) {
        const rad = t * 0.4;
        const ang = t * 0.5;
        const x = W / 2 + rad * Math.cos(ang);
        const y = H / 2 + rad * Math.sin(ang) * 0.85;
        if (x - r < 2 || x + r > W - 2 || y - r < 2 || y + r > H - 2) continue;
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r + 2)) continue;
        spot = { x, y, r };
        break;
      }
      if (!spot) {
        ok = false;
        break;
      }
      placed.push(spot);
      out[i] = spot;
    }
    if (ok) return out;
    scale *= 0.88;
  }
  return out;
}

export default function BubbleCloud({
  items,
  height = 300,
  rMin = 14,
  rMax = 62,
  selectedId,
  onSelect,
}: {
  items: Bubble[];
  height?: number;
  rMin?: number;
  rMax?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const key = items.map((i) => i.id + ':' + i.value).join('|');
  const pos = useMemo(
    () => layout(items.map((i) => (Number.isFinite(i.value) ? i.value : 0)), height, rMin, rMax),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, height, rMin, rMax]
  );

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img">
      {items.map((b, i) => {
        const p = pos[i];
        if (!p) return null;
        const fs = Math.max(8, Math.min(13, p.r / 2.6));
        const chars = Math.max(3, Math.floor(p.r / 4.2));
        const sel = selectedId === b.id;
        return (
          <g key={b.id} onClick={() => onSelect?.(b.id)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <circle cx={p.x} cy={p.y} r={p.r} fill={b.fill} stroke={b.stroke} strokeWidth={sel ? 3.5 : 1.5} />
            {p.r >= 16 && (
              <text x={p.x} y={b.sub && p.r >= 26 ? p.y - 2 : p.y} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fontWeight={700} fill="#f8fafc">
                {b.label.length > chars ? b.label.slice(0, chars) : b.label}
              </text>
            )}
            {p.r >= 26 && b.sub && (
              <text x={p.x} y={p.y + fs + 1} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(8, fs - 2)} fill="#f8fafc" opacity={0.75}>
                {b.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
