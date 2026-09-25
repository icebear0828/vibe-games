import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Slider } from './mc';
import { makeLogo, dirtBackground } from '../game/textures';
import type { Settings, GameMode } from '../game/engine';
import type { WorldMeta } from '../game/storage';

const SPLASHES = [
  '也试试泰拉瑞亚！', '100% 纯方块！', '由 React 驱动！', '无限世界！', '苦力怕，别了！', 'WebGL 渲染！', '也可以在浏览器里玩！',
  '致敬 Notch！', '烤猪排！', '随机生成！', '嘿，那边的！', 'Ceci n\'est pas une pipe!', '现在有 3D 云了！', '钻石！', 'Minecraft!',
  '无需安装！', '平滑光照！', '有多少木头能被土拨鼠丢出？', '用 TypeScript 编写！', '8 位原生音效？不，程序生成！',
];

let logoUrl: string | null = null;
let dirtUrl: string | null = null;
export const getDirt = () => (dirtUrl ??= dirtBackground());

export function DirtBg({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center dirt-bg" style={{ backgroundImage: `url(${getDirt()})` }}>
      {children}
    </div>
  );
}

export function TitleScreen({ onSingle, onOptions }: { onSingle: () => void; onOptions: () => void }) {
  const logo = useMemo(() => (logoUrl ??= makeLogo()), []);
  const splash = useMemo(() => SPLASHES[Math.floor(Math.random() * SPLASHES.length)], []);
  return (
    <div className="absolute inset-0 flex flex-col items-center">
      <div className="relative mt-[9vh] mb-[7vh]">
        <img src={logo} className="pixel" style={{ width: 'min(620px, 88vw)' }} draggable={false} alt="MINECRAFT" />
        <div className="text-center -mt-2 text-[20px] tracking-[0.35em] text-[#e8e8e8] mc-text-dark" style={{ fontWeight: 'bold' }}>REACT EDITION</div>
        <div className="absolute right-[-10px] bottom-[10px] splash text-[#ffff00] text-[20px] whitespace-nowrap" style={{ textShadow: '2px 2px 0 #3f3f00' }}>{splash}</div>
      </div>
      <div className="flex flex-col gap-[8px] items-center">
        <Button onClick={onSingle}>单人游戏</Button>
        <Button disabled>多人游戏</Button>
        <Button disabled>Minecraft Realms</Button>
        <div className="flex gap-[8px] mt-[16px]">
          <Button width={196} onClick={onOptions}>选项...</Button>
          <Button width={196} onClick={() => window.close()}>退出游戏</Button>
        </div>
      </div>
      <div className="absolute left-2 bottom-1 text-[16px] mc-text">Minecraft 1.20.1 (React 版)</div>
      <div className="absolute right-2 bottom-1 text-[16px] mc-text">非官方粉丝复刻 · 与 Mojang 无关</div>
    </div>
  );
}

