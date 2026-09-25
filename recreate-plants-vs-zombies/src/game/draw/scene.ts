import { LAWN_X, LAWN_Y, CELL_W, CELL_H, COLS, ROWS, WORLD_W, VIEW_H, PLANTS, type PlantType } from '../data';
import { Ctx, ell, circ, rrect, linear, radial, outlinedText } from './util';
import { drawPlant } from './plants';

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildBackground(rows: number[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = VIEW_H;
  const ctx = c.getContext('2d')!;
  const R = rng(1234);
  const lawnR = LAWN_X + COLS * CELL_W;

  // base grass everywhere
  ctx.fillStyle = '#4f8f2a';
  ctx.fillRect(0, 0, WORLD_W, VIEW_H);

  // top hedge & fence region
  ctx.fillStyle = linear(ctx, 0, 0, 0, LAWN_Y, [[0, '#2f5e1a'], [1, '#447d24']]);
  ctx.fillRect(0, 0, WORLD_W, LAWN_Y);
  // fence
  for (let x = 90; x < WORLD_W; x += 26) {
    ctx.fillStyle = '#d9c8a0';
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x, 22);
    ctx.lineTo(x + 10, 14);
    ctx.lineTo(x + 20, 22);
    ctx.lineTo(x + 20, 64);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a7650';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = '#c5b38a';
  ctx.fillRect(90, 30, WORLD_W, 6);
  ctx.fillRect(90, 52, WORLD_W, 6);
  // hedge bushes in front of fence
  for (let x = 80; x < WORLD_W + 40; x += 34) {
    const r = 26 + R() * 12;
    circ(ctx, x, LAWN_Y - 8 + R() * 6, r, radial(ctx, x, LAWN_Y - 8, r, '#5fa336', '#2b5a17'));
  }
  // some flowers on hedge
  for (let i = 0; i < 40; i++) {
    circ(ctx, 100 + R() * (WORLD_W - 100), LAWN_Y - 30 + R() * 30, 2.5, ['#ffe066', '#ff7aa2', '#ffffff'][i % 3]);
  }

  // lawn cells
  for (let r = 0; r < ROWS; r++) {
    const y = LAWN_Y + r * CELL_H;
    const sod = rows.includes(r);
    for (let col = 0; col < COLS; col++) {
      const x = LAWN_X + col * CELL_W;
      if (sod) {
        const light = (r + col) % 2 === 0;
        ctx.fillStyle = light ? '#6cbb3c' : '#5aa830';
        ctx.fillRect(x, y, CELL_W, CELL_H);
        // subtle stripe
        ctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
        ctx.fillRect(x, y, CELL_W, CELL_H / 2);
      } else {
        ctx.fillStyle = (col % 2) ? '#8a5a2b' : '#83532a';
        ctx.fillRect(x, y, CELL_W, CELL_H);
      }
    }
    if (!sod) {
      for (let i = 0; i < 70; i++) circ(ctx, LAWN_X + R() * COLS * CELL_W, y + R() * CELL_H, 1 + R() * 3, R() > 0.5 ? '#6e4420' : '#9c6a38');
    } else {
      // grass blades
      ctx.strokeStyle = 'rgba(40,100,20,0.45)';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 110; i++) {
        const gx = LAWN_X + R() * COLS * CELL_W;
        const gy = y + 6 + R() * (CELL_H - 8);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + (R() - 0.5) * 4, gy - 4 - R() * 4);
        ctx.stroke();
      }
    }
  }
  // row separators shading
  for (let r = 1; r < ROWS; r++) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(LAWN_X, LAWN_Y + r * CELL_H - 1, COLS * CELL_W, 2);
  }

  // house on the left
  const hx = 0;
  ctx.fillStyle = linear(ctx, 0, 0, 90, 0, [[0, '#b8a27a'], [1, '#e2d2a8']]);
  ctx.fillRect(hx, 0, 78, VIEW_H);
  ctx.strokeStyle = 'rgba(120,95,60,0.5)';
  ctx.lineWidth = 1.5;
  for (let y = 8; y < VIEW_H; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(78, y);
    ctx.stroke();
  }
  // door
  rrect(ctx, 10, 250, 56, 120, 4);
  ctx.fillStyle = '#6b3b1c';
  ctx.fill();
  ctx.strokeStyle = '#3a1d0a';
  ctx.lineWidth = 3;
  ctx.stroke();
  rrect(ctx, 18, 262, 40, 44, 3);
  ctx.fillStyle = '#9ed4f0';
  ctx.fill();
  circ(ctx, 56, 320, 3.5, '#e6c04a');
  // window
  rrect(ctx, 14, 120, 50, 60, 3);
  ctx.fillStyle = '#9ed4f0';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(39, 120);
  ctx.lineTo(39, 180);
  ctx.moveTo(14, 150);
  ctx.lineTo(64, 150);
  ctx.stroke();
  rrect(ctx, 14, 460, 50, 60, 3);
  ctx.fillStyle = '#9ed4f0';
  ctx.fill();
  ctx.stroke();
  // corner trim
  ctx.fillStyle = '#f5ecd5';
  ctx.fillRect(74, 0, 8, VIEW_H);
  // patio stones
  for (let y = 0; y < VIEW_H; y += 30) {
    for (let x = 82; x < LAWN_X; x += 30) {
      rrect(ctx, x + 1 + ((y / 30) % 2) * 6, y + 1, 26, 27, 5);
      ctx.fillStyle = R() > 0.5 ? '#b9b1a0' : '#a9a190';
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(LAWN_X - 4, LAWN_Y, 4, ROWS * CELL_H);

  // sidewalk & street on the right
  ctx.fillStyle = '#c9c4b5';
  ctx.fillRect(lawnR + 8, LAWN_Y - 30, 90, VIEW_H);
  ctx.strokeStyle = '#a19c8e';
  ctx.lineWidth = 2;
  for (let y = LAWN_Y - 30; y < VIEW_H; y += 45) {
    ctx.beginPath();
    ctx.moveTo(lawnR + 8, y);
    ctx.lineTo(lawnR + 98, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#6e8f3c';
  ctx.fillRect(lawnR, LAWN_Y - 30, 8, VIEW_H);
  ctx.fillStyle = '#8f8a7c';
  ctx.fillRect(lawnR + 98, LAWN_Y - 40, 10, VIEW_H);
  ctx.fillStyle = linear(ctx, lawnR + 108, 0, WORLD_W, 0, [[0, '#4b4b4f'], [1, '#3b3b40']]);
  ctx.fillRect(lawnR + 108, LAWN_Y - 40, WORLD_W, VIEW_H);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = R() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)';
    ctx.fillRect(lawnR + 108 + R() * 500, LAWN_Y - 40 + R() * VIEW_H, 2, 2);
  }
  ctx.fillStyle = '#e8c44a';
  for (let y = LAWN_Y - 20; y < VIEW_H; y += 70) ctx.fillRect(lawnR + 330, y, 8, 38);
  // curb bushes on top right
  for (let x = lawnR + 110; x < WORLD_W; x += 60) {
    circ(ctx, x, LAWN_Y - 45, 22, radial(ctx, x, LAWN_Y - 45, 22, '#5fa336', '#2b5a17'));
  }
  return c;
}

export function drawMower(ctx: Ctx, x: number, y: number, t: number, running: boolean) {
  const shake = running ? Math.sin(t * 60) * 1.2 : 0;
  ctx.save();
  ctx.translate(x, y + shake);
  ell(ctx, 4, 2, 30, 7, 'rgba(0,0,0,0.3)');
  // handle
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-30, -46);
  ctx.lineTo(-36, -46);
  ctx.stroke();
  // deck
  rrect(ctx, -18, -22, 44, 18, 6);
  ctx.fillStyle = linear(ctx, 0, -22, 0, -4, [[0, '#ff5a4a'], [1, '#a8140c']]);
  ctx.fill();
  ctx.strokeStyle = '#4a0602';
  ctx.lineWidth = 2;
  ctx.stroke();
  // engine
  rrect(ctx, -6, -36, 20, 16, 4);
  ctx.fillStyle = '#444';
  ctx.fill();
  ctx.stroke();
  rrect(ctx, -2, -40, 12, 6, 2);
  ctx.fillStyle = '#777';
  ctx.fill();
  if (running) {
    circ(ctx, -8 - Math.random() * 6, -40 - Math.random() * 6, 3 + Math.random() * 3, 'rgba(120,120,120,0.5)');
  }
  // wheels
  for (const wx of [-10, 18]) {
    circ(ctx, wx, -4, 7, '#222', '#000', 1.5);
    circ(ctx, wx, -4, 2.5, '#bbb');
  }
  ctx.restore();
}

