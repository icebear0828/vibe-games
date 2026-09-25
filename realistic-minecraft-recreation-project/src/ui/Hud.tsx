import { useEffect, useRef, useState } from 'react';
import type { UIState } from '../game/engine';
import { BLOCKS } from '../game/blocks';
import { ItemIcon, Count, Heart, Food, Bubble } from './mc';

export interface ChatMsg { text: string; time: number; }

export function Hud({ ui, messages, chatOpen }: { ui: UIState; messages: ChatMsg[]; chatOpen: boolean }) {
  const [nameShow, setNameShow] = useState<{ name: string; t: number } | null>(null);
  const lastSel = useRef<string>('');
  const [, force] = useState(0);
  const cur = ui.inventory[ui.selected];
  const key = `${ui.selected}:${cur?.id ?? 0}`;
  useEffect(() => {
    if (lastSel.current && lastSel.current !== key && cur) setNameShow({ name: BLOCKS[cur.id].name, t: Date.now() });
    lastSel.current = key;
  }, [key]);
  useEffect(() => { const i = setInterval(() => force((x) => x + 1), 250); return () => clearInterval(i); }, []);

  if (ui.hideHud) return null;
  const survival = ui.mode === 'survival';
  const hearts = [];
  for (let i = 0; i < 10; i++) {
    const hp = ui.health - i * 2;
    hearts.push(<Heart key={i} state={hp >= 2 ? 2 : hp === 1 ? 1 : 0} flash={ui.hurt > 0.3} />);
  }
  const bubbles = Math.ceil(Math.max(0, ui.air) / 30);
  const nameAge = nameShow ? (Date.now() - nameShow.t) / 1000 : 99;
  const now = Date.now();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {ui.underwater && <div className="absolute inset-0" style={{ background: 'rgba(20,50,160,0.28)' }} />}
      {ui.inLava && <div className="absolute inset-0" style={{ background: 'rgba(255,90,0,0.55)' }} />}
      {ui.hurt > 0 && survival && <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 180px rgba(255,0,0,${ui.hurt})` }} />}

      {/* crosshair */}
      <div className="absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%,-50%)', mixBlendMode: 'difference' }}>
        <div style={{ position: 'absolute', left: -9, top: -1, width: 18, height: 2, background: '#fff' }} />
        <div style={{ position: 'absolute', left: -1, top: -9, width: 2, height: 18, background: '#fff' }} />
      </div>

      {/* debug */}
      {ui.debug && (
        <div className="absolute left-1 top-1 flex flex-col items-start gap-[2px]">
          {ui.debug.map((l, i) => l ? (
            <div key={i} className="text-[15px] leading-[18px] px-[3px] text-[#e0e0e0]" style={{ background: 'rgba(80,80,80,0.55)', textShadow: '1px 1px 0 #333' }}>{l}</div>
          ) : <div key={i} className="h-[10px]" />)}
        </div>
      )}

      {/* chat history */}
      {!chatOpen && (
        <div className="absolute left-1 bottom-[140px] flex flex-col items-start w-[560px]">
          {messages.slice(-8).map((m, i) => {
            const age = (now - m.time) / 1000;
            if (age > 10) return null;
            const op = age > 9 ? 10 - age : 1;
            return <div key={i} className="px-1 text-[16px] mc-text w-full" style={{ background: `rgba(0,0,0,${0.45 * op})`, opacity: op }}>{m.text}</div>;
          })}
        </div>
      )}

      {/* bottom hud */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {nameShow && nameAge < 2.5 && (
          <div className="mb-2 text-[17px] mc-text" style={{ opacity: nameAge > 2 ? (2.5 - nameAge) * 2 : 1 }}>{nameShow.name}</div>
        )}
        {survival && (
          <div className="w-[364px] flex justify-between items-end mb-[2px]">
            <div className="flex gap-[-2px]" style={{ gap: 0 }}>{hearts.map((h, i) => <div key={i} style={{ marginRight: -2 }}>{h}</div>)}</div>
            <div className="flex flex-col items-end gap-[2px]">
              {ui.air < 300 && <div className="flex flex-row-reverse">{Array.from({ length: bubbles }).map((_, i) => <div key={i} style={{ marginLeft: -2 }}><Bubble /></div>)}</div>}
              <div className="flex flex-row-reverse">{Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ marginLeft: -2 }}><Food /></div>)}</div>
            </div>
          </div>
        )}
        {survival && (
          <div className="w-[364px] h-[10px] mb-[4px] relative" style={{ background: '#000', border: '2px solid #000' }}>
            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(90deg, #2c5d00 0 20px, #000 20px 22px)' }} />
          </div>
        )}
        <div className="relative flex mb-[2px]" style={{ background: 'rgba(0,0,0,0.35)', border: '2px solid #000', boxShadow: 'inset 0 0 0 2px #7d7d7d' }}>
          {Array.from({ length: 9 }).map((_, i) => {
            const s = ui.inventory[i];
            return (
              <div key={i} className="relative w-[40px] h-[40px] flex items-center justify-center" style={{ boxShadow: 'inset 0 0 0 2px #4f4f4f', background: 'rgba(120,120,120,0.35)' }}>
                {s && <ItemIcon id={s.id} size={32} />}
                {s && survival && <Count n={s.count} />}
              </div>
            );
          })}
          <div className="absolute top-[-4px] h-[48px] w-[48px] pointer-events-none" style={{ left: ui.selected * 40 - 4, border: '4px solid #fff', outline: '2px solid #000', boxShadow: 'inset 0 0 0 2px #000' }} />
        </div>
      </div>
    </div>
  );
}
