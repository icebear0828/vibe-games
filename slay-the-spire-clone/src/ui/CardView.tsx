import type { CSSProperties, ReactNode } from 'react';
import type { CardInst, Enemy } from '../game/types';
import { CARDS, KEYWORDS, cardDesc, cardName, cardVals, baseCost } from '../game/cards';
import { game } from '../game/engine';

const TYPE_NAME: Record<string, string> = { attack: '攻击', skill: '技能', power: '能力', status: '状态', curse: '诅咒' };
const ART_BG: Record<string, string> = {
  attack: 'radial-gradient(circle at 50% 40%, #ffb27a 0%, #c2452a 45%, #3a0d07 100%)',
  skill: 'radial-gradient(circle at 50% 40%, #9fd0ff 0%, #3e6fa8 45%, #0f1c33 100%)',
  power: 'radial-gradient(circle at 50% 40%, #ffe38a 0%, #c98a1c 45%, #3a2106 100%)',
  status: 'radial-gradient(circle at 50% 40%, #bbb 0%, #555 55%, #1a1a1a 100%)',
  curse: 'radial-gradient(circle at 50% 40%, #a77bc4 0%, #472a5c 55%, #120818 100%)',
};

const KW_RE = new RegExp(`(!D!|!B!|!M!|${Object.keys(KEYWORDS).sort((a, b) => b.length - a.length).join('|')})`, 'g');

function numCls(shown: number, base: number) {
  if (shown > base) return 't-g';
  if (shown < base) return 't-r';
  return '';
}

export interface CardViewProps {
  card: CardInst;
  combat?: boolean;
  target?: Enemy | null;
  glow?: 'blue' | 'gold' | 'selected' | null;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  scale?: number;
  children?: ReactNode;
}

export function CardView({ card, combat, target, glow, style, className, onClick, onPointerDown, onPointerEnter, onPointerLeave, scale = 1, children }: CardViewProps) {
  const d = CARDS[card.id];
  const base = cardVals(card, combat ? game : null);
  let shown = { ...base };
  if (combat && game.c) {
    const nibNext = d.type === 'attack' && (game.relic('pen_nib')?.counter ?? 0) === 9;
    if (d.dmg !== undefined) shown.dmg = game.calcPlayerAttack(base.dmg, target ?? null, d.strMult ? base.mag : 1, nibNext);
    if (d.blk !== undefined) shown.blk = game.calcBlock(base.blk);
  }
  const text = cardDesc(card);
  const lines = text.split('\n');
  const rendered = lines.map((line, li) => (
    <div key={li}>
      {line.split(KW_RE).map((part, i) => {
        if (part === '!D!') return <span key={i} className={numCls(shown.dmg, base.dmg)}>{shown.dmg}</span>;
        if (part === '!B!') return <span key={i} className={numCls(shown.blk, base.blk)}>{shown.blk}</span>;
        if (part === '!M!') return <span key={i}>{shown.mag}</span>;
        if (KEYWORDS[part]) return <span key={i} className="kw">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </div>
  ));
  const cost = combat && game.c ? game.costOf(card) : baseCost(card);
  const bc = baseCost(card);
  const rar = d.rarity === 'curse' ? 'curse' : d.rarity;
  const glowCls = glow === 'blue' ? 'card-glow' : glow === 'gold' ? 'card-glow-gold' : glow === 'selected' ? 'card-selected' : '';
  return (
    <div
      className={`card card-${d.color} ${className ?? ''}`}
      style={{ ...style, transform: `${style?.transform ?? ''} scale(${scale})` }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className={`card-body ${glowCls}`}>
        <div className="card-inner" />
        <div className={`card-art-frame rar-${rar} shape-${d.type}`} />
        <div className={`card-art shape-${d.type}`} style={{ background: ART_BG[d.type] }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,.06) 0 8px, transparent 8px 18px)' }} />
          <span className="art-emoji">{d.icon}</span>
        </div>
        <div className={`card-banner rar-${rar} ${card.up ? 'upgraded' : ''}`}>
          <span className="outline-text">{cardName(card)}</span>
        </div>
        <div className="card-type">{TYPE_NAME[d.type]}</div>
        <div className="card-desc outline-text" style={{ fontSize: text.length > 44 ? 13 : text.length > 30 ? 14.5 : 15.5 }}>{rendered}</div>
        {d.cost !== -2 && (
          <div className={`card-cost cost-${d.color === 'red' ? 'red' : d.color === 'colorless' ? 'colorless' : 'status'} outline-text`}>
            <span className={cost >= 0 && bc >= 0 && cost < bc ? 't-g' : cost > bc ? 't-r' : ''}>{cost === -1 ? 'X' : cost}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** Card that sits in normal layout flow (wraps absolutely positioned card) */
export function FlowCard({ card, scale = 1, glow, onClick, combat, className }: { card: CardInst; scale?: number; glow?: CardViewProps['glow']; onClick?: () => void; combat?: boolean; className?: string }) {
  return (
    <div className={className} style={{ position: 'relative', width: 200 * scale, height: 276 * scale, cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <CardView card={card} glow={glow} combat={combat} style={{ left: 0, top: 0, transformOrigin: '0 0' }} scale={scale} />
    </div>
  );
}

export function keywordsOf(card: CardInst): [string, string][] {
  const text = cardDesc(card);
  const out: [string, string][] = [];
  for (const k of Object.keys(KEYWORDS)) if (text.includes(k) && !out.some(([o]) => o.includes(k))) out.push([k, KEYWORDS[k]]);
  return out.slice(0, 4);
}
