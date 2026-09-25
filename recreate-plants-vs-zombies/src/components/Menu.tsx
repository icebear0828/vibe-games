import { useState } from 'react';
import bg from '../assets/menu-bg.jpg';
import { LEVELS, PLANTS } from '../game/data';
import { sfx } from '../game/audio';
import { PlantSprite, ZombieSprite, WoodButton, Panel, SeedPacket } from './Sprite';
import { VolumeSliders } from './GameView';
import { resetProgress } from '../game/save';

function Tombstone({ label, sub, onClick, big = false, disabled = false }: { label: string; sub?: string; onClick: () => void; big?: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => { sfx.click(); onClick(); }}
      className={`group relative ${big ? 'w-[300px] h-[96px]' : 'w-[260px] h-[70px]'} cursor-pointer transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ transform: `rotate(${big ? -3 : 2}deg)` }}
    >
      <div className="absolute inset-0 rounded-t-[60px] rounded-b-md bg-gradient-to-b from-[#9aa39a] via-[#7d867e] to-[#5a625b] border-4 border-[#2f3530] shadow-[0_8px_0_rgba(0,0,0,0.45)] group-hover:from-[#b8f28a] group-hover:via-[#86c65a] group-hover:to-[#4e8a2a] transition-colors" />
      <div className="absolute inset-2 rounded-t-[52px] rounded-b border-2 border-black/15" />
      <div className="relative flex flex-col items-center justify-center h-full">
        <span className={`font-black ${big ? 'text-3xl' : 'text-2xl'} text-[#e9f0e6] [text-shadow:0_2px_0_#1c211d,0_0_6px_rgba(0,0,0,0.5)]`}>{label}</span>
        {sub && <span className="text-sm font-bold text-[#f5f2d0] [text-shadow:0_1px_0_#000]">{sub}</span>}
      </div>
    </button>
  );
}

export function MainMenu({ progress, onAdventure, onLevels, onEndless, onAlmanac, onOptions }: {
  progress: number; onAdventure: () => void; onLevels: () => void; onEndless: () => void; onAlmanac: () => void; onOptions: () => void;
}) {
  const next = LEVELS[Math.min(progress, LEVELS.length - 1)];
  const done = progress >= LEVELS.length;
  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none">
      <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* Logo */}
      <div className="absolute top-[4%] left-1/2 -translate-x-1/2 text-center">
        <div className="relative inline-block rotate-[-2deg]">
          <div className="px-10 py-4 rounded-3xl bg-gradient-to-b from-[#8c5a2b] to-[#4e2f10] border-[6px] border-[#2a1705] shadow-[0_10px_0_rgba(0,0,0,0.4)]">
            <div className="text-[64px] leading-none font-black tracking-wider">
              <span className="text-[#8be04e] [text-shadow:0_4px_0_#1f4a0a,0_0_20px_rgba(140,230,80,0.5)]">植物</span>
              <span className="text-[#ffe36b] text-[40px] mx-3 align-middle [text-shadow:0_3px_0_#6b4a00]">大战</span>
              <span className="text-[#c9d6b8] [text-shadow:0_4px_0_#39402f,0_0_20px_rgba(200,220,180,0.4)]">僵尸</span>
            </div>
            <div className="text-[#f3dca8] font-black tracking-[0.4em] text-sm mt-1">PLANTS VS. ZOMBIES · WEB</div>
          </div>
        </div>
      </div>

      {/* Tombstone menu */}
      <div className="absolute right-[6%] top-[30%] flex flex-col items-center gap-5">
        <Tombstone big label={done ? '冒险模式' : progress === 0 ? '开始冒险' : '继续冒险'} sub={done ? '已通关 · 重玩' : `关卡 ${next.name}`} onClick={onAdventure} />
        <Tombstone label="选择关卡" onClick={onLevels} />
        <Tombstone label="无尽生存" sub={progress >= 4 ? '看看你能撑多少波' : '通过 1-4 解锁'} onClick={onEndless} disabled={progress < 4} />
        <div className="flex gap-3">
          <button onClick={() => { sfx.click(); onAlmanac(); }} className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#e8d9a8] to-[#b89a5a] border-4 border-[#4a3512] font-black text-[#3a2508] shadow-[0_5px_0_rgba(0,0,0,0.4)] hover:brightness-110 cursor-pointer">📖 图鉴</button>
          <button onClick={() => { sfx.click(); onOptions(); }} className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#e8d9a8] to-[#b89a5a] border-4 border-[#4a3512] font-black text-[#3a2508] shadow-[0_5px_0_rgba(0,0,0,0.4)] hover:brightness-110 cursor-pointer">⚙ 选项</button>
        </div>
      </div>

      {/* Characters */}
      <div className="absolute left-[6%] bottom-[4%] flex items-end gap-2 pointer-events-none">
        <PlantSprite type="sunflower" size={150} />
        <PlantSprite type="peashooter" size={150} />
        <PlantSprite type="wallnut" size={130} />
      </div>
      <div className="absolute left-[45%] bottom-[3%] flex items-end pointer-events-none opacity-95">
        <ZombieSprite type="normal" size={140} />
        <div className="-ml-10"><ZombieSprite type="cone" size={130} /></div>
      </div>
      <div className="absolute bottom-2 right-3 text-white/60 text-xs">非官方同人复刻 · 所有美术与音效均为程序实时生成</div>
    </div>
  );
}

