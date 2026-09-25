import { useState } from 'react';
import { useGame, Tip, ACT_NAMES } from './common';
import { RELICS } from '../game/relics';
import { POTIONS } from '../game/potions';
import { sound, sfx } from '../game/sfx';

export function PotionIcon({ id, size = 38 }: { id: string; size?: number }) {
  const p = POTIONS[id];
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div style={{
        position: 'absolute', left: '18%', right: '18%', top: '28%', bottom: '4%', borderRadius: '45% 45% 40% 40%',
        background: `radial-gradient(circle at 35% 35%, #fff8, ${p.color} 45%, #000a)`, border: '2px solid #222', boxShadow: `0 0 8px ${p.color}`,
      }} />
      <div style={{ position: 'absolute', left: '38%', right: '38%', top: '8%', height: '24%', background: '#8a6a3a', border: '2px solid #222', borderRadius: 3 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, paddingTop: size * 0.25 }}>{p.icon}</div>
    </div>
  );
}

export function RelicIcon({ id, size = 44, counter }: { id: string; size?: number; counter?: number | null }) {
  const r = RELICS[id];
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,230,160,.25), transparent 70%)' }} />
      <span style={{ fontSize: size * 0.68, filter: 'drop-shadow(0 2px 3px #000)' }}>{r.icon}</span>
      {counter != null && (
        <span className="outline-text" style={{ position: 'absolute', right: -2, bottom: -4, fontSize: 15, fontWeight: 900 }}>{counter}</span>
      )}
    </div>
  );
}

export function TopBar() {
  const g = useGame();
  const r = g.run!;
  const [potMenu, setPotMenu] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const hp = g.c && g.screen === 'combat' ? g.c.player.hp : r.hp;
  const maxHp = g.c && g.screen === 'combat' ? g.c.player.maxHp : r.maxHp;
  const deckCount = r.deck.length;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 56, zIndex: 100, background: 'linear-gradient(rgba(10,8,6,.92), rgba(20,15,10,.8))', borderBottom: '2px solid rgba(201,165,92,.4)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }} className="outline-text">铁甲战士</div>
        <Tip title="生命值" body="你当前的生命值。降到 0 时你将死亡。">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 700 }} className="outline-text">
            <span>❤️</span><span style={{ color: '#ff6b5b' }}>{hp}/{maxHp}</span>
          </div>
        </Tip>
        <Tip title="金币" body="可以在商人处购买物品。">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 700 }} className="outline-text">
            <span>🪙</span><span style={{ color: '#ffd84a' }}>{r.gold}</span>
          </div>
        </Tip>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {r.potions.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {p ? (
                <Tip title={POTIONS[p].name} body={POTIONS[p].desc} width={220}>
                  <div style={{ cursor: 'pointer', outline: g.targetingPotion === i ? '2px solid #7fff00' : 'none', borderRadius: 8 }} onClick={() => { sfx.click(); setPotMenu(potMenu === i ? null : i); }}>
                    <PotionIcon id={p} />
                  </div>
                </Tip>
              ) : (
                <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 26, borderRadius: '40%', border: '2px dashed rgba(255,255,255,.25)' }} />
                </div>
              )}
              {potMenu === i && p && (
                <div className="tip-box pop-in" style={{ position: 'absolute', top: 46, left: -20, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 6, width: 100 }}>
                  <button className="sts-btn" style={{ fontSize: 16, padding: '4px 10px' }} onClick={() => { setPotMenu(null); g.usePotion(i); }}>使用</button>
                  <button className="sts-btn" style={{ fontSize: 16, padding: '4px 10px' }} onClick={() => { setPotMenu(null); g.discardPotion(i); }}>丢弃</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <Tip title={`第 ${r.act} 层：${ACT_NAMES[r.act]}`} body={`当前楼层：${r.floor}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 700 }} className="outline-text">
            <span>🗼</span><span>{r.floor}</span>
            <span style={{ fontSize: 15, color: '#c9a55c', marginLeft: 6 }}>{ACT_NAMES[r.act]}</span>
          </div>
        </Tip>
        <div style={{ flex: 1 }} />
        <Tip title="地图" body="查看地图。" side="bottom">
          <button onClick={() => { sfx.click(); g.overlay = g.overlay === 'map' ? null : 'map'; g.emit(); }} style={{ fontSize: 28, cursor: 'pointer', background: 'none', border: 'none' }}>🗺️</button>
        </Tip>
        <Tip title="牌组" body="查看你牌组中所有的牌。" side="bottom">
          <button onClick={() => { sfx.click(); g.overlay = g.overlay === 'deck' ? null : 'deck'; g.emit(); }} style={{ fontSize: 28, cursor: 'pointer', background: 'none', border: 'none', position: 'relative' }}>
            🎴<span className="outline-text" style={{ position: 'absolute', right: -6, bottom: -4, fontSize: 16, fontWeight: 900, color: '#fff' }}>{deckCount}</span>
          </button>
        </Tip>
        <div style={{ position: 'relative' }}>
          <button onClick={() => { sfx.click(); setMenu(!menu); }} style={{ fontSize: 28, cursor: 'pointer', background: 'none', border: 'none' }}>⚙️</button>
          {menu && (
            <div className="tip-box pop-in" style={{ position: 'absolute', right: 0, top: 48, width: 200, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 400 }}>
              <button className="sts-btn" style={{ fontSize: 16 }} onClick={() => { sound.toggle(); setMenu(false); g.emit(); }}>声音：{sound.on ? '开' : '关'}</button>
              <button className="sts-btn" style={{ fontSize: 16 }} onClick={() => { setMenu(false); g.save(); g.goTitle(); }}>保存并退出</button>
              <button className="sts-btn" style={{ fontSize: 16, borderColor: '#c44' }} onClick={() => { setMenu(false); g.clearSave(); g.lose(); }}>放弃本局</button>
            </div>
          )}
        </div>
      </div>
      {/* relic bar */}
      <div style={{ position: 'absolute', left: 12, top: 60, zIndex: 99, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 1200 }}>
        {r.relics.map((rl, i) => {
          const d = RELICS[rl.id];
          return (
            <Tip key={i} title={d.name} body={<>{d.desc}{d.flavor && <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: 4 }}>{d.flavor}</div>}</>} side="bottom" width={260}>
              <div className="pop-in"><RelicIcon id={rl.id} counter={g.relicCounter(rl)} /></div>
            </Tip>
          );
        })}
      </div>
    </>
  );
}
