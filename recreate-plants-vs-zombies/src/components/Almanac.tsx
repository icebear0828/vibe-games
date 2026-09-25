import { useState } from 'react';
import { PLANTS, PLANT_ORDER, ZOMBIES, ZOMBIE_ORDER, type PlantType, type ZombieType } from '../game/data';
import { sfx } from '../game/audio';
import { PlantSprite, ZombieSprite, SeedPacket, WoodButton, SpriteCanvas } from './Sprite';
import { drawZombie } from '../game/draw/zombies';
import { unlockedPlants } from '../game/save';

export default function Almanac({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'plants' | 'zombies'>('plants');
  const [plant, setPlant] = useState<PlantType>('peashooter');
  const [zombie, setZombie] = useState<ZombieType>('normal');
  const owned = unlockedPlants();

  return (
    <div className="fixed inset-0 bg-[#2b1a0a] flex items-center justify-center select-none p-4">
      <div className="w-[min(96vw,980px)] h-[min(92vh,640px)] rounded-2xl border-[6px] border-[#3b2208] bg-gradient-to-b from-[#e9dcb0] to-[#cbb57a] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-[#6b8f2a] to-[#3f5f14] border-b-4 border-[#2a3a0a]">
          <div className="text-3xl font-black text-[#fff6c8] [text-shadow:0_3px_0_#1f2f05]">📖 图鉴</div>
          <div className="flex gap-2">
            <button onClick={() => { sfx.tap(); setTab('plants'); }} className={`px-5 py-1.5 rounded-lg font-black border-2 cursor-pointer ${tab === 'plants' ? 'bg-[#fff6c8] text-[#3a5a0a] border-[#2a3a0a]' : 'bg-black/20 text-white/80 border-transparent'}`}>植物</button>
            <button onClick={() => { sfx.tap(); setTab('zombies'); }} className={`px-5 py-1.5 rounded-lg font-black border-2 cursor-pointer ${tab === 'zombies' ? 'bg-[#fff6c8] text-[#3a5a0a] border-[#2a3a0a]' : 'bg-black/20 text-white/80 border-transparent'}`}>僵尸</button>
          </div>
          <WoodButton variant="wood" onClick={() => { sfx.click(); onBack(); }}>关闭</WoodButton>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="w-[56%] p-4 overflow-y-auto">
            {tab === 'plants' ? (
              <div className="grid grid-cols-6 gap-2">
                {PLANT_ORDER.map((p) => {
                  const has = owned.includes(p);
                  return (
                    <button key={p} onClick={() => { if (has) { sfx.tap(); setPlant(p); } }}
                      className={`rounded-lg p-0.5 cursor-pointer ${plant === p ? 'ring-4 ring-yellow-400' : ''} ${has ? '' : 'opacity-30 grayscale cursor-not-allowed'}`}>
                      <SeedPacket type={p} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {ZOMBIE_ORDER.map((z) => (
                  <button key={z} onClick={() => { sfx.tap(); setZombie(z); }}
                    className={`rounded-xl bg-[#6b8a4a]/40 border-4 cursor-pointer ${zombie === z ? 'border-yellow-400' : 'border-[#5a4a2a]/50'} flex flex-col items-center`}>
                    <SpriteCanvas width={90} height={100} draw={(ctx, t) => {
                      ctx.translate(50, 150);
                      ctx.scale(1.1, 1.1);
                      drawZombie(ctx, { type: z, phase: 0, state: 'idle', stateTime: 0, armLost: false, headLost: false, armor: ZOMBIES[z].armor ?? null, armorRatio: 1, slowed: false, flash: 0, hasPole: z === 'pole', angry: false, seed: 1 }, t);
                    }} />
                    <div className="text-xs font-black text-[#3a2508] pb-1">{ZOMBIES[z].name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-[44%] border-l-4 border-[#8a6a3a]/40 bg-[#f7efd2] p-5 overflow-y-auto">
            {tab === 'plants' ? (
              <div className="text-center">
                <div className="mx-auto w-[200px] h-[170px] rounded-xl bg-gradient-to-b from-[#8fd0f0] to-[#6cbb3c] border-4 border-[#5a4a2a] flex items-end justify-center overflow-hidden">
                  <PlantSprite type={plant} size={160} />
                </div>
                <div className="text-3xl font-black text-[#3a6b12] mt-3">{PLANTS[plant].name}</div>
                <div className="text-sm text-[#7a5a2a]">{PLANTS[plant].en}</div>
                <div className="text-left mt-3 text-[#4a3212] text-sm leading-relaxed">
                  <div className="font-bold text-[#8a3a12]">{PLANTS[plant].stat}</div>
                  <p className="mt-2">{PLANTS[plant].desc}</p>
                  <div className="flex justify-between mt-4 font-black text-[#3a2508] bg-[#e8d9a8] rounded-lg px-3 py-2">
                    <span>花费：<span className="text-[#c47a00]">{PLANTS[plant].cost}</span></span>
                    <span>冷却时间：<span className="text-[#c47a00]">{PLANTS[plant].rechargeLabel}</span></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto w-[200px] h-[190px] rounded-xl bg-gradient-to-b from-[#7a8a9a] to-[#4f8f2a] border-4 border-[#5a4a2a] flex items-end justify-center overflow-hidden">
                  <ZombieSprite type={zombie} size={140} walking />
                </div>
                <div className="text-3xl font-black text-[#4a5a3a] mt-3">{ZOMBIES[zombie].name}</div>
                <div className="text-left mt-3 text-[#4a3212] text-sm leading-relaxed">
                  <div className="font-bold text-[#8a3a12]">{ZOMBIES[zombie].stat}</div>
                  <p className="mt-2">{ZOMBIES[zombie].desc}</p>
                  <div className="mt-4 font-black text-[#3a2508] bg-[#e8d9a8] rounded-lg px-3 py-2">
                    生命值：{ZOMBIES[zombie].hp}{ZOMBIES[zombie].armorHp ? ` + 护具 ${ZOMBIES[zombie].armorHp}` : ''}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
