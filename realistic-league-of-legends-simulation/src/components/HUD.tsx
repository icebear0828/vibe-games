import { useState } from 'react';
import type { Game, Unit } from '../game/engine';
import { XP_TABLE, SUMMONER_CD, DRAGONS } from '../game/engine';
import { DD_CHAMPIONS, DD_SUMMONERS } from '../game/dd';
import { champIcon, spellIcon, passiveIcon, summIcon } from '../game/assets';
import { ITEMS, itemIcon, statLines, buyCost, SHOP_CATS } from '../game/items';

const fmt = (t: number) => `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

function CD({ rem, max, size = 'text-xl' }: { rem: number; max: number; size?: string }) {
  if (rem <= 0) return null;
  const pct = Math.min(1, rem / Math.max(0.01, max));
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: `conic-gradient(rgba(0,0,0,0.78) ${pct * 360}deg, rgba(0,0,0,0.25) 0)` }}>
      <span className={`${size} font-bold text-white drop-shadow-[0_0_3px_#000]`}>{rem >= 1 ? Math.ceil(rem) : rem.toFixed(1)}</span>
    </div>
  );
}

function Tooltip({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`pointer-events-none absolute bottom-full mb-3 left-1/2 -translate-x-1/2 ${wide ? 'w-80' : 'w-64'} p-3 bg-[#010a13f0] border border-[#785a28] text-xs text-[#a09b8c] opacity-0 group-hover:opacity-100 z-50 transition-opacity shadow-2xl`}>{children}</div>;
}

