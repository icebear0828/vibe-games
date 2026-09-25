import { useEffect, useRef, useState } from 'react';
import { useGame, IMG, toStage, Tip, ACT_FILTERS } from './common';
import { CardView, keywordsOf } from './CardView';
import { ENEMIES } from '../game/enemies';
import { CARDS } from '../game/cards';
import { POWERS } from '../game/powers';
import type { Creature, Enemy } from '../game/types';
import { sfx } from '../game/sfx';

const ASPECT: Record<string, number> = { ironclad: 0.72, jawworm: 0.66, cultist: 0.68, louse: 1.15, slime: 0.7, nob: 0.68, lagavulin: 0.7, hexaghost: 0.92, guardian: 0.7, sentry: 0.62 };
const GROUND = 640;
const PLAYER_X = 360;
const HAND_SCALE = 0.82;

function SentrySvg({ h }: { h: number }) {
  return (
    <svg width={h * 0.62} height={h} viewBox="0 0 62 100">
      <defs>
        <linearGradient id="stone" x1="0" x2="1"><stop offset="0" stopColor="#6b6f7a" /><stop offset=".5" stopColor="#a7abb5" /><stop offset="1" stopColor="#4d5059" /></linearGradient>
        <radialGradient id="eye"><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor="#ffd35a" /><stop offset="1" stopColor="#ff7a00" stopOpacity="0" /></radialGradient>
      </defs>
      <polygon points="31,2 50,18 46,86 16,86 12,18" fill="url(#stone)" stroke="#1d1f24" strokeWidth="2.5" />
      <polygon points="31,8 44,20 41,80 21,80 18,20" fill="none" stroke="#2d3038" strokeWidth="1.2" opacity=".7" />
      <rect x="8" y="84" width="46" height="12" rx="3" fill="#555963" stroke="#1d1f24" strokeWidth="2.5" />
      <circle cx="31" cy="36" r="14" fill="url(#eye)"><animate attributeName="r" values="12;15;12" dur="2s" repeatCount="indefinite" /></circle>
      <circle cx="31" cy="36" r="4" fill="#fff" />
      <path d="M20 58 L42 58 M22 66 L40 66" stroke="#2d3038" strokeWidth="2" />
    </svg>
  );
}

const INTENT_ICON: Record<string, string> = {
  attack: '🗡️', attack_block: '🗡️🛡️', attack_buff: '🗡️💪', attack_debuff: '🗡️💧', block: '🛡️', buff: '💪', debuff: '💧',
  strong_debuff: '☠️', block_buff: '🛡️💪', sleep: '💤', stun: '💫', unknown: '❓', magic: '🔮',
};
const INTENT_TEXT: Record<string, string> = {
  attack_block: '该敌人将要攻击并获得格挡。', attack_buff: '该敌人将要攻击并强化自身。', attack_debuff: '该敌人将要攻击并给予你一个负面效果。',
  block: '该敌人将要获得格挡。', buff: '该敌人将要强化自身。', debuff: '该敌人将要给予你一个负面效果。', strong_debuff: '该敌人将要给予你强力的负面效果。',
  block_buff: '该敌人将要获得格挡并强化自身。', sleep: '该敌人正在沉睡。', stun: '该敌人被眩晕了。', unknown: '该敌人的意图不明。', magic: '该敌人将要施展魔法。',
};

function Powers({ cr }: { cr: Creature }) {
  const entries = Object.entries(cr.powers).filter(([id]) => POWERS[id]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 4, justifyContent: 'flex-start' }}>
      {entries.map(([id, n]) => {
        const p = POWERS[id];
        const neg = p.debuff || (p.negIsDebuff && n < 0);
        return (
          <Tip key={id} title={p.name} body={p.desc(n)} width={220} side="bottom">
            <div className="pop-in" style={{ position: 'relative', width: 26, height: 26, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 1px 2px #000)' }}>
              {p.icon}
              {p.showAmount !== false && (
                <span className="outline-text" style={{ position: 'absolute', right: -3, bottom: -5, fontSize: 13, fontWeight: 900, color: neg ? '#ff6b5b' : '#fff' }}>{n}</span>
              )}
            </div>
          </Tip>
        );
      })}
    </div>
  );
}

