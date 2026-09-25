import { W, IMG, cls, BUSHES, mapImage, LANES, FOUNTAIN } from './map';
import type { Game, Unit } from './engine';
import { img, ready, champIcon } from './assets';

const GS = 2800; // ground canvas size
const K = GS / W;
let ground: HTMLCanvasElement | null = null;
let bushCanvases: { c: HTMLCanvasElement; x: number; y: number; s: number }[] = [];

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function maskCanvas(test: (c: number) => boolean) {
  const cv = document.createElement('canvas'); cv.width = IMG; cv.height = IMG;
  const x = cv.getContext('2d')!; const id = x.createImageData(IMG, IMG);
  for (let i = 0; i < IMG * IMG; i++) { const on = test(cls[i]); id.data[i * 4] = 255; id.data[i * 4 + 1] = 255; id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = on ? 255 : 0; }
  x.putImageData(id, 0, 0);
  return cv;
}
let scratch: HTMLCanvasElement | null = null;
function colorize(mask: HTMLCanvasElement, fill: (x: CanvasRenderingContext2D) => void, blur = 0) {
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = GS; scratch.height = GS; }
  const cv = scratch;
  const x = cv.getContext('2d')!;
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, GS, GS);
  void blur;
  fill(x);
  x.globalCompositeOperation = 'source-over';
  // apply mask once
  x.globalCompositeOperation = 'destination-in';
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(mask, 0, 0, GS, GS);
  x.globalCompositeOperation = 'source-over';
  return cv;
}

