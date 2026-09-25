import type { PlantType } from '../data';
import { Ctx, ell, circ, radial, leaf, stem, shadow, linear, clamp } from './util';

export interface PlantVisual {
  state?: string;
  stateTime?: number;
  hpRatio?: number;
  shoot?: number; // 0..1, 1 = just fired
  glow?: number;
  flash?: number;
  seed?: number;
  lookX?: number;
  headShoot?: number[];
}

const G_OUT = '#24560f';
const G_STEM = '#4c9e2a';
const G_LEAF = '#5dbb32';
const G_LEAF_D = '#3f8a1f';

function baseLeaves(ctx: Ctx, t: number, s = 1) {
  const w = Math.sin(t * 2) * 0.05;
  leaf(ctx, -3, -1, 26 * s, 8 * s, Math.PI + 0.25 + w, G_LEAF_D, G_OUT);
  leaf(ctx, 3, -1, 26 * s, 8 * s, -0.25 - w, G_LEAF_D, G_OUT);
  leaf(ctx, -2, -2, 20 * s, 7 * s, Math.PI + 0.85 + w, G_LEAF, G_OUT);
  leaf(ctx, 2, -2, 20 * s, 7 * s, -0.85 - w, G_LEAF, G_OUT);
}

function peaHead(ctx: Ctx, hx: number, hy: number, shoot: number, kind: 'pea' | 'snow' | 'repeater', scale = 1) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(scale, scale);
  const sq = shoot;
  const light = kind === 'snow' ? '#d8f6ff' : kind === 'repeater' ? '#8fd449' : '#b9f06b';
  const dark = kind === 'snow' ? '#58b3e3' : kind === 'repeater' ? '#3d8d1e' : '#56ae2c';
  const out = kind === 'snow' ? '#1e5f8c' : G_OUT;
  // back crest
  if (kind === 'snow') {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI + 0.9 - i * 0.35;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(12, -4);
      ctx.lineTo(28 - i * 2, 0);
      ctx.lineTo(12, 4);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#e8fbff' : '#a6e3fb';
      ctx.fill();
      ctx.strokeStyle = out;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  } else {
    leaf(ctx, -12, -8, 18, 6, Math.PI + 0.55, dark, out);
    if (kind === 'repeater') leaf(ctx, -12, -2, 18, 6, Math.PI + 0.15, dark, out);
  }
  // snout
  const sl = 28 + sq * 4;
  const sr = 9 + sq * 2;
  ctx.beginPath();
  ctx.moveTo(4, -sr);
  ctx.lineTo(sl, -sr - 1);
  ctx.lineTo(sl, sr + 1);
  ctx.lineTo(4, sr);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, 0, -sr, 0, sr, [[0, light], [1, dark]]);
  ctx.fill();
  ctx.strokeStyle = out;
  ctx.lineWidth = 2;
  ctx.stroke();
  // head
  ctx.save();
  ctx.scale(1 - sq * 0.08, 1 + sq * 0.06);
  circ(ctx, 0, 0, 18, radial(ctx, 0, 0, 18, light, dark), out, 2);
  ctx.restore();
  // mouth rim
  ell(ctx, sl, 0, 6, sr + 2, light, out, 2);
  ell(ctx, sl + 1, 0, 3.5, sr - 1.5, '#16380a');
  // eye
  const ey = -5;
  ell(ctx, 7, ey, 4.2, 6, '#111');
  circ(ctx, 8.3, ey - 2.4, 1.6, '#fff');
  if (kind === 'repeater') {
    ctx.beginPath();
    ctx.moveTo(1, ey - 10);
    ctx.lineTo(13, ey - 6);
    ctx.strokeStyle = '#1a3a0a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // highlight
  ell(ctx, -6, -9, 5, 3, 'rgba(255,255,255,0.35)', undefined, 0, -0.5);
  ctx.restore();
}

