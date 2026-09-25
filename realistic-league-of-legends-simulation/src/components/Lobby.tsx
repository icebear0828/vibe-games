import { useEffect, useMemo, useState } from 'react';
import { CHAMP_ORDER, CHAMPIONS } from '../game/champions';
import { DD_CHAMPIONS, DD_SUMMONERS } from '../game/dd';
import { champIcon, splashArt, summIcon, spellIcon, passiveIcon } from '../game/assets';
import type { Role } from '../game/types';
import type { GameConfig } from '../game/engine';

const ROLES: { id: Role; name: string; icon: string }[] = [
  { id: 'top', name: '上单', icon: '⚔️' }, { id: 'jungle', name: '打野', icon: '🌲' }, { id: 'mid', name: '中单', icon: '🔮' },
  { id: 'adc', name: '下路', icon: '🏹' }, { id: 'support', name: '辅助', icon: '🛡️' },
];
const PREFS: Record<Role, string[]> = {
  top: ['Garen', 'Darius', 'Malphite'], jungle: ['MasterYi', 'Amumu'], mid: ['Ahri', 'Lux', 'Annie'],
  adc: ['Jinx', 'Ashe', 'Ezreal'], support: ['Leona', 'Lux', 'Malphite', 'Amumu', 'Annie'],
};
const SUMMS = ['SummonerFlash', 'SummonerDot', 'SummonerHeal', 'SummonerSmite', 'SummonerHaste', 'SummonerBarrier', 'SummonerExhaust', 'SummonerBoost'];
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export function buildTeams(champ: string, role: Role, team: 0 | 1) {
  const used = new Set<string>([champ]);
  const teams: { champ: string; role: Role }[][] = [[], []];
  for (const t of [team, 1 - team] as (0 | 1)[]) {
    for (const r of ROLES.map(r => r.id)) {
      if (t === team && r === role) { teams[t].push({ champ, role }); continue; }
      let pick = shuffle(PREFS[r]).find(c => !used.has(c));
      if (!pick) pick = shuffle(CHAMP_ORDER).find(c => !used.has(c))!;
      used.add(pick); teams[t].push({ champ: pick, role: r });
    }
  }
  return { blue: teams[0], red: teams[1] };
}

