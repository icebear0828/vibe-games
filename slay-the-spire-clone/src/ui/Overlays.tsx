import { useState } from 'react';
import { useGame } from './common';
import { FlowCard } from './CardView';
import { MapView } from './MapScreen';
import { CARDS } from '../game/cards';
import type { CardInst } from '../game/types';
import { sfx } from '../game/sfx';

const TYPE_ORDER: Record<string, number> = { attack: 0, skill: 1, power: 2, status: 3, curse: 4 };
const sortCards = (cs: CardInst[]) => [...cs].sort((a, b) => TYPE_ORDER[CARDS[a.id].type] - TYPE_ORDER[CARDS[b.id].type] || CARDS[a.id].name.localeCompare(CARDS[b.id].name) || b.up - a.up);

export function CardSelectOverlay() {
  const g = useGame();
  const s = g.select;
  const [sel, setSel] = useState<number[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  if (!s) return null;
  const toggle = (uid: number) => {
    sfx.click();
    if (sel.includes(uid)) setSel(sel.filter((x) => x !== uid));
    else if (s.max === 1) setSel([uid]);
    else if (sel.length < s.max) setSel([...sel, uid]);
  };
  const confirm = () => {
    const picked = s.cards.filter((c) => sel.includes(c.uid));
    setSel([]);
    s.resolve(picked);
  };
  const ok = sel.length >= Math.min(s.min, s.cards.length) && sel.length <= s.max;
  const previewCard = s.preview === 'upgrade' && (hover != null || sel.length === 1) ? s.cards.find((c) => c.uid === (sel[0] ?? hover)) : null;
  return (
    <div className="fade-in" style={{ position: 'absolute', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.82)' }}>
      <div className="outline-text" style={{ position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center', fontSize: 32, fontWeight: 900, color: '#ffe38a' }}>
        {s.title}{s.max > 1 && ` (${sel.length}/${s.max})`}
      </div>
      <div className="scroll-thin" style={{ position: 'absolute', top: 80, left: 0, right: previewCard ? 420 : 0, bottom: 100, overflowY: 'auto', padding: '10px 40px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
          {s.cards.map((c) => (
            <div key={c.uid} onPointerEnter={() => setHover(c.uid)} onPointerLeave={() => setHover((h) => (h === c.uid ? null : h))} style={{ transition: 'transform .12s', transform: hover === c.uid ? 'scale(1.05)' : 'none' }}>
              <FlowCard card={c} scale={0.78} glow={sel.includes(c.uid) ? 'selected' : null} onClick={() => toggle(c.uid)} />
            </div>
          ))}
        </div>
      </div>
      {previewCard && (
        <div className="fade-in" style={{ position: 'absolute', right: 40, top: 160, width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="outline-text" style={{ fontSize: 22, color: '#7fff00', fontWeight: 900 }}>升级后</div>
          <FlowCard card={{ ...previewCard, up: previewCard.up + 1 }} scale={1.2} />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 24 }}>
        {s.canCancel && <button className="sts-btn" onClick={() => { setSel([]); s.resolve(null); }}>取消</button>}
        <button className="sts-btn" disabled={!ok} style={{ borderColor: ok ? '#7fff00' : undefined }} onClick={confirm}>确认</button>
      </div>
    </div>
  );
}

export function PileOverlay() {
  const g = useGame();
  const o = g.overlay;
  if (!o || o === 'map') return null;
  let cards: CardInst[] = [];
  let title = '';
  if (o === 'deck') { cards = g.run!.deck; title = '牌组'; }
  else if (g.c) {
    if (o === 'draw') { cards = sortCards(g.c.draw); title = '抽牌堆'; }
    if (o === 'discard') { cards = g.c.discard; title = '弃牌堆'; }
    if (o === 'exhaust') { cards = g.c.exhaust; title = '消耗堆'; }
  }
  if (o === 'deck') cards = sortCards(cards);
  const close = () => { g.overlay = null; g.emit(); };
  return (
    <div className="fade-in" style={{ position: 'absolute', inset: 0, zIndex: 800, background: 'rgba(0,0,0,.85)' }} onClick={close}>
      <div className="outline-text" style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontSize: 32, fontWeight: 900, color: '#ffe38a' }}>{title}（{cards.length}）</div>
      {o === 'draw' && <div style={{ position: 'absolute', top: 112, left: 0, right: 0, textAlign: 'center', color: '#aaa', fontSize: 15 }}>卡牌顺序已被打乱</div>}
      <div className="scroll-thin" style={{ position: 'absolute', top: 140, left: 0, right: 0, bottom: 90, overflowY: 'auto', padding: '10px 60px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
          {cards.map((c) => <FlowCard key={c.uid} card={c} scale={0.78} combat={o !== 'deck'} />)}
          {cards.length === 0 && <div style={{ color: '#888', fontSize: 22, marginTop: 100 }}>空空如也</div>}
        </div>
      </div>
      <button className="sts-btn" style={{ position: 'absolute', left: 710, bottom: 20, width: 180 }} onClick={close}>返回</button>
    </div>
  );
}

export function MapOverlay() {
  const g = useGame();
  if (g.overlay !== 'map') return null;
  const close = () => { g.overlay = null; g.emit(); };
  return (
    <div className="fade-in" style={{ position: 'absolute', inset: 0, zIndex: 800, background: 'rgba(0,0,0,.8)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 100, bottom: 0 }}>
        <MapView readOnly />
      </div>
      <button className="sts-btn" style={{ position: 'absolute', right: 60, top: 780, width: 180, zIndex: 5 }} onClick={close}>返回</button>
    </div>
  );
}

export function Toasts() {
  const g = useGame();
  return (
    <div style={{ position: 'absolute', top: 120, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1000, pointerEvents: 'none' }}>
      {g.toasts.map((t) => (
        <div key={t.id} className="tip-box pop-in" style={{ fontSize: 20, fontWeight: 700, padding: '10px 24px' }}>{t.text}</div>
      ))}
    </div>
  );
}