function drawPeashooter(ctx: Ctx, t: number, v: PlantVisual, kind: 'pea' | 'snow' | 'repeater') {
  const s = v.seed ?? 0;
  shadow(ctx, 0, 0, 26);
  baseLeaves(ctx, t + s);
  const sway = Math.sin(t * 2.3 + s) * 1.6;
  const hx = sway - (v.shoot ?? 0) * 3;
  const hy = -44 + Math.sin(t * 2.3 + s + 1) * 1.2;
  stem(ctx, 0, -2, -6, -22, hx - 2, hy + 10, 5, G_STEM, G_OUT);
  peaHead(ctx, hx, hy, v.shoot ?? 0, kind);
}

function drawThreepeater(ctx: Ctx, t: number, v: PlantVisual) {
  const s = v.seed ?? 0;
  shadow(ctx, 0, 0, 30);
  baseLeaves(ctx, t + s, 1.1);
  const hs = v.headShoot ?? [0, 0, 0];
  const heads: [number, number][] = [
    [-15 + Math.sin(t * 2.1 + s) * 1.2, -34],
    [0 + Math.sin(t * 2.4 + s) * 1.5, -62],
    [15 + Math.sin(t * 2.2 + s + 2) * 1.2, -32],
  ];
  stem(ctx, 0, -2, 0, -30, heads[1][0], heads[1][1] + 10, 5, G_STEM, G_OUT);
  stem(ctx, 0, -8, -14, -14, heads[0][0], heads[0][1] + 8, 4, G_STEM, G_OUT);
  stem(ctx, 0, -8, 14, -14, heads[2][0], heads[2][1] + 8, 4, G_STEM, G_OUT);
  peaHead(ctx, heads[1][0], heads[1][1], hs[0], 'pea', 0.78);
  peaHead(ctx, heads[0][0], heads[0][1], hs[1], 'pea', 0.78);
  peaHead(ctx, heads[2][0], heads[2][1], hs[2], 'pea', 0.78);
}

function drawSunflower(ctx: Ctx, t: number, v: PlantVisual) {
  const s = v.seed ?? 0;
  shadow(ctx, 0, 0, 24);
  baseLeaves(ctx, t + s);
  const rot = Math.sin(t * 1.8 + s) * 0.12;
  const hx = Math.sin(t * 1.8 + s) * 4;
  const hy = -50 + Math.cos(t * 3.6 + s) * 1.2;
  stem(ctx, 0, -2, hx * 0.2 - 3, -26, hx, hy + 12, 5, G_STEM, G_OUT);
  leaf(ctx, hx * 0.4, -24, 16, 6, -0.6, G_LEAF, G_OUT);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(rot);
  const glow = v.glow ?? 0;
  if (glow > 0) {
    ctx.globalAlpha = glow * 0.6;
    circ(ctx, 0, 0, 42, radial(ctx, 0, 0, 42, 'rgba(255,255,160,0.9)', 'rgba(255,230,0,0)', 0, 0));
    ctx.globalAlpha = 1;
  }
  const n = 16;
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + layer * (Math.PI / n) + Math.sin(t * 2 + i) * 0.02;
      ctx.save();
      ctx.rotate(a);
      ell(ctx, 0, -24 + layer * 2, 6.5, 12 - layer * 1.5, layer ? '#ffe03a' : '#f7b90c', '#b87a00', 1.4);
      ctx.restore();
    }
  }
  circ(ctx, 0, 0, 18, radial(ctx, 0, 0, 18, '#c98536', '#8a4f14'), '#5b320a', 2);
  // face
  const bright = glow > 0 ? `rgba(255,240,120,${glow * 0.5})` : null;
  if (bright) circ(ctx, 0, 0, 17, bright);
  ell(ctx, -6, -4, 2.8, 4.2, '#1b0e03');
  ell(ctx, 6, -4, 2.8, 4.2, '#1b0e03');
  circ(ctx, -5.2, -5.5, 1, '#fff');
  circ(ctx, 6.8, -5.5, 1, '#fff');
  ctx.beginPath();
  ctx.arc(0, 2, 7, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = '#1b0e03';
  ctx.lineWidth = 2;
  ctx.stroke();
  ell(ctx, -11, 3, 3.5, 2, 'rgba(255,120,80,0.45)');
  ell(ctx, 11, 3, 3.5, 2, 'rgba(255,120,80,0.45)');
  ctx.restore();
}

