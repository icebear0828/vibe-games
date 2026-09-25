export type Ctx = CanvasRenderingContext2D;

export function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill?: string | CanvasGradient, stroke?: string, lw = 2, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function circ(ctx: Ctx, x: number, y: number, r: number, fill?: string | CanvasGradient, stroke?: string, lw = 2) {
  ell(ctx, x, y, r, r, fill, stroke, lw);
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function radial(ctx: Ctx, x: number, y: number, r: number, c1: string, c2: string, ox = -0.35, oy = -0.4) {
  const g = ctx.createRadialGradient(x + r * ox, y + r * oy, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

export function linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function leaf(ctx: Ctx, x: number, y: number, len: number, w: number, ang: number, fill: string, stroke: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -w, len, 0);
  ctx.quadraticCurveTo(len * 0.45, w, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(len * 0.8, 0);
  ctx.globalAlpha *= 0.5;
  ctx.stroke();
  ctx.restore();
}

export function stem(ctx: Ctx, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w: number, color: string, outline: string) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.strokeStyle = outline;
  ctx.lineWidth = w + 3;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

export function shadow(ctx: Ctx, x: number, y: number, rx: number, ry = rx * 0.28, a = 0.28) {
  ell(ctx, x, y, rx, ry, `rgba(0,0,0,${a})`);
}

// ---------- color utils ----------
const mixCache = new Map<string, string>();
function hexToRgb(h: string): [number, number, number] {
  const v = h.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number) {
  const k = a + b + t;
  const c = mixCache.get(k);
  if (c) return c;
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
  mixCache.set(k, r);
  return r;
}

export function outlinedText(ctx: Ctx, text: string, x: number, y: number, size: number, fill: string, stroke = '#000', lw = 6, align: CanvasTextAlign = 'center') {
  ctx.font = `900 ${size}px "Arial Black", "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