function HealthBar({ cr, width }: { cr: Creature; width: number }) {
  const pct = Math.max(0, cr.hp / cr.maxHp) * 100;
  return (
    <div style={{ position: 'relative', width }}>
      <div className="hp-bar" style={{ borderColor: cr.block > 0 ? '#6fc3ff' : '#000' }}>
        <div className="hp-lag" style={{ width: `${pct}%` }} />
        <div className={`hp-fill ${cr.block > 0 ? 'blocked' : ''}`} style={{ width: `${pct}%` }} />
        <div className="hp-text outline-text">{cr.hp}/{cr.maxHp}</div>
      </div>
      {cr.block > 0 && <div className="block-badge outline-text pop-in" key={cr.block}>{cr.block}</div>}
    </div>
  );
}

interface CreatureProps { cr: Creature; x: number; w: number; h: number; img: string; hue?: number; isPlayer?: boolean; targeted?: boolean; onEnter?: () => void; onLeave?: () => void; flip?: boolean }

function CreatureView({ cr, x, w, h, img, hue, isPlayer, targeted, onEnter, onLeave }: CreatureProps) {
  const g = useGame();
  const e = cr as Enemy;
  const [hover, setHover] = useState(false);
  const barW = Math.max(110, Math.min(250, w * 0.92));
  const animCls = cr.anim === 'hit' ? (isPlayer ? 'anim-phit' : 'anim-hit') : cr.anim ? `anim-${cr.anim}` : '';
  const move = !isPlayer ? e.move : null;
  let intentDmg: string | null = null;
  if (move && move.dmg !== undefined && g.c) {
    const d = g.calcEnemyAttack(e, move.dmg);
    intentDmg = move.hits && move.hits > 1 ? `${d}x${move.hits}` : `${d}`;
  }
  const dead = !isPlayer && e.dead;
  if (dead && !e.dying) return null;
  const isFloat = img === 'hexaghost';
  return (
    <div
      className={dead ? 'dying' : ''}
      style={{ position: 'absolute', left: x - w / 2, top: GROUND - h, width: w, height: h + 90, zIndex: 10 }}
      onPointerEnter={() => { setHover(true); onEnter?.(); }}
      onPointerLeave={() => { setHover(false); onLeave?.(); }}
    >
      {/* shadow */}
      <div style={{ position: 'absolute', left: '10%', right: '10%', top: h - 14, height: 26, borderRadius: '50%', background: 'radial-gradient(rgba(0,0,0,.6), transparent 70%)' }} />
      <div key={cr.animKey} className={animCls} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div className={isFloat ? 'idle-float' : 'idle'} style={{ animationDelay: `${(cr.uid % 7) * -0.37}s`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
          {img === 'sentry' ? <SentrySvg h={h} /> : (
            <img src={IMG[img]} draggable={false} style={{ height: h, width: 'auto', maxWidth: 'none', filter: `${hue ? `hue-rotate(${hue}deg)` : ''} drop-shadow(0 0 2px rgba(0,0,0,.6))` }} />
          )}
        </div>
      </div>
      {/* intent */}
      {move && !dead && (
        <Tip title={move.name} body={move.dmg !== undefined ? `该敌人将要攻击，造成 ${intentDmg?.split('x')[0]} 点伤害${move.hits && move.hits > 1 ? `，共 ${move.hits} 次` : ''}。${move.intent !== 'attack' ? INTENT_TEXT[move.intent] ?? '' : ''}` : INTENT_TEXT[move.intent]} side="top" width={240}
          style={{ position: 'absolute', left: '50%', top: -58, transform: 'translateX(-50%)' }}>
          <div className="intent" style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 30, filter: 'drop-shadow(0 2px 3px #000)', whiteSpace: 'nowrap' }}>
            <span>{INTENT_ICON[move.intent]}</span>
            {intentDmg && <span className="outline-text" style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{intentDmg}</span>}
          </div>
        </Tip>
      )}
      {/* targeting reticle */}
      {targeted && !dead && (
        <div style={{ position: 'absolute', inset: '-8px -8px 70px -8px', pointerEvents: 'none' }}>
          <div className="reticle" style={{ left: 0, top: 0, borderWidth: '4px 0 0 4px' }} />
          <div className="reticle" style={{ right: 0, top: 0, borderWidth: '4px 4px 0 0' }} />
          <div className="reticle" style={{ left: 0, bottom: 0, borderWidth: '0 0 4px 4px' }} />
          <div className="reticle" style={{ right: 0, bottom: 0, borderWidth: '0 4px 4px 0' }} />
        </div>
      )}
      {/* hp / powers */}
      {!dead && (
        <div style={{ position: 'absolute', top: h + 8, left: '50%', transform: 'translateX(-50%)', width: barW }}>
          {(hover || targeted) && <div className="outline-text fade-in" style={{ position: 'absolute', top: -30, left: 0, right: 0, textAlign: 'center', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>{cr.name}</div>}
          <HealthBar cr={cr} width={barW} />
          <Powers cr={cr} />
        </div>
      )}
      {/* fx */}
      <div style={{ position: 'absolute', left: '50%', top: h * 0.35, width: 0, height: 0 }}>
        {cr.fx.map((f) => (
          <div key={f.id} className={`fx outline-text ${f.cls}`} style={{ marginLeft: f.dx }}>{f.text}</div>
        ))}
      </div>
      {/* speech */}
      {g.c?.speech.filter((s) => s.uid === cr.uid).map((s) => (
        <div key={s.key} className="pop-in" style={{ position: 'absolute', top: -40, [isPlayer ? 'left' : 'right']: isPlayer ? w * 0.6 : w * 0.6, background: '#fff', color: '#222', padding: '8px 14px', borderRadius: 16, fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(0,0,0,.5)', zIndex: 70 }}>
          {s.text}
        </div>
      ))}
    </div>
  );
}

function Arrow({ sx, sy, ex, ey, hot }: { sx: number; sy: number; ex: number; ey: number; hot: boolean }) {
  const cx = sx + (ex - sx) * 0.1;
  const cy = ey - Math.abs(ex - sx) * 0.1 - 60;
  const pts: [number, number][] = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push([(1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey]);
  }
  const ang = Math.atan2(ey - cy, ex - cx);
  const col = hot ? '#ff5a3c' : '#e8e8e8';
  return (
    <svg width={1600} height={900} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 400 }}>
      {pts.slice(0, -1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4 + (i / N) * 7} fill={col} stroke="#000" strokeWidth={2.5} />
      ))}
      <g transform={`translate(${ex},${ey}) rotate(${(ang * 180) / Math.PI})`}>
        <polygon points="14,0 -18,-20 -10,0 -18,20" fill={col} stroke="#000" strokeWidth={3} />
      </g>
    </svg>
  );
}

