import mapUrl from '../assets/map11.png';
import type { Vec } from './types';

export const W = 14870;
export const MAPURL: string = mapUrl;
export const GRID = 256;
export const CELL = W / GRID;
export const IMG = 512;

// classes: 0 wall, 1 ground, 2 river, 3 base
export let cls: Uint8Array = new Uint8Array(IMG * IMG);
export let walk: Uint8Array = new Uint8Array(GRID * GRID);
export let mapImage: HTMLImageElement | null = null;

// real LoL coords (y up) -> our coords (y down)
export const R = (x: number, y: number): Vec => ({ x, y: W - y });
export const mirror = (p: Vec): Vec => ({ x: W - p.x, y: W - p.y });

export function loadMap(): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      mapImage = img;
      const cv = document.createElement('canvas');
      cv.width = IMG; cv.height = IMG;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(img, 0, 0, IMG, IMG);
      const d = ctx.getImageData(0, 0, IMG, IMG).data;
      for (let i = 0; i < IMG * IMG; i++) {
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        const s = r + g + b;
        let c = 1;
        if (s < 110) c = 0;
        else if (b > 150 && r < 100) c = 2;
        else if (b > 115 && g < 150 && Math.abs(g - b) < 45 && r < 135) c = 3;
        else if (r > 110 && b > 80 && g < 120) c = 3; // red fountain tint
        cls[i] = c;
      }
      for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
        let n = 0;
        for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) if (cls[(gy * 2 + oy) * IMG + gx * 2 + ox] !== 0) n++;
        walk[gy * GRID + gx] = n >= 2 ? 1 : 0;
      }
      res(img);
    };
    img.onerror = rej;
    img.src = mapUrl;
  });
}

export const clsAt = (x: number, y: number) => {
  const ix = Math.floor(x / W * IMG), iy = Math.floor(y / W * IMG);
  if (ix < 0 || iy < 0 || ix >= IMG || iy >= IMG) return 0;
  return cls[iy * IMG + ix];
};
export const cellOf = (x: number, y: number) => [Math.floor(x / CELL), Math.floor(y / CELL)];
export const isWalk = (x: number, y: number) => {
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return false;
  return walk[gy * GRID + gx] === 1;
};

export function nearestWalkable(x: number, y: number): Vec {
  if (isWalk(x, y)) return { x, y };
  const [cx, cy] = cellOf(x, y);
  for (let r = 1; r < 40; r++) {
    let best: Vec | null = null, bd = 1e18;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      const gx = cx + dx, gy = cy + dy;
      if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;
      if (walk[gy * GRID + gx]) {
        const px = (gx + 0.5) * CELL, py = (gy + 0.5) * CELL;
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < bd) { bd = d; best = { x: px, y: py }; }
      }
    }
    if (best) return best;
  }
  return { x, y };
}

// ---------- A* pathfinding ----------
const N = GRID * GRID;
const gScore = new Float32Array(N);
const came = new Int32Array(N);
const seen = new Uint32Array(N);
const closed = new Uint32Array(N);
let gen = 1;
const heap: number[] = []; const heapF: number[] = [];
function hpush(n: number, f: number) {
  heap.push(n); heapF.push(f);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapF[p] <= heapF[i]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]]; [heapF[p], heapF[i]] = [heapF[i], heapF[p]];
    i = p;
  }
}
function hpop(): number {
  const top = heap[0];
  const ln = heap.pop()!, lf = heapF.pop()!;
  if (heap.length) {
    heap[0] = ln; heapF[0] = lf;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1, r = l + 1; let m = i;
      if (l < heap.length && heapF[l] < heapF[m]) m = l;
      if (r < heap.length && heapF[r] < heapF[m]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]]; [heapF[m], heapF[i]] = [heapF[i], heapF[m]];
      i = m;
    }
  }
  return top;
}