export function LevelSelect({ progress, onPick, onBack }: { progress: number; onPick: (i: number) => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none flex items-center justify-center">
      <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105" />
      <div className="absolute inset-0 bg-black/40" />
      <Panel className="relative w-[min(92vw,860px)]">
        <div className="p-6">
          <div className="text-center text-4xl font-black text-lime-300 [text-shadow:0_3px_0_#1f3d08] mb-1">冒险模式 · 白天</div>
          <div className="text-center text-amber-100/80 mb-5">每通过一关可获得新植物</div>
          <div className="grid grid-cols-7 gap-3">
            {LEVELS.map((L, i) => {
              const locked = i > progress;
              const done = i < progress;
              return (
                <button key={L.id} disabled={locked} onClick={() => { sfx.click(); onPick(i); }}
                  className={`relative rounded-xl border-4 p-2 flex flex-col items-center transition cursor-pointer disabled:cursor-not-allowed ${locked ? 'bg-black/40 border-black/50' : 'bg-gradient-to-b from-[#9fd66a] to-[#4f8f25] border-[#1f3d08] hover:-translate-y-1 hover:brightness-110'}`}>
                  <div className={`font-black text-xl ${locked ? 'text-white/30' : 'text-white [text-shadow:0_2px_0_#1f3d08]'}`}>{L.name}</div>
                  <div className="h-[80px] flex items-center justify-center">
                    {locked ? <span className="text-4xl">🔒</span> : L.unlock ? <div className="scale-90"><SeedPacket type={L.unlock} /></div> : <span className="text-5xl">🏆</span>}
                  </div>
                  <div className="text-[11px] font-bold text-white/90">{locked ? '未解锁' : L.unlock ? PLANTS[L.unlock].name : '最终关'}</div>
                  {done && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full w-7 h-7 flex items-center justify-center font-black border-2 border-black">✓</div>}
                </button>
              );
            })}
          </div>
          <div className="text-center mt-6"><WoodButton variant="wood" onClick={() => { sfx.click(); onBack(); }}>返回</WoodButton></div>
        </div>
      </Panel>
    </div>
  );
}

export function Options({ onBack, onReset }: { onBack: () => void; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none flex items-center justify-center">
      <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105" />
      <div className="absolute inset-0 bg-black/40" />
      <Panel className="relative w-[420px]">
        <div className="p-6">
          <div className="text-center text-4xl font-black text-lime-300 [text-shadow:0_3px_0_#1f3d08] mb-6">选项</div>
          <VolumeSliders />
          <div className="mt-6 text-amber-100/80 text-sm leading-relaxed">
            <b className="text-amber-200">操作说明</b><br />
            · 点击卡片后点击草地种植<br />
            · 点击阳光收集，阳光用于种植<br />
            · 铲子可移除植物（快捷键 S）<br />
            · 数字键 1-9 快速选卡，右键取消<br />
            · 空格 / Esc 暂停
          </div>
          <div className="flex gap-3 justify-center mt-6">
            <WoodButton variant="red" onClick={() => { if (confirm) { resetProgress(); onReset(); setConfirm(false); } else setConfirm(true); }}>{confirm ? '确认重置？' : '重置进度'}</WoodButton>
            <WoodButton variant="wood" onClick={() => { sfx.click(); onBack(); }}>返回</WoodButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}