function nutFace(ctx: Ctx, t: number, v: PlantVisual, cx: number, cy: number, rx: number, ry: number) {
  const hp = v.hpRatio ?? 1;
  const look = v.lookX ?? Math.sin(t * 0.7 + (v.seed ?? 0)) * 2;
  const blink = (t * 0.45 + (v.seed ?? 0)) % 4 > 3.9;
  const ey = cy - ry * 0.18;
  for (const ex of [cx - rx * 0.28, cx + rx * 0.32]) {
    if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - 5, ey);
      ctx.lineTo(ex + 5, ey);
      ctx.strokeStyle = '#2a1605';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ell(ctx, ex, ey, 6, 7.5, '#fff', '#2a1605', 1.5);
      circ(ctx, ex + look + 1.5, ey + 1, 3, '#111');
    }
  }
  if (hp < 0.34) {
    // worried brows
    ctx.strokeStyle = '#2a1605';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.45, ey - 9);
    ctx.lineTo(cx - rx * 0.12, ey - 12);
    ctx.moveTo(cx + rx * 0.5, ey - 9);
    ctx.lineTo(cx + rx * 0.16, ey - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 2, cy + ry * 0.35, 5, Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + ry * 0.28);
    ctx.quadraticCurveTo(cx + 3, cy + ry * 0.32, cx + 8, cy + ry * 0.26);
    ctx.strokeStyle = '#2a1605';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
}

function nutCracks(ctx: Ctx, hp: number, cx: number, cy: number, rx: number, ry: number) {
  ctx.strokeStyle = '#3e2206';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'miter';
  if (hp < 0.67) {
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.1, cy - ry);
    ctx.lineTo(cx + rx * 0.05, cy - ry * 0.7);
    ctx.lineTo(cx - rx * 0.12, cy - ry * 0.55);
    ctx.lineTo(cx + rx * 0.02, cy - ry * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + rx, cy + ry * 0.1);
    ctx.lineTo(cx + rx * 0.72, cy + ry * 0.2);
    ctx.lineTo(cx + rx * 0.8, cy + ry * 0.38);
    ctx.stroke();
  }
  if (hp < 0.34) {
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy + ry * 0.05);
    ctx.lineTo(cx - rx * 0.7, cy + ry * 0.15);
    ctx.lineTo(cx - rx * 0.78, cy + ry * 0.35);
    ctx.lineTo(cx - rx * 0.55, cy + ry * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.2, cy + ry);
    ctx.lineTo(cx + rx * 0.1, cy + ry * 0.75);
    ctx.lineTo(cx + rx * 0.3, cy + ry * 0.6);
    ctx.stroke();
  }
}

function drawNut(ctx: Ctx, t: number, v: PlantVisual, tall: boolean) {
  const rx = tall ? 29 : 27;
  const ry = tall ? 52 : 32;
  const cy = -ry - 1;
  const hp = v.hpRatio ?? 1;
  shadow(ctx, 0, 0, rx + 3);
  ctx.save();
  ctx.translate(0, 0);
  const wob = Math.sin(t * 1.3 + (v.seed ?? 0)) * 0.015;
  ctx.rotate(wob);
  ell(ctx, 0, cy, rx, ry, radial(ctx, 0, cy, ry, '#e8b56a', '#9a5f22', -0.3, -0.35), '#4a2a0b', 2.5);
  // texture
  ctx.strokeStyle = 'rgba(90,50,12,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < (tall ? 7 : 4); i++) {
    const yy = cy - ry * 0.75 + i * (ry * 1.5) / (tall ? 7 : 4);
    ctx.beginPath();
    ctx.arc(-rx * 0.55, yy, 4, 0.2, 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx * 0.6, yy + 6, 3, 1, 3);
    ctx.stroke();
  }
  ell(ctx, -rx * 0.35, cy - ry * 0.55, rx * 0.25, ry * 0.12, 'rgba(255,255,255,0.25)', undefined, 0, -0.5);
  nutCracks(ctx, hp, 0, cy, rx, ry);
  nutFace(ctx, t, v, 0, cy + (tall ? -ry * 0.2 : 0), rx, tall ? ry * 0.6 : ry);
  if (hp < 0.34) {
    // bite chunk
    ctx.beginPath();
    ctx.arc(rx * 0.9, cy - ry * 0.45, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#c69350';
    ctx.fill();
  }
  ctx.restore();
}

