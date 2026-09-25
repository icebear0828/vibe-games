import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { game } from '../game/engine';
import bg from '../assets/bg.webp';
import ironclad from '../assets/ironclad.webp';
import jawworm from '../assets/jawworm.webp';
import cultist from '../assets/cultist.webp';
import louse from '../assets/louse.webp';
import slime from '../assets/slime.webp';
import nob from '../assets/nob.webp';
import lagavulin from '../assets/lagavulin.webp';
import hexaghost from '../assets/hexaghost.webp';
import guardian from '../assets/guardian.webp';

export const IMG: Record<string, string> = { bg, ironclad, jawworm, cultist, louse, slime, nob, lagavulin, hexaghost, guardian };

export function useGame() {
  useSyncExternalStore(game.subscribe, game.getVersion);
  return game;
}

export const STAGE_W = 1600;
export const STAGE_H = 900;
export const stageInfo = { scale: 1, left: 0, top: 0 };

export function toStage(clientX: number, clientY: number) {
  return { x: (clientX - stageInfo.left) / stageInfo.scale, y: (clientY - stageInfo.top) / stageInfo.scale };
}

export function Stage({ children }: { children: ReactNode }) {
  const [dim, setDim] = useState({ s: 1, l: 0, t: 0 });
  useLayoutEffect(() => {
    const f = () => {
      const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
      const l = (window.innerWidth - STAGE_W * s) / 2;
      const t = (window.innerHeight - STAGE_H * s) / 2;
      stageInfo.scale = s; stageInfo.left = l; stageInfo.top = t;
      setDim({ s, l, t });
    };
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ position: 'absolute', left: dim.l, top: dim.t, width: STAGE_W, height: STAGE_H, transform: `scale(${dim.s})`, transformOrigin: '0 0', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

/** Parses <g>..</g>, <r>..</r>, <y>..</y>, <b>..</b> markup and newlines */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <span key={li}>
          {line.split(/(<[gryb]>.*?<\/[gryb]>)/g).map((part, i) => {
            const m = part.match(/^<([gryb])>(.*?)<\/[gryb]>$/);
            if (m) return <span key={i} className={`t-${m[1]}`}>{m[2]}</span>;
            return <span key={i}>{part}</span>;
          })}
          {li < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  );
}

export function Tip({ title, body, children, side = 'bottom', width = 260, className, style }: { title?: ReactNode; body?: ReactNode; children: ReactNode; side?: 'bottom' | 'top' | 'right' | 'left'; width?: number; className?: string; style?: React.CSSProperties }) {
  const [show, setShow] = useState(false);
  const pos: React.CSSProperties =
    side === 'bottom' ? { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 }
      : side === 'top' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 }
        : side === 'right' ? { left: '100%', top: 0, marginLeft: 10 } : { right: '100%', top: 0, marginRight: 10 };
  return (
    <div className={className} style={{ position: 'relative', ...style }} onPointerEnter={() => setShow(true)} onPointerLeave={() => setShow(false)}>
      {children}
      {show && (title || body) && (
        <div className="tip-box fade-in" style={{ position: 'absolute', zIndex: 500, width, pointerEvents: 'none', ...pos }}>
          {title && <div className="tip-title">{title}</div>}
          {body && <div className="tip-body">{body}</div>}
        </div>
      )}
    </div>
  );
}

export function useInterval(fn: () => void, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => { const id = setInterval(() => ref.current(), ms); return () => clearInterval(id); }, [ms]);
}

export function Embers({ n = 24 }: { n?: number }) {
  const [list] = useState(() => Array.from({ length: n }, () => ({ left: Math.random() * 100, dur: 6 + Math.random() * 8, delay: -Math.random() * 12, size: 2 + Math.random() * 4 })));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {list.map((e, i) => (
        <div key={i} className="ember" style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDuration: `${e.dur}s`, animationDelay: `${e.delay}s` }} />
      ))}
    </div>
  );
}

export const ACT_NAMES = ['', '底层', '城市', '深处'];
export const ACT_FILTERS = ['', 'none', 'hue-rotate(-35deg) saturate(1.2) brightness(0.95)', 'hue-rotate(190deg) saturate(0.9) brightness(0.8)'];