export function buildGround() {
  if (ground) return ground;
  const t0 = performance.now();
  const R = rng(777);
  const cv = document.createElement('canvas'); cv.width = GS; cv.height = GS;
  const x = cv.getContext('2d')!;
  // base grass
  x.fillStyle = '#3e5a2c'; x.fillRect(0, 0, GS, GS);
  const blobSprite = (c: string) => {
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const bx = s.getContext('2d')!; const gr = bx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 64, 64); return s;
  };
  const blobs = [blobSprite('rgba(80,110,50,0.3)'), blobSprite('rgba(35,55,25,0.3)')];
  for (let i = 0; i < 2600; i++) { const r = 20 + R() * 90; x.drawImage(blobs[i & 1], R() * GS - r, R() * GS - r, r * 2, r * 2); }
  x.fillStyle = 'rgba(110,145,70,0.35)';
  for (let i = 0; i < 25000; i++) x.fillRect(R() * GS, R() * GS, 1, 2 + R() * 3);
  x.fillStyle = 'rgba(30,50,20,0.35)';
  for (let i = 0; i < 25000; i++) x.fillRect(R() * GS, R() * GS, 1, 2 + R() * 3);
  // lanes (dirt)
  const lanePaint = (w: number, col: string) => {
    x.strokeStyle = col; x.lineWidth = w * K; x.lineCap = 'round'; x.lineJoin = 'round';
    for (const L of LANES) { x.beginPath(); L.forEach((p, i) => i ? x.lineTo(p.x * K, p.y * K) : x.moveTo(p.x * K, p.y * K)); x.stroke(); }
  };
  lanePaint(900, 'rgba(120,100,60,0.25)');
  lanePaint(720, 'rgba(130,108,66,0.45)');
  lanePaint(560, 'rgba(142,118,74,0.6)');
  lanePaint(420, 'rgba(150,126,82,0.5)');
  for (let i = 0; i < 25000; i++) {
    const L = LANES[Math.floor(R() * 3)]; const si = Math.floor(R() * (L.length - 1)); const a = L[si], b = L[si + 1]; const t = R();
    const px = (a.x + (b.x - a.x) * t + (R() - 0.5) * 600) * K, py = (a.y + (b.y - a.y) * t + (R() - 0.5) * 600) * K;
    x.fillStyle = R() < 0.5 ? 'rgba(90,72,45,0.5)' : 'rgba(175,150,105,0.45)';
    x.fillRect(px, py, 1 + R() * 2.5, 1 + R() * 2.5);
  }
  // base plazas
  const baseMask = maskCanvas(c => c === 3);
  const baseLayer = colorize(baseMask, (bx) => {
    bx.fillStyle = '#6d7680'; bx.fillRect(0, 0, GS, GS);
    bx.strokeStyle = 'rgba(40,45,55,0.35)'; bx.lineWidth = 1.5;
    const tile = 110 * K;
    for (let i = 0; i < GS; i += tile) { bx.beginPath(); bx.moveTo(i, 0); bx.lineTo(i, GS); bx.stroke(); bx.beginPath(); bx.moveTo(0, i); bx.lineTo(GS, i); bx.stroke(); }
    for (let i = 0; i < 4000; i++) { bx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; bx.fillRect(Math.floor(R() * GS / tile) * tile, Math.floor(R() * GS / tile) * tile, tile, tile); }
    for (const [i, f] of FOUNTAIN.entries()) {
      const g = bx.createRadialGradient(f.x * K, f.y * K, 0, f.x * K, f.y * K, 2600 * K);
      g.addColorStop(0, i === 0 ? 'rgba(60,120,220,0.35)' : 'rgba(220,60,60,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      bx.fillStyle = g; bx.fillRect(0, 0, GS, GS);
    }
  }, 2);
  x.drawImage(baseLayer, 0, 0);
  // river
  const riverMask = maskCanvas(c => c === 2);
  const riverLayer = colorize(riverMask, (rx) => {
    const g = rx.createLinearGradient(0, 0, GS, GS);
    g.addColorStop(0, '#2c6f7a'); g.addColorStop(0.5, '#2f7f86'); g.addColorStop(1, '#2c6f7a');
    rx.fillStyle = g; rx.fillRect(0, 0, GS, GS);
    for (let i = 0; i < 3500; i++) { rx.strokeStyle = R() < 0.6 ? 'rgba(160,230,240,0.18)' : 'rgba(10,40,50,0.25)'; rx.lineWidth = 1 + R() * 1.5; const px = R() * GS, py = R() * GS, l = 6 + R() * 16; rx.beginPath(); rx.moveTo(px, py); rx.quadraticCurveTo(px + l / 2, py - 3, px + l, py); rx.stroke(); }
  }, 3);
  x.drawImage(riverLayer, 0, 0);
  // wall shadow
  const wallMask = maskCanvas(c => c === 0);
  const shadow = colorize(wallMask, (sx) => { sx.fillStyle = 'rgba(0,0,0,0.3)'; sx.fillRect(0, 0, GS, GS); }, 10);
  x.drawImage(shadow, 4, 6); x.drawImage(shadow, 8, 12); x.drawImage(shadow, 12, 18);
  const walls = colorize(wallMask, (wx) => { wx.fillStyle = '#1c2a17'; wx.fillRect(0, 0, GS, GS); }, 2);
  x.drawImage(walls, 0, 0);
  // rocks on wall edges + tree canopies
  const trees: [number, number, number][] = [];
  for (let iy = 0; iy < IMG; iy += 2) for (let ix = 0; ix < IMG; ix += 2) {
    if (cls[iy * IMG + ix] !== 0) continue;
    if (R() < 0.62) trees.push([(ix + R() * 2) / IMG * GS, (iy + R() * 2) / IMG * GS, (6 + R() * 12)]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  const treeSprites = Array.from({ length: 10 }, () => {
    const s = document.createElement('canvas'); s.width = s.height = 72;
    const tx = s.getContext('2d')!;
    tx.fillStyle = 'rgba(0,0,0,0.35)'; tx.beginPath(); tx.ellipse(40, 42, 30, 24, 0, 0, 7); tx.fill();
    const hue = 95 + R() * 40, l = 14 + R() * 10;
    const g = tx.createRadialGradient(22, 21, 3, 32, 32, 30);
    g.addColorStop(0, `hsl(${hue},38%,${l + 14}%)`); g.addColorStop(0.7, `hsl(${hue},40%,${l}%)`); g.addColorStop(1, `hsl(${hue},45%,${l - 6}%)`);
    tx.fillStyle = g; tx.beginPath(); tx.arc(32, 32, 30, 0, 7); tx.fill();
    for (let i = 0; i < 6; i++) { tx.fillStyle = `hsla(${hue},40%,${l + 18}%,0.35)`; tx.beginPath(); tx.arc(18 + R() * 28, 18 + R() * 28, 3 + R() * 5, 0, 7); tx.fill(); }
    return s;
  });
  for (const [tx, ty, r] of trees) {
    x.drawImage(treeSprites[Math.floor(R() * treeSprites.length)], tx - r * 1.07, ty - r * 1.07, r * 2.4, r * 2.4);
    if (R() < 0.08) { x.fillStyle = `hsla(${280 + R() * 60},60%,70%,0.6)`; x.fillRect(tx + (R() - 0.5) * r, ty + (R() - 0.5) * r, 2, 2); }
  }
  ground = cv;
  console.log('[ground] built in', Math.round(performance.now() - t0), 'ms');
  // bushes
  bushCanvases = BUSHES.map((b, bi) => {
    const R2 = rng(1000 + bi);
    const s = Math.max(b.rx, b.ry) * 2 + 120;
    const px = Math.ceil(s * 0.6);
    const c = document.createElement('canvas'); c.width = px; c.height = px;
    const bx = c.getContext('2d')!;
    const k = px / s;
    bx.translate(px / 2, px / 2); bx.rotate(b.rot);
    for (let i = 0; i < 70; i++) {
      const a = R2() * Math.PI * 2, rr = Math.sqrt(R2());
      const lx = Math.cos(a) * b.rx * rr * k, ly = Math.sin(a) * b.ry * rr * k, r = (28 + R2() * 30) * k;
      const g = bx.createRadialGradient(lx - r * 0.3, ly - r * 0.3, 0, lx, ly, r);
      g.addColorStop(0, `hsl(${100 + R2() * 25},55%,${34 + R2() * 10}%)`); g.addColorStop(1, `hsl(${110 + R2() * 20},55%,16%)`);
      bx.fillStyle = g; bx.beginPath(); bx.arc(lx, ly, r, 0, Math.PI * 2); bx.fill();
    }
    for (let i = 0; i < 90; i++) {
      const a = R2() * Math.PI * 2, rr = Math.sqrt(R2());
      const lx = Math.cos(a) * b.rx * rr * k, ly = Math.sin(a) * b.ry * rr * k;
      bx.strokeStyle = `hsla(${90 + R2() * 30},60%,${45 + R2() * 15}%,0.8)`; bx.lineWidth = 1.2;
      bx.beginPath(); bx.moveTo(lx, ly); bx.lineTo(lx + (R2() - 0.5) * 8, ly - 6 - R2() * 8); bx.stroke();
    }
    return { c, x: b.x, y: b.y, s };
  });
  return cv;
}

export interface Cam { x: number; y: number; zoom: number; w: number; h: number }
export interface DrawOpts { hover: Unit | null; indicator: { slot: number; kind: string; range: number; width?: number; radius?: number } | null; mouse: { x: number; y: number }; clicks: { x: number; y: number; t: number; red: boolean }[]; showRange: boolean }

const TEAMC = ['#3b8cff', '#ff4040'];
let fogCv: HTMLCanvasElement | null = null;

export function draw(ctx: CanvasRenderingContext2D, g: Game, cam: Cam, o: DrawOpts) {
  const { w, h, zoom } = cam;
  const pt = g.playerTeam;
  ctx.save();
  ctx.fillStyle = '#0a0f0a'; ctx.fillRect(0, 0, w, h);
  const sh = g.shakeAmt > 0.3 ? g.shakeAmt : 0;
  const ox = w / 2 - cam.x * zoom + (Math.random() - 0.5) * sh, oy = h / 2 - cam.y * zoom + (Math.random() - 0.5) * sh;
  // ground
  if (ground) {
    const vx0 = (0 - ox) / zoom, vy0 = (0 - oy) / zoom, vw = w / zoom, vh = h / zoom;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(ground, vx0 * K, vy0 * K, vw * K, vh * K, 0, 0, w, h);
  }
  ctx.translate(ox, oy); ctx.scale(zoom, zoom);
  const vx0 = -ox / zoom - 300, vy0 = -oy / zoom - 300, vx1 = vx0 + w / zoom + 600, vy1 = vy0 + h / zoom + 600;
  const onScreen = (x: number, y: number) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
  const T = g.time;

  // river shimmer
  // zones
  for (const z of g.zones) {
    if (!onScreen(z.x, z.y)) continue;
    const a = Math.min(1, z.age * 4) * (z.dur - z.age < 0.3 ? (z.dur - z.age) / 0.3 : 1);
    ctx.save(); ctx.globalAlpha = a;
    if (z.style === 'spin') {
      ctx.strokeStyle = z.color; ctx.lineWidth = 10;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.85, T * 14 + i * 2.1, T * 14 + i * 2.1 + 1.2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,220,120,0.12)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
    } else if (z.style === 'chomper') {
      ctx.fillStyle = z.owner.team === pt ? 'rgba(255,90,176,0.35)' : 'rgba(255,60,60,0.35)';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ff5ab0'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#333'; for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(z.x + Math.cos(an) * z.r * 0.7, z.y + Math.sin(an) * z.r * 0.7); ctx.lineTo(z.x + Math.cos(an + 0.2) * z.r * 0.4, z.y + Math.sin(an + 0.2) * z.r * 0.4); ctx.lineTo(z.x + Math.cos(an + 0.4) * z.r * 0.7, z.y + Math.sin(an + 0.4) * z.r * 0.7); ctx.fill(); }
    } else {
      const gr = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      gr.addColorStop(0, 'rgba(255,250,200,0.45)'); gr.addColorStop(0.8, 'rgba(255,240,150,0.25)'); gr.addColorStop(1, 'rgba(255,240,150,0.05)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
      ctx.strokeStyle = z.color; ctx.lineWidth = 5; ctx.setLineDash([30, 20]); ctx.lineDashOffset = -T * 60; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  // ground fx (warn, cone, line)
  for (const f of g.fx) {
    if (!onScreen(f.x, f.y) && f.type !== 'line' && f.type !== 'beam') continue;
    const p = f.t / f.dur;
    if (f.type === 'warn') {
      ctx.save(); ctx.strokeStyle = f.color!; ctx.lineWidth = 6; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r!, 0, 7); ctx.stroke();
      ctx.fillStyle = f.color!; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(f.x, f.y, f.r! * p, 0, 7); ctx.fill();
      ctx.restore();
    } else if (f.type === 'cone') {
      ctx.save(); ctx.globalAlpha = 0.5 * (1 - p); ctx.fillStyle = f.color!;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, f.r!, f.angle! - f.width!, f.angle! + f.width!); ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (f.type === 'line') {
      ctx.save(); ctx.strokeStyle = f.color!; ctx.lineWidth = f.width || 4; ctx.globalAlpha = f.dur > 0.4 ? 1 : 1 - p; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2!, f.y2!); ctx.stroke(); ctx.restore();
    } else if (f.type === 'click') {
      ctx.save(); ctx.strokeStyle = f.color!; ctx.lineWidth = 4; ctx.globalAlpha = 1 - p;
      ctx.beginPath(); ctx.arc(f.x, f.y, 40 * (1 - p) + 8, 0, 7); ctx.stroke(); ctx.restore();
    }
  }
  // player indicators
  const P = g.player;
  if (P.alive && o.showRange) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, P.st.range + P.r, 0, 7); ctx.stroke(); }
  if (P.alive && o.indicator) {
    const ind = o.indicator; const m = o.mouse;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,200,255,0.6)'; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(100,180,255,0.12)';
    if (ind.range && ind.range < 5000) { ctx.beginPath(); ctx.arc(P.x, P.y, ind.range, 0, 7); ctx.stroke(); }
    const a = Math.atan2(m.y - P.y, m.x - P.x);
    if (ind.kind === 'skillshot') {
      const len = Math.min(ind.range, 3000), wd = ind.width || 80;
      ctx.translate(P.x, P.y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(120,200,255,0.25)'; ctx.fillRect(0, -wd / 2, len, wd); ctx.strokeRect(0, -wd / 2, len, wd);
    } else if (ind.kind === 'ground') {
      const d = Math.min(ind.range, Math.hypot(m.x - P.x, m.y - P.y));
      const cx = P.x + Math.cos(a) * d, cy = P.y + Math.sin(a) * d;
      ctx.beginPath(); ctx.arc(cx, cy, ind.radius || 120, 0, 7); ctx.fill(); ctx.stroke();
    } else if (ind.kind === 'self' && ind.radius) { ctx.beginPath(); ctx.arc(P.x, P.y, ind.radius, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  // units
  const list = g.units.filter(u => (u.alive || u.isStructure) && onScreen(u.x, u.y) && (u.team === pt || u.vis[pt] || u.isStructure) && !(u.kind === 'ward' && u.team !== pt) && !u.invisible);
  list.sort((a, b) => a.y - b.y);
  for (const u of list) drawUnit(ctx, g, u, u === o.hover);
  // bushes on top of units
  BUSHES.forEach((b, i) => {
    if (!onScreen(b.x, b.y)) return;
    const bc = bushCanvases[i]; if (!bc) return;
    const inside = (P.alive && P.bush === i) || list.some(u => u.team === pt && u.bush === i && u.kind === 'champion');
    ctx.globalAlpha = inside ? 0.45 : 1;
    ctx.drawImage(bc.c, b.x - bc.s / 2, b.y - bc.s / 2, bc.s, bc.s);
    ctx.globalAlpha = 1;
  });
  // turret beams
  for (const s of g.structs) {
    if (!s.alive || s.kind !== 'turret' || !s.target || s.target.kind !== 'champion' || !onScreen(s.x, s.y)) continue;
    const t = s.target;
    ctx.save(); ctx.strokeStyle = s.team === 0 ? 'rgba(120,190,255,0.7)' : 'rgba(255,90,90,0.7)'; ctx.lineWidth = 4 + Math.sin(T * 20) * 1.5;
    ctx.beginPath(); ctx.moveTo(s.x, s.y - 170); ctx.lineTo(t.x, t.y - 20); ctx.stroke(); ctx.restore();
  }
  // projectiles
  for (const p of g.projectiles) {
    if (!onScreen(p.x, p.y)) continue;
    if (p.owner && p.owner.team !== pt && !p.owner.vis?.[pt] && p.kind === 'homing' && p.isAttack) {
      // still show
    }
    drawProjectile(ctx, p, T);
  }
  // fx top
  for (const f of g.fx) {
    const p = f.t / f.dur;
    if (f.type === 'nova') {
      ctx.save(); ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = f.color!; ctx.lineWidth = 14 * (1 - p) + 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r! * (0.3 + 0.7 * Math.sqrt(p)), 0, 7); ctx.stroke();
      ctx.globalAlpha = (1 - p) * 0.25; ctx.fillStyle = f.color!; ctx.fill(); ctx.restore();
    } else if (f.type === 'burst') {
      ctx.save(); ctx.globalAlpha = 1 - p; const r = f.r! * (0.4 + p);
      const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, f.color!); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill(); ctx.restore();
    } else if (f.type === 'spark') {
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.color!; ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) { const a = (f.angle || 0) + (i - 2) * 0.5; const r0 = 10 + p * 30, r1 = r0 + 18; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0); ctx.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); ctx.stroke(); }
      ctx.restore();
    } else if (f.type === 'slash') {
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.color!; ctx.lineWidth = (f.size || 1) * 14 * (1 - p) + 2; ctx.lineCap = 'round';
      const a = (f.angle || 0) + p * 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r! * 0.7, a, a + 2.2); ctx.stroke(); ctx.restore();
    } else if (f.type === 'beam') {
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.lineCap = 'round';
      ctx.strokeStyle = f.color!; ctx.lineWidth = (f.width || 20) * (1 - p * 0.5); ctx.shadowColor = f.color!; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2!, f.y2!); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = (f.width || 20) * 0.35; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2!, f.y2!); ctx.stroke();
      ctx.restore();
    } else if (f.type === 'ring') {
      if (f.follow && (!f.follow.alive)) continue;
      ctx.save(); ctx.globalAlpha = 0.7 * (p > 0.8 ? (1 - p) * 5 : 1); ctx.strokeStyle = f.color!; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r! + Math.sin(T * 8) * 4, 0, 7); ctx.stroke(); ctx.restore();
    } else if (f.type === 'levelup') {
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#7ad0ff'; ctx.lineWidth = 6;
      for (let i = 0; i < 3; i++) { const yy = f.y - p * 150 - i * 30; ctx.beginPath(); ctx.ellipse(f.x, yy, 70 - i * 10, 22 - i * 3, 0, 0, 7); ctx.stroke(); }
      ctx.restore();
    }
  }
  // health bars
  for (const u of list) if (u.alive && u.kind !== 'ward') drawBars(ctx, g, u);
  // text fx
  for (const f of g.fx) {
    if (f.type !== 'text' && f.type !== 'gold') continue;
    const p = f.t / f.dur;
    ctx.save(); ctx.globalAlpha = p > 0.6 ? (1 - p) / 0.4 : 1;
    const sz = (f.size || 16) * (p < 0.15 ? 1 + (0.15 - p) * 4 : 1);
    ctx.font = `bold ${sz / zoom * 0.9}px "Microsoft YaHei", sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3 / zoom; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(f.text!, f.x, f.y);
    ctx.fillStyle = f.color!; ctx.fillText(f.text!, f.x, f.y);
    ctx.restore();
  }
  ctx.restore();
  // fog of war
  drawFog(ctx, g, cam, ox, oy);
  // click markers (screen)
  for (const c of o.clicks) {
    const p = (performance.now() - c.t) / 400; if (p > 1) continue;
    const sx = c.x * zoom + ox, sy = c.y * zoom + oy;
    ctx.save(); ctx.strokeStyle = c.red ? '#ff4040' : '#50ff70'; ctx.lineWidth = 2.5; ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.ellipse(sx, sy, 22 * (1 - p) + 4, 11 * (1 - p) + 2, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 6, sy - 14 * (1 - p) - 6); ctx.lineTo(sx, sy - 4); ctx.lineTo(sx + 6, sy - 14 * (1 - p) - 6); ctx.stroke();
    ctx.restore();
  }
}

function drawFog(ctx: CanvasRenderingContext2D, g: Game, cam: Cam, ox: number, oy: number) {
  const sc = 0.25;
  const fw = Math.ceil(cam.w * sc), fh = Math.ceil(cam.h * sc);
  if (!fogCv) fogCv = document.createElement('canvas');
  if (fogCv.width !== fw || fogCv.height !== fh) { fogCv.width = fw; fogCv.height = fh; }
  const f = fogCv.getContext('2d')!;
  f.globalCompositeOperation = 'source-over';
  f.clearRect(0, 0, fw, fh);
  f.fillStyle = 'rgba(5,10,20,0.58)'; f.fillRect(0, 0, fw, fh);
  f.globalCompositeOperation = 'destination-out';
  const z = cam.zoom * sc;
  const pt = g.playerTeam;
  const hole = (x: number, y: number, r: number) => {
    const sx = (x * cam.zoom + ox) * sc, sy = (y * cam.zoom + oy) * sc, sr = r * z;
    if (sx < -sr || sy < -sr || sx > fw + sr || sy > fh + sr) return;
    const gr = f.createRadialGradient(sx, sy, sr * 0.75, sx, sy, sr);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = gr; f.beginPath(); f.arc(sx, sy, sr, 0, 7); f.fill();
  };
  for (const u of g.units) {
    if (!u.alive || u.team !== pt || u.kind === 'inhib' || u.kind === 'nexus') continue;
    hole(u.x, u.y, u.kind === 'champion' ? 1200 : u.kind === 'turret' ? 1350 : u.kind === 'ward' ? 900 : u.kind === 'minion' ? 1000 : 800);
  }
  for (const v of g.visions) if (v.team === pt) hole(v.x, v.y, v.r);
  hole(FOUNTAIN[pt].x, FOUNTAIN[pt].y, 1600);
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fogCv, 0, 0, cam.w, cam.h);
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: any, T: number) {
  const a = p.angle ?? p.dir ?? p.angle ?? 0;
  const ang = p.kind === 'skill' ? (p.returning ? Math.atan2(p.owner.y - p.y, p.owner.x - p.x) : p.angle) : a;
  ctx.save(); ctx.translate(p.x, p.y);
  const col = p.color || '#fff';
  const style = p.style;
  ctx.rotate(ang);
  if (style === 'arrow' || style === 'crystal') {
    const L = style === 'crystal' ? 140 : 60, Wd = style === 'crystal' ? 30 : 6;
    ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(L / 2, 0); ctx.lineTo(-L / 2, -Wd); ctx.lineTo(-L / 3, 0); ctx.lineTo(-L / 2, Wd); ctx.closePath(); ctx.fill();
    if (style === 'crystal') { ctx.globalAlpha = 0.4; ctx.fillRect(-L * 1.6, -Wd * 0.6, L * 1.2, Wd * 1.2); }
  } else if (style === 'rocket' || style === 'cannon') {
    const s = style === 'rocket' && p.width > 100 ? 2.4 : 1;
    ctx.fillStyle = 'rgba(255,160,60,0.5)'; ctx.beginPath(); ctx.arc(-24 * s, 0, 14 * s + Math.random() * 6, 0, 7); ctx.fill();
    ctx.fillStyle = style === 'cannon' ? '#333' : col; ctx.fillRect(-18 * s, -8 * s, 36 * s, 16 * s);
    ctx.fillStyle = '#ffd'; ctx.beginPath(); ctx.moveTo(18 * s, -8 * s); ctx.lineTo(30 * s, 0); ctx.lineTo(18 * s, 8 * s); ctx.fill();
  } else if (style === 'hook') {
    ctx.restore(); ctx.save();
    ctx.strokeStyle = '#e8dcb0'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, 7); ctx.fill();
  } else if (style === 'barrage' || style === 'wave' || style === 'blade') {
    const wd = p.width;
    ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.fillStyle = col; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(0, 0, 40, wd / 2, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.35; ctx.fillRect(-160, -wd / 3, 160, wd * 0.66);
  } else if (style === 'turret') {
    ctx.shadowColor = col; ctx.shadowBlur = 25; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.4; ctx.fillStyle = col; ctx.fillRect(-60, -8, 60, 16);
  } else {
    const s = p.size || 10;
    ctx.shadowColor = col; ctx.shadowBlur = 18;
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.4; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-s * 2, 0, s * 2, s * 0.6, 0, 0, 7); ctx.fill();
    if (style === 'fire' || style === 'fox') { ctx.globalAlpha = 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-s * (1 + i) + Math.sin(T * 30 + i) * 3, Math.cos(T * 25 + i) * 4, s * (0.8 - i * 0.2), 0, 7); ctx.fill(); } }
  }
  ctx.restore();
}

function drawUnit(ctx: CanvasRenderingContext2D, g: Game, u: Unit, hover: boolean) {
  const pt = g.playerTeam;
  const tc = u.team === 2 ? '#e0a040' : u.team === pt ? TEAMC[0] : TEAMC[1];
  const T = g.time;
  ctx.save();
  if (u.kind === 'turret') {
    if (!u.alive) { ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 90, 60, 0, 0, 7); ctx.fill(); for (let i = 0; i < 7; i++) { ctx.fillStyle = '#555'; ctx.fillRect(u.x - 70 + i * 20, u.y - 20 + (i % 3) * 12, 18, 12); } ctx.restore(); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(u.x + 30, u.y + 15, 110, 60, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a5f66'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 95, 62, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a2d31'; ctx.lineWidth = 5; ctx.stroke();
    const gr = ctx.createLinearGradient(u.x - 45, 0, u.x + 45, 0);
    gr.addColorStop(0, '#4a4f56'); gr.addColorStop(0.5, '#9aa0a8'); gr.addColorStop(1, '#3a3e44');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(u.x - 55, u.y); ctx.lineTo(u.x - 38, u.y - 170); ctx.lineTo(u.x + 38, u.y - 170); ctx.lineTo(u.x + 55, u.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = u.team === pt ? '#c9a24a' : '#8a3a3a'; ctx.fillRect(u.x - 48, u.y - 60, 96, 14); ctx.fillRect(u.x - 42, u.y - 130, 84, 12);
    const glow = u.team === pt ? '#6ac0ff' : '#ff5050';
    ctx.shadowColor = glow; ctx.shadowBlur = 40;
    ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(u.x, u.y - 250 + Math.sin(T * 2) * 6); ctx.lineTo(u.x + 26, u.y - 195); ctx.lineTo(u.x, u.y - 170); ctx.lineTo(u.x - 26, u.y - 195); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    if (g.isInvuln(u)) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(u.x, u.y - 100, 130, 0, 7); ctx.stroke(); }
    if (hover || (g.player.alive && Math.hypot(g.player.x - u.x, g.player.y - u.y) < 1100 && u.team !== pt)) { ctx.strokeStyle = u.team === pt ? 'rgba(100,180,255,0.35)' : 'rgba(255,60,60,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(u.x, u.y, 775, 0, 7); ctx.stroke(); }
  } else if (u.kind === 'inhib') {
    ctx.fillStyle = '#444a52'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 130, 85, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#23262a'; ctx.lineWidth = 6; ctx.stroke();
    if (u.alive) {
      const c = u.team === pt ? '#5ab4ff' : '#ff5a6a';
      ctx.shadowColor = c; ctx.shadowBlur = 50; ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(u.x, u.y - 30, 70, 55, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(u.x - 15, u.y - 45, 25, 18, 0, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(u.x, u.y - 30, 100, 30, T, 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(u.x, u.y - 20, 60, 40, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ddd'; ctx.font = 'bold 60px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(u.respawnAt - g.time) + '', u.x, u.y - 100);
    }
  } else if (u.kind === 'nexus') {
    const c = u.team === pt ? '#4aa8ff' : '#ff4a5a';
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(u.x + 30, u.y + 20, 230, 140, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#50565e'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 220, 140, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a2d31'; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = '#6a7078'; ctx.beginPath(); ctx.ellipse(u.x, u.y - 10, 160, 100, 0, 0, 7); ctx.fill();
    if (u.alive) {
      ctx.shadowColor = c; ctx.shadowBlur = 70; ctx.fillStyle = c;
      const bob = Math.sin(T * 1.5) * 12;
      ctx.beginPath(); ctx.moveTo(u.x, u.y - 330 + bob); ctx.lineTo(u.x + 80, u.y - 170 + bob); ctx.lineTo(u.x, u.y - 60 + bob); ctx.lineTo(u.x - 80, u.y - 170 + bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(u.x, u.y - 320 + bob); ctx.lineTo(u.x + 25, u.y - 180 + bob); ctx.lineTo(u.x - 40, u.y - 170 + bob); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = c; ctx.lineWidth = 5;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(u.x, u.y - 170 + bob, 150, 40, T * (i ? 1 : -1) * 0.5, 0, 7); ctx.stroke(); }
    }
  } else if (u.kind === 'champion') {
    const R = 58;
    const kup = u.buffs.some(b => b.knockup) ? 40 : 0;
    let lx = 0, ly = 0;
    if (u.animT > 0 && !u.ranged) { const k = Math.sin((1 - u.animT / 0.35) * Math.PI) * 18; lx = Math.cos(u.facing) * k; ly = Math.sin(u.facing) * k; }
    const x = u.x + lx, y = u.y + ly - kup;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(u.x, u.y + 30, R * 0.95, R * 0.45, 0, 0, 7); ctx.fill();
    if (u.recall) {
      const p = 1 - u.recall.t / u.recall.max;
      ctx.strokeStyle = '#7ab8ff'; ctx.lineWidth = 6; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(u.x, u.y + 20 - i * 40 * p, 90 - i * 15, 30 - i * 5, 0, T * 3 + i, T * 3 + i + 4); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (hover) { ctx.strokeStyle = u.team === pt ? '#8ad0ff' : '#ff6060'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(u.x, u.y + 30, R + 12, R * 0.55, 0, 0, 7); ctx.stroke(); }
    // facing wedge
    ctx.fillStyle = u === g.player ? '#ffd760' : tc;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(u.facing) * (R + 22), y + Math.sin(u.facing) * (R + 22)); ctx.lineTo(x + Math.cos(u.facing + 0.35) * (R + 2), y + Math.sin(u.facing + 0.35) * (R + 2)); ctx.lineTo(x + Math.cos(u.facing - 0.35) * (R + 2), y + Math.sin(u.facing - 0.35) * (R + 2)); ctx.fill();
    const im = img(champIcon(u.champId));
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.clip();
    if (ready(im)) ctx.drawImage(im, x - R * 1.12, y - R * 1.12, R * 2.24, R * 2.24); else { ctx.fillStyle = u.def!.color; ctx.fill(); }
    if (u.buffs.some(b => b.stasis)) { ctx.fillStyle = 'rgba(255,210,80,0.55)'; ctx.fill(); }
    ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = u === g.player ? '#f0c850' : tc; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(x, y, R + 4, 0, 7); ctx.stroke();
    if (u.animT > 0 && u.ranged) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R + 10, u.facing - 0.6, u.facing + 0.6); ctx.stroke(); }
    drawStatus(ctx, g, u, x, y, R);
  } else if (u.kind === 'minion') {
    const r = u.r;
    const base = u.team === pt ? ['#3a6fd0', '#9cc4ff', '#1d3b75'] : ['#c03a3a', '#ffb0a0', '#6a1a1a'];
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(u.x, u.y + r * 0.5, r, r * 0.45, 0, 0, 7); ctx.fill();
    const bob = u.animT > 0 ? Math.sin(u.animT * 20) * 4 : 0;
    ctx.translate(u.x, u.y - 10 + bob);
    if (u.mtype === 'siege') {
      ctx.rotate(u.facing);
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4);
      ctx.fillStyle = base[0]; ctx.fillRect(-r * 0.8, -r * 0.5, r * 1.3, r);
      ctx.fillStyle = '#333'; ctx.fillRect(r * 0.2, -r * 0.18, r * 1.1, r * 0.36);
      ctx.fillStyle = '#222'; for (const [wx, wy] of [[-r * 0.6, -r * 0.8], [r * 0.5, -r * 0.8], [-r * 0.6, r * 0.8], [r * 0.5, r * 0.8]]) { ctx.beginPath(); ctx.arc(wx, wy, r * 0.28, 0, 7); ctx.fill(); }
    } else {
      const big = u.mtype === 'super';
      const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      gr.addColorStop(0, base[1]); gr.addColorStop(0.6, base[0]); gr.addColorStop(1, base[2]);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * (big ? 1 : 0.8), 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.rotate(u.facing);
      if (u.mtype === 'caster') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.lineTo(r * 1.1, r * 0.5); ctx.stroke(); ctx.fillStyle = u.team === pt ? '#9ef' : '#fa8'; ctx.shadowColor = ctx.fillStyle as string; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(r * 1.15, r * 0.5, 7, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
      else { ctx.fillStyle = '#ccc'; ctx.fillRect(r * 0.4, -r * 0.9, r * 0.15, r * 1.1); ctx.fillStyle = base[2]; ctx.beginPath(); ctx.ellipse(r * 0.55, r * 0.45, r * 0.25, r * 0.5, 0, 0, 7); ctx.fill(); }
      if (big) { ctx.fillStyle = '#ddd'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a + 0.2) * r * 1.3, Math.sin(a + 0.2) * r * 1.3); ctx.lineTo(Math.cos(a + 0.4) * r, Math.sin(a + 0.4) * r); ctx.fill(); } }
    }
  } else if (u.kind === 'monster') {
    drawMonster(ctx, u, T);
    if (hover) { ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(u.x, u.y, u.r + 12, 0, 7); ctx.stroke(); }
  } else if (u.kind === 'pet') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(u.x, u.y + 30, 70, 30, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.arc(u.x, u.y - 10, u.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(u.x - 30, u.y - 55, 16, 0, 7); ctx.arc(u.x + 30, u.y - 55, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff7a2a'; ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 25; ctx.beginPath(); ctx.arc(u.x - 14, u.y - 20, 6, 0, 7); ctx.arc(u.x + 14, u.y - 20, 6, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(u.x, u.y, 280, 0, 7); ctx.fill();
  } else if (u.kind === 'ward') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(u.x, u.y + 8, 22, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8c060'; ctx.shadowColor = '#ffe070'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(u.x, u.y - 50); ctx.lineTo(u.x + 12, u.y); ctx.lineTo(u.x - 12, u.y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(u.x, u.y - 52, 9 + Math.sin(T * 4) * 2, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawStatus(ctx: CanvasRenderingContext2D, g: Game, u: Unit, x: number, y: number, R: number) {
  const T = g.time;
  if (u.shields.length) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R + 12, 0, 7); ctx.stroke(); }
  if (u.buffs.some(b => b.stun || b.knockup)) { ctx.fillStyle = '#ffe060'; for (let i = 0; i < 3; i++) { const a = T * 5 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 40, y - R - 20 + Math.sin(a) * 12, 7, 0, 7); ctx.fill(); } }
  if (u.buffs.some(b => b.root)) { ctx.strokeStyle = '#fff7a0'; ctx.lineWidth = 5; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.ellipse(u.x, u.y + 28, R + 8, R * 0.45, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (u.buffs.some(b => b.slow && b.debuff)) { ctx.fillStyle = 'rgba(120,190,255,0.25)'; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); }
  if (u.buffs.some(b => b.charm)) { ctx.fillStyle = '#ff7ad2'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♥', x, y - R - 15 + Math.sin(T * 8) * 5); }
  if (u.buffs.some(b => b.silence)) { ctx.fillStyle = '#c090ff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✕', x + R, y - R); }
  if (u.buffs.some(b => b.id === 'redBuff')) { ctx.fillStyle = 'rgba(255,80,40,0.5)'; ctx.beginPath(); ctx.arc(x - R * 0.7, y + R * 0.7, 10, 0, 7); ctx.fill(); }
  if (u.buffs.some(b => b.id === 'blueBuff')) { ctx.fillStyle = 'rgba(60,140,255,0.7)'; ctx.beginPath(); ctx.arc(x + R * 0.7, y + R * 0.7, 10, 0, 7); ctx.fill(); }
  if (g.baronBuffUntil[u.team as 0 | 1] > g.time) { ctx.strokeStyle = 'rgba(170,90,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R + 18 + Math.sin(T * 4) * 3, 0, 7); ctx.stroke(); }
  if (u.data.aura) { ctx.strokeStyle = 'rgba(120,230,140,0.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(u.x, u.y, 330, 0, 7); ctx.stroke(); }
}

function drawMonster(ctx: CanvasRenderingContext2D, u: Unit, T: number) {
  const r = u.r, x = u.x, y = u.y;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.5, r * 1.1, r * 0.5, 0, 0, 7); ctx.fill();
  const t = u.mtype;
  const body = (c1: string, c2: string, rr = r) => { const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 2, x, y, rr); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - rr * 0.2, rr, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.stroke(); };
  const eyes = (c: string, dy = -0.35, sp = 0.3) => { ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(x - r * sp, y + r * dy, r * 0.1, 0, 7); ctx.arc(x + r * sp, y + r * dy, r * 0.1, 0, 7); ctx.fill(); ctx.shadowBlur = 0; };
  if (t === 'dragon') {
    ctx.fillStyle = shade(u.color, -30);
    const flap = Math.sin(T * 4) * 0.25;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - r * 0.3); ctx.lineTo(x + s * r * 2.1, y - r * (1.2 + flap)); ctx.lineTo(x + s * r * 1.6, y - r * 0.1); ctx.lineTo(x + s * r * 1.9, y + r * 0.4); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = shade(u.color, -40); ctx.lineWidth = r * 0.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + r * 0.3); ctx.quadraticCurveTo(x + r * 0.9, y + r * 1.2, x + r * 0.2 + Math.sin(T * 2) * 20, y + r * 1.6); ctx.stroke();
    body(shade(u.color, 50), shade(u.color, -30));
    ctx.fillStyle = shade(u.color, -20); ctx.beginPath(); ctx.ellipse(x, y - r * 0.95, r * 0.45, r * 0.4, 0, 0, 7); ctx.fill();
    eyes('#ffe060', -1.0, 0.2);
  } else if (t === 'baron') {
    ctx.strokeStyle = '#4a2a80'; ctx.lineWidth = 22; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.sin(T + i) * 0.15; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3 - 30, x + Math.cos(a + 0.3) * r * 1.7, y + Math.sin(a + 0.3) * r * 1.5); ctx.stroke(); }
    body('#b080ff', '#3a1a6a');
    ctx.fillStyle = '#e0d0ff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.4 + i * r * 0.2, y - r * 0.9); ctx.lineTo(x - r * 0.3 + i * r * 0.2, y - r * 1.5); ctx.lineTo(x - r * 0.2 + i * r * 0.2, y - r * 0.9); ctx.fill(); }
    eyes('#ff60ff', -0.5, 0.35);
  } else if (t === 'blue' || t === 'red') {
    body(t === 'blue' ? '#8ab8ff' : '#ff9a7a', t === 'blue' ? '#1a3a7a' : '#6a1a0a');
    ctx.fillStyle = t === 'blue' ? '#5ab0ff' : '#ff5a2a'; ctx.shadowColor = ctx.fillStyle as string; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.3 + Math.sin(T * 3) * 4, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = t === 'blue' ? '#2a4a8a' : '#7a2a1a'; ctx.beginPath(); ctx.arc(x - r * 0.9, y - r * 0.1, r * 0.35, 0, 7); ctx.arc(x + r * 0.9, y - r * 0.1, r * 0.35, 0, 7); ctx.fill();
    eyes('#fff', -0.7);
  } else if (t === 'gromp') {
    body('#a0d070', '#3a5a20'); eyes('#ffe040', -0.55, 0.45);
    ctx.fillStyle = '#e8d060'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - r * 0.5 + i * r * 0.25, y + r * 0.1, 5, 0, 7); ctx.fill(); }
  } else if (t.startsWith('wolf')) {
    body('#aab4c8', '#3a4050'); ctx.fillStyle = '#3a4050'; ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.8); ctx.lineTo(x - r * 0.3, y - r * 1.4); ctx.lineTo(x - r * 0.1, y - r * 0.9); ctx.moveTo(x + r * 0.6, y - r * 0.8); ctx.lineTo(x + r * 0.3, y - r * 1.4); ctx.lineTo(x + r * 0.1, y - r * 0.9); ctx.fill(); eyes('#7af', -0.4);
  } else if (t.startsWith('raptor')) {
    body(t === 'raptor' ? '#ffffff' : '#f0c0a0', t === 'raptor' ? '#909090' : '#a05040'); ctx.fillStyle = '#e04030'; ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 0.2, y - r * 0.6); ctx.lineTo(x - r * 0.2, y - r * 0.6); ctx.fill(); eyes('#000', -0.4, 0.25);
  } else {
    body('#b8a080', '#4a3a28'); ctx.fillStyle = '#6a5a48'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - r * 0.5 + i * r * 0.33, y - r * 0.7, r * 0.18, 0, 7); ctx.fill(); } eyes('#ffa040', -0.3);
  }
}
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function drawBars(ctx: CanvasRenderingContext2D, g: Game, u: Unit) {
  const pt = g.playerTeam;
  const ally = u.team === pt;
  if (u.kind === 'champion') {
    const w = 150, h = 16, x = u.x - w / 2 + 12, y = u.y - 118 - (u.buffs.some(b => b.knockup) ? 40 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(x - 30, y - 3, w + 33, h + 12);
    ctx.fillStyle = '#111'; ctx.fillRect(x - 28, y - 1, 24, h + 8);
    ctx.fillStyle = '#e8d9a8'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(u.level + '', x - 16, y + 16);
    const tot = Math.max(u.maxHp, u.hp + g.shieldTotal(u));
    const hw = w * u.hp / tot, sw = w * g.shieldTotal(u) / tot;
    const col = u === g.player ? '#3cc83c' : ally ? '#2f8fe8' : '#d83030';
    const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, shadeCol(col, 40)); gr.addColorStop(1, col);
    ctx.fillStyle = gr; ctx.fillRect(x, y, hw, h);
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x + hw, y, sw, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5;
    const tick = w * 100 / tot;
    if (tick > 2.5) for (let i = 1; i * 100 < tot; i++) { const tx = x + i * tick; ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + (i % 10 === 0 ? h : h * 0.5)); ctx.stroke(); }
    if (u.maxMana > 0) { ctx.fillStyle = '#1a2a4a'; ctx.fillRect(x, y + h + 2, w, 5); ctx.fillStyle = u.champId === 'Garen' ? '#888' : '#3a8aff'; ctx.fillRect(x, y + h + 2, w * u.mana / u.maxMana, 5); }
    ctx.font = 'bold 17px "Microsoft YaHei", sans-serif'; ctx.fillStyle = ally ? '#bfe0ff' : '#ffc0c0'; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3;
    ctx.strokeText(u.name, u.x, y - 10); ctx.fillText(u.name, u.x, y - 10);
    if (u.recall) { const p = 1 - u.recall.t / u.recall.max; ctx.fillStyle = '#000a'; ctx.fillRect(u.x - 60, u.y + 70, 120, 10); ctx.fillStyle = '#6ab0ff'; ctx.fillRect(u.x - 60, u.y + 70, 120 * p, 10); }
  } else if (u.isStructure) {
    if (!u.alive) return;
    const w = u.kind === 'nexus' ? 260 : 190, h = 14, x = u.x - w / 2, y = u.y - (u.kind === 'turret' ? 290 : u.kind === 'nexus' ? 370 : 150);
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = ally ? '#2f8fe8' : '#d83030'; ctx.fillRect(x, y, w * u.hp / u.maxHp, h);
  } else {
    if (u.hp >= u.maxHp && u.kind === 'monster' && !u.target) return;
    const w = u.kind === 'monster' ? Math.min(200, 60 + u.r) : u.mtype === 'siege' ? 80 : 60, h = u.kind === 'monster' && u.r > 100 ? 12 : 7;
    const x = u.x - w / 2, y = u.y - u.r - 40;
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = u.team === 2 ? '#e8a030' : ally ? '#4a9aee' : '#e04040';
    ctx.fillRect(x, y, w * Math.max(0, u.hp) / u.maxHp, h);
    if (u.kind === 'monster' && u.r > 70) { ctx.font = 'bold 18px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd890'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(u.name, u.x, y - 8); ctx.fillText(u.name, u.x, y - 8); }
  }
}
function shadeCol(hex: string, amt: number) { return shade(hex, amt); }

// ---------------- minimap ----------------
export function drawMinimap(ctx: CanvasRenderingContext2D, g: Game, size: number, cam: Cam) {
  const s = size / W;
  const pt = g.playerTeam;
  ctx.clearRect(0, 0, size, size);
  if (mapImage) ctx.drawImage(mapImage, 0, 0, size, size);
  // fog
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.rect(0, 0, size, size);
  for (const u of g.units) {
    if (!u.alive || u.team !== pt || u.kind === 'inhib' || u.kind === 'nexus') continue;
    const r = (u.kind === 'champion' ? 1200 : u.kind === 'turret' ? 1350 : u.kind === 'ward' ? 900 : 1000) * s;
    ctx.moveTo(u.x * s + r, u.y * s); ctx.arc(u.x * s, u.y * s, r, 0, Math.PI * 2, true);
  }
  ctx.fill('evenodd');
  ctx.restore();
  // camps
  for (const cp of g.camps) {
    const c = cp.def; const x = c.x * s, y = c.y * s;
    if (cp.alive) {
      ctx.fillStyle = c.id === 'baron' ? '#b07aff' : c.id === 'dragon' ? '#ff8a3a' : c.id.includes('blue') ? '#5ab0ff' : c.id.includes('red') ? '#ff5a3a' : '#e0c080';
      ctx.beginPath(); ctx.arc(x, y, c.side === 2 ? 6 : 3.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    } else if (cp.spawnAt - g.time < 60 && c.side !== 2) { ctx.fillStyle = '#aaa'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(cp.spawnAt - g.time) + '', x, y + 3); }
  }
  // structures
  for (const st of g.structs) {
    if (!st.alive) continue;
    const x = st.x * s, y = st.y * s;
    ctx.fillStyle = st.team === pt ? '#3aa0ff' : '#ff4040';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    if (st.kind === 'turret') { ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x - 4, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (st.kind === 'inhib') { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  // minions
  for (const u of g.units) {
    if (!u.alive || (u.kind !== 'minion' && u.kind !== 'pet')) continue;
    if (u.team !== pt && !u.vis[pt]) continue;
    ctx.fillStyle = u.team === pt ? '#6ab8ff' : '#ff6a6a';
    ctx.fillRect(u.x * s - 1.5, u.y * s - 1.5, 3, 3);
  }
  for (const u of g.units) if (u.alive && u.kind === 'ward' && u.team === pt) { ctx.fillStyle = '#ffe060'; ctx.beginPath(); ctx.arc(u.x * s, u.y * s, 2.5, 0, 7); ctx.fill(); }
  // champions
  const ch = [...g.champs].sort((a) => (a === g.player ? 1 : 0));
  for (const c of ch) {
    if (!c.alive) continue;
    if (c.team !== pt && !c.vis[pt]) continue;
    const r = c === g.player ? 11 : 9;
    const x = c.x * s, y = c.y * s;
    const im = img(champIcon(c.champId));
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    if (ready(im)) ctx.drawImage(im, x - r, y - r, r * 2, r * 2); else { ctx.fillStyle = c.def!.color; ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = c === g.player ? '#f0c850' : c.team === pt ? '#3aa0ff' : '#ff3a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  }
  for (const v of g.visions) if (v.team === pt) { ctx.strokeStyle = 'rgba(120,200,255,0.6)'; ctx.beginPath(); ctx.arc(v.x * s, v.y * s, v.r * s, 0, 7); ctx.stroke(); }
  // camera rect
  const vw = cam.w / cam.zoom, vh = cam.h / cam.zoom;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
  ctx.strokeRect((cam.x - vw / 2) * s, (cam.y - vh / 2) * s, vw * s, vh * s);
}