export function WorldSelect({ worlds, onPlay, onCreate, onDelete, onBack }: { worlds: WorldMeta[]; onPlay: (w: WorldMeta) => void; onCreate: () => void; onDelete: (w: WorldMeta) => void; onBack: () => void }) {
  const [sel, setSel] = useState<string | null>(worlds[0]?.id ?? null);
  const [confirm, setConfirm] = useState(false);
  const w = worlds.find((x) => x.id === sel);
  if (confirm && w) {
    return (
      <DirtBg>
        <div className="mt-[30vh] text-[18px] mc-text">你确定要删除这个世界吗？</div>
        <div className="mt-4 text-[17px] text-[#a0a0a0] mc-text">'{w.name}' 将会永久失去！（真的很久！）</div>
        <div className="flex gap-2 mt-10">
          <Button width={196} onClick={() => { onDelete(w); setConfirm(false); setSel(null); }}>删除</Button>
          <Button width={196} onClick={() => setConfirm(false)}>取消</Button>
        </div>
      </DirtBg>
    );
  }
  return (
    <DirtBg>
      <div className="mt-4 text-[18px] mc-text">选择世界</div>
      <div className="w-full flex-1 mt-4 overflow-y-auto scroll-mc flex flex-col items-center py-2" style={{ background: 'rgba(0,0,0,0.5)', boxShadow: 'inset 0 4px 8px #000, inset 0 -4px 8px #000' }}>
        {worlds.length === 0 && <div className="mt-8 text-[#a0a0a0] text-[17px] mc-text">还没有世界。点击“创建新的世界”开始吧！</div>}
        {worlds.map((x) => (
          <div key={x.id} onClick={() => setSel(x.id)} onDoubleClick={() => onPlay(x)}
            className="w-[440px] p-[6px] flex gap-3 cursor-pointer mb-1" style={{ border: sel === x.id ? '2px solid #808080' : '2px solid transparent', background: sel === x.id ? '#000' : 'transparent' }}>
            <div className="w-[64px] h-[64px] shrink-0 dirt-bg" style={{ backgroundImage: `url(${getDirt()})`, backgroundSize: '64px', filter: 'brightness(2.2)' }} />
            <div className="flex flex-col justify-center leading-[20px]">
              <div className="text-[17px] text-white">{x.name}</div>
              <div className="text-[15px] text-[#808080]">{x.name} ({new Date(x.lastPlayed).toLocaleString()})</div>
              <div className="text-[15px] text-[#808080]">{x.mode === 'creative' ? '创造模式' : '生存模式'}, 种子: {x.seed}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 my-3 items-center">
        <div className="flex gap-2">
          <Button width={300} disabled={!w} onClick={() => w && onPlay(w)}>进入选中的世界</Button>
          <Button width={300} onClick={onCreate}>创建新的世界</Button>
        </div>
        <div className="flex gap-2">
          <Button width={300} disabled={!w} onClick={() => setConfirm(true)}>删除</Button>
          <Button width={300} onClick={onBack}>取消</Button>
        </div>
      </div>
    </DirtBg>
  );
}

export function CreateWorld({ onCreate, onBack }: { onCreate: (name: string, seed: string, mode: GameMode) => void; onBack: () => void }) {
  const [name, setName] = useState('新的世界');
  const [seed, setSeed] = useState('');
  const [mode, setMode] = useState<GameMode>('creative');
  return (
    <DirtBg>
      <div className="mt-6 text-[18px] mc-text">创建新的世界</div>
      <div className="mt-10 w-[400px] flex flex-col gap-1">
        <label className="text-[16px] text-[#a0a0a0] mc-text">世界名称</label>
        <input className="mc-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
        <div className="h-5" />
        <Button onClick={() => setMode(mode === 'creative' ? 'survival' : 'creative')}>游戏模式: {mode === 'creative' ? '创造' : '生存'}</Button>
        <div className="text-[15px] text-[#a0a0a0] mc-text mt-1 leading-5">
          {mode === 'creative' ? '无限的资源、自由地飞翔并且能够瞬间破坏方块' : '探索神秘的世界，建造、收集、合成并与怪物战斗'}
        </div>
        <div className="h-5" />
        <label className="text-[16px] text-[#a0a0a0] mc-text">世界生成器的种子</label>
        <input className="mc-input" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="留空以生成随机种子" />
      </div>
      <div className="flex gap-2 mt-auto mb-6">
        <Button width={196} onClick={() => onCreate(name.trim() || '新的世界', seed, mode)}>创建新的世界</Button>
        <Button width={196} onClick={onBack}>取消</Button>
      </div>
    </DirtBg>
  );
}

export function OptionsScreen({ settings, onChange, onBack, transparent }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void; transparent?: boolean }) {
  const set = (p: Partial<Settings>) => onChange({ ...settings, ...p });
  const body = (
    <>
      <div className="mt-6 text-[18px] mc-text">选项</div>
      <div className="grid grid-cols-2 gap-2 mt-8">
        <Slider width={300} label="视场角" value={settings.fov} min={30} max={110} onChange={(v) => set({ fov: v })} format={(v) => (v === 70 ? '普通' : v === 110 ? '极限' : String(v))} />
        <Slider width={300} label="渲染距离" value={settings.renderDistance} min={2} max={12} onChange={(v) => set({ renderDistance: v })} format={(v) => `${v} 区块`} />
        <Slider width={300} label="鼠标灵敏度" value={settings.sensitivity} min={20} max={200} onChange={(v) => set({ sensitivity: v })} format={(v) => `${v}%`} />
        <Slider width={300} label="主音量" value={settings.volume} min={0} max={100} onChange={(v) => set({ volume: v })} format={(v) => (v === 0 ? '关' : `${v}%`)} />
        <Button width={300} onClick={() => set({ music: !settings.music })}>音乐: {settings.music ? '开' : '关'}</Button>
        <Button width={300} onClick={() => set({ viewBobbing: !settings.viewBobbing })}>视角摇晃: {settings.viewBobbing ? '开' : '关'}</Button>
        <Button width={300} onClick={() => set({ clouds: !settings.clouds })}>云: {settings.clouds ? '高品质' : '关'}</Button>
        <Button width={300} disabled>图像品质: 高品质</Button>
      </div>
      <div className="mt-8 text-[15px] text-[#a0a0a0] mc-text text-center leading-6 max-w-[620px]">
        操作：WASD 移动 · 空格 跳跃（创造模式双击飞行）· Shift 潜行 · Ctrl/双击W 疾跑 · 左键 破坏/攻击 · 右键 放置/点燃TNT · 中键 选取方块<br />
        E 物品栏 · Q 丢弃 · T 聊天 · / 命令 · F3 调试信息 · F1 隐藏界面 · 滚轮/1-9 切换物品
      </div>
      <div className="mt-auto mb-6"><Button width={400} onClick={onBack}>完成</Button></div>
    </>
  );
  if (transparent) return <div className="absolute inset-0 flex flex-col items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>{body}</div>;
  return <DirtBg>{body}</DirtBg>;
}

export function PauseMenu({ onResume, onOptions, onQuit }: { onResume: () => void; onOptions: () => void; onQuit: () => void }) {
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.code === 'Escape') onResume(); };
    const t = setTimeout(() => window.addEventListener('keydown', kd), 200);
    return () => { clearTimeout(t); window.removeEventListener('keydown', kd); };
  }, [onResume]);
  return (
    <div className="absolute inset-0 flex flex-col items-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="mt-[12vh] text-[18px] mc-text">游戏菜单</div>
      <div className="flex flex-col gap-2 mt-10 items-center">
        <Button onClick={onResume}>回到游戏</Button>
        <div className="flex gap-2">
          <Button width={196} disabled>进度</Button>
          <Button width={196} disabled>统计信息</Button>
        </div>
        <div className="flex gap-2">
          <Button width={196} disabled>提供反馈</Button>
          <Button width={196} disabled>报告Bug</Button>
        </div>
        <div className="flex gap-2">
          <Button width={196} onClick={onOptions}>选项...</Button>
          <Button width={196} disabled>对局域网开放</Button>
        </div>
        <Button onClick={onQuit}>保存并退出到标题屏幕</Button>
      </div>
    </div>
  );
}