function cherry(ctx: Ctx, x: number, y: number, r: number, flip: boolean, fuse: number) {
  const hot = fuse > 0 ? Math.min(1, fuse) : 0;
  const c1 = hot > 0.5 && Math.floor(fuse * 14) % 2 === 0 ? '#ffc0a0' : '#ff6a55';
  circ(ctx, x, y, r, radial(ctx, x, y, r, c1, '#b0100a'), '#5e0602', 2);
  ell(ctx, x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.18, 'rgba(255,255,255,0.55)', undefined, 0, -0.6);
  const d = flip ? -1 : 1;
  // angry brows
  ctx.strokeStyle = '#2a0200';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 8 * d + (flip ? 0 : 0), y - 7);
  ctx.lineTo(x - 2 * d, y - 4);
  ctx.moveTo(x + 8 * d, y - 7);
  ctx.lineTo(x + 2 * d, y - 4);
  ctx.stroke();
  circ(ctx, x - 4.5, y - 1, 2.6, '#111');
  circ(ctx, x + 4.5, y - 1, 2.6, '#111');
  ctx.beginPath();
  ctx.arc(x, y + 9, 4.5, Math.PI + 0.3, -0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawCherry(ctx: Ctx, t: number, v: PlantVisual) {
  const fuse = v.state === 'fuse' ? (v.stateTime ?? 0) : 0;
  const sc = 1 + clamp(fuse / 1.2, 0, 1) * 0.35;
  const shake = fuse > 0 ? (Math.random() - 0.5) * 3 * fuse : 0;
  shadow(ctx, 0, 0, 30);
  ctx.save();
  ctx.translate(shake, 0);
  ctx.scale(sc, sc);
  const b = Math.sin(t * 3 + (v.seed ?? 0)) * 1.2;
  stem(ctx, -13, -30 + b, -10, -52, 0, -58, 3, '#3f8a1f', G_OUT);
  stem(ctx, 14, -34 + b, 12, -52, 0, -58, 3, '#3f8a1f', G_OUT);
  leaf(ctx, 0, -58, 18, 6, -0.4, G_LEAF, G_OUT);
  cherry(ctx, -13, -19 + b, 17, false, fuse);
  cherry(ctx, 14, -22 - b, 17, true, fuse);
  ctx.restore();
}

function drawPotato(ctx: Ctx, t: number, v: PlantVisual) {
  const armed = v.state === 'armed';
  const rise = armed ? clamp((v.stateTime ?? 0) / 0.4, 0, 1) : 0;
  // dirt mound
  ell(ctx, 0, -2, 28, 9, '#6b4423', '#3d2410', 1.5);
  for (let i = 0; i < 5; i++) circ(ctx, -18 + i * 9, -5 + (i % 2) * 2, 3, '#7c5230');
  if (!armed) {
    // just the antenna poking out
    stem(ctx, 0, -6, 1, -10, 2, -14, 2, '#8a8a8a', '#333');
    circ(ctx, 2, -16, 3, '#7a1b10', '#300', 1);
    return;
  }
  const y = -8 - rise * 6;
  ell(ctx, 0, y, 23, 15 * (0.6 + rise * 0.4), radial(ctx, 0, y, 20, '#e5b876', '#a86d34'), '#5a3512', 2);
  circ(ctx, -12, y + 3, 1.6, '#8a5623');
  circ(ctx, 10, y + 6, 1.4, '#8a5623');
  circ(ctx, 14, y - 2, 1.2, '#8a5623');
  // antenna
  stem(ctx, 0, y - 12, 2, y - 20, 1, y - 27, 2, '#8a8a8a', '#333');
  const blink = Math.floor(t * 2.5) % 2 === 0;
  circ(ctx, 1, y - 29, 4, blink ? '#ff2a1a' : '#8a1a10', '#300', 1.2);
  if (blink) circ(ctx, 1, y - 29, 9, 'rgba(255,60,40,0.25)');
  // face
  const ey = y - 2;
  ell(ctx, -6, ey, 3.5, 4.5, '#fff', '#3a1d05', 1.2);
  ell(ctx, 6, ey, 3.5, 4.5, '#fff', '#3a1d05', 1.2);
  circ(ctx, -5, ey + 1, 2, '#111');
  circ(ctx, 7, ey + 1, 2, '#111');
  ctx.beginPath();
  ctx.arc(0, y + 5, 3.5, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = '#3a1d05';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawChomper(ctx: Ctx, t: number, v: PlantVisual) {
  const s = v.seed ?? 0;
  shadow(ctx, 0, 0, 28);
  baseLeaves(ctx, t + s, 1.15);
  const st = v.state ?? 'idle';
  const tt = v.stateTime ?? 0;
  let open = 0.25 + Math.sin(t * 2.5 + s) * 0.08;
  let lean = 0;
  let chew = 0;
  if (st === 'bite') {
    const p = tt / 0.7;
    if (p < 0.55) { open = 0.3 + (p / 0.55) * 0.75; lean = (p / 0.55) * 14; }
    else { open = Math.max(0, 1.05 - ((p - 0.55) / 0.2) * 1.05); lean = 14 - ((p - 0.55) / 0.45) * 14; }
  } else if (st === 'chew') {
    open = 0.02;
    chew = Math.sin(tt * 7);
  }
  const hx = 6 + lean + Math.sin(t * 2 + s) * 1.5;
  const hy = -58 + Math.cos(t * 2 + s) * 1.2 + (st === 'bite' ? lean * 0.5 : 0);
  stem(ctx, 0, -2, -14, -24, hx - 18, hy + 6, 6, G_STEM, G_OUT);
  leaf(ctx, -8, -24, 16, 6, Math.PI + 0.5, G_LEAF, G_OUT);
  ctx.save();
  ctx.translate(hx - 18, hy + 4);
  const cs = st === 'chew' ? 1 + chew * 0.05 : 1;
  ctx.scale(cs, 2 - cs);
  const purple = '#9d3fb8';
  const purpleD = '#5e1a73';
  // lower jaw
  ctx.save();
  ctx.rotate(open * 0.55);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(8, 20, 36, 18, 44, 2);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, 20, 8, 24, '#c065d8', purpleD);
  ctx.fill();
  ctx.strokeStyle = '#3b0b4a';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (open > 0.1) {
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.quadraticCurveTo(22, 12, 42, 2);
    ctx.lineTo(4, 1);
    ctx.fillStyle = '#e0487a';
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) {
    const x = 8 + i * 7.5;
    ctx.beginPath();
    ctx.moveTo(x - 3, 2);
    ctx.lineTo(x, -5);
    ctx.lineTo(x + 3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();
  // upper jaw
  ctx.save();
  ctx.rotate(-open);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-2, -30, 36, -34, 48, -2);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, 18, -14, 28, '#cf78e6', purple);
  ctx.fill();
  ctx.strokeStyle = '#3b0b4a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // spots
  circ(ctx, 14, -16, 3, 'rgba(255,255,255,0.25)');
  circ(ctx, 26, -18, 2.2, 'rgba(255,255,255,0.2)');
  circ(ctx, 34, -10, 1.8, 'rgba(255,255,255,0.2)');
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) {
    const x = 7 + i * 7;
    ctx.beginPath();
    ctx.moveTo(x - 3, -1);
    ctx.lineTo(x, 7);
    ctx.lineTo(x + 3, -1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // lip leaves
  leaf(ctx, 2, -16, 14, 5, Math.PI + 0.6, G_LEAF_D, G_OUT);
  ctx.restore();
  ctx.restore();
}

function drawSquash(ctx: Ctx, t: number, v: PlantVisual) {
  const st = v.state ?? 'idle';
  const tt = v.stateTime ?? 0;
  let y = 0;
  let squish = 1;
  if (st === 'aim') squish = 1 + Math.sin(tt * 20) * 0.03;
  if (st === 'jump') {
    const p = clamp(tt / 0.45, 0, 1);
    y = -Math.sin(p * Math.PI * 0.5) * 110;
  }
  if (st === 'fall') {
    const p = clamp(tt / 0.15, 0, 1);
    y = -110 * (1 - p);
  }
  if (st === 'smash') {
    squish = 0.75;
  }
  if (st !== 'jump' && st !== 'fall') shadow(ctx, 0, 0, 30);
  else shadow(ctx, 0, 0, 30 * (1 + y / 200), 6, 0.2);
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(2 - squish, squish);
  const c1 = '#9ccc4c', c2 = '#4f8a1d';
  // body lobes
  ctx.beginPath();
  ctx.moveTo(-26, -8);
  ctx.bezierCurveTo(-34, -40, -18, -62, 0, -62);
  ctx.bezierCurveTo(18, -62, 34, -40, 26, -8);
  ctx.quadraticCurveTo(0, 4, -26, -8);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, 0, -32, 36, c1, c2);
  ctx.fill();
  ctx.strokeStyle = '#27500b';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,80,10,0.4)';
  ctx.lineWidth = 2;
  for (const x of [-14, 0, 14]) {
    ctx.beginPath();
    ctx.moveTo(x, -58);
    ctx.quadraticCurveTo(x * 1.35, -30, x, -4);
    ctx.stroke();
  }
  // stem
  stem(ctx, 0, -60, 4, -68, 8, -72, 5, '#6c8a2a', '#2f4410');
  // angry face
  const look = st === 'aim' ? 4 : 0;
  ctx.strokeStyle = '#1b3304';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-16 + look, -44);
  ctx.lineTo(-4 + look, -38);
  ctx.moveTo(16 + look, -44);
  ctx.lineTo(4 + look, -38);
  ctx.stroke();
  ell(ctx, -8 + look, -32, 4.5, 4, '#fff', '#1b3304', 1.2);
  ell(ctx, 8 + look, -32, 4.5, 4, '#fff', '#1b3304', 1.2);
  circ(ctx, -7 + look * 1.3, -32, 2.2, '#111');
  circ(ctx, 9 + look * 1.3, -32, 2.2, '#111');
  ctx.beginPath();
  ctx.moveTo(-10 + look, -16);
  ctx.quadraticCurveTo(look, -24, 10 + look, -16);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  void t;
}

