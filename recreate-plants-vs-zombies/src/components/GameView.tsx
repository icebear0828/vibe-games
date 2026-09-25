import { useEffect, useRef, useState } from 'react';
import { Game } from '../game/engine';
import { VIEW_W, VIEW_H, PLANTS, type LevelDef, type PlantType } from '../game/data';
import { sfx, playMusic, stopMusic, getVolumes, setVolumes } from '../game/audio';
import { PlantSprite, SeedPacket, WoodButton, Panel } from './Sprite';

interface Props {
  level: LevelDef;
  onExit: () => void;
  onRestart: () => void;
  onNext: () => void;
  onWin: () => void;
  hasNext: boolean;
}

function useFitScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const f = () => setScale(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return scale;
}

export function VolumeSliders() {
  const [v, setV] = useState(getVolumes());
  return (
    <div className="space-y-3 text-amber-100 font-bold">
      <label className="flex items-center gap-3">
        <span className="w-16">音效</span>
        <input type="range" min={0} max={1} step={0.05} value={v.sfx} className="flex-1 accent-lime-400"
          onChange={(e) => { const n = { ...v, sfx: Number(e.target.value) }; setV(n); setVolumes(n.sfx, n.music); }}
          onMouseUp={() => sfx.sunCollect()} />
      </label>
      <label className="flex items-center gap-3">
        <span className="w-16">音乐</span>
        <input type="range" min={0} max={1} step={0.05} value={v.music} className="flex-1 accent-lime-400"
          onChange={(e) => { const n = { ...v, music: Number(e.target.value) }; setV(n); setVolumes(n.sfx, n.music); }} />
      </label>
    </div>
  );
}