interface Held { uid: number; sticky: boolean; moved: boolean; sx: number; sy: number }

export function CombatScreen() {
  const g = useGame();
  const c = g.c!;
  const [held, setHeld] = useState<Held | null>(null);
  const [mouse, setMouse] = useState({ x: 800, y: 450 });
  const [hoverCard, setHoverCard] = useState<number | null>(null);
  const [hoverEnemy, setHoverEnemy] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const heldRef = useRef(held);
  heldRef.current = held;

  // screen shake
  const lastShake = useRef(c.shake);
  useEffect(() => {
    if (c.shake !== lastShake.current) {
      lastShake.current = c.shake;
      rootRef.current?.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-12px,6px)' }, { transform: 'translate(10px,-6px)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(0,0)' }], { duration: 320 });
    }
  });

  useEffect(() => { if (c.phase !== 'player' && held) setHeld(null); }, [c.phase, held]);
  useEffect(() => { if (held && !c.hand.some((h) => h.uid === held.uid)) setHeld(null); }, [c.hand, held]);

  const heldCard = held ? c.hand.find((h) => h.uid === held.uid) : null;
  const heldDef = heldCard ? CARDS[heldCard.id] : null;
  const needsTarget = heldDef?.target === 'enemy';

  const tryPlay = () => {
    const h = heldRef.current;
    if (!h) return;
    const card = c.hand.find((x) => x.uid === h.uid);
    if (!card) { setHeld(null); return; }
    const d = CARDS[card.id];
    if (d.target === 'enemy') {
      if (hoverEnemy != null) g.playCard(card.uid, hoverEnemy);
      else if (!h.sticky) { /* dropped nowhere */ }
    } else if (mouse.y < 620) g.playCard(card.uid);
    setHeld(null);
  };

  const onMove = (e: React.PointerEvent) => {
    const p = toStage(e.clientX, e.clientY);
    setMouse(p);
    if (held && !held.moved && Math.hypot(p.x - held.sx, p.y - held.sy) > 12) setHeld({ ...held, moved: true });
  };
  const onUp = () => {
    if (!held) return;
    if (held.sticky) return;
    if (!held.moved) { setHeld({ ...held, sticky: true }); return; }
    tryPlay();
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.button === 2) { setHeld(null); if (g.targetingPotion != null) { g.targetingPotion = null; g.emit(); } return; }
    if (g.targetingPotion != null) {
      if (hoverEnemy != null) g.usePotion(g.targetingPotion, hoverEnemy);
      else { g.targetingPotion = null; g.emit(); }
      return;
    }
    if (held?.sticky) tryPlay();
  };

  const startHold = (uid: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button === 2) { setHeld(null); return; }
    if (c.phase !== 'player') return;
    if (held?.uid === uid) { setHeld(null); return; }
    const card = c.hand.find((x) => x.uid === uid)!;
    const err = g.canPlay(card);
    if (err) { g.say(c.player, err); sfx.error(); g.emit(); return; }
    const p = toStage(e.clientX, e.clientY);
    sfx.click();
    setHeld({ uid, sticky: false, moved: false, sx: p.x, sy: p.y });
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (g.select || g.overlay) return;
      if (e.key === 'Escape') { setHeld(null); return; }
      if (e.key.toLowerCase() === 'e') { setHeld(null); g.endTurn(); return; }
      const n = e.key === '0' ? 10 : parseInt(e.key);
      if (!isNaN(n) && n >= 1 && n <= 10) {
        const card = g.c?.hand[n - 1];
        if (!card || g.c?.phase !== 'player') return;
        const d = CARDS[card.id];
        const err = g.canPlay(card);
        if (err) { g.say(g.c.player, err); sfx.error(); g.emit(); return; }
        if (d.target === 'enemy' && g.alive().length > 1) setHeld({ uid: card.uid, sticky: true, moved: true, sx: 0, sy: 0 });
        else g.playCard(card.uid);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g]);

  // enemy layout
  const layout = c.enemies.map((e) => {
    const d = ENEMIES[e.id];
    const w = Math.max(130, d.size * (ASPECT[d.img] ?? 0.7));
    return { e, d, w, h: d.size };
  });
  const gap = layout.length > 3 ? 18 : 36;
  const total = layout.reduce((s, l) => s + l.w, 0) + gap * (layout.length - 1);
  let startX = Math.max(820, 1200 - total / 2);
  if (startX + total > 1570) startX = Math.max(760, 1570 - total);
  let acc = startX;
  const pos = layout.map((l) => { const x = acc + l.w / 2; acc += l.w + gap; return x; });

  // hand layout
  const hand = c.hand;
  const n = hand.length;
  const hoverIdx = held ? -1 : hand.findIndex((h) => h.uid === hoverCard);
  const spacing = n <= 5 ? 150 : Math.min(150, 780 / (n - 1));
  const targetEnemy = needsTarget && hoverEnemy != null ? c.enemies.find((e) => e.uid === hoverEnemy) ?? null : null;
  const potionTargeting = g.targetingPotion != null;

  const allUnplayable = c.phase === 'player' && hand.every((h) => g.canPlay(h) !== null);

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0 }} onPointerMove={onMove} onPointerUp={onUp} onPointerDown={onDown}>
      <img src={IMG.bg} style={{ position: 'absolute', inset: 0, width: 1600, height: 900, objectFit: 'cover', filter: ACT_FILTERS[g.run!.act] }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 60%, rgba(0,0,0,.55))' }} />

      {/* player */}
      <CreatureView cr={c.player} x={PLAYER_X} w={300 * ASPECT.ironclad} h={300} img="ironclad" isPlayer />
      {/* enemies */}
      {layout.map((l, i) => (
        <CreatureView key={l.e.uid} cr={l.e} x={pos[i]} w={l.w} h={l.h} img={l.d.img} hue={l.d.hue}
          targeted={(needsTarget || potionTargeting) && hoverEnemy === l.e.uid}
          onEnter={() => setHoverEnemy(l.e.uid)} onLeave={() => setHoverEnemy((h) => (h === l.e.uid ? null : h))} />
      ))}

      {/* energy orb */}
      <Tip title="能量" body="打出卡牌需要消耗能量。每回合开始时重置。" side="right" style={{ position: 'absolute', left: 60, top: 640, zIndex: 150 }}>
        <div style={{ width: 110, height: 110, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '3px dashed rgba(255,150,90,.6)', animation: 'spin-slow 12s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c.energy > 0 ? 'radial-gradient(circle at 40% 35%, #ffcf8a, #ff5a1f 45%, #7a1206 80%)' : 'radial-gradient(circle at 40% 35%, #777, #3a2a2a 60%, #111)', border: '4px solid #2a0d05', boxShadow: c.energy > 0 ? '0 0 30px 6px rgba(255,90,30,.6)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="outline-text" style={{ fontSize: 38, fontWeight: 900 }}>{c.energy}/{c.maxEnergy}</span>
          </div>
        </div>
      </Tip>
      {/* draw pile */}
      <Tip title="抽牌堆" body="点击查看抽牌堆中的牌（顺序已打乱）。" side="right" style={{ position: 'absolute', left: 24, top: 790, zIndex: 150 }}>
        <button onClick={() => { g.overlay = 'draw'; g.emit(); }} style={{ width: 84, height: 84, borderRadius: '50%', background: 'radial-gradient(#3b2a1a, #1a120a)', border: '3px solid #c9a55c', cursor: 'pointer', position: 'relative', fontSize: 38 }}>
          🂠<span className="outline-text" style={{ position: 'absolute', right: -4, bottom: -4, background: '#222', border: '2px solid #c9a55c', borderRadius: 14, padding: '0 7px', fontSize: 20, fontWeight: 900, color: '#fff' }}>{c.draw.length}</span>
        </button>
      </Tip>
      {/* discard + exhaust */}
      <Tip title="弃牌堆" body="打出和丢弃的牌会进入这里。抽牌堆为空时，弃牌堆会被洗入抽牌堆。" side="left" style={{ position: 'absolute', right: 24, top: 790, zIndex: 150 }}>
        <button onClick={() => { g.overlay = 'discard'; g.emit(); }} style={{ width: 84, height: 84, borderRadius: '50%', background: 'radial-gradient(#1a2a3b, #0a121a)', border: '3px solid #6fa8d8', cursor: 'pointer', position: 'relative', fontSize: 38 }}>
          🗂️<span className="outline-text" style={{ position: 'absolute', left: -4, bottom: -4, background: '#222', border: '2px solid #6fa8d8', borderRadius: 14, padding: '0 7px', fontSize: 20, fontWeight: 900, color: '#fff' }}>{c.discard.length}</span>
        </button>
      </Tip>
      {c.exhaust.length > 0 && (
        <Tip title="消耗堆" body="被消耗的牌会进入这里，直到战斗结束。" side="left" style={{ position: 'absolute', right: 34, top: 715, zIndex: 150 }}>
          <button onClick={() => { g.overlay = 'exhaust'; g.emit(); }} style={{ width: 62, height: 62, borderRadius: '50%', background: 'radial-gradient(#3a1a3b, #120a1a)', border: '3px solid #b07ad8', cursor: 'pointer', position: 'relative', fontSize: 26 }}>
            🔥<span className="outline-text" style={{ position: 'absolute', left: -6, bottom: -6, background: '#222', border: '2px solid #b07ad8', borderRadius: 12, padding: '0 6px', fontSize: 16, fontWeight: 900, color: '#fff' }}>{c.exhaust.length}</span>
          </button>
        </Tip>
      )}
      {/* end turn */}
      <button
        className={`sts-btn ${allUnplayable ? 'glow-pulse' : ''}`}
        disabled={c.phase !== 'player'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => { setHeld(null); g.endTurn(); }}
        style={{ position: 'absolute', left: 1360, top: 690, width: 190, height: 66, zIndex: 150, fontSize: 24, background: c.phase === 'player' ? 'linear-gradient(#3d6b8a, #1d3a52)' : 'linear-gradient(#444, #222)', borderColor: '#9fd0ff' }}
      >
        {c.phase === 'player' || c.phase === 'busy' ? '结束回合' : c.phase === 'enemy' ? '敌人回合' : '……'}
      </button>
      <div style={{ position: 'absolute', left: 1360, top: 760, width: 190, textAlign: 'center', fontSize: 12, color: '#aaa', zIndex: 150 }}>[E] 结束回合 · 数字键出牌</div>

      {/* hand */}
      {hand.map((card, i) => {
        const off = i - (n - 1) / 2;
        let cx = 800 + off * spacing;
        let cy = 768 + Math.abs(off) ** 2 * 3.2;
        let rot = off * (n > 1 ? Math.min(5, 36 / n) : 0);
        let scale = HAND_SCALE;
        let z = 200 + i;
        const isHeld = held?.uid === card.uid;
        if (hoverIdx >= 0 && !isHeld) {
          if (i === hoverIdx) { cy = 900 - (276 * 1.18) / 2 - 4; rot = 0; scale = 1.18; z = 300; }
          else cx += (i < hoverIdx ? -1 : 1) * Math.max(0, 70 - Math.abs(i - hoverIdx) * 12);
        }
        if (isHeld) {
          z = 320; rot = 0;
          if (needsTarget) { cx = 800; cy = 640; scale = 0.95; }
          else if (held!.moved || held!.sticky) { cx = mouse.x; cy = mouse.y; scale = 0.95; }
        }
        const playable = c.phase === 'player' && g.canPlay(card) === null;
        const kws = i === hoverIdx || (isHeld && !needsTarget) ? keywordsOf(card) : [];
        return (
          <CardView
            key={card.uid}
            card={card}
            combat
            target={isHeld ? targetEnemy : null}
            glow={playable ? (isHeld ? 'gold' : 'blue') : null}
            className={`hand-card ${isHeld && (held!.moved || held!.sticky) && !needsTarget ? 'dragging' : ''} ${isHeld && needsTarget ? 'dragging' : ''}`}
            style={{ left: cx - 100, top: cy - 138, zIndex: z, transform: `rotate(${rot}deg)` }}
            scale={scale}
            onPointerDown={(e) => startHold(card.uid, e)}
            onPointerEnter={() => { if (!held) { setHoverCard(card.uid); sfx.hover(); } }}
            onPointerLeave={() => setHoverCard((h) => (h === card.uid ? null : h))}
          >
            {kws.length > 0 && (
              <div style={{ position: 'absolute', left: 206, top: 0, width: 210, display: 'flex', flexDirection: 'column', gap: 6, transform: `scale(${1 / scale * 0.85})`, transformOrigin: '0 0', pointerEvents: 'none' }}>
                {kws.map(([k, v]) => (
                  <div key={k} className="tip-box"><div className="tip-title">{k}</div><div className="tip-body">{v}</div></div>
                ))}
              </div>
            )}
          </CardView>
        );
      })}

      {/* arrow */}
      {held && needsTarget && <Arrow sx={800} sy={640 - 120} ex={mouse.x} ey={mouse.y} hot={hoverEnemy != null} />}
      {potionTargeting && <Arrow sx={330 + g.targetingPotion! * 42} sy={50} ex={mouse.x} ey={mouse.y} hot={hoverEnemy != null} />}

      {/* played card */}
      {c.playing && (
        <div key={c.playing.key} className="card-play" style={{ position: 'absolute', left: 700, top: 250, width: 200, height: 276, zIndex: 250, pointerEvents: 'none' }}>
          <CardView card={c.playing.card} style={{ left: 0, top: 0 }} />
        </div>
      )}

      {/* banner */}
      {c.banner && (
        <div key={c.banner.key} className="turn-banner" style={{ position: 'absolute', left: 0, right: 0, top: 360, height: 110, zIndex: 450, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(0,0,0,.75) 25%, rgba(0,0,0,.75) 75%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="outline-text" style={{ fontSize: 58, fontWeight: 900, letterSpacing: 8, color: c.banner.text === '敌人回合' ? '#ff8a7a' : '#ffe38a' }}>{c.banner.text}</span>
        </div>
      )}
      {c.phase === 'won' && (
        <div className="fade-in" style={{ position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', zIndex: 450, pointerEvents: 'none' }}>
          <span className="outline-text" style={{ fontSize: 64, fontWeight: 900, color: '#ffe38a', letterSpacing: 10 }}>胜利！</span>
        </div>
      )}
    </div>
  );
}