function drawJalapeno(ctx: Ctx, t: number, v: PlantVisual) {
  const fuse = v.state === 'fuse' ? (v.stateTime ?? 0) : 0;
  const sc = 1 + clamp(fuse / 1, 0, 1) * 0.3;
  const shake = fuse > 0 ? (Math.random() - 0.5) * 4 * fuse : 0;
  shadow(ctx, 0, 0, 20);
  ctx.save();
  ctx.translate(shake, 0);
  ctx.scale(sc * (1 + Math.sin(t * 4) * 0.02), sc);
  ctx.beginPath();
  ctx.moveTo(-6, -64);
  ctx.bezierCurveTo(16, -62, 20, -30, 12, -12);
  ctx.bezierCurveTo(6, 2, -6, 4, -12, -8);
  ctx.bezierCurveTo(-18, -24, -22, -56, -6, -64);
  ctx.closePath();
  const hot = fuse > 0 && Math.floor(fuse * 12) % 2 === 0;
  ctx.fillStyle = radial(ctx, -2, -36, 34, hot ? '#ff9a70' : '#ff4b2e', '#a50d05');
  ctx.fill();
  ctx.strokeStyle = '#4d0400';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ell(ctx, -8, -48, 3, 10, 'rgba(255,255,255,0.4)', undefined, 0, 0.2);
  // cap
  ctx.beginPath();
  ctx.moveTo(-12, -62);
  ctx.quadraticCurveTo(-4, -72, 6, -64);
  ctx.quadraticCurveTo(-3, -58, -12, -62);
  ctx.fillStyle = G_LEAF;
  ctx.fill();
  ctx.strokeStyle = G_OUT;
  ctx.stroke();
  stem(ctx, -3, -67, -1, -76, 5, -80, 3, G_STEM, G_OUT);
  // face
  ctx.strokeStyle = '#2a0200';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-10, -46);
  ctx.lineTo(-2, -42);
  ctx.moveTo(10, -46);
  ctx.lineTo(3, -42);
  ctx.stroke();
  circ(ctx, -5, -38, 2.6, '#111');
  circ(ctx, 6, -38, 2.6, '#111');
  ctx.beginPath();
  ctx.ellipse(0, -26, 5, fuse > 0 ? 6 : 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#300';
  ctx.fill();
  ctx.restore();
}

