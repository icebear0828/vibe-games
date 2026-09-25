import { useEffect, useRef } from 'react';
import type { PlantType, ZombieType } from '../game/data';
import { drawPlant } from '../game/draw/plants';
import { drawZombie } from '../game/draw/zombies';
import { drawSeedPacket, PACKET_W, PACKET_H } from '../game/draw/scene';

type DrawFn = (ctx: CanvasRenderingContext2D, t: number) => void;

export function SpriteCanvas({ width, height, draw, animate = false, className, style }: { width: number; height: number; draw: DrawFn; animate?: boolean; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1) * 1.5;
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawRef.current(ctx, (now - start) / 1000);
      if (animate) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height, animate]);
  return <canvas ref={ref} className={className} style={{ width, height, ...style }} />;
}

export function PlantSprite({ type, size = 100, animate = true }: { type: PlantType; size?: number; animate?: boolean }) {
  return (
    <SpriteCanvas
      width={size}
      height={size}
      animate={animate}
      draw={(ctx, t) => {
        const tall = type === 'tallnut' || type === 'threepeater' || type === 'chomper';
        const s = (size / 100) * (tall ? 0.95 : 1.1);
        ctx.translate(size / 2, size - 10);
        ctx.scale(s, s);
        drawPlant(ctx, type, t, { state: type === 'potatomine' ? 'armed' : 'idle', stateTime: 1 });
      }}
    />
  );
}

export function ZombieSprite({ type, size = 120, animate = true, walking = false }: { type: ZombieType; size?: number; animate?: boolean; walking?: boolean }) {
  return (
    <SpriteCanvas
      width={size}
      height={size * 1.25}
      animate={animate}
      draw={(ctx, t) => {
        const s = (size / 120) * 0.95;
        ctx.translate(size / 2 + 8, size * 1.25 - 8);
        ctx.scale(s, s);
        drawZombie(ctx, {
          type, phase: t * 3.4, state: walking ? 'walk' : 'idle', stateTime: 0, armLost: false, headLost: false,
          armor: type === 'cone' ? 'cone' : type === 'bucket' ? 'bucket' : type === 'football' ? 'helmet' : type === 'newspaper' ? 'newspaper' : type === 'door' ? 'door' : null,
          armorRatio: 1, slowed: false, flash: 0, hasPole: type === 'pole', angry: false, seed: 1,
        }, t);
      }}
    />
  );
}

export function SeedPacket({ type, dim = false }: { type: PlantType; dim?: boolean }) {
  return (
    <SpriteCanvas
      width={PACKET_W + 4}
      height={PACKET_H + 4}
      draw={(ctx) => drawSeedPacket(ctx, 2, 2, type, { selected: dim })}
      key={type + dim}
    />
  );
}

export function WoodButton({ children, onClick, disabled, className = '', variant = 'green' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; variant?: 'green' | 'wood' | 'red' }) {
  const bg = variant === 'green'
    ? 'from-lime-400 to-green-700 border-green-950 text-white'
    : variant === 'red'
      ? 'from-red-400 to-red-800 border-red-950 text-white'
      : 'from-amber-600 to-amber-900 border-amber-950 text-amber-50';
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`bg-gradient-to-b ${bg} border-[3px] rounded-xl px-5 py-2 font-black tracking-wide shadow-[0_4px_0_rgba(0,0,0,0.45)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.45)] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition [text-shadow:0_2px_0_rgba(0,0,0,0.5)] cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border-[5px] border-[#3b2208] bg-gradient-to-b from-[#8c5a2b] to-[#5b3714] shadow-2xl p-1 ${className}`}>
      <div className="rounded-xl border-2 border-[#c89a5a]/40 bg-[#2b1a0a]/30 h-full">{children}</div>
    </div>
  );
}