export function DeathScreen({ onRespawn, onQuit }: { onRespawn: () => void; onQuit: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 1000); return () => clearTimeout(t); }, []);
  return (
    <div className="absolute inset-0 flex flex-col items-center" style={{ background: 'linear-gradient(rgba(80,0,0,0.5), rgba(160,20,20,0.6))' }}>
      <div className="mt-[18vh] text-[48px] mc-text">你死了！</div>
      <div className="mt-6 text-[18px] mc-text">分数：<span className="text-[#ffff55]">0</span></div>
      <div className="flex flex-col gap-2 mt-14">
        <Button disabled={!ready} onClick={onRespawn}>重生</Button>
        <Button disabled={!ready} onClick={onQuit}>标题屏幕</Button>
      </div>
    </div>
  );
}

export function LoadingScreen({ progress, label = '正在加载地形' }: { progress: number; label?: string }) {
  return (
    <DirtBg>
      <div className="mt-[40vh] text-[18px] mc-text">{label}</div>
      <div className="mt-6 w-[300px] h-[6px] bg-[#808080] relative">
        <div className="absolute left-0 top-0 h-full bg-[#80ff80]" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="mt-3 text-[16px] text-[#a0a0a0] mc-text">{Math.round(progress * 100)}%</div>
    </DirtBg>
  );
}

export function ChatInput({ initial, onSend, onClose, history }: { initial: string; onSend: (t: string) => void; onClose: () => void; history: { text: string }[] }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 10); }, []);
  return (
    <div className="absolute inset-0">
      <div className="absolute left-1 bottom-[52px] w-[560px] flex flex-col items-start">
        {history.slice(-12).map((m, i) => <div key={i} className="px-1 text-[16px] mc-text w-full" style={{ background: 'rgba(0,0,0,0.45)' }}>{m.text}</div>)}
      </div>
      <input
        ref={ref}
        className="absolute left-1 right-1 bottom-1 h-[34px] px-2 text-[17px] text-white outline-none mc-text"
        style={{ background: 'rgba(0,0,0,0.55)', fontFamily: 'inherit', border: 'none' }}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { if (v.trim()) onSend(v.trim()); onClose(); }
          if (e.key === 'Escape') onClose();
        }}
      />
    </div>
  );
}