function drawSpikeweed(ctx: Ctx, t: number, v: PlantVisual) {
  const atk = v.state === 'attack' ? Math.sin(clamp((v.stateTime ?? 0) / 0.3, 0, 1) * Math.PI) : 0;
  ell(ctx, 0, -3, 32, 8, radial(ctx, 0, -3, 30, '#76b33a', '#3f7317'), '#244a0a', 2);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = -26 + (i * 52) / (n - 1);
    const h = 12 + (i % 2) * 5 + atk * 8 + Math.sin(t * 3 + i) * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 4, -4);
    ctx.lineTo(x + (i - 3) * 0.8, -4 - h);
    ctx.lineTo(x + 4, -4);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, x, -4 - h, x, -4, [[0, '#f4f4f4'], [1, '#8a8a8a']]);
    ctx.fill();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // eyes peeking
  ell(ctx, -6, -6, 2.6, 2.2, '#fff');
  ell(ctx, 6, -6, 2.6, 2.2, '#fff');
  circ(ctx, -5.5, -6, 1.3, '#111');
  circ(ctx, 6.5, -6, 1.3, '#111');
}

export function drawFlame(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const layers: [string, number][] = [['#ff4d00', 1], ['#ff9a00', 0.75], ['#ffe65c', 0.45]];
  layers.forEach(([c, s], li) => {
    ctx.beginPath();
    const ww = w * s;
    const hh = h * s;
    ctx.moveTo(x - ww / 2, y);
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const px = x - ww / 2 + (ww * i) / n;
      const ph = hh * (0.55 + 0.45 * Math.abs(Math.sin(t * 9 + i * 1.7 + li)));
      ctx.lineTo(px - ww / (n * 2), y - ph * (i === 0 || i === n ? 0.4 : 1));
      ctx.lineTo(px, y - ph * 0.6);
    }
    ctx.lineTo(x + ww / 2, y);
    ctx.quadraticCurveTo(x, y + hh * 0.18, x - ww / 2, y);
    ctx.fillStyle = c;
    ctx.fill();
  });
  ctx.restore();
}

