import { useState } from 'react';
import { useGame, IMG, RichText, Embers, Tip, ACT_NAMES } from './common';
import { FlowCard } from './CardView';
import { PotionIcon, RelicIcon } from './TopBar';
import { RELICS } from '../game/relics';
import { POTIONS } from '../game/potions';
import { CARD_LIST, CARDS } from '../game/cards';
import { EVENTS } from '../game/events';
import { sound, sfx } from '../game/sfx';
import type { CardInst } from '../game/types';

const Backdrop = ({ dim = 0.55, blur = 0 }: { dim?: number; blur?: number }) => (
  <>
    <img src={IMG.bg} style={{ position: 'absolute', inset: 0, width: 1600, height: 900, objectFit: 'cover', filter: `blur(${blur}px) brightness(${1 - dim})` }} />
  </>
);

// ================= TITLE =================
export function TitleScreen() {
  const g = useGame();
  const [, force] = useState(0);
  const hasSave = g.hasSave();
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={IMG.bg} className="bg-pan" style={{ position: 'absolute', inset: 0, width: 1600, height: 900, objectFit: 'cover', filter: 'brightness(.55) saturate(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 40%, transparent 20%, rgba(0,0,0,.8) 90%)' }} />
      <Embers n={40} />
      <img src={IMG.ironclad} className="idle" style={{ position: 'absolute', right: 180, bottom: 90, height: 520, filter: 'drop-shadow(0 0 30px rgba(255,80,40,.35))' }} />
      <div style={{ position: 'absolute', left: 110, top: 110 }}>
        <div style={{ fontSize: 128, fontWeight: 900, letterSpacing: 18, lineHeight: 1, background: 'linear-gradient(#fff6d0, #f0c050 45%, #a86a10)', WebkitBackgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 6px 0 #2a1604) drop-shadow(0 0 30px rgba(255,160,40,.5))' }}>
          杀戮尖塔
        </div>
        <div className="outline-text" style={{ fontSize: 30, letterSpacing: 16, color: '#e8d6ad', marginTop: 12, marginLeft: 8 }}>SLAY THE SPIRE</div>
      </div>
      <div style={{ position: 'absolute', left: 120, top: 440, display: 'flex', flexDirection: 'column', gap: 16, width: 320 }}>
        {hasSave && <button className="sts-btn" onClick={() => { sfx.click(); g.load(); }}>继续游戏</button>}
        <button className="sts-btn" onClick={() => { sfx.click(); if (hasSave && !confirm('开始新游戏会覆盖当前存档，确定吗？')) return; g.newRun(); }}>开始新游戏</button>
        <button className="sts-btn" onClick={() => { sfx.click(); g.screen = 'library'; g.emit(); }}>卡牌图鉴</button>
        <button className="sts-btn" onClick={() => { sound.toggle(); sfx.click(); force((x) => x + 1); }}>声音：{sound.on ? '开' : '关'}</button>
      </div>
      <div className="soft-shadow" style={{ position: 'absolute', left: 120, bottom: 40, color: '#b9a57a', fontSize: 15, lineHeight: 1.6 }}>
        拖动卡牌到敌人身上出牌 · 点击卡牌后再点击目标也可出牌 · 右键取消<br />
        三层高塔 · 精英、商店、事件、休息处与首领战 · 自动存档
      </div>
    </div>
  );
}

// ================= NEOW =================
export function NeowScreen() {
  const g = useGame();
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #1d3a5c 0%, #0a1422 60%, #03060b 100%)' }}>
      <Embers n={20} />
      <div style={{ position: 'absolute', left: 420, top: 150, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(140,220,255,.35), transparent 65%)' }} />
      <div className="idle-float" style={{ position: 'absolute', left: 480, top: 200, fontSize: 240, filter: 'drop-shadow(0 0 40px #6cf) hue-rotate(-10deg)' }}>🐋</div>
      <img src={IMG.ironclad} className="idle" style={{ position: 'absolute', left: 120, top: 330, height: 300 }} />
      <div style={{ position: 'absolute', left: 900, top: 170, width: 600 }}>
        <div className="outline-text" style={{ fontSize: 36, fontWeight: 900, color: '#9fe4ff', marginBottom: 14 }}>涅奥</div>
        <div className="tip-box" style={{ fontSize: 21, lineHeight: 1.6, padding: 20, marginBottom: 24 }}>
          {g.neow.length ? '……你好，挑战者……\n'.replace('\n', '') : '……'}
          {g.neow.length > 0 && <><br />我是涅奥。我会给你一份祝福，助你攀登这座高塔。<br />请选择吧……</>}
          {g.neow.length === 0 && <>祝你好运……</>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {g.neow.map((o, i) => (
            <button key={i} className="opt-btn pop-in" style={{ animationDelay: `${i * 0.08}s` }} onClick={() => { sfx.click(); g.pickNeow(i); }}>
              <RichText text={o.label} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= REWARD =================
export function RewardScreen() {
  const g = useGame();
  const choosing = g.rewardCardIdx !== null ? g.rewards[g.rewardCardIdx] : null;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Backdrop dim={0.6} blur={3} />
      {!choosing && (
        <div className="pop-in" style={{ position: 'absolute', left: 550, top: 130, width: 500, padding: '20px 30px 30px', background: 'linear-gradient(rgba(30,24,18,.96), rgba(18,14,10,.96))', border: '3px solid #8a6d3b', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,.8)' }}>
          <div className="outline-text" style={{ textAlign: 'center', fontSize: 40, fontWeight: 900, color: '#ffe38a', margin: '-50px 0 16px', letterSpacing: 6 }}>战利品！</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.rewards.map((it, i) => {
              if (it.taken) return null;
              let icon: React.ReactNode = null; let label = ''; let tip: string | undefined;
              if (it.kind === 'gold') { icon = <span style={{ fontSize: 32 }}>🪙</span>; label = `${it.amount} 金币`; }
              if (it.kind === 'potion') { icon = <PotionIcon id={it.id} size={40} />; label = POTIONS[it.id].name; tip = POTIONS[it.id].desc; }
              if (it.kind === 'relic') { icon = <RelicIcon id={it.id} size={42} />; label = RELICS[it.id].name; tip = RELICS[it.id].desc; }
              if (it.kind === 'card') { icon = <span style={{ fontSize: 32 }}>🎴</span>; label = '将一张牌加入你的牌组'; }
              return (
                <Tip key={i} title={tip ? label : undefined} body={tip} side="right" width={240}>
                  <button className="opt-btn" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px' }} onClick={() => g.takeReward(i)}>
                    {icon}<span>{label}</span>
                  </button>
                </Tip>
              );
            })}
          </div>
        </div>
      )}
      {choosing && choosing.kind === 'card' && (
        <div className="fade-in" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }}>
          <div className="outline-text" style={{ position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', fontSize: 36, fontWeight: 900 }}>选择一张牌</div>
          <div style={{ position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 50 }}>
            {choosing.cards.map((c, i) => (
              <div key={c.uid} className="pop-in" style={{ animationDelay: `${i * 0.08}s`, transition: 'transform .15s' }}
                onPointerEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)'; sfx.hover(); }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}>
                <FlowCard card={c} scale={1.25} onClick={() => g.pickRewardCard(c)} />
              </div>
            ))}
          </div>
          <button className="sts-btn" style={{ position: 'absolute', left: 710, top: 640, width: 180 }} onClick={() => { sfx.click(); g.pickRewardCard(null); }}>跳过</button>
        </div>
      )}
      {!choosing && (
        <button className="sts-btn" style={{ position: 'absolute', right: 80, top: 700, width: 200, height: 70, fontSize: 24 }} onClick={() => { sfx.click(); g.proceedFromRewards(); }}>
          继续 ➜
        </button>
      )}
    </div>
  );
}

// ================= REST =================
export function RestScreen() {
  const g = useGame();
  const r = g.run!;
  const heal = Math.floor(r.maxHp * 0.3) + (g.has('regal_pillow') ? 15 : 0);
  const canRest = !g.has('coffee_dripper');
  const canSmith = !g.has('fusion_hammer') && r.deck.some((c) => CARDS[c.id].type !== 'curse' && CARDS[c.id].type !== 'status' && (c.up === 0 || CARDS[c.id].multiUpgrade));
  const girya = g.relic('girya');
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 75%, #5a2a0a 0%, #1a0d05 45%, #050302 100%)' }}>
      <Embers n={50} />
      <div style={{ position: 'absolute', left: 620, top: 480, width: 360, height: 200, borderRadius: '50%', background: 'radial-gradient(rgba(255,140,40,.45), transparent 70%)' }} />
      <div className="flicker" style={{ position: 'absolute', left: 720, top: 470, fontSize: 150, transformOrigin: '50% 100%', filter: 'drop-shadow(0 0 40px #ff7a00)' }}>🔥</div>
      <div style={{ position: 'absolute', left: 700, top: 640, fontSize: 60 }}>🪵🪵</div>
      <img src={IMG.ironclad} className="idle" style={{ position: 'absolute', left: 330, top: 380, height: 320, filter: 'brightness(.8) sepia(.3)' }} />
      <div className="outline-text" style={{ position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', fontSize: 42, fontWeight: 900, color: '#ffe38a', letterSpacing: 6 }}>休息处</div>
      {!g.restDone ? (
        <div style={{ position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 50 }}>
          <RestOpt icon="💤" name="休息" desc={canRest ? `回复 ${heal} 点生命。` : '咖啡滤杯：你不能休息。'} disabled={!canRest} onClick={() => g.rest()} />
          <RestOpt icon="⚒️" name="锻造" desc={canSmith ? '升级你牌组中的一张牌。' : '融合之锤：你不能锻造。'} disabled={!canSmith} onClick={() => g.smith()} />
          {girya && <RestOpt icon="🏋️" name="举重" desc={`永久获得 1 点力量。（${girya.counter}/3）`} disabled={girya.counter >= 3} onClick={() => g.lift()} />}
        </div>
      ) : (
        <>
          <div className="tip-box fade-in" style={{ position: 'absolute', top: 230, left: 500, width: 600, textAlign: 'center', fontSize: 24, padding: 24 }}>{g.restDone}</div>
          <button className="sts-btn" style={{ position: 'absolute', right: 80, top: 700, width: 200, height: 70, fontSize: 24 }} onClick={() => g.goMap()}>继续 ➜</button>
        </>
      )}
    </div>
  );
}
function RestOpt({ icon, name, desc, onClick, disabled }: { icon: string; name: string; desc: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={() => { sfx.click(); onClick(); }} className="pop-in"
      style={{ width: 200, height: 220, borderRadius: 16, cursor: disabled ? 'not-allowed' : 'pointer', background: 'radial-gradient(circle at 50% 35%, rgba(255,200,120,.25), rgba(30,20,10,.9) 70%)', border: '3px solid #c9a55c', color: '#fff', opacity: disabled ? 0.4 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform .12s' }}
      onPointerEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)'; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}>
      <span style={{ fontSize: 72 }}>{icon}</span>
      <span className="outline-text" style={{ fontSize: 28, fontWeight: 900 }}>{name}</span>
      <span style={{ fontSize: 15, color: '#ddd', padding: '0 14px' }}>{desc}</span>
    </button>
  );
}

// ================= SHOP =================
export function ShopScreen() {
  const g = useGame();
  const s = g.shop!;
  const r = g.run!;
  const Price = ({ p, sale }: { p: number; sale?: boolean }) => (
    <div className="outline-text" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', fontSize: 20, fontWeight: 900, color: r.gold >= p ? '#fff' : '#ff6b5b' }}>
      🪙{p}{sale && <span style={{ color: '#7fff00', fontSize: 14, marginLeft: 4 }}>特价!</span>}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Backdrop dim={0.7} blur={4} />
      <div style={{ position: 'absolute', left: 90, top: 110, right: 90, bottom: 40, borderRadius: 20, background: 'repeating-linear-gradient(90deg, #6b2a1a 0 30px, #5a2214 30px 60px), #5a2214', border: '8px solid #3a1a0e', boxShadow: 'inset 0 0 80px rgba(0,0,0,.7), 0 10px 40px rgba(0,0,0,.8)' }}>
        <div style={{ position: 'absolute', inset: 16, border: '3px dashed rgba(255,210,120,.35)', borderRadius: 12 }} />
      </div>
      <div style={{ position: 'absolute', left: 110, top: 540, fontSize: 150, filter: 'drop-shadow(0 6px 10px #000)' }}>🧙‍♂️</div>
      <div className="tip-box" style={{ position: 'absolute', left: 90, top: 470, width: 230, fontSize: 17 }}>“欢迎光临！随便看看吧，嘿嘿嘿……”</div>
      <div style={{ position: 'absolute', left: 300, top: 140, display: 'flex', gap: 24 }}>
        {s.items.filter((it) => it.kind === 'card').map((it) => {
          const idx = s.items.indexOf(it);
          return (
            <div key={idx} style={{ opacity: it.sold ? 0.15 : 1, pointerEvents: it.sold ? 'none' : 'auto', transition: 'transform .12s' }}
              onPointerEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.06)'; }}
              onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}>
              <FlowCard card={it.card!} scale={0.92} onClick={() => g.buy(idx)} />
              <Price p={it.price} sale={it.sale} />
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 420, top: 480, display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        {s.items.filter((it) => it.kind !== 'card').map((it) => {
          const idx = s.items.indexOf(it);
          const d = it.kind === 'relic' ? RELICS[it.id] : POTIONS[it.id];
          return (
            <Tip key={idx} title={d.name} body={d.desc} side="top" width={220}>
              <div onClick={() => g.buy(idx)} style={{ cursor: 'pointer', opacity: it.sold ? 0.15 : 1, pointerEvents: it.sold ? 'none' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 90 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(rgba(255,230,160,.25), transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {it.kind === 'relic' ? <RelicIcon id={it.id} size={70} /> : <PotionIcon id={it.id} size={64} />}
                </div>
                <Price p={it.price} />
              </div>
            </Tip>
          );
        })}
        <Tip title="卡牌移除服务" body="从你的牌组中移除一张牌。每次使用后价格上涨。" side="top" width={220}>
          <div onClick={() => g.buyRemove()} style={{ cursor: s.removeUsed ? 'default' : 'pointer', opacity: s.removeUsed ? 0.2 : 1, width: 130, height: 170, marginLeft: 40, borderRadius: 12, background: 'linear-gradient(#3a3a4a, #1a1a24)', border: '3px solid #9a9ab0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 56 }}>🗑️</span>
            <span style={{ fontWeight: 900, fontSize: 16 }}>移除卡牌</span>
            {!s.removeUsed ? <Price p={r.cardRemoveCost} /> : <span style={{ fontSize: 14 }}>已售罄</span>}
          </div>
        </Tip>
      </div>
      <button className="sts-btn" style={{ position: 'absolute', right: 120, top: 760, width: 200, height: 64, fontSize: 22 }} onClick={() => { sfx.click(); g.goMap(); }}>离开 ➜</button>
    </div>
  );
}

// ================= EVENT =================
export function EventScreen() {
  const g = useGame();
  const page = g.eventPage;
  const ev = EVENTS.find((e) => e.id === g.eventId);
  if (!page || !ev) return null;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Backdrop dim={0.65} blur={3} />
      <div className="pop-in" style={{ position: 'absolute', left: 120, top: 120, width: 1360, height: 700, background: 'linear-gradient(rgba(22,18,14,.95), rgba(12,10,8,.95))', border: '4px solid #8a6d3b', borderRadius: 12, boxShadow: '0 10px 50px rgba(0,0,0,.9)' }}>
        <div style={{ position: 'absolute', left: 40, top: 40, width: 540, height: 620, borderRadius: 8, border: '4px solid #c9a55c', background: 'radial-gradient(circle at 50% 40%, #4a3a5a, #1a1420 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Embers n={14} />
          <span className="idle-float" style={{ fontSize: 220, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,.8))' }}>{ev.art}</span>
        </div>
        <div style={{ position: 'absolute', left: 630, top: 40, right: 40 }}>
          <div className="outline-text" style={{ fontSize: 40, fontWeight: 900, color: '#ffe38a', marginBottom: 20 }}>{ev.name}</div>
          <div key={page.text} className="fade-in" style={{ fontSize: 21, lineHeight: 1.65, color: '#eee', minHeight: 250 }}><RichText text={page.text} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            {page.options.map((o, i) => (
              <button key={page.text + i} className="opt-btn pop-in" style={{ animationDelay: `${i * 0.06}s` }} disabled={o.disabled} onClick={() => { sfx.click(); o.pick(); }}>
                <RichText text={o.label} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= TREASURE =================
export function TreasureScreen() {
  const g = useGame();
  const size = g.chestSize;
  const scale = size === 'small' ? 0.8 : size === 'medium' ? 1 : 1.25;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Backdrop dim={0.5} />
      <img src={IMG.ironclad} className="idle" style={{ position: 'absolute', left: 250, top: 340, height: 300 }} />
      <div onClick={() => { g.openChest(); }} className={g.chestOpened ? '' : 'idle'}
        style={{ position: 'absolute', left: 900, top: 380, cursor: 'pointer', transform: `scale(${scale})`, transformOrigin: '50% 100%', fontSize: 200, filter: `drop-shadow(0 0 ${g.chestOpened ? 60 : 20}px rgba(255,210,80,.8))`, transition: 'filter .5s' }}>
        {g.chestOpened ? '✨' : '🧰'}
      </div>
      <div className="outline-text" style={{ position: 'absolute', top: 160, left: 0, right: 0, textAlign: 'center', fontSize: 38, fontWeight: 900, color: '#ffe38a' }}>
        {size === 'small' ? '小宝箱' : size === 'medium' ? '中宝箱' : '大宝箱'}
      </div>
      {!g.chestOpened && <div className="outline-text" style={{ position: 'absolute', top: 700, left: 850, width: 400, textAlign: 'center', fontSize: 22 }}>点击宝箱打开</div>}
      <button className="sts-btn" style={{ position: 'absolute', right: 80, top: 760, width: 180 }} onClick={() => g.goMap()}>离开 ➜</button>
    </div>
  );
}

// ================= BOSS RELIC =================
export function BossRelicScreen() {
  const g = useGame();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Backdrop dim={0.7} blur={3} />
      <Embers n={30} />
      <div className="outline-text" style={{ position: 'absolute', top: 140, left: 0, right: 0, textAlign: 'center', fontSize: 44, fontWeight: 900, color: '#ffe38a', letterSpacing: 6 }}>选择一件Boss遗物</div>
      <div style={{ position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 60 }}>
        {g.bossRelics.map((id, i) => (
          <div key={id} className="pop-in" onClick={() => g.pickBossRelic(id)} style={{ animationDelay: `${i * 0.1}s`, cursor: 'pointer', width: 300, padding: 24, borderRadius: 16, background: 'radial-gradient(circle at 50% 25%, rgba(255,210,100,.25), rgba(20,14,8,.95) 60%)', border: '3px solid #c9a55c', textAlign: 'center', transition: 'transform .12s' }}
            onPointerEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)'; sfx.hover(); }}
            onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><RelicIcon id={id} size={110} /></div>
            <div className="outline-text" style={{ fontSize: 26, fontWeight: 900, color: '#ffe38a', margin: '12px 0 8px' }}>{RELICS[id].name}</div>
            <div style={{ fontSize: 17, lineHeight: 1.5, color: '#eee' }}>{RELICS[id].desc}</div>
          </div>
        ))}
      </div>
      <button className="sts-btn" style={{ position: 'absolute', left: 710, top: 720, width: 180 }} onClick={() => g.pickBossRelic(null)}>跳过</button>
    </div>
  );
}

// ================= END SCREENS =================
export function EndScreen({ win }: { win: boolean }) {
  const g = useGame();
  const r = g.run!;
  const rows: [string, number][] = [
    ['攀登楼层', r.floor * 5], ['击败敌人', r.monstersKilled * 2], ['击败精英', r.elitesKilled * 10], ['击败首领', r.bossesKilled * 50], ['到达层数', (r.act - 1) * 100], ['金币', Math.floor(r.gold / 10)],
  ];
  const mins = Math.floor((Date.now() - r.startTime) / 60000);
  return (
    <div className="fade-in" style={{ position: 'absolute', inset: 0 }}>
      <Backdrop dim={0.8} blur={5} />
      {win && <Embers n={60} />}
      <div className="outline-text pop-in" style={{ position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', fontSize: 96, fontWeight: 900, letterSpacing: 20, color: win ? '#ffe38a' : '#ff5a4a' }}>
        {win ? '胜利！' : '你被击败了'}
      </div>
      <div className="outline-text" style={{ position: 'absolute', top: 240, left: 0, right: 0, textAlign: 'center', fontSize: 24, color: '#ccc' }}>
        {win ? '你登上了高塔的顶端……但这真的是终点吗？' : `倒在了第 ${r.act} 层（${ACT_NAMES[r.act]}），第 ${r.floor} 楼。`}
      </div>
      <div className="tip-box" style={{ position: 'absolute', top: 320, left: 600, width: 400, padding: 24, fontSize: 21 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.1)' }}><span>{k}</span><span className="t-y">{v}</span></div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 28, fontWeight: 900 }}><span>总分</span><span className="t-y">{g.score()}</span></div>
        <div style={{ fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' }}>种子 {r.seedName} · 用时 {mins} 分钟 · 牌组 {r.deck.length} 张</div>
      </div>
      <button className="sts-btn" style={{ position: 'absolute', left: 680, top: 740, width: 240, height: 64 }} onClick={() => { sfx.click(); g.run = null; g.goTitle(); }}>返回主菜单</button>
    </div>
  );
}

// ================= LIBRARY =================
export function LibraryScreen() {
  const g = useGame();
  const [up, setUp] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const cards: CardInst[] = CARD_LIST.filter((d) => filter === 'all' || d.rarity === filter || (filter === 'other' && ['special', 'curse'].includes(d.rarity))).map((d, i) => ({ uid: -i - 1, id: d.id, up: up && (d.type !== 'curse' && d.type !== 'status') ? 1 : 0 }));
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#1a1410, #0a0806)' }}>
      <div style={{ position: 'absolute', top: 20, left: 40, right: 40, display: 'flex', alignItems: 'center', gap: 14, zIndex: 5 }}>
        <div className="outline-text" style={{ fontSize: 36, fontWeight: 900, color: '#ffe38a', marginRight: 20 }}>卡牌图鉴</div>
        {[['all', '全部'], ['basic', '基础'], ['common', '普通'], ['uncommon', '罕见'], ['rare', '稀有'], ['other', '状态/诅咒']].map(([k, n]) => (
          <button key={k} className="sts-btn" style={{ fontSize: 16, padding: '6px 14px', borderColor: filter === k ? '#7fff00' : undefined }} onClick={() => setFilter(k)}>{n}</button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, marginLeft: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={up} onChange={(e) => setUp(e.target.checked)} style={{ width: 20, height: 20 }} /> 显示升级
        </label>
        <div style={{ flex: 1 }} />
        <button className="sts-btn" onClick={() => g.goTitle()}>返回</button>
      </div>
      <div className="scroll-thin" style={{ position: 'absolute', top: 90, left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: '20px 60px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, justifyContent: 'center' }}>
          {cards.map((c) => <FlowCard key={c.id} card={c} scale={0.85} />)}
        </div>
      </div>
    </div>
  );
}