export function lineWalkable(ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(d / (CELL * 0.4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isWalk(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

export function findPath(sx: number, sy: number, tx: number, ty: number): Vec[] {
  const t = nearestWalkable(tx, ty);
  tx = t.x; ty = t.y;
  if (lineWalkable(sx, sy, tx, ty)) return [{ x: tx, y: ty }];
  const s0 = nearestWalkable(sx, sy);
  const [sgx, sgy] = cellOf(s0.x, s0.y);
  const [tgx, tgy] = cellOf(tx, ty);
  gen++;
  heap.length = 0; heapF.length = 0;
  const start = sgy * GRID + sgx, goal = tgy * GRID + tgx;
  gScore[start] = 0; seen[start] = gen; came[start] = -1;
  hpush(start, 0);
  let found = false, iter = 0;
  while (heap.length && iter++ < 40000) {
    const cur = hpop();
    if (cur === goal) { found = true; break; }
    if (closed[cur] === gen) continue;
    closed[cur] = gen;
    const cx = cur % GRID, cy = (cur / GRID) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      const ni = ny * GRID + nx;
      if (!walk[ni] || closed[ni] === gen) continue;
      if (dx && dy && (!walk[cy * GRID + nx] || !walk[ny * GRID + cx])) continue;
      const cost = gScore[cur] + (dx && dy ? 1.4142 : 1);
      if (seen[ni] !== gen || cost < gScore[ni]) {
        seen[ni] = gen; gScore[ni] = cost; came[ni] = cur;
        const h = Math.hypot(nx - tgx, ny - tgy);
        hpush(ni, cost + h * 1.05);
      }
    }
  }
  if (!found) return [{ x: tx, y: ty }];
  const raw: Vec[] = [];
  let c = goal;
  while (c !== -1 && c !== start) { raw.push({ x: (c % GRID + 0.5) * CELL, y: (((c / GRID) | 0) + 0.5) * CELL }); c = came[c]; }
  raw.reverse();
  raw[raw.length - 1] = { x: tx, y: ty };
  // string pulling
  const out: Vec[] = [];
  let ax = sx, ay = sy, i = 0;
  while (i < raw.length) {
    let j = raw.length - 1;
    while (j > i && !lineWalkable(ax, ay, raw[j].x, raw[j].y)) j--;
    out.push(raw[j]);
    ax = raw[j].x; ay = raw[j].y; i = j + 1;
  }
  return out;
}

// ---------- Layout (Summoner's Rift, real coordinates) ----------
export interface StructDef { kind: 'turret' | 'inhib' | 'nexus'; team: 0 | 1; lane: number; tier: number; x: number; y: number }

const blueStructs: Omit<StructDef, 'team'>[] = [
  { kind: 'turret', lane: 0, tier: 1, ...R(981, 10441) },
  { kind: 'turret', lane: 0, tier: 2, ...R(1512, 6699) },
  { kind: 'turret', lane: 0, tier: 3, ...R(1169, 4287) },
  { kind: 'turret', lane: 1, tier: 1, ...R(5846, 6396) },
  { kind: 'turret', lane: 1, tier: 2, ...R(5048, 4812) },
  { kind: 'turret', lane: 1, tier: 3, ...R(3651, 3696) },
  { kind: 'turret', lane: 2, tier: 1, ...R(10504, 1029) },
  { kind: 'turret', lane: 2, tier: 2, ...R(6919, 1483) },
  { kind: 'turret', lane: 2, tier: 3, ...R(4281, 1253) },
  { kind: 'turret', lane: 1, tier: 4, ...R(1748, 2270) },
  { kind: 'turret', lane: 1, tier: 4, ...R(2177, 1807) },
  { kind: 'inhib', lane: 0, tier: 0, ...R(1171, 3571) },
  { kind: 'inhib', lane: 1, tier: 0, ...R(3203, 3208) },
  { kind: 'inhib', lane: 2, tier: 0, ...R(3452, 1236) },
  { kind: 'nexus', lane: 1, tier: 0, ...R(1551, 1661) },
];
export const STRUCTS: StructDef[] = [
  ...blueStructs.map(s => ({ ...s, team: 0 as const })),
  ...blueStructs.map(s => ({ ...s, ...mirror(s), team: 1 as const })),
];

export const FOUNTAIN = [R(420, 420), mirror(R(420, 420))];
export const NEXUS = [R(1551, 1661), mirror(R(1551, 1661))];

const topReal: [number, number][] = [[1551, 1661], [1180, 3000], [1250, 5000], [1250, 7500], [1150, 10000], [1250, 11800], [1800, 12950], [3000, 13550], [5500, 13600], [8000, 13500], [10500, 13600], [12000, 13450]];
const botReal: [number, number][] = topReal.map(([x, y]) => [y, x]);
function lanePath(pts: [number, number][]): Vec[] {
  const a = pts.map(([x, y]) => R(x, y));
  const end = mirror(NEXUS[0]);
  return [...a, end];
}
export const LANES: Vec[][] = [
  lanePath(topReal),
  [NEXUS[0], R(3200, 3300), R(5000, 5000), R(7435, 7435), R(9870, 9870), NEXUS[1]],
  lanePath(botReal),
];

export interface CampDef { id: string; name: string; x: number; y: number; monsters: { type: string; dx: number; dy: number }[]; respawn: number; first: number; side: number }
const blueCamps = [
  { id: 'blue', name: '蓝色岗哨', ...R(3821, 7901), monsters: [{ type: 'blue', dx: 0, dy: 0 }], respawn: 300, first: 90 },
  { id: 'gromp', name: '魔沼蛙', ...R(2288, 8448), monsters: [{ type: 'gromp', dx: 0, dy: 0 }], respawn: 135, first: 102 },
  { id: 'wolves', name: '暗影狼', ...R(3783, 6495), monsters: [{ type: 'wolf', dx: 0, dy: 0 }, { type: 'wolfs', dx: -120, dy: 90 }, { type: 'wolfs', dx: 110, dy: 110 }], respawn: 135, first: 90 },
  { id: 'raptors', name: '锋喙鸟', ...R(7061, 5325), monsters: [{ type: 'raptor', dx: 0, dy: 0 }, { type: 'raptors', dx: -110, dy: -80 }, { type: 'raptors', dx: 100, dy: -90 }, { type: 'raptors', dx: 0, dy: 120 }], respawn: 135, first: 90 },
  { id: 'red', name: '红色树精', ...R(7765, 4020), monsters: [{ type: 'red', dx: 0, dy: 0 }], respawn: 300, first: 90 },
  { id: 'krugs', name: '石甲虫', ...R(8394, 2641), monsters: [{ type: 'krug', dx: 0, dy: 0 }, { type: 'krugs', dx: 130, dy: 60 }], respawn: 135, first: 102 },
];
export const CAMPS: CampDef[] = [
  ...blueCamps.map(c => ({ ...c, side: 0 })),
  ...blueCamps.map(c => ({ ...c, ...mirror(c), id: 'r_' + c.id, side: 1, monsters: c.monsters.map(m => ({ ...m, dx: -m.dx, dy: -m.dy })) })),
  { id: 'dragon', name: '元素巨龙', ...R(9866, 4414), monsters: [{ type: 'dragon', dx: 0, dy: 0 }], respawn: 300, first: 300, side: 2 },
  { id: 'baron', name: '纳什男爵', ...mirror(R(9866, 4414)), monsters: [{ type: 'baron', dx: 0, dy: 0 }], respawn: 360, first: 1200, side: 2 },
];

export interface Bush { x: number; y: number; rx: number; ry: number; rot: number }
const blueBushes: [number, number, number, number, number][] = [
  [1500, 12350, 170, 330, 0.2], [2100, 13050, 260, 150, 0.6], [2750, 13600, 150, 120, 0],
  [3300, 7050, 140, 260, 0.5], [2700, 9500, 260, 150, 0.4], [4400, 8200, 150, 240, 0.3],
  [6500, 4700, 170, 230, 0.8], [7100, 3100, 250, 140, 0.3], [9000, 2250, 150, 230, 0.4],
  [10300, 3100, 240, 150, 0.8], [11700, 3700, 200, 150, 0.3], [12350, 1500, 330, 170, 0.2],
  [13050, 2100, 150, 260, 0.6], [5600, 7400, 150, 210, 0.8], [6250, 8350, 150, 240, 0.8],
  [8900, 5800, 200, 140, 0.7], [4900, 5900, 150, 150, 0.5],
];
export const BUSHES: Bush[] = [];
export function buildBushes() {
  BUSHES.length = 0;
  for (const [x, y, rx, ry, rot] of blueBushes) {
    for (const p of [R(x, y), mirror(R(x, y))]) {
      let ok = 0, tot = 0;
      for (let a = 0; a < 12; a++) for (const f of [0, 0.5, 0.9]) {
        tot++;
        if (isWalk(p.x + Math.cos(a) * rx * f, p.y + Math.sin(a) * ry * f)) ok++;
      }
      if (ok / tot > 0.7) BUSHES.push({ x: p.x, y: p.y, rx, ry, rot });
    }
  }
}
export function bushAt(x: number, y: number): number {
  for (let i = 0; i < BUSHES.length; i++) {
    const b = BUSHES[i];
    const dx = x - b.x, dy = y - b.y;
    const c = Math.cos(-b.rot), s = Math.sin(-b.rot);
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    if ((lx / b.rx) ** 2 + (ly / b.ry) ** 2 <= 1) return i;
  }
  return -1;
}