function drawTorchwood(ctx: Ctx, t: number, v: PlantVisual) {
  shadow(ctx, 0, 0, 28);
  // trunk
  const top = -58;
  ctx.beginPath();
  ctx.moveTo(-24, -2);
  ctx.lineTo(-22, top);
  ctx.lineTo(22, top);
  ctx.lineTo(25, -2);
  ctx.quadraticCurveTo(0, 6, -24, -2);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, -24, 0, 24, 0, [[0, '#6b3f1a'], [0.4, '#a8683a'], [1, '#5a3212']]);
  ctx.fill();
  ctx.strokeStyle = '#2d1605';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,20,5,0.5)';
  ctx.lineWidth = 1.5;
  for (const x of [-15, -5, 8, 17]) {
    ctx.beginPath();
    ctx.moveTo(x, top + 8);
    ctx.quadraticCurveTo(x + 2, -30, x - 1, -6);
    ctx.stroke();
  }
  // fire (behind rim)
  drawFlame(ctx, 0, top + 2, 46, 46, t + (v.seed ?? 0));
  ell(ctx, 0, top, 22, 6, '#8a5328', '#2d1605', 2);
  ell(ctx, 0, top, 16, 3.5, '#ff7a00');
  // face
  ctx.strokeStyle = '#1a0a02';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -44);
  ctx.lineTo(-4, -39);
  ctx.moveTo(14, -44);
  ctx.lineTo(4, -39);
  ctx.stroke();
  ell(ctx, -8, -34, 4, 4.5, '#ffd24a', '#1a0a02', 1.5);
  ell(ctx, 8, -34, 4, 4.5, '#ffd24a', '#1a0a02', 1.5);
  circ(ctx, -7, -34, 2, '#1a0a02');
  circ(ctx, 9, -34, 2, '#1a0a02');
  ell(ctx, 0, -20, 7, 4, '#2a1105');
}