export function BottomHUD({ g, onHoverSlot, onShop }: { g: Game; onHoverSlot: (s: number | null) => void; onShop: () => void }) {
  const c = g.player;
  const dd = DD_CHAMPIONS[c.champId];
  const xpPrev = XP_TABLE[c.level - 1], xpNext = XP_TABLE[c.level];
  const xpPct = c.level >= 18 ? 1 : (c.xp - xpPrev) / (xpNext - xpPrev);
  const st = c.st;
  const buffs = c.buffs.filter(b => !b.hidden && b.name);
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end pointer-events-auto select-none">
      {/* stats */}
      <div className="w-[150px] bg-[#010a13]/95 border border-[#785a28] border-r-0 px-2 py-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-[#cdbe91] mb-0">
        {[['⚔', Math.round(st.ad), '攻击力'], ['✦', Math.round(st.ap), '法术强度'], ['🛡', Math.round(st.armor), '护甲'], ['◈', Math.round(st.mr), '魔抗'], ['»', st.as.toFixed(2), '攻速'], ['⌛', Math.round(st.haste), '技能急速'], ['✸', Math.round(st.crit * 100) + '%', '暴击'], ['➤', Math.round(st.ms), '移速']].map(([i, v, n]) => (
          <div key={n as string} title={n as string} className="flex items-center gap-1"><span className="text-[#c8aa6e] w-3 text-center">{i}</span><span>{v}</span></div>
        ))}
      </div>
      {/* main */}
      <div className="relative bg-gradient-to-b from-[#0e1a22] to-[#010a13] border border-[#785a28] px-3 pt-2 pb-2">
        {buffs.length > 0 && (
          <div className="absolute -top-8 left-24 flex gap-1">
            {buffs.slice(0, 10).map(b => (
              <div key={b.id} className={`group relative h-6 px-1.5 text-[10px] flex items-center border ${b.debuff ? 'border-red-600 bg-red-950/80 text-red-200' : 'border-[#c8aa6e] bg-[#1e2328]/90 text-[#f0e6d2]'}`}>
                {b.name}{b.stacks && b.stacks > 1 ? ` x${b.stacks}` : ''} <span className="ml-1 text-[#a09b8c]">{b.dur < 200 ? Math.ceil(b.dur - b.t) : ''}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-3">
          {/* portrait */}
          <div className="relative w-[84px] h-[84px] -mt-6">
            <svg className="absolute -inset-1 w-[92px] h-[92px] -rotate-90" viewBox="0 0 92 92"><circle cx="46" cy="46" r="43" fill="none" stroke="#1e2328" strokeWidth="5" /><circle cx="46" cy="46" r="43" fill="none" stroke="#7a5ae8" strokeWidth="5" strokeDasharray={`${xpPct * 270} 999`} /></svg>
            <img src={champIcon(c.champId)} className={`w-[84px] h-[84px] rounded-full border-2 border-[#c8aa6e] ${c.alive ? '' : 'grayscale'}`} alt="" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#010a13] border border-[#c8aa6e] flex items-center justify-center text-sm font-bold text-[#f0e6d2]">{c.level}</div>
            {!c.alive && <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">{Math.ceil(c.respawn)}</div>}
          </div>
          <div>
            <div className="flex items-end gap-1.5">
              <div className="group relative w-9 h-9 mb-0.5">
                <img src={passiveIcon(c.champId)} className="w-9 h-9 border border-[#785a28]" alt="" />
                <Tooltip><div className="text-[#f0e6d2] font-bold mb-1">{dd.passive.name} <span className="text-[#a09b8c]">(被动)</span></div>{dd.passive.desc}</Tooltip>
              </div>
              {c.def!.abilities.map((a, i) => {
                const lvl = c.abil[i];
                const cost = lvl ? a.cost[lvl - 1] : a.cost[0];
                const max = lvl ? a.cd[lvl - 1] * 100 / (100 + st.haste) : 1;
                const canUp = c.points > 0 && (i === 3 ? lvl < (c.level >= 16 ? 3 : c.level >= 11 ? 2 : c.level >= 6 ? 1 : 0) : lvl < 5 && lvl < Math.floor((c.level + 1) / 2));
                const noMana = lvl > 0 && c.mana < cost;
                const toggled = (c.champId === 'Amumu' && i === 1 && c.data.aura) || (c.champId === 'Jinx' && i === 0 && c.data.rocket);
                return (
                  <div key={i} className="group relative" onMouseEnter={() => onHoverSlot(i)} onMouseLeave={() => onHoverSlot(null)}>
                    {canUp && <button onClick={() => g.cmdLevel(c, i)} className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-6 bg-[#c8aa6e] text-[#010a13] font-black text-lg leading-none border border-[#f0e6d2] animate-pulse">+</button>}
                    <div className={`relative w-[54px] h-[54px] border-2 ${toggled ? 'border-[#0ac8b9]' : 'border-[#785a28]'} overflow-hidden`}>
                      <img src={spellIcon(c.champId, i)} className={`w-full h-full ${lvl ? '' : 'grayscale brightness-50'} ${noMana ? 'hue-rotate-[200deg] brightness-75' : ''}`} alt="" />
                      <CD rem={c.cds[i]} max={max} />
                      <span className="absolute top-0 left-0.5 text-[10px] font-bold text-white drop-shadow-[0_0_2px_#000]">{'QWER'[i]}</span>
                    </div>
                    <div className="flex justify-center gap-[2px] mt-1">{Array.from({ length: i === 3 ? 3 : 5 }).map((_, k) => <div key={k} className={`w-[7px] h-[4px] ${k < lvl ? 'bg-[#c8aa6e]' : 'bg-[#1e2328]'}`} />)}</div>
                    <Tooltip wide>
                      <div className="text-[#f0e6d2] font-bold text-sm mb-1">{dd.spells[i].name} <span className="text-[#a09b8c] text-xs">[{'QWER'[i]}] 等级 {lvl}</span></div>
                      <div className="text-[#0ac8b9] mb-1">{!a.noCostText && cost ? `消耗 ${cost} 法力` : '无消耗'} · 冷却 {(a.cd[Math.max(0, lvl - 1)] * 100 / (100 + st.haste)).toFixed(1)}秒{a.range && a.range < 5000 ? ` · 范围 ${a.range}` : a.range >= 5000 ? ' · 全图' : ''}</div>
                      {dd.spells[i].desc}
                      <div className="mt-2 text-[#5b5a56]">Ctrl+{'QWER'[i]} 升级技能</div>
                    </Tooltip>
                  </div>
                );
              })}
              <div className="flex flex-col gap-1 ml-1 mb-2">
                {c.summ.map((s, i) => (
                  <div key={i} className="group relative w-[34px] h-[34px] border border-[#785a28] overflow-hidden">
                    <img src={summIcon(s.id)} className="w-full h-full" alt="" />
                    <CD rem={s.cd} max={SUMMONER_CD[s.id]} size="text-xs" />
                    <span className="absolute bottom-0 right-0.5 text-[9px] font-bold text-white drop-shadow-[0_0_2px_#000]">{'DF'[i]}</span>
                    <Tooltip><div className="text-[#f0e6d2] font-bold">{DD_SUMMONERS[s.id]?.name} [{'DF'[i]}]</div>冷却 {SUMMONER_CD[s.id]} 秒</Tooltip>
                  </div>
                ))}
              </div>
            </div>
            {/* bars */}
            <div className="mt-1.5 w-[330px]">
              <div className="relative h-[18px] bg-[#0a1a0a] border border-black">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#56d84a] to-[#1f8a1a] transition-[width] duration-100" style={{ width: `${c.hp / c.maxHp * 100}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow-[0_0_2px_#000]">{Math.ceil(c.hp)} / {Math.ceil(c.maxHp)}</div>
                <div className="absolute right-1 inset-y-0 flex items-center text-[9px] text-[#b0ffb0]">+{(st.hpRegen * 5).toFixed(1)}</div>
              </div>
              <div className="relative h-[14px] bg-[#0a0a1a] border border-black mt-[2px]">
                {c.maxMana > 0 && <div className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#4a9aff] to-[#1a4ab8]" style={{ width: `${c.mana / c.maxMana * 100}%` }} />}
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-[0_0_2px_#000]">{c.maxMana > 0 ? `${Math.floor(c.mana)} / ${Math.floor(c.maxMana)}` : '无资源'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* items */}
      <div className="bg-[#010a13]/95 border border-[#785a28] border-l-0 p-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <div className="grid grid-cols-3 gap-1">
            {c.items.map((id, i) => {
              const it = id ? ITEMS[id] : null;
              return (
                <div key={i} className="group relative w-[38px] h-[38px] border border-[#3c3c41] bg-[#0a0e13]">
                  {it && <img src={itemIcon(it.id)} className="w-full h-full" alt="" />}
                  {it && it.active && <CD rem={c.itemCd[i]} max={it.activeCd || 1} size="text-xs" />}
                  {it && it.stack && <span className="absolute bottom-0 right-0.5 text-[10px] text-white font-bold drop-shadow-[0_0_2px_#000]">{c.stacks[i]}</span>}
                  <span className="absolute top-0 left-0.5 text-[8px] text-[#a09b8c]">{[1, 2, 3, 5, 6, 7][i]}</span>
                  {it && <Tooltip><div className="text-[#f0e6d2] font-bold mb-1">{it.name}</div><div className="text-[#0ac8b9]">{statLines(it.stats).join('  ')}</div>{it.passive && <div className="mt-1">{it.passive}</div>}<div className="mt-1 text-[#c8aa6e]">售价 {Math.floor(it.gold * 0.7)}</div></Tooltip>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1">
            <div className="group relative w-[38px] h-[38px] border border-[#c8aa6e] rounded-full overflow-hidden bg-[#0a0e13]">
              <img src={itemIcon(3340)} className="w-full h-full" alt="" />
              {c.wards <= 0 && <CD rem={c.wardCd} max={120} size="text-xs" />}
              <span className="absolute bottom-0 right-1 text-[10px] font-bold text-white drop-shadow-[0_0_2px_#000]">{c.wards}</span>
              <Tooltip><div className="text-[#f0e6d2] font-bold">侦查守卫 [4]</div>放置一个隐形守卫，提供视野。</Tooltip>
            </div>
            <button onClick={() => g.cmdRecall(c)} title="回城 [B]" className="w-[38px] h-[38px] border border-[#3c3c41] bg-gradient-to-b from-[#1a3a6a] to-[#0a1a3a] text-lg">⟲</button>
          </div>
        </div>
        <button onClick={onShop} className="flex items-center justify-center gap-1 h-7 bg-[#1e2328] border border-[#785a28] hover:border-[#c8aa6e] text-[#f0e6d2] text-sm font-bold">
          <span className="inline-block w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#ffe680] to-[#c8961e] border border-[#8a6a1a]" />{Math.floor(c.gold)}
        </button>
      </div>
    </div>
  );
}

export function TopBar({ g, fps }: { g: Game; fps: number }) {
  const p = g.player; const pt = g.playerTeam;
  return (
    <div className="absolute top-0 right-0 flex items-center gap-4 bg-[#010a13]/90 border-b border-l border-[#785a28] px-4 py-1.5 text-sm text-[#f0e6d2] pointer-events-none select-none">
      <div className="flex items-center gap-2 font-bold"><span className="text-[#3a9bff]">{g.teamKills[pt]}</span><span className="text-[#a09b8c]">⚔</span><span className="text-[#ff4a4a]">{g.teamKills[1 - pt]}</span></div>
      <div className="flex items-center gap-1 text-xs text-[#a09b8c]"><span>🗼</span><span className="text-[#3a9bff]">{g.teamTowers[pt]}</span>/<span className="text-[#ff4a4a]">{g.teamTowers[1 - pt]}</span></div>
      <div className="flex gap-0.5">{g.dragons[pt].map((d, i) => <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: DRAGONS.find(x => x.id === d)?.color }} />)}</div>
      <div className="text-xs"><span className="text-[#a09b8c]">KDA </span>{p.kills}/{p.deaths}/{p.assists}</div>
      <div className="text-xs"><span className="text-[#a09b8c]">补刀 </span>{p.cs}</div>
      <div className="font-mono text-base">{fmt(g.time)}</div>
      <div className="text-[10px] text-[#5b5a56]">{fps}fps</div>
    </div>
  );
}

export function AllyPanel({ g }: { g: Game }) {
  const allies = g.champs.filter(c => c.team === g.playerTeam && c !== g.player);
  return (
    <div className="absolute left-2 top-16 flex flex-col gap-2 pointer-events-none select-none">
      {allies.map(c => (
        <div key={c.id} className="flex items-center gap-1.5">
          <div className="relative">
            <img src={champIcon(c.champId)} className={`w-11 h-11 rounded-full border-2 border-[#3a9bff] ${c.alive ? '' : 'grayscale brightness-50'}`} alt="" />
            {!c.alive && <span className="absolute inset-0 flex items-center justify-center font-bold text-white">{Math.ceil(c.respawn)}</span>}
            <span className="absolute -bottom-1 -left-1 text-[10px] bg-black border border-[#785a28] px-1 text-[#f0e6d2]">{c.level}</span>
            {c.abil[3] > 0 && <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-black ${c.cds[3] <= 0 ? 'bg-[#0ac8b9]' : 'bg-[#333]'}`} />}
          </div>
          <div className="w-16">
            <div className="h-1.5 bg-black/80"><div className="h-full bg-[#2f8fe8]" style={{ width: `${c.alive ? c.hp / c.maxHp * 100 : 0}%` }} /></div>
            <div className="h-1 bg-black/80 mt-[1px]"><div className="h-full bg-[#4a7aff]" style={{ width: `${c.maxMana ? c.mana / c.maxMana * 100 : 0}%` }} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Announcer({ g }: { g: Game }) {
  const a = g.announcements[g.announcements.length - 1];
  if (!a || a.t > 3.5) return null;
  const op = a.t > 3 ? (3.5 - a.t) * 2 : Math.min(1, a.t * 5);
  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none" style={{ opacity: op, transform: `translateX(-50%) scale(${a.t < 0.2 ? 1.3 - a.t * 1.5 : 1})` }}>
      {a.icons && (
        <div className="flex items-center gap-3 mb-2">
          <img src={champIcon(a.icons[0])} className="w-14 h-14 rounded-full border-2 border-[#c8aa6e]" alt="" />
          {a.icons[1] && <><span className="text-2xl text-[#c8aa6e]">⚔</span><img src={champIcon(a.icons[1])} className="w-14 h-14 rounded-full border-2 border-red-500 grayscale" alt="" /></>}
        </div>
      )}
      <div className="text-3xl font-black tracking-wider px-10 py-2 lol-banner" style={{ color: a.color }}>{a.text}</div>
      {a.sub && <div className="text-sm text-[#f0e6d2] mt-1 drop-shadow-[0_0_3px_#000]">{a.sub}</div>}
    </div>
  );
}

export function KillFeed({ g }: { g: Game }) {
  const items = g.feed.filter(f => g.time - f.t < 12).slice(-5);
  return (
    <div className="absolute right-2 top-12 flex flex-col gap-1 items-end pointer-events-none select-none">
      {items.map((f, i) => (
        <div key={i} className={`flex items-center gap-1.5 px-2 py-1 bg-black/70 border-l-2 ${f.kteam === g.playerTeam ? 'border-[#3a9bff]' : 'border-[#ff4a4a]'}`}>
          {f.killer ? <img src={champIcon(f.killer)} className="w-7 h-7" alt="" /> : <span className="text-xs text-[#a09b8c]">小兵/塔</span>}
          {f.assists && f.assists.length > 0 && <div className="flex -space-x-1">{f.assists.map(a => <img key={a} src={champIcon(a)} className="w-4 h-4 rounded-full" alt="" />)}</div>}
          <span className="text-[#c8aa6e] text-sm">⚔</span>
          {f.victim ? <img src={champIcon(f.victim)} className="w-7 h-7 grayscale" alt="" /> : <span className="text-xs text-[#f0e6d2]">{f.text}</span>}
        </div>
      ))}
    </div>
  );
}

export function ChatLog({ g, local }: { g: Game; local: { t: number; text: string; color: string }[] }) {
  const all = [...g.chat.map(c => ({ ...c, rt: c.t })), ...local.map(c => ({ ...c, rt: c.t }))].filter(c => g.time - c.rt < 12).slice(-6);
  return (
    <div className="absolute left-2 bottom-40 w-80 text-xs pointer-events-none select-none space-y-0.5">
      {all.map((c, i) => <div key={i} className="drop-shadow-[0_0_2px_#000]" style={{ color: c.color }}><span className="text-[#a09b8c]">[{fmt(c.rt)}] </span>{c.text}</div>)}
    </div>
  );
}

export function Scoreboard({ g }: { g: Game }) {
  const row = (c: Unit) => (
    <div key={c.id} className={`flex items-center gap-2 px-2 py-1 ${c === g.player ? 'bg-[#c8aa6e]/15' : ''}`}>
      <div className="relative"><img src={champIcon(c.champId)} className={`w-9 h-9 ${c.alive ? '' : 'grayscale'}`} alt="" /><span className="absolute -bottom-1 -right-1 text-[10px] bg-black px-0.5">{c.level}</span></div>
      <div className="w-24 truncate text-sm">{c.name}{c === g.player ? ' (你)' : ''}</div>
      <div className="flex gap-0.5">{c.summ.map(s => <img key={s.id} src={summIcon(s.id)} className="w-4 h-4" alt="" />)}</div>
      <div className="flex gap-0.5 w-[160px]">{c.items.map((id, i) => <div key={i} className="w-6 h-6 bg-[#1e2328] border border-[#3c3c41]">{id && <img src={itemIcon(id)} className="w-full h-full" alt="" />}</div>)}</div>
      <div className="w-20 text-center text-sm">{c.kills}/{c.deaths}/{c.assists}</div>
      <div className="w-10 text-center text-sm text-[#a09b8c]">{c.cs}</div>
      <div className="w-16 text-right text-sm text-[#c8aa6e]">{Math.floor(c.items.reduce((a, id) => a + (id ? ITEMS[id].gold : 0), 0) + c.gold)}</div>
    </div>
  );
  const pt = g.playerTeam;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <div className="bg-[#010a13]/95 border border-[#785a28] p-4 text-[#f0e6d2] min-w-[640px]">
        <div className="flex justify-between mb-2 text-sm"><span className="text-[#3a9bff] font-bold">我方 {g.teamKills[pt]}</span><span className="font-mono">{fmt(g.time)}</span><span className="text-[#ff4a4a] font-bold">敌方 {g.teamKills[1 - pt]}</span></div>
        <div className="text-[10px] text-[#a09b8c] flex gap-2 px-2"><span className="w-9" /><span className="w-24">英雄</span><span className="w-9">技能</span><span className="w-[160px]">装备</span><span className="w-20 text-center">KDA</span><span className="w-10 text-center">补刀</span><span className="w-16 text-right">总金币</span></div>
        <div className="border-l-2 border-[#3a9bff] my-1">{g.champs.filter(c => c.team === pt).map(row)}</div>
        <div className="border-l-2 border-[#ff4a4a] my-1">{g.champs.filter(c => c.team !== pt).map(row)}</div>
      </div>
    </div>
  );
}

export function Shop({ g, onClose, onMsg }: { g: Game; onClose: () => void; onMsg: (m: string) => void }) {
  const c = g.player;
  const [cat, setCat] = useState<string>('recommended');
  const [sel, setSel] = useState<number>(c.def!.build[2]);
  const [q, setQ] = useState('');
  const all = Object.values(ITEMS).sort((a, b) => a.gold - b.gold);
  const list = cat === 'recommended' ? c.def!.build.map(id => ITEMS[id]).filter(Boolean) : all.filter(i => (cat === 'all' || i.cat === cat) && (!q || i.name.includes(q)));
  const it = ITEMS[sel];
  const [cost] = it ? buyCost(sel, c.items) : [0];
  const buy = (id: number) => { const r = g.buy(c, id); if (r !== true) onMsg(r); };
  const into = it ? all.filter(x => x.from.includes(sel)) : [];
  const Tree = ({ id, depth = 0 }: { id: number; depth?: number }) => {
    const x = ITEMS[id]; if (!x) return null;
    const own = c.items.includes(id);
    return (
      <div className="flex flex-col items-center">
        <button onClick={() => setSel(id)} onContextMenu={e => { e.preventDefault(); buy(id); }} className={`relative ${own ? 'ring-2 ring-[#0ac8b9]' : ''}`}>
          <img src={itemIcon(id)} className={`${depth ? 'w-9 h-9' : 'w-12 h-12'} border border-[#785a28]`} alt="" />
          <div className="text-[10px] text-[#c8aa6e]">{x.gold}</div>
        </button>
        {x.from.length > 0 && depth < 2 && <div className="flex gap-2 mt-1 pt-1 border-t border-[#785a28]/50">{x.from.map((f, i) => <Tree key={i} id={f} depth={depth + 1} />)}</div>}
      </div>
    );
  };
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-auto select-none" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} onContextMenu={e => e.preventDefault()}>
      <div className="w-[900px] h-[600px] bg-[#010a13]/97 border-2 border-[#785a28] flex flex-col text-[#f0e6d2] shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#785a28]">
          <div className="text-lg font-bold text-[#c8aa6e] mr-4">商店</div>
          {[{ id: 'recommended', name: '推荐' }, ...SHOP_CATS].map(s => <button key={s.id} onClick={() => setCat(s.id)} className={`px-3 py-1 text-sm border ${cat === s.id ? 'border-[#c8aa6e] bg-[#c8aa6e]/20' : 'border-transparent text-[#a09b8c] hover:text-[#f0e6d2]'}`}>{s.name}</button>)}
          <input value={q} onChange={e => { setQ(e.target.value); setCat('all'); }} placeholder="搜索装备" className="ml-auto bg-[#1e2328] border border-[#3c3c41] px-2 py-1 text-sm w-40 outline-none" />
          <button onClick={onClose} className="ml-2 text-xl text-[#a09b8c] hover:text-white">✕</button>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 p-3 overflow-y-auto">
            {!g.inShop(c) && <div className="mb-2 text-xs text-red-400">你必须在泉水处才能购买装备（按 B 回城）</div>}
            <div className="grid grid-cols-8 gap-2">
              {list.map(x => {
                const [cc] = buyCost(x.id, c.items);
                return (
                  <button key={x.id} onClick={() => setSel(x.id)} onContextMenu={e => { e.preventDefault(); buy(x.id); }} className={`flex flex-col items-center p-1 border ${sel === x.id ? 'border-[#c8aa6e] bg-[#c8aa6e]/10' : 'border-transparent hover:border-[#3c3c41]'}`}>
                    <img src={itemIcon(x.id)} className={`w-12 h-12 border border-[#3c3c41] ${c.gold < cc ? 'opacity-50' : ''}`} alt="" />
                    <span className={`text-[11px] ${c.gold >= cc ? 'text-[#c8aa6e]' : 'text-[#5b5a56]'}`}>{cc}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-[#5b5a56] mt-3">左键选择 · 右键直接购买</div>
          </div>
          <div className="w-[330px] border-l border-[#785a28] p-3 flex flex-col min-h-0">
            {it && (
              <>
                <div className="flex flex-col items-center py-2 bg-[#0a1520] border border-[#1e2328] mb-2 overflow-x-auto"><Tree id={sel} /></div>
                {into.length > 0 && <div className="flex gap-1 mb-2 flex-wrap"><span className="text-[10px] text-[#a09b8c] w-full">可合成：</span>{into.map(x => <button key={x.id} onClick={() => setSel(x.id)}><img src={itemIcon(x.id)} className="w-7 h-7 border border-[#3c3c41]" alt="" /></button>)}</div>}
                <div className="flex items-center gap-2"><img src={itemIcon(sel)} className="w-10 h-10 border border-[#c8aa6e]" alt="" /><div><div className="font-bold">{it.name}</div><div className="text-[#c8aa6e] text-sm">{cost} <span className="text-[#5b5a56] text-xs">(总价 {it.gold})</span></div></div></div>
                <div className="text-xs text-[#0ac8b9] mt-2 space-y-0.5">{statLines(it.stats).map(s => <div key={s}>{s}</div>)}</div>
                {it.passive && <div className="text-xs text-[#f0e6d2] mt-2">{it.passive}</div>}
                <div className="text-xs text-[#a09b8c] mt-2 overflow-y-auto flex-1">{it.plain}</div>
                <button onClick={() => buy(sel)} disabled={c.gold < cost} className="lol-btn-primary py-2 mt-2">购买 ({cost})</button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[#785a28]">
          {c.items.map((id, i) => (
            <button key={i} onContextMenu={e => { e.preventDefault(); const r = g.sell(c, i); if (r !== true) onMsg(r); }} onClick={() => id && setSel(id)} className="w-10 h-10 border border-[#3c3c41] bg-[#0a0e13]" title="右键出售">
              {id && <img src={itemIcon(id)} className="w-full h-full" alt="" />}
            </button>
          ))}
          <span className="text-[10px] text-[#5b5a56] ml-2">右键背包内装备出售</span>
          <div className="ml-auto flex items-center gap-1 text-lg font-bold text-[#c8aa6e]"><span className="inline-block w-4 h-4 rounded-full bg-gradient-to-br from-[#ffe680] to-[#c8961e]" />{Math.floor(c.gold)}</div>
        </div>
      </div>
    </div>
  );
}

export function EndScreen({ g, onExit }: { g: Game; onExit: () => void }) {
  const win = g.winner === g.playerTeam;
  const since = g.time - g.endT;
  const [stats, setStats] = useState(false);
  if (since < 2.5) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-auto select-none">
      {!stats ? (
        <div className="flex flex-col items-center animate-[fadein_1s_ease]">
          <div className={`text-[120px] font-black tracking-[0.2em] ${win ? 'lol-victory' : 'lol-defeat'}`}>{win ? '胜利' : '失败'}</div>
          <div className="text-2xl tracking-[0.6em] text-[#c8aa6e] -mt-4">{win ? 'VICTORY' : 'DEFEAT'}</div>
          <button onClick={() => setStats(true)} className="lol-btn-primary px-12 py-3 mt-10">继续</button>
        </div>
      ) : (
        <div className="bg-[#010a13] border border-[#785a28] p-6 text-[#f0e6d2]">
          <div className={`text-3xl font-bold mb-1 ${win ? 'text-[#c8aa6e]' : 'text-red-400'}`}>{win ? '胜利' : '失败'}</div>
          <div className="text-sm text-[#a09b8c] mb-4">召唤师峡谷 · 游戏时长 {fmt(g.endT)}</div>
          {[g.playerTeam, 1 - g.playerTeam].map(t => (
            <div key={t} className="mb-3">
              <div className={`text-sm font-bold mb-1 ${t === g.playerTeam ? 'text-[#3a9bff]' : 'text-[#ff4a4a]'}`}>{t === g.playerTeam ? '我方' : '敌方'} · {g.teamKills[t]} 击杀</div>
              {g.champs.filter(c => c.team === t).map(c => (
                <div key={c.id} className={`flex items-center gap-3 py-1 px-2 ${c === g.player ? 'bg-[#c8aa6e]/10' : ''}`}>
                  <img src={champIcon(c.champId)} className="w-9 h-9" alt="" /><span className="w-24 text-sm">{c.name}</span><span className="text-xs text-[#a09b8c] w-8">Lv{c.level}</span>
                  <div className="flex gap-0.5 w-44">{c.items.map((id, i) => <div key={i} className="w-6 h-6 bg-[#1e2328]">{id && <img src={itemIcon(id)} className="w-full h-full" alt="" />}</div>)}</div>
                  <span className="w-20 text-center">{c.kills}/{c.deaths}/{c.assists}</span><span className="w-12 text-center text-[#a09b8c]">{c.cs}</span>
                  <span className="w-24 text-right text-xs text-[#a09b8c]">伤害 {Math.round(c.totalDmg)}</span>
                </div>
              ))}
            </div>
          ))}
          <button onClick={onExit} className="lol-btn-primary px-10 py-2 mt-2">返回主界面</button>
        </div>
      )}
    </div>
  );
}

export { fmt };
