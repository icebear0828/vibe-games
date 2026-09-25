import React, { useMemo, useRef } from 'react';
import { blockIcon } from '../game/textures';

export function Button({ children, onClick, disabled, width = 400, className = '', style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; width?: number | string; className?: string; style?: React.CSSProperties }) {
  return (
    <button className={`mc-btn ${className}`} style={{ width, ...style }} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, width = 400, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; width?: number; format?: (v: number) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = (value - min) / (max - min);
  const set = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    let f = (clientX - r.left - 8) / (r.width - 16);
    f = Math.max(0, Math.min(1, f));
    const v = Math.round((min + f * (max - min)) / step) * step;
    onChange(Number(v.toFixed(4)));
  };
  return (
    <div
      ref={ref}
      className="mc-slider"
      style={{ width }}
      onMouseDown={(e) => {
        set(e.clientX);
        const mv = (ev: MouseEvent) => set(ev.clientX);
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv);
        window.addEventListener('mouseup', up);
      }}
    >
      <div className="knob" style={{ left: `calc(${t} * (100% - 16px))` }} />
      <div className="absolute inset-0 flex items-center justify-center mc-text text-[17px] text-[#e0e0e0] pointer-events-none">
        {label}: {format ? format(value) : value}
      </div>
    </div>
  );
}

export function ItemIcon({ id, size = 32 }: { id: number; size?: number }) {
  const src = useMemo(() => blockIcon(id), [id]);
  return <img src={src} width={size} height={size} className="pixel pointer-events-none" draggable={false} alt="" />;
}

export function Count({ n }: { n: number }) {
  if (n <= 1) return null;
  return <span className="absolute right-[1px] bottom-[-3px] text-[17px] text-white mc-text pointer-events-none leading-none">{n}</span>;
}

// ------------ pixel sprites ------------
const PAL: Record<string, string> = {
  K: '#000', R: '#ff1313', W: '#ffc8c8', D: '#b80000', E: '#3b1616', M: '#b2672e', N: '#7d4415', B: '#f3f0e0', b: '#a0a0a0',
  A: '#2b6bff', a: '#9cd0ff', G: '#7efc20', g: '#2c5d00',
};
function Sprite({ rows, scale = 2, override }: { rows: string[]; scale?: number; override?: (x: number, y: number, c: string) => string }) {
  const w = rows[0].length, h = rows.length;
  const rects: React.ReactNode[] = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) {
      let c = r[x];
      if (override) c = override(x, y, c);
      if (c === ' ' || c === '.') continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={PAL[c]} />);
    }
  });
  return (
    <svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" style={{ display: 'block' }}>
      {rects}
    </svg>
  );
}

const HEART = [
  ' KK   KK ',
  'KRRK KRRK',
  'KRWRKRRRK',
  'KRRRRRRRK',
  'KDRRRRRDK',
  ' KDRRRDK ',
  '  KDRDK  ',
  '   KDK   ',
  '    K    ',
];
export function Heart({ state, flash }: { state: 0 | 1 | 2; flash?: boolean }) {
  return (
    <Sprite rows={HEART} override={(x, _y, c) => {
      if (c === 'K') return flash ? 'B' : 'K';
      if (state === 2) return c;
      if (state === 1 && x <= 4) return c;
      return 'E';
    }} />
  );
}
const FOOD = [
  '      KK ',
  '     KBBK',
  '    KKBK ',
  '  KKMMK  ',
  ' KMMMMNK ',
  'KMMMMMNK ',
  'KMMMMNK  ',
  ' KNNNK   ',
  '  KKK    ',
];
export function Food() { return <Sprite rows={FOOD} />; }
const BUBBLE = [
  '  KKKKK  ',
  ' KaaAAAK ',
  'KaaAAAAAK',
  'KaAAAAAAK',
  'KAAAAAAAK',
  'KAAAAAAAK',
  ' KAAAAAK ',
  '  KKKKK  ',
];
export function Bubble() { return <Sprite rows={BUBBLE} />; }