export default function GameView({ level, onExit, onRestart, onNext, onWin, hasNext }: Props) {
  const scale = useFitScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [overlay, setOverlay] = useState<'none' | 'chooser' | 'pause' | 'lose' | 'win'>('none');
  const [chosen, setChosen] = useState<PlantType[]>([]);
  const [winPlant, setWinPlant] = useState<PlantType | undefined>();

  useEffect(() => {
    const c = canvasRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(VIEW_W * scale * dpr);
    c.height = Math.round(VIEW_H * scale * dpr);
  }, [scale]);

  useEffect(() => {
    const g = new Game(canvasRef.current!, level, {
      onChooser: () => setOverlay('chooser'),
      onLose: () => setOverlay('lose'),
      onWin: (u) => { setWinPlant(u); setOverlay('win'); onWin(); },
      onPause: () => { g.paused = true; sfx.pause(); setOverlay('pause'); },
    });
    gameRef.current = g;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        if (g.phase !== 'playing') return;
        if (g.paused) { g.paused = false; setOverlay('none'); playMusic('day'); }
        else { g.paused = true; sfx.pause(); setOverlay('pause'); }
        return;
      }
      g.onKey(e.key);
    };
    const onBlur = () => { if (g.phase === 'playing' && !g.paused) { g.paused = true; setOverlay('pause'); } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      g.destroy();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const resume = () => {
    const g = gameRef.current;
    if (!g) return;
    g.paused = false;
    sfx.click();
    setOverlay(g.phase === 'choose' ? 'chooser' : 'none');
  };

  const pointer = (e: React.PointerEvent) => {
    const g = gameRef.current;
    if (!g) return;
    const p = g.toLogical(e);
    if (e.type === 'pointermove') g.onMove(p.x, p.y);
    else if (e.type === 'pointerdown') {
      if (e.button === 2) g.onRightClick();
      else { g.onMove(p.x, p.y); g.onClick(p.x, p.y); }
    }
  };

  const available = level.plants;
  const need = Math.min(level.slots, available.length);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none">
      <div style={{ width: VIEW_W, height: VIEW_H, transform: `scale(${scale})`, transformOrigin: 'center center', flex: 'none' }} className="relative">
        <canvas
          ref={canvasRef}
          style={{ width: VIEW_W, height: VIEW_H, cursor: 'pointer', touchAction: 'none' }}
          onPointerMove={pointer}
          onPointerDown={pointer}
          onPointerLeave={() => { if (gameRef.current) gameRef.current.mouse.inside = false; }}
          onContextMenu={(e) => e.preventDefault()}
        />

        {overlay === 'chooser' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* selected slots */}
            <div className="absolute left-2 top-1 pointer-events-auto">
              <Panel>
                <div className="flex items-center gap-1 px-2 py-1">
                  <div className="w-[70px] text-center text-yellow-200 font-black text-xs leading-tight">选择<br />你的植物</div>
                  {Array.from({ length: need }).map((_, i) => (
                    <div key={i} className="w-[56px] h-[76px] rounded-md bg-black/30 flex items-center justify-center cursor-pointer"
                      onClick={() => { if (chosen[i]) { sfx.tap(); setChosen(chosen.filter((_, j) => j !== i)); } }}>
                      {chosen[i] && <SeedPacket type={chosen[i]} />}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            {/* plant grid */}
            <div className="absolute left-2 top-[100px] w-[490px] pointer-events-auto">
              <Panel>
                <div className="p-3">
                  <div className="text-center text-2xl font-black text-yellow-300 [text-shadow:0_3px_0_#3b2208] mb-2">选择你的植物</div>
                  <div className="grid grid-cols-8 gap-1 bg-black/25 rounded-lg p-2 min-h-[170px] content-start">
                    {available.map((p) => {
                      const used = chosen.includes(p);
                      return (
                        <div key={p} className={`cursor-pointer transition ${used ? 'opacity-100' : 'hover:-translate-y-1'}`} title={PLANTS[p].name}
                          onClick={() => {
                            if (used) return;
                            if (chosen.length >= need) { sfx.buzzer(); return; }
                            sfx.seedLift();
                            setChosen([...chosen, p]);
                          }}>
                          <SeedPacket type={p} dim={used} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-amber-100/80 text-sm">已选择 {chosen.length} / {need}</div>
                    <WoodButton variant="red" className="text-xl px-8" disabled={chosen.length < need}
                      onClick={() => { sfx.click(); setOverlay('none'); gameRef.current?.startBattle(chosen); }}>
                      一起摇滚吧！
                    </WoodButton>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {overlay === 'pause' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Panel className="w-[400px]">
              <div className="p-6 text-center">
                <div className="text-4xl font-black text-lime-300 [text-shadow:0_3px_0_#1f3d08] mb-5">游戏暂停</div>
                <div className="mb-6"><VolumeSliders /></div>
                <div className="flex flex-col gap-3">
                  <WoodButton onClick={resume} className="text-xl">返回游戏</WoodButton>
                  <WoodButton variant="wood" onClick={() => { sfx.click(); onRestart(); }}>重新开始</WoodButton>
                  <WoodButton variant="wood" onClick={() => { sfx.click(); onExit(); }}>主菜单</WoodButton>
                </div>
                <div className="mt-4 text-xs text-amber-200/70">快捷键：数字键选卡 · S 铲子 · 空格/Esc 暂停 · 右键取消</div>
              </div>
            </Panel>
          </div>
        )}

        {overlay === 'lose' && (
          <div className="absolute inset-0 flex items-end justify-center pb-16">
            <div className="flex gap-4">
              <WoodButton className="text-2xl px-8" onClick={() => { sfx.click(); onRestart(); }}>再试一次</WoodButton>
              <WoodButton variant="wood" className="text-2xl px-8" onClick={() => { sfx.click(); onExit(); }}>主菜单</WoodButton>
            </div>
          </div>
        )}

        {overlay === 'win' && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#f7f0d8] to-[#e6d6a8] flex items-center justify-center">
            <div className="w-[640px] text-center">
              {winPlant ? (
                <>
                  <div className="text-4xl font-black text-[#3a6b12] [text-shadow:0_3px_0_#fff] mb-3">你得到了一株新植物！</div>
                  <div className="mx-auto w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,#fffbe0_0%,#ffe89a_55%,transparent_70%)] flex items-center justify-center">
                    <PlantSprite type={winPlant} size={170} />
                  </div>
                  <div className="text-3xl font-black text-[#5a3a16] mt-1">{PLANTS[winPlant].name}</div>
                  <div className="text-sm text-[#7a5a2a] mb-2">{PLANTS[winPlant].en} · 阳光 {PLANTS[winPlant].cost}</div>
                  <p className="text-[#4a3212] leading-relaxed px-10 mb-6">{PLANTS[winPlant].desc}</p>
                </>
              ) : (
                <>
                  <div className="text-5xl font-black text-[#b8860b] [text-shadow:0_3px_0_#fff] mb-4">🏆 恭喜通关！</div>
                  <p className="text-[#4a3212] text-lg mb-6">你成功守住了你的草坪和脑子！<br />试试「无尽生存」模式，看看你能坚持多少波！</p>
                </>
              )}
              <div className="flex gap-4 justify-center">
                {hasNext && <WoodButton className="text-2xl px-10" onClick={() => { sfx.click(); onNext(); }}>下一关</WoodButton>}
                <WoodButton variant="wood" className="text-xl" onClick={() => { sfx.click(); onExit(); }}>主菜单</WoodButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