const iconCache = new Map<string, HTMLCanvasElement>();
export function getPlantIcon(type: PlantType, size = 64): HTMLCanvasElement {
  const key = type + size;
  const c0 = iconCache.get(key);
  if (c0) return c0;
  const c = document.createElement('canvas');
  const dpr = 2;
  c.width = size * dpr;
  c.height = size * dpr;
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const tall = type === 'tallnut' || type === 'threepeater' || type === 'chomper' || type === 'jalapeno' || type === 'squash';
  const s = (size / 90) * (tall ? 0.78 : 0.9);
  ctx.translate(size / 2 - (type === 'peashooter' || type === 'snowpea' || type === 'repeater' ? 6 * s : 0), size - 6);
  ctx.scale(s, s);
  drawPlant(ctx, type, 0.3, { state: type === 'potatomine' ? 'armed' : undefined, stateTime: 1 });
  iconCache.set(key, c);
  return c;
}

export const PACKET_W = 52;
export const PACKET_H = 72;

export function drawSeedPacket(ctx: Ctx, x: number, y: number, type: PlantType, opts: { cooldown?: number; affordable?: boolean; selected?: boolean; hover?: boolean }) {
  const w = PACKET_W, h = PACKET_H;
  ctx.save();
  if (opts.hover && !opts.selected) ctx.translate(0, -2);
  rrect(ctx, x, y, w, h, 5);
  ctx.fillStyle = linear(ctx, x, y, x, y + h, [[0, '#f7f0c4'], [1, '#d9cd8e']]);
  ctx.fill();
  ctx.strokeStyle = '#6b5a22';
  ctx.lineWidth = 2;
  ctx.stroke();
  rrect(ctx, x + 4, y + 4, w - 8, h - 24, 3);
  ctx.fillStyle = '#a8d67a';
  ctx.fill();
  ctx.strokeStyle = '#6b8a3a';
  ctx.lineWidth = 1;
  ctx.stroke();
  const icon = getPlantIcon(type, 64);
  ctx.drawImage(icon, x + w / 2 - 24, y + 2, 48, 48);
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#111';
  ctx.fillText(String(PLANTS[type].cost), x + w / 2, y + h - 10);
  // unavailable overlays
  if (opts.affordable === false) {
    rrect(ctx, x, y, w, h, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
  }
  if (opts.cooldown && opts.cooldown > 0) {
    ctx.save();
    rrect(ctx, x, y, w, h, 5);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, w, h * opts.cooldown);
    ctx.restore();
  }
  if (opts.selected) {
    rrect(ctx, x, y, w, h, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
  }
  ctx.restore();
}

export function drawShovel(ctx: Ctx, x: number, y: number, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(-0.7);
  // handle
  rrect(ctx, -3, -30, 6, 34, 2);
  ctx.fillStyle = '#a0692f';
  ctx.fill();
  ctx.strokeStyle = '#4a2c0d';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  rrect(ctx, -8, -36, 16, 7, 3);
  ctx.fillStyle = '#6b4217';
  ctx.fill();
  ctx.stroke();
  // blade
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.lineTo(10, 2);
  ctx.lineTo(10, 18);
  ctx.quadraticCurveTo(0, 30, -10, 18);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, -10, 0, 10, 0, [[0, '#9aa3a8'], [0.5, '#e8eef0'], [1, '#7c858a']]);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.stroke();
  ctx.restore();
}