export function drawPlant(ctx: Ctx, type: PlantType, t: number, v: PlantVisual = {}) {
  switch (type) {
    case 'peashooter': return drawPeashooter(ctx, t, v, 'pea');
    case 'snowpea': return drawPeashooter(ctx, t, v, 'snow');
    case 'repeater': return drawPeashooter(ctx, t, v, 'repeater');
    case 'threepeater': return drawThreepeater(ctx, t, v);
    case 'sunflower': return drawSunflower(ctx, t, v);
    case 'wallnut': return drawNut(ctx, t, v, false);
    case 'tallnut': return drawNut(ctx, t, v, true);
    case 'cherrybomb': return drawCherry(ctx, t, v);
    case 'potatomine': return drawPotato(ctx, t, { ...v, state: v.state ?? 'armed', stateTime: v.stateTime ?? 1 });
    case 'chomper': return drawChomper(ctx, t, v);
    case 'squash': return drawSquash(ctx, t, v);
    case 'jalapeno': return drawJalapeno(ctx, t, v);
    case 'spikeweed': return drawSpikeweed(ctx, t, v);
    case 'torchwood': return drawTorchwood(ctx, t, v);
  }
}

// ---------- projectiles & sun ----------
export function drawPea(ctx: Ctx, x: number, y: number, kind: 'pea' | 'snow' | 'fire', t: number) {
  shadow(ctx, x, y + 58, 9, 3, 0.2);
  if (kind === 'fire') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    drawFlame(ctx, 0, 6, 22, 30, t);
    ctx.restore();
    circ(ctx, x, y, 9, radial(ctx, x, y, 9, '#fff6a0', '#ff8a00'));
    return;
  }
  if (kind === 'snow') {
    circ(ctx, x, y, 12, 'rgba(180,235,255,0.35)');
    circ(ctx, x, y, 9, radial(ctx, x, y, 9, '#ffffff', '#6cc8f0'), '#2a7db0', 1.5);
    return;
  }
  circ(ctx, x, y, 9, radial(ctx, x, y, 9, '#c8ff7a', '#4fa82a'), '#2a6812', 1.5);
}

export function drawSun(ctx: Ctx, x: number, y: number, t: number, scale = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  circ(ctx, 0, 0, 44, radial(ctx, 0, 0, 44, 'rgba(255,255,170,0.75)', 'rgba(255,220,0,0)', 0, 0));
  ctx.rotate(t * 0.8);
  ctx.fillStyle = 'rgba(255,214,40,0.85)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.lineTo(0, -38 - (i % 2) * 5);
    ctx.lineTo(5, -20);
    ctx.fill();
  }
  ctx.rotate(-t * 0.8 * 2);
  ctx.fillStyle = 'rgba(255,240,120,0.6)';
  for (let i = 0; i < 8; i++) {
    ctx.rotate((Math.PI * 2) / 8);
    ctx.beginPath();
    ctx.moveTo(-6, -18);
    ctx.lineTo(0, -32);
    ctx.lineTo(6, -18);
    ctx.fill();
  }
  circ(ctx, 0, 0, 22, radial(ctx, 0, 0, 22, '#fffbd0', '#ffc400', -0.2, -0.2), '#e89b00', 2);
  ctx.restore();
}
