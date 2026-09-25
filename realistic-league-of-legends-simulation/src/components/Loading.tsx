import { useEffect, useState } from 'react';
import type { GameConfig } from '../game/engine';
import { loadingArt, summIcon, preloadChamps } from '../game/assets';
import { DD_CHAMPIONS } from '../game/dd';
import { loadMap } from '../game/map';
import { buildGround } from '../game/render';

export function Loading({ cfg, onReady }: { cfg: GameConfig; onReady: () => void }) {
  const [prog, setProg] = useState<number[]>(() => Array(10).fill(0));
  const [done, setDone] = useState(false);
  useEffect(() => {
    let alive = true;
    preloadChamps([...cfg.blue, ...cfg.red].map(p => p.champ));
    const iv = setInterval(() => setProg(p => p.map(v => Math.min(done ? 100 : 92, v + Math.random() * 9))), 120);
    (async () => {
      await loadMap();
      await new Promise(r => setTimeout(r, 50));
      buildGround();
      await new Promise(r => setTimeout(r, 1400));
      if (!alive) return;
      setDone(true);
      setProg(Array(10).fill(100));
      setTimeout(() => alive && onReady(), 500);
    })();
    return () => { alive = false; clearInterval(iv); };
  }, []);
  const Card = ({ p, i, team }: { p: { champ: string; role: string }; i: number; team: number }) => {
    const me = team === cfg.playerTeam && p.champ === cfg.playerChamp;
    const summ = me ? cfg.summoners : p.role === 'jungle' ? ['SummonerFlash', 'SummonerSmite'] : p.role === 'adc' ? ['SummonerFlash', 'SummonerHeal'] : p.role === 'support' ? ['SummonerFlash', 'SummonerExhaust'] : ['SummonerFlash', 'SummonerDot'];
    return (
      <div className={`relative w-[150px] h-[272px] border-2 ${me ? 'border-[#f0e6d2]' : 'border-[#785a28]'} overflow-hidden bg-black`}>
        <img src={loadingArt(p.champ)} className="w-full h-full object-cover" alt="" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-10 pb-2 px-2 text-center">
          <div className="text-sm font-bold text-[#f0e6d2]">{DD_CHAMPIONS[p.champ].name}</div>
          <div className="text-[11px] text-[#a09b8c]">{me ? '你' : 'AI'}</div>
          <div className="flex justify-center gap-1 mt-1">{summ.map(s => <img key={s} src={summIcon(s)} className="w-5 h-5" alt="" />)}</div>
          <div className="h-1 bg-[#1e2328] mt-2"><div className="h-full bg-[#0ac8b9] transition-all" style={{ width: prog[i + team * 5] + '%' }} /></div>
          <div className="text-[10px] text-[#a09b8c] mt-0.5">{Math.floor(prog[i + team * 5])}%</div>
        </div>
      </div>
    );
  };
  return (
    <div className="w-full h-full bg-[#010a13] flex flex-col items-center justify-center gap-8 select-none" style={{ background: 'radial-gradient(ellipse at center, #0a1a2a 0%, #010a13 70%)' }}>
      <div className="flex gap-3">{cfg.blue.map((p, i) => <Card key={i} p={p} i={i} team={0} />)}</div>
      <div className="text-[#c8aa6e] text-2xl font-bold tracking-[0.3em]">召唤师峡谷</div>
      <div className="flex gap-3">{cfg.red.map((p, i) => <Card key={i} p={p} i={i} team={1} />)}</div>
      <div className="text-xs text-[#5b5a56]">提示：右键移动/攻击，QWER释放技能，D/F召唤师技能，B回城，P打开商店，Tab查看战绩，Y锁定视角，空格居中</div>
    </div>
  );
}