export function drawBankFrame(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rrect(ctx, x, y, w, h, 8);
  ctx.fillStyle = linear(ctx, x, y, x, y + h, [[0, '#8a5a2c'], [1, '#5e3a16']]);
  ctx.fill();
  ctx.strokeStyle = '#2d1a08';
  ctx.lineWidth = 3;
  ctx.stroke();
  rrect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
  ctx.strokeStyle = 'rgba(255,220,160,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawProgress(ctx: Ctx, x: number, y: number, progress: number, flags: number[], passed: number[], label: string) {
  const w = 160, h = 18;
  outlinedText(ctx, label, x - 14, y + h / 2, 16, '#ffe9a8', '#3a2208', 5, 'right');
  rrect(ctx, x, y, w, h, 9);
  ctx.fillStyle = '#3b2a12';
  ctx.fill();
  ctx.strokeStyle = '#1a1005';
  ctx.lineWidth = 2;
  ctx.stroke();
  // fill from right to left
  const fw = Math.max(0, Math.min(1, progress)) * (w - 6);
  if (fw > 0) {
    rrect(ctx, x + w - 3 - fw, y + 3, fw, h - 6, 6);
    ctx.fillStyle = linear(ctx, 0, y, 0, y + h, [[0, '#a8f07a'], [1, '#4cae2a']]);
    ctx.fill();
  }
  // flags
  flags.forEach((f, i) => {
    const fx = x + w - 3 - f * (w - 6);
    const up = passed.includes(i) ? 8 : 0;
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, y + h - 2);
    ctx.lineTo(fx, y - 12 - up);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, y - 12 - up);
    ctx.lineTo(fx - 13, y - 8 - up);
    ctx.lineTo(fx, y - 3 - up);
    ctx.closePath();
    ctx.fillStyle = '#c62828';
    ctx.fill();
    ctx.stroke();
  });
  // zombie head marker
  const hx = x + w - 3 - Math.min(1, progress) * (w - 6);
  circ(ctx, hx, y + h / 2, 10, '#a8b894', '#1d1a12', 2);
  circ(ctx, hx - 4, y + h / 2 - 2, 3, '#fff');
  circ(ctx, hx + 2, y + h / 2 - 2, 2.4, '#fff');
  circ(ctx, hx - 4.5, y + h / 2 - 1.5, 1, '#000');
  ctx.fillStyle = '#2b0f0f';
  ctx.fillRect(hx - 6, y + h / 2 + 4, 6, 2);
}
