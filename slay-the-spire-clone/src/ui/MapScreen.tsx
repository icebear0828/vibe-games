import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useGame, IMG, ACT_NAMES, Tip } from './common';
import { NODE_INFO } from '../game/map';
import { BOSSES } from '../game/enemies';
import type { NodeType } from '../game/types';
import { sfx } from '../game/sfx';

const ICON: Record<NodeType, string> = { monster: '👹', elite: '😈', rest: '🔥', shop: '💰', event: '❓', treasure: '🧰', boss: '💀' };
const ROW_H = 108;
const MAP_W = 900;
const TOP_PAD = 330;
const MAP_H = TOP_PAD + 15 * ROW_H + 80;

const nodeXY = (row: number, col: number, jx = 0, jy = 0) => ({ x: 130 + col * 108 + jx, y: MAP_H - 90 - row * ROW_H + jy });

export function MapView({ readOnly = false }: { readOnly?: boolean }) {
  const g = useGame();
  const r = g.run!;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const avail = readOnly ? [] : g.availableNodes();
  const isAvail = (row: number, col: number) => avail.some((a) => a.row === row && a.col === col);
  const visited = (row: number, col: number) => r.visited.some((v) => v.row === row && v.col === col);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const row = r.pos ? r.pos.row : -1;
    const y = MAP_H - 90 - (row + 1) * ROW_H;
    el.scrollTop = Math.max(0, y - 520);
  }, []);

  const rows = r.map.rows;
  const edges: React.ReactElement[] = [];
  rows.forEach((row, ri) => row.forEach((n) => {
    if (!n) return;
    const a = nodeXY(ri, n.col, n.jx, n.jy);
    const targets = ri === 14 ? [{ x: MAP_W / 2 - 20, y: TOP_PAD - 90 }] : n.next.map((c) => { const m = rows[ri + 1][c]!; return nodeXY(ri + 1, c, m.jx, m.jy); });
    targets.forEach((b, ti) => {
      const walked = ri === 14 ? visited(14, n.col) && r.pos?.row === 15 : visited(ri, n.col) && visited(ri + 1, n.next[ti]) && r.visited.findIndex((v) => v.row === ri && v.col === n.col) + 1 === r.visited.findIndex((v) => v.row === ri + 1 && v.col === n.next[ti]);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const x1 = a.x + ux * 24, y1 = a.y + uy * 24, x2 = b.x - ux * 26, y2 = b.y - uy * 26;
      edges.push(<line key={`${ri}-${n.col}-${ti}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={walked ? '#2a1a0c' : '#5a4630'} strokeWidth={walked ? 5 : 3.5} strokeDasharray={walked ? '0' : '2 10'} strokeLinecap="round" opacity={walked ? 0.95 : 0.7} />);
    });
  }));

  const bossAvail = isAvail(15, 3);
  const boss = BOSSES[r.map.bossId];

  return (
    <div ref={scrollRef} className="scroll-thin" style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      <div className="parchment" style={{ position: 'relative', width: MAP_W, height: MAP_H, margin: '0 auto', boxShadow: '0 0 60px rgba(0,0,0,.8), inset 0 0 80px rgba(90,60,20,.45)', borderLeft: '6px solid #8a6d3b', borderRight: '6px solid #8a6d3b' }}>
        <svg width={MAP_W} height={MAP_H} style={{ position: 'absolute', left: 0, top: 0 }}>{edges}</svg>
        {/* boss */}
        <div
          onClick={() => { if (bossAvail) g.travel(15, 3); }}
          onPointerEnter={() => bossAvail && sfx.hover()}
          style={{ position: 'absolute', left: MAP_W / 2 - 20, top: TOP_PAD - 190, transform: 'translate(-50%, -50%)', width: 260, height: 260, cursor: bossAvail ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className={bossAvail ? 'node-available' : ''}
        >
          <img src={IMG[boss.icon]} className="ink" style={{ maxWidth: 240, maxHeight: 240, opacity: 0.9 }} />
          <div style={{ position: 'absolute', bottom: -20, color: '#3b2a1c', fontSize: 26, fontWeight: 900 }}>{boss.name}</div>
        </div>
        <div style={{ position: 'absolute', top: 16, left: 0, right: 0, textAlign: 'center', color: '#3b2a1c', fontSize: 34, fontWeight: 900, letterSpacing: 6 }}>
          第{['', '一', '二', '三'][r.act]}层 · {ACT_NAMES[r.act]}
        </div>
        {rows.map((row, ri) => row.map((n) => {
          if (!n) return null;
          const { x, y } = nodeXY(ri, n.col, n.jx, n.jy);
          const av = isAvail(ri, n.col);
          const vis = visited(ri, n.col);
          const cur = r.pos?.row === ri && r.pos?.col === n.col;
          const key = `${ri}-${n.col}`;
          const big = n.type === 'elite';
          return (
            <div key={key}
              onClick={() => av && g.travel(ri, n.col)}
              onPointerEnter={() => { setHover(key); if (av) sfx.hover(); }}
              onPointerLeave={() => setHover((h) => (h === key ? null : h))}
              className={av ? 'node-available' : ''}
              style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${hover === key && !av ? 1.15 : 1})`, width: big ? 58 : 48, height: big ? 58 : 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: av ? 'pointer' : 'default', transition: 'transform .12s', zIndex: 5 }}>
              <span className="ink" style={{ fontSize: big ? 44 : 36, opacity: vis || av ? 1 : 0.8, filter: av ? 'grayscale(1) sepia(1) saturate(1.2) brightness(.3) contrast(1.8) drop-shadow(0 0 6px rgba(255,255,255,.8))' : undefined }}>{ICON[n.type]}</span>
              {vis && <div style={{ position: 'absolute', inset: -8, border: '4px solid #2a1a0c', borderRadius: '50%', transform: 'rotate(-12deg) scaleX(1.1)', opacity: 0.85 }} />}
              {cur && <div style={{ position: 'absolute', inset: -14, border: '3px solid #b3261e', borderRadius: '50%', opacity: 0.8 }} />}
              {hover === key && (
                <div className="tip-box" style={{ position: 'absolute', left: 60, top: -10, width: 150, pointerEvents: 'none', zIndex: 50 }}>
                  <div className="tip-title">{NODE_INFO[n.type].name}</div>
                  <div className="tip-body">{NODE_INFO[n.type].desc}</div>
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

export function MapScreen() {
  const g = useGame();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <img src={IMG.bg} style={{ position: 'absolute', inset: 0, width: 1600, height: 900, objectFit: 'cover', filter: 'blur(6px) brightness(.35)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 100, bottom: 0 }}>
        <MapView />
      </div>
      <Legend />
      {!g.run!.pos && (
        <div className="outline-text fade-in" style={{ position: 'absolute', left: 60, top: 420, width: 240, fontSize: 22, fontWeight: 700, color: '#ffe38a', zIndex: 20 }}>
          选择一条路径，开始攀登高塔。
        </div>
      )}
    </div>
  );
}

function Legend() {
  const items: NodeType[] = ['event', 'shop', 'treasure', 'rest', 'monster', 'elite'];
  return (
    <div className="parchment" style={{ position: 'absolute', right: 40, top: 300, width: 190, padding: '16px 18px', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.7)', border: '3px solid #8a6d3b', zIndex: 20 }}>
      <div style={{ color: '#3b2a1c', fontWeight: 900, fontSize: 22, textAlign: 'center', marginBottom: 8 }}>图例</div>
      {items.map((t) => (
        <Tip key={t} title={NODE_INFO[t].name} body={NODE_INFO[t].desc} side="left" width={180}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#3b2a1c', fontSize: 19, fontWeight: 700, padding: '3px 0' }}>
            <span className="ink" style={{ fontSize: 26 }}>{ICON[t]}</span>{NODE_INFO[t].name}
          </div>
        </Tip>
      ))}
    </div>
  );
}