export function MainMenu({ onPlay }: { onPlay: () => void }) {
  const [bg] = useState(() => CHAMP_ORDER[Math.floor(Math.random() * CHAMP_ORDER.length)]);
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#010a13] text-[#f0e6d2] select-none">
      <img src={splashArt(bg)} className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 animate-[slowzoom_30s_ease-in-out_infinite_alternate]" alt="" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#010a13] via-[#010a13]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#010a13] via-transparent to-[#010a13]/60" />
      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 h-20 flex items-center px-8 gap-8 border-b border-[#785a28]/50 bg-[#010a13]/70 backdrop-blur-sm">
        <button onClick={onPlay} className="lol-play-btn">开始游戏</button>
        <nav className="flex gap-7 text-sm tracking-widest text-[#a09b8c]">
          <span className="text-[#f0e6d2] border-b-2 border-[#c8aa6e] pb-1">主页</span><span>TFT</span><span>生涯</span><span>收藏</span><span>战利品</span><span>商城</span>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right"><div className="text-sm text-[#f0e6d2]">召唤师</div><div className="text-xs text-[#0ac8b9]">在线</div></div>
          <img src={champIcon(bg)} className="w-12 h-12 rounded-full border-2 border-[#c8aa6e]" alt="" />
        </div>
      </div>
      <div className="absolute left-16 top-1/2 -translate-y-1/2 max-w-xl">
        <div className="text-[#c8aa6e] tracking-[0.5em] text-sm mb-3">LEAGUE OF LEGENDS</div>
        <h1 className="text-7xl font-black tracking-wider lol-title">英雄联盟</h1>
        <p className="mt-4 text-[#a09b8c] leading-relaxed">召唤师峡谷 · 5v5 经典模式。选择你的英雄与位置，与AI队友并肩作战，推倒敌方防御塔，摧毁敌方主水晶，赢得胜利！</p>
        <div className="mt-8 flex gap-4">
          <button onClick={onPlay} className="lol-btn-primary text-lg px-12 py-3">寻找对局</button>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-3 text-xs text-[#a09b8c]">
          <div className="lol-card p-3"><div className="text-[#c8aa6e] font-bold mb-1">12 位英雄</div>真实技能组与数值</div>
          <div className="lol-card p-3"><div className="text-[#c8aa6e] font-bold mb-1">完整峡谷</div>三路 · 野区 · 小龙 · 男爵</div>
          <div className="lol-card p-3"><div className="text-[#c8aa6e] font-bold mb-1">84 件装备</div>合成路线与主动效果</div>
        </div>
      </div>
      <div className="absolute bottom-6 right-8 text-xs text-[#5b5a56]">美术资源来自 Riot Data Dragon · 非官方粉丝还原作品</div>
    </div>
  );
}

export function ChampSelect({ onStart, onBack }: { onStart: (cfg: GameConfig) => void; onBack: () => void }) {
  const [champ, setChamp] = useState('Garen');
  const [role, setRole] = useState<Role>('top');
  const [summs, setSumms] = useState<[string, string]>(['SummonerFlash', 'SummonerDot']);
  const [team, setTeam] = useState<0 | 1>(0);
  const [speed, setSpeed] = useState(1);
  const [pickSlot, setPickSlot] = useState<0 | 1 | null>(null);
  const [timer, setTimer] = useState(90);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [locked, setLocked] = useState(false);
  const teams = useMemo(() => buildTeams(champ, role, team), [champ, role, team]);
  useEffect(() => { const i = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (role === 'jungle' && !summs.includes('SummonerSmite')) setSumms(['SummonerFlash', 'SummonerSmite']); }, [role]);
  const dd = DD_CHAMPIONS[champ];
  const mine = team === 0 ? teams.blue : teams.red;
  const theirs = team === 0 ? teams.red : teams.blue;
  const lock = () => {
    setLocked(true);
    setTimeout(() => onStart({ playerChamp: champ, playerRole: role, playerTeam: team, summoners: summs, speed, blue: teams.blue, red: teams.red }), 900);
  };
  const list = CHAMP_ORDER.filter(c => filter === 'all' || CHAMPIONS[c].roles.includes(filter));
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#010a13] text-[#f0e6d2] select-none">
      <img key={champ} src={splashArt(champ)} className="absolute inset-0 w-full h-full object-cover opacity-35 transition-opacity duration-700" alt="" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#010a13]/80 via-[#010a13]/40 to-[#010a13]" />
      <div className="relative h-full flex flex-col">
        <div className="text-center pt-4">
          <div className="text-xs tracking-[0.4em] text-[#a09b8c]">召唤师峡谷 · 自选模式</div>
          <div className="text-2xl font-bold text-[#f0e6d2] mt-1">{locked ? '已锁定！准备进入游戏…' : '选择你的英雄'}</div>
          <div className="text-4xl font-black text-[#c8aa6e] mt-1">{timer}</div>
        </div>
        <div className="flex-1 flex gap-6 px-6 pb-4 min-h-0">
          {/* my team */}
          <div className="w-64 flex flex-col gap-2 pt-4">
            <div className={`text-sm font-bold ${team === 0 ? 'text-[#3a9bff]' : 'text-[#ff4a4a]'}`}>{team === 0 ? '蓝色方（我方）' : '红色方（我方）'}</div>
            {mine.map((p, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 border ${p.champ === champ && p.role === role ? 'border-[#c8aa6e] bg-[#c8aa6e]/10' : 'border-[#1e2328] bg-[#010a13]/70'}`}>
                <img src={champIcon(p.champ)} className="w-12 h-12 border border-[#785a28]" alt="" />
                <div>
                  <div className="text-xs text-[#a09b8c]">{ROLES.find(r => r.id === p.role)?.name}</div>
                  <div className="text-sm">{p.champ === champ && p.role === role ? '你' : 'AI 队友'} · {DD_CHAMPIONS[p.champ].name}</div>
                </div>
              </div>
            ))}
          </div>
          {/* center */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex gap-2 justify-center mb-3">
              {(['all', ...ROLES.map(r => r.id)] as const).map(r => (
                <button key={r} onClick={() => setFilter(r as any)} className={`px-3 py-1 text-xs border ${filter === r ? 'border-[#c8aa6e] text-[#f0e6d2]' : 'border-[#3c3c41] text-[#a09b8c]'}`}>{r === 'all' ? '全部' : ROLES.find(x => x.id === r)!.name}</button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-3 mx-auto">
              {list.map(c => (
                <button key={c} disabled={locked} onClick={() => setChamp(c)} className={`relative group ${champ === c ? 'ring-2 ring-[#c8aa6e]' : ''}`}>
                  <img src={champIcon(c)} className={`w-20 h-20 border ${champ === c ? 'border-[#f0e6d2]' : 'border-[#3c3c41] group-hover:border-[#c8aa6e]'}`} alt={c} />
                  <div className="text-[11px] mt-1 text-center text-[#a09b8c]">{DD_CHAMPIONS[c].name}</div>
                </button>
              ))}
            </div>
            <div className="mt-auto lol-card p-4 flex gap-5 items-start">
              <div className="flex-1">
                <div className="text-3xl font-bold">{dd.name} <span className="text-lg text-[#c8aa6e]">{dd.title}</span></div>
                <div className="text-xs text-[#a09b8c] mt-1">{dd.tags.map((t: string) => ({ Fighter: '战士', Tank: '坦克', Mage: '法师', Assassin: '刺客', Marksman: '射手', Support: '辅助' } as any)[t] || t).join(' · ')}</div>
                <div className="flex gap-2 mt-3">
                  <div className="group relative"><img src={passiveIcon(champ)} className="w-11 h-11 border border-[#785a28]" alt="" /><Tip title={'被动 - ' + dd.passive.name} text={dd.passive.desc} /></div>
                  {dd.spells.map((s: any, i: number) => (
                    <div key={i} className="group relative"><img src={spellIcon(champ, i)} className="w-11 h-11 border border-[#785a28]" alt="" /><span className="absolute bottom-0 right-0 bg-black/80 text-[10px] px-1">{'QWER'[i]}</span><Tip title={'QWER'[i] + ' - ' + s.name} text={s.desc} /></div>
                  ))}
                </div>
              </div>
              <div className="w-72 space-y-3">
                <div>
                  <div className="text-xs text-[#a09b8c] mb-1">位置</div>
                  <div className="flex gap-1">{ROLES.map(r => <button key={r.id} disabled={locked} onClick={() => setRole(r.id)} className={`flex-1 py-1 text-xs border ${role === r.id ? 'border-[#c8aa6e] bg-[#c8aa6e]/20' : 'border-[#3c3c41]'}`}>{r.icon}<br />{r.name}</button>)}</div>
                </div>
                <div className="flex gap-3">
                  <div>
                    <div className="text-xs text-[#a09b8c] mb-1">召唤师技能</div>
                    <div className="flex gap-1">{[0, 1].map(i => <button key={i} onClick={() => setPickSlot(pickSlot === i ? null : i as 0 | 1)} className={`relative border ${pickSlot === i ? 'border-[#f0e6d2]' : 'border-[#785a28]'}`}><img src={summIcon(summs[i])} className="w-10 h-10" alt="" /><span className="absolute bottom-0 right-0 text-[10px] bg-black/80 px-1">{'DF'[i]}</span></button>)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a09b8c] mb-1">阵营</div>
                    <div className="flex gap-1">
                      <button onClick={() => setTeam(0)} className={`px-2 py-2 text-xs border ${team === 0 ? 'border-[#3a9bff] bg-[#3a9bff]/20' : 'border-[#3c3c41]'}`}>蓝色方</button>
                      <button onClick={() => setTeam(1)} className={`px-2 py-2 text-xs border ${team === 1 ? 'border-[#ff4a4a] bg-[#ff4a4a]/20' : 'border-[#3c3c41]'}`}>红色方</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a09b8c] mb-1">游戏速度</div>
                    <div className="flex gap-1">{[1, 1.5, 2].map(s => <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-2 text-xs border ${speed === s ? 'border-[#c8aa6e] bg-[#c8aa6e]/20' : 'border-[#3c3c41]'}`}>{s}x</button>)}</div>
                  </div>
                </div>
                {pickSlot !== null && (
                  <div className="grid grid-cols-8 gap-1 p-2 bg-black/70 border border-[#785a28]">
                    {SUMMS.map(s => <button key={s} title={DD_SUMMONERS[s].name} onClick={() => { const n = [...summs] as [string, string]; const other = 1 - pickSlot; if (n[other] === s) n[other] = n[pickSlot]; n[pickSlot] = s; setSumms(n); setPickSlot(null); }}><img src={summIcon(s)} className="w-8 h-8 border border-[#3c3c41] hover:border-[#c8aa6e]" alt="" /></button>)}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* enemy team */}
          <div className="w-64 flex flex-col gap-2 pt-4">
            <div className={`text-sm font-bold text-right ${team === 1 ? 'text-[#3a9bff]' : 'text-[#ff4a4a]'}`}>{team === 1 ? '蓝色方（敌方）' : '红色方（敌方）'}</div>
            {theirs.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border border-[#1e2328] bg-[#010a13]/70 flex-row-reverse text-right">
                <img src={champIcon(p.champ)} className="w-12 h-12 border border-[#5b1a1a]" alt="" />
                <div><div className="text-xs text-[#a09b8c]">{ROLES.find(r => r.id === p.role)?.name}</div><div className="text-sm">AI 敌人 · {DD_CHAMPIONS[p.champ].name}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-4 pb-6">
          <button onClick={onBack} className="lol-btn-secondary px-8 py-2">返回</button>
          <button onClick={lock} disabled={locked} className="lol-btn-primary px-16 py-3 text-lg">{locked ? '已锁定' : '锁定英雄'}</button>
        </div>
      </div>
    </div>
  );
}

function Tip({ title, text }: { title: string; text: string }) {
  return (
    <div className="pointer-events-none absolute bottom-14 left-0 w-72 p-3 bg-[#010a13] border border-[#785a28] text-xs text-[#a09b8c] opacity-0 group-hover:opacity-100 z-50 transition-opacity">
      <div className="text-[#f0e6d2] font-bold mb-1">{title}</div>{text}
    </div>
  );
}

export { ROLES };
