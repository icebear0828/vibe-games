import { TILE_NAMES, ATLAS_COLS, ATLAS_PX, tileIndex } from './tiles';
import { mulberry32 } from './noise';
import { BLOCKS, BlockDef } from './blocks';

type RGB = [number, number, number];
const S = 16;

class Tile {
  d = new Uint8ClampedArray(S * S * 4);
  r: () => number;
  constructor(seed: number) { this.r = mulberry32(seed * 7919 + 13); }
  set(x: number, y: number, c: RGB, a = 255) {
    x = ((x % S) + S) % S; y = ((y % S) + S) % S;
    const i = (y * S + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a;
  }
  get(x: number, y: number): RGB {
    x = ((x % S) + S) % S; y = ((y % S) + S) % S;
    const i = (y * S + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2]];
  }
  alpha(x: number, y: number) { return this.d[(y * S + x) * 4 + 3]; }
  setA(x: number, y: number, a: number) { this.d[(y * S + x) * 4 + 3] = a; }
  noise(base: RGB, v: number) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) this.set(x, y, mul(base, 1 + (this.r() - 0.5) * v));
  }
  palette(p: RGB[], w?: number[]) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) this.set(x, y, pick(p, this.r(), w));
  }
  clear() { this.d.fill(0); }
  ri(n: number) { return Math.floor(this.r() * n); }
}

function mul(c: RGB, f: number): RGB { return [c[0] * f, c[1] * f, c[2] * f]; }
function mix(a: RGB, b: RGB, t: number): RGB { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function pick(p: RGB[], r: number, w?: number[]): RGB {
  if (!w) return p[Math.floor(r * p.length)];
  let s = 0; for (const x of w) s += x;
  let t = r * s;
  for (let i = 0; i < p.length; i++) { t -= w[i]; if (t <= 0) return p[i]; }
  return p[p.length - 1];
}

// ---------- painters ----------
function stone(t: Tile, base: RGB = [127, 127, 127]) {
  t.noise(base, 0.12);
  for (let i = 0; i < 26; i++) {
    const x = t.ri(S), y = t.ri(S), len = 1 + t.ri(3);
    const f = t.r() < 0.55 ? 0.82 : 1.12;
    for (let k = 0; k < len; k++) t.set(x + k, y, mul(t.get(x + k, y), f));
  }
}
function dirt(t: Tile) {
  t.palette([[150, 108, 74], [134, 96, 67], [121, 85, 58], [96, 67, 45], [185, 133, 92], [110, 78, 52]], [3, 5, 4, 1.5, 0.6, 2]);
}
function grassTopGray(t: Tile) {
  t.palette([[172, 172, 172], [196, 196, 196], [210, 210, 210], [226, 226, 226], [150, 150, 150], [240, 240, 240]], [3, 4, 4, 3, 1.5, 1]);
}
const PLAINS_GRASS: RGB = [124, 189, 107];

function sideOverlay(t: Tile, top: (x: number, y: number) => RGB, tintC: RGB | null) {
  dirt(t);
  const depth: number[] = [];
  for (let x = 0; x < S; x++) depth[x] = 2 + (t.r() < 0.6 ? 1 : 0) + (t.r() < 0.35 ? 1 : 0) + (t.r() < 0.15 ? 1 : 0);
  for (let x = 0; x < S; x++) for (let y = 0; y < depth[x]; y++) {
    let c = top(x, y);
    if (tintC) c = [c[0] * tintC[0] / 255, c[1] * tintC[1] / 255, c[2] * tintC[2] / 255];
    t.set(x, y, c);
  }
}
function cobble(t: Tile, base = 128, mossy = false) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 11; i++) pts.push([t.r() * S, t.r() * S, 0.75 + t.r() * 0.45]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9, idx = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
        const dx = x + 0.5 - pts[i][0] - ox, dy = y + 0.5 - pts[i][1] - oy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) { d2 = d1; d1 = d; idx = i; } else if (d < d2) d2 = d;
      }
    }
    const edge = d2 - d1;
    let v = base * pts[idx][2] * (1 + (t.r() - 0.5) * 0.12);
    if (edge < 0.9) v = base * 0.45 + t.r() * 10;
    else if (edge < 1.7) v *= 0.85;
    let c: RGB = [v, v, v];
    if (mossy && t.r() < 0.35 + (edge < 1.5 ? 0.25 : 0)) c = mix(c, [70, 110, 40], 0.7);
    t.set(x, y, c);
  }
}
function planks(t: Tile, base: RGB) {
  const dark = mul(base, 0.62);
  for (let y = 0; y < S; y++) {
    const board = Math.floor(y / 4);
    const seam = (board * 5 + 3 + (board % 2) * 6) % S;
    for (let x = 0; x < S; x++) {
      let c = mul(base, 1 + (t.r() - 0.5) * 0.08);
      if (y % 4 === 3) c = mul(dark, 1 + (t.r() - 0.5) * 0.1);
      else if (x === seam) c = mul(base, 0.72);
      t.set(x, y, c);
    }
    if (y % 4 !== 3) for (let k = 0; k < 2; k++) {
      const gx = t.ri(S), gl = 2 + t.ri(5);
      for (let i = 0; i < gl; i++) t.set(gx + i, y, mul(t.get(gx + i, y), 0.88));
    }
  }
}
function logSide(t: Tile, base: RGB, birch = false) {
  const colv: number[] = [];
  for (let x = 0; x < S; x++) colv[x] = 0.8 + t.r() * 0.35;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.set(x, y, mul(base, colv[x] * (1 + (t.r() - 0.5) * 0.12)));
  if (!birch) {
    for (let i = 0; i < 7; i++) {
      const x = t.ri(S), y = t.ri(S), l = 2 + t.ri(5);
      for (let k = 0; k < l; k++) t.set(x, y + k, mul(base, 0.6));
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const x = t.ri(S), y = t.ri(S), l = 1 + t.ri(4);
      for (let k = 0; k < l; k++) t.set(x + k, y, [40 + t.r() * 20, 40, 38]);
      if (t.r() < 0.5) t.set(x + 1, y + 1, [60, 58, 55]);
    }
  }
}
function logTop(t: Tile, inner: RGB, ring: RGB, bark: RGB) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    let c: RGB;
    if (d > 6.6) c = mul(bark, 0.85 + t.r() * 0.3);
    else if (Math.floor(d) % 2 === 0 && d > 1.4) c = mul(ring, 0.95 + t.r() * 0.1);
    else c = mul(inner, 0.95 + t.r() * 0.1);
    t.set(x, y, c);
  }
}
function leavesTex(t: Tile) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = t.r();
    if (r < 0.2) { t.set(x, y, [60, 60, 60], 0); continue; }
    const v = r < 0.4 ? 110 : r < 0.75 ? 160 : 200 + t.r() * 30;
    t.set(x, y, [v, v, v]);
  }
}
function ore(t: Tile, cols: RGB[]) {
  stone(t);
  const n = 4 + t.ri(3);
  for (let i = 0; i < n; i++) {
    const cx = 2 + t.ri(12), cy = 2 + t.ri(12);
    const cnt = 2 + t.ri(4);
    for (let k = 0; k < cnt; k++) {
      const x = cx + t.ri(3) - 1, y = cy + t.ri(3) - 1;
      t.set(x, y, cols[k % cols.length]);
    }
  }
}
function wool(t: Tile, c: RGB) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const f = 1 + (t.r() - 0.5) * 0.1 + (((x + y) % 4 === 0) ? -0.05 : 0) + (((x - y + 16) % 5 === 0) ? 0.04 : 0);
    t.set(x, y, mul(c, f));
  }
}
function metal(t: Tile, c: RGB) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let f = 1 + (t.r() - 0.5) * 0.06;
    if (x === 0 || y === 0) f = 1.18;
    if (x === 15 || y === 15) f = 0.72;
    if ((x === 1 || y === 1) && x < 15 && y < 15) f = 1.08;
    t.set(x, y, mul(c, f));
  }
}
const FONT3x5: Record<string, string[]> = {
  T: ['111', '010', '010', '010', '010'],
  N: ['101', '111', '111', '111', '101'],
};
function crackTile(t: Tile, stage: number) {
  t.clear();
  const rr = mulberry32(4242);
  const walks: [number, number][][] = [];
  for (let w = 0; w < 10; w++) {
    const path: [number, number][] = [];
    let x = 8 + Math.floor((rr() - 0.5) * 6), y = 8 + Math.floor((rr() - 0.5) * 6);
    const len = 4 + Math.floor(rr() * 7);
    const dx = rr() < 0.5 ? -1 : 1, dy = rr() < 0.5 ? -1 : 1;
    for (let i = 0; i < len; i++) {
      path.push([x, y]);
      if (rr() < 0.5) x += dx; else y += dy;
      if (rr() < 0.2) { x += dx; y += dy; }
    }
    walks.push(path);
  }
  for (let w = 0; w <= stage; w++) for (const [x, y] of walks[w]) {
    if (x >= 0 && x < S && y >= 0 && y < S) t.set(x, y, [20, 20, 20], 200);
  }
}

function paint(name: string, t: Tile) {
  switch (name) {
    case 'grass_top': grassTopGray(t); break;
    case 'grass_side': {
      const g = new Tile(99); grassTopGray(g);
      sideOverlay(t, (x, y) => g.get(x, y), PLAINS_GRASS); break;
    }
    case 'dirt': dirt(t); break;
    case 'stone': stone(t); break;
    case 'cobblestone': cobble(t); break;
    case 'mossy_cobblestone': cobble(t, 128, true); break;
    case 'oak_planks': planks(t, [162, 130, 78]); break;
    case 'spruce_planks': planks(t, [115, 85, 49]); break;
    case 'birch_planks': planks(t, [196, 178, 123]); break;
    case 'oak_log': logSide(t, [106, 82, 48]); break;
    case 'oak_log_top': logTop(t, [176, 144, 88], [146, 116, 68], [98, 76, 44]); break;
    case 'birch_log': logSide(t, [216, 214, 208], true); break;
    case 'birch_log_top': logTop(t, [206, 190, 140], [176, 160, 110], [220, 218, 210]); break;
    case 'spruce_log': logSide(t, [60, 42, 24]); break;
    case 'spruce_log_top': logTop(t, [128, 96, 56], [104, 76, 44], [58, 40, 22]); break;
    case 'oak_leaves': case 'birch_leaves': case 'spruce_leaves': leavesTex(t); break;
    case 'sand': t.palette([[219, 207, 163], [212, 199, 153], [226, 215, 172], [200, 186, 140]], [5, 3, 2, 1]); break;
    case 'sandstone_top': t.palette([[220, 208, 162], [214, 201, 153], [226, 215, 170]]); break;
    case 'sandstone_bottom': t.palette([[210, 196, 150], [200, 186, 140], [218, 204, 158]]); break;
    case 'sandstone_side': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let c: RGB = [216, 203, 155];
        if (y < 3) c = [224, 212, 166];
        else if (y === 3 || y === 11) c = [190, 176, 128];
        else if (y > 12) c = [205, 190, 140];
        t.set(x, y, mul(c, 1 + (t.r() - 0.5) * 0.06));
      }
      break;
    }
    case 'gravel': {
      t.palette([[130, 125, 122], [100, 95, 93], [160, 155, 150], [120, 110, 105], [80, 77, 75], [145, 135, 130]]);
      for (let i = 0; i < 10; i++) {
        const x = t.ri(S), y = t.ri(S), c = pick([[90, 86, 84], [170, 164, 160], [110, 100, 95]], t.r());
        t.set(x, y, c); t.set(x + 1, y, c); t.set(x, y + 1, mul(c, 0.85));
      }
      break;
    }
    case 'water': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const w = Math.sin((x + y * 0.5) * 0.9) * 0.5 + 0.5;
        t.set(x, y, mix([36, 72, 190], [62, 108, 220], w * 0.6 + t.r() * 0.2));
      }
      break;
    }
    case 'glass': {
      t.clear();
      for (let i = 0; i < S; i++) {
        t.set(i, 0, [220, 236, 240]); t.set(i, 15, [190, 212, 220]);
        t.set(0, i, [220, 236, 240]); t.set(15, i, [190, 212, 220]);
      }
      const hl: [number, number][] = [[3, 4], [4, 3], [5, 2], [4, 5], [5, 4], [6, 3], [10, 11], [11, 10]];
      for (const [x, y] of hl) t.set(x, y, [240, 250, 255], 200);
      break;
    }
    case 'bedrock': {
      t.palette([[85, 85, 85], [50, 50, 50], [120, 120, 120], [30, 30, 30], [100, 100, 100]]);
      break;
    }
    case 'coal_ore': ore(t, [[30, 30, 30], [55, 55, 55], [20, 20, 20]]); break;
    case 'iron_ore': ore(t, [[216, 175, 147], [190, 140, 110], [230, 200, 175]]); break;
    case 'gold_ore': ore(t, [[252, 238, 75], [230, 190, 40], [255, 255, 160]]); break;
    case 'diamond_ore': ore(t, [[93, 236, 245], [40, 190, 200], [200, 255, 255]]); break;
    case 'redstone_ore': ore(t, [[255, 0, 0], [170, 0, 0], [255, 90, 90]]); break;
    case 'emerald_ore': ore(t, [[23, 221, 98], [0, 150, 50], [150, 255, 180]]); break;
    case 'snow': t.palette([[240, 251, 251], [232, 245, 247], [250, 255, 255], [222, 236, 240]], [4, 3, 3, 1]); break;
    case 'grass_snow_side': {
      const s = new Tile(77); s.palette([[240, 251, 251], [228, 240, 244], [250, 255, 255]]);
      sideOverlay(t, (x, y) => s.get(x, y), null); break;
    }
    case 'ice': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.set(x, y, mul([145, 183, 253], 1 + (t.r() - 0.5) * 0.08));
      for (let i = 0; i < 5; i++) { const x = t.ri(S), y = t.ri(S); for (let k = 0; k < 4; k++) t.set(x + k, y - k, [200, 225, 255]); }
      break;
    }
    case 'cactus_side': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let c: RGB = [88, 138, 44];
        if (x % 4 === 1) c = [60, 105, 30];
        if (x === 0 || x === 15) c = [50, 90, 25];
        t.set(x, y, mul(c, 1 + (t.r() - 0.5) * 0.1));
      }
      for (let i = 0; i < 10; i++) t.set(t.ri(S), t.ri(S), [200, 210, 160]);
      break;
    }
    case 'cactus_top': case 'cactus_bottom': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        let c: RGB = [95, 146, 50];
        if (d > 6.5) c = [55, 95, 28]; else if (Math.floor(d) % 3 === 0) c = [75, 125, 40];
        t.set(x, y, mul(c, 1 + (t.r() - 0.5) * 0.1));
      }
      break;
    }
    case 'bricks': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
        const mortar = y % 4 === 3 || (x + off) % 8 === 7;
        const c: RGB = mortar ? [168, 160, 152] : mul([150, 74, 58], 0.85 + t.r() * 0.3);
        t.set(x, y, mortar ? mul(c, 1 + (t.r() - 0.5) * 0.08) : c);
      }
      break;
    }
    case 'stone_bricks': {
      stone(t, [122, 122, 122]);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const top = y < 8;
        const yy = y % 8, seamX = top ? 15 : 7;
        if (yy === 7 || x === seamX) t.set(x, y, [72, 72, 72]);
        else if (yy === 0 || x === (seamX + 1) % 16) t.set(x, y, mul(t.get(x, y), 1.15));
        else if (yy === 6 || x === seamX - 1) t.set(x, y, mul(t.get(x, y), 0.85));
      }
      break;
    }
    case 'bookshelf': {
      planks(t, [162, 130, 78]);
      const cols: RGB[] = [[140, 40, 30], [40, 70, 140], [50, 110, 50], [150, 120, 60], [90, 50, 110], [180, 170, 150]];
      for (const [y0, y1] of [[1, 7], [9, 15]]) {
        let x = 1;
        while (x < 15) {
          const w = 1 + t.ri(2), c = pick(cols, t.r()), h = y0 + t.ri(2);
          for (let xx = x; xx < Math.min(15, x + w); xx++) for (let y = h; y < y1; y++) t.set(xx, y, mul(c, y === h ? 1.2 : 0.9 + t.r() * 0.15));
          x += w;
        }
        for (let xx = 0; xx < S; xx++) { t.set(xx, y0 - 1, [110, 85, 50]); t.set(xx, y1, [90, 68, 40]); }
      }
      break;
    }
    case 'crafting_table_top': {
      planks(t, [170, 128, 80]);
      for (let i = 0; i < S; i++) { t.set(i, 0, [90, 62, 36]); t.set(i, 15, [90, 62, 36]); t.set(0, i, [90, 62, 36]); t.set(15, i, [90, 62, 36]); }
      for (let i = 2; i < 14; i++) { t.set(i, 5, [120, 88, 50]); t.set(i, 10, [120, 88, 50]); t.set(5, i, [120, 88, 50]); t.set(10, i, [120, 88, 50]); }
      break;
    }
    case 'crafting_table_side': case 'crafting_table_front': {
      planks(t, [162, 130, 78]);
      for (let x = 0; x < S; x++) { t.set(x, 0, [100, 70, 40]); t.set(x, 1, [140, 100, 60]); t.set(x, 2, [100, 70, 40]); }
      if (name === 'crafting_table_front') {
        for (let y = 5; y < 14; y++) t.set(4, y, [110, 80, 45]); // handle
        for (let x = 2; x < 7; x++) { t.set(x, 5, [150, 150, 150]); t.set(x, 6, [120, 120, 120]); } // hammer head
        for (let y = 4; y < 13; y++) t.set(11, y, [180, 180, 180]); // saw
        for (let y = 4; y < 13; y += 2) t.set(12, y, [140, 140, 140]);
        t.set(11, 13, [110, 80, 45]); t.set(11, 14, [110, 80, 45]);
      } else {
        for (let y = 5; y < 14; y++) { t.set(3, y, [110, 80, 45]); t.set(12, y, [110, 80, 45]); }
        for (let x = 3; x < 13; x++) t.set(x, 9, [120, 88, 50]);
      }
      break;
    }
    case 'furnace_side': case 'furnace_top': case 'furnace_front': {
      stone(t, [118, 118, 118]);
      for (let i = 0; i < S; i++) {
        t.set(i, 0, [90, 90, 90]); t.set(i, 15, [80, 80, 80]); t.set(0, i, [90, 90, 90]); t.set(15, i, [80, 80, 80]);
      }
      if (name === 'furnace_front') {
        for (let y = 3; y < 6; y++) for (let x = 3; x < 13; x++) t.set(x, y, [70, 70, 70]);
        for (let y = 8; y < 14; y++) for (let x = 3; x < 13; x++) t.set(x, y, y > 11 ? [30, 30, 30] : [45, 45, 45]);
        for (let x = 3; x < 13; x++) t.set(x, 7, [150, 150, 150]);
      }
      break;
    }
    case 'tnt_side': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let c: RGB = x % 4 === 0 ? [170, 40, 20] : [219, 68, 26];
        if (y >= 5 && y <= 10) c = [230, 230, 225];
        t.set(x, y, mul(c, 1 + (t.r() - 0.5) * 0.08));
      }
      const word = ['T', 'N', 'T'];
      let ox = 2;
      for (const ch of word) {
        const g = FONT3x5[ch];
        for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 3; xx++) if (g[yy][xx] === '1') t.set(ox + xx, 5 + yy + (yy > 2 ? 0 : 0), [20, 20, 20]);
        ox += 4;
      }
      break;
    }
    case 'tnt_top': case 'tnt_bottom': {
      t.noise([200, 60, 30], 0.15);
      if (name === 'tnt_top') for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.set(x, y, (x + y) % 2 ? [60, 60, 60] : [230, 230, 220]);
      break;
    }
    case 'obsidian': {
      t.palette([[20, 18, 30], [15, 12, 22], [30, 24, 45], [8, 6, 12]]);
      for (let i = 0; i < 12; i++) t.set(t.ri(S), t.ri(S), [70, 50, 100]);
      break;
    }
    case 'glowstone': {
      t.palette([[255, 220, 120], [230, 170, 80], [170, 120, 60], [255, 240, 180], [200, 140, 70]], [3, 3, 2, 2, 2]);
      for (let i = 0; i < S; i++) { t.set(i, 0, mul(t.get(i, 0), 0.8)); t.set(0, i, mul(t.get(0, i), 0.8)); }
      break;
    }
    case 'wool_white': wool(t, [233, 236, 236]); break;
    case 'wool_red': wool(t, [161, 39, 34]); break;
    case 'wool_blue': wool(t, [53, 57, 157]); break;
    case 'wool_yellow': wool(t, [248, 197, 39]); break;
    case 'wool_green': wool(t, [84, 109, 27]); break;
    case 'wool_black': wool(t, [30, 30, 34]); break;
    case 'wool_orange': wool(t, [240, 118, 19]); break;
    case 'wool_purple': wool(t, [121, 42, 172]); break;
    case 'wool_cyan': wool(t, [21, 137, 145]); break;
    case 'clay': t.noise([160, 166, 179], 0.08); break;
    case 'pumpkin_side': case 'pumpkin_face': case 'jack_face': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let c: RGB = [227, 144, 29];
        if (x % 5 === 0) c = [190, 110, 20];
        t.set(x, y, mul(c, 1 + (t.r() - 0.5) * 0.1));
      }
      if (name !== 'pumpkin_side') {
        const col: RGB = name === 'jack_face' ? [255, 230, 90] : [60, 34, 6];
        const eyes = [[3, 4], [4, 4], [4, 5], [3, 5], [11, 4], [12, 4], [11, 5], [12, 5], [4, 3], [11, 3]];
        for (const [x, y] of eyes) t.set(x, y, col);
        for (let x = 3; x < 13; x++) { t.set(x, 10, col); if (x > 3 && x < 12) t.set(x, 11, col); }
        t.set(3, 9, col); t.set(12, 9, col); t.set(6, 10, [227, 144, 29]); t.set(9, 11, [227, 144, 29]);
      }
      break;
    }
    case 'pumpkin_top': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.set(x, y, mul([210, 130, 25], 1 + (t.r() - 0.5) * 0.1));
      for (let y = 6; y < 10; y++) for (let x = 7; x < 9; x++) t.set(x, y, [100, 80, 30]);
      break;
    }
    case 'melon_side': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const c: RGB = x % 4 < 2 ? [110, 150, 30] : [150, 185, 40];
        t.set(x, y, mul(c, 1 + (t.r() - 0.5) * 0.1));
      }
      break;
    }
    case 'melon_top': {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        t.set(x, y, mul(Math.floor(d) % 3 === 0 ? [110, 150, 30] : [145, 180, 40], 1 + (t.r() - 0.5) * 0.1));
      }
      break;
    }
    case 'torch': {
      t.clear();
      for (let y = 8; y < 16; y++) { t.set(7, y, [120, 92, 52]); t.set(8, y, [92, 70, 38]); }
      t.set(7, 6, [255, 255, 200]); t.set(8, 6, [255, 230, 110]);
      t.set(7, 7, [255, 200, 60]); t.set(8, 7, [255, 170, 40]);
      break;
    }
    case 'poppy': case 'dandelion': {
      t.clear();
      const stem: RGB = [60, 120, 30];
      for (let y = 8; y < 16; y++) t.set(7, y, stem);
      t.set(6, 12, stem); t.set(5, 11, stem); t.set(8, 13, stem); t.set(9, 12, stem);
      const pc: RGB[] = name === 'poppy' ? [[237, 48, 44], [190, 20, 20], [255, 90, 80]] : [[255, 236, 79], [230, 200, 30], [255, 255, 150]];
      const petals: [number, number][] = [[6, 5], [7, 4], [8, 5], [7, 6], [6, 6], [8, 6], [7, 5], [6, 7], [8, 7], [5, 5], [9, 5]];
      petals.forEach(([x, y], i) => t.set(x, y, pc[i % 3]));
      if (name === 'poppy') t.set(7, 5, [40, 30, 10]);
      break;
    }
    case 'tall_grass': {
      t.clear();
      for (let i = 0; i < 12; i++) {
        let x = 1 + t.ri(14); const h = 5 + t.ri(10);
        for (let y = 15; y > 15 - h; y--) {
          const v = 150 + t.r() * 90;
          t.set(x, y, [v, v, v]);
          if (t.r() < 0.15) x += t.r() < 0.5 ? -1 : 1;
          if (x < 0 || x > 15) break;
        }
      }
      break;
    }
    case 'sapling': {
      t.clear();
      for (let y = 9; y < 16; y++) t.set(7, y, [100, 75, 40]);
      for (let i = 0; i < 30; i++) { const x = 4 + t.ri(8), y = 2 + t.ri(9); t.set(x, y, mul([60, 130, 40], 0.8 + t.r() * 0.4)); }
      break;
    }
    case 'dead_bush': {
      t.clear();
      const c: RGB = [140, 100, 50];
      const br = (x: number, y: number, dx: number, n: number) => { for (let i = 0; i < n; i++) { t.set(x, y, mul(c, 0.8 + t.r() * 0.3)); y--; if (i % 2) x += dx; } };
      br(7, 15, 0, 6); br(7, 11, -1, 7); br(8, 12, 1, 7); br(7, 9, 1, 5); br(6, 8, -1, 4);
      break;
    }
    case 'sugar_cane': {
      t.clear();
      for (const x0 of [3, 8, 12]) for (let y = 0; y < S; y++) {
        const node = (y + x0) % 5 === 0;
        t.set(x0, y, node ? [150, 190, 110] : [120, 170, 80]); t.set(x0 + 1, y, node ? [120, 160, 80] : [90, 140, 60]);
      }
      break;
    }
    case 'brown_mushroom': case 'red_mushroom': {
      t.clear();
      for (let y = 10; y < 15; y++) { t.set(7, y, [220, 210, 190]); t.set(8, y, [200, 190, 170]); }
      const cap: RGB = name === 'red_mushroom' ? [220, 30, 30] : [150, 110, 80];
      for (let y = 7; y < 10; y++) for (let x = 5 - (y - 7); x < 11 + (y - 7); x++) t.set(x, y, mul(cap, 0.9 + t.r() * 0.2));
      for (let x = 6; x < 10; x++) t.set(x, 6, cap);
      if (name === 'red_mushroom') { t.set(6, 8, [255, 255, 255]); t.set(9, 7, [255, 255, 255]); t.set(10, 9, [255, 255, 255]); }
      break;
    }
    case 'lava': t.palette([[207, 92, 15], [230, 130, 20], [255, 180, 50], [180, 60, 10], [252, 150, 40]], [3, 3, 1.5, 2, 2]); break;
    case 'gold_block': metal(t, [248, 222, 70]); break;
    case 'iron_block': metal(t, [220, 220, 220]); break;
    case 'diamond_block': metal(t, [98, 230, 220]); break;
    default:
      if (name.startsWith('destroy_')) crackTile(t, parseInt(name.split('_')[1], 10));
      else t.noise([255, 0, 255], 0.1);
  }
}

// ---------- atlas ----------
let atlasCanvas: HTMLCanvasElement | null = null;
const tileCanvases: HTMLCanvasElement[] = [];

export function getAtlas(): HTMLCanvasElement {
  if (atlasCanvas) return atlasCanvas;
  const c = document.createElement('canvas');
  c.width = ATLAS_PX; c.height = ATLAS_PX;
  const ctx = c.getContext('2d')!;
  TILE_NAMES.forEach((name, i) => {
    const t = new Tile(i + 1);
    paint(name, t);
    const img = new ImageData(t.d, S, S);
    const x = (i % ATLAS_COLS) * S, y = Math.floor(i / ATLAS_COLS) * S;
    ctx.putImageData(img, x, y);
    const tc = document.createElement('canvas');
    tc.width = S; tc.height = S;
    tc.getContext('2d')!.putImageData(img, 0, 0);
    tileCanvases[i] = tc;
  });
  atlasCanvas = c;
  return c;
}

export function getTileCanvas(i: number, tint?: RGB | null): HTMLCanvasElement {
  getAtlas();
  if (!tint) return tileCanvases[i];
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(tileCanvases[i], 0, 0);
  const d = ctx.getImageData(0, 0, S, S);
  for (let p = 0; p < d.data.length; p += 4) {
    d.data[p] = d.data[p] * tint[0] / 255; d.data[p + 1] = d.data[p + 1] * tint[1] / 255; d.data[p + 2] = d.data[p + 2] * tint[2] / 255;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

export const DEFAULT_TINTS: Record<string, RGB> = {
  grass: PLAINS_GRASS, foliage: [89, 174, 48], birch: [128, 167, 85], spruce: [97, 153, 97],
};

// ---------- item icons ----------
const iconCache = new Map<number, string>();
export function blockIcon(id: number): string {
  const c = iconCache.get(id);
  if (c) return c;
  const b = BLOCKS[id];
  const url = renderIcon(b);
  iconCache.set(id, url);
  return url;
}

function renderIcon(b: BlockDef): string {
  const cv = document.createElement('canvas');
  cv.width = 48; cv.height = 48;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const tint = b.tint ? DEFAULT_TINTS[b.tint] : null;
  if (b.shape === 'cross' || b.shape === 'torch') {
    ctx.drawImage(getTileCanvas(b.tex[0], tint), 0, 0, 48, 48);
    return cv.toDataURL();
  }
  const top = getTileCanvas(b.tex[2], tint);
  const sideTint = b.tintTopOnly ? null : tint;
  const left = getTileCanvas(b.tex[4], sideTint);
  const right = getTileCanvas(b.tex[0], sideTint);
  const faces: [HTMLCanvasElement, number[], number][] = [
    [top, [22 / 16, -11 / 16, 22 / 16, 11 / 16, 2, 12], 0],
    [left, [22 / 16, 11 / 16, 0, 24 / 16, 2, 12], 0.22],
    [right, [22 / 16, -11 / 16, 0, 24 / 16, 24, 23], 0.42],
  ];
  for (const [img, m, shade] of faces) {
    const tmp = document.createElement('canvas');
    tmp.width = 48; tmp.height = 48;
    const tc = tmp.getContext('2d')!;
    tc.imageSmoothingEnabled = false;
    tc.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    tc.drawImage(img, 0, 0);
    if (shade > 0) {
      tc.globalCompositeOperation = 'source-atop';
      tc.fillStyle = `rgba(0,0,0,${shade})`;
      tc.fillRect(0, 0, 16, 16);
    }
    ctx.drawImage(tmp, 0, 0);
  }
  return cv.toDataURL();
}

// ---------- misc textures ----------
export function makeSunCanvas(moon = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const ctx = c.getContext('2d')!;
  const r = mulberry32(moon ? 5 : 3);
  if (!moon) {
    ctx.fillStyle = 'rgba(255,255,160,0.25)'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffa0'; ctx.fillRect(6, 6, 20, 20);
    ctx.fillStyle = '#ffffe8'; ctx.fillRect(8, 8, 16, 16);
  } else {
    ctx.fillStyle = '#dfe3ea'; ctx.fillRect(8, 8, 16, 16);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = r() < 0.5 ? '#aab0bc' : '#c3c8d2'; ctx.fillRect(8 + Math.floor(r() * 14), 8 + Math.floor(r() * 14), 2, 2); }
  }
  return c;
}

export function makeCloudCanvas(seed: number): HTMLCanvasElement {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  const r = mulberry32(seed);
  // value noise with wrap
  const G = 32;
  const grid: number[] = [];
  for (let i = 0; i < G * G; i++) grid.push(r());
  const val = (x: number, y: number, g: number) => {
    const fx = x / N * g, fy = y / N * g;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const gv = (a: number, b: number) => grid[((a % g) + g) % g * (G / g) + (((b % g) + g) % g) * (G / g) * G];
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (gv(x0, y0) * (1 - sx) + gv(x0 + 1, y0) * sx) * (1 - sy) + (gv(x0, y0 + 1) * (1 - sx) + gv(x0 + 1, y0 + 1) * sx) * sy;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = val(x, y, 8) * 0.6 + val(x, y, 16) * 0.3 + val(x, y, 32) * 0.1;
    const i = (y * N + x) * 4;
    const on = v > 0.56;
    img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = on ? 255 : 0;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function dirtBackground(): string {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(getTileCanvas(tileIndex('dirt')), 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, 16, 16);
  return c.toDataURL();
}

// ---------- MINECRAFT logo ----------
const LOGO: Record<string, string[]> = {
  M: ['10001', '11011', '10101', '10001', '10001'],
  I: ['111', '010', '010', '010', '111'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  E: ['1111', '1000', '1110', '1000', '1111'],
  C: ['0111', '1000', '1000', '1000', '0111'],
  R: ['1110', '1001', '1110', '1010', '1001'],
  A: ['0110', '1001', '1111', '1001', '1001'],
  F: ['1111', '1000', '1110', '1000', '1000'],
  T: ['11111', '00100', '00100', '00100', '00100'],
};
export function makeLogo(): string {
  const word = 'MINECRAFT';
  const cell = 12, depth = 5, gap = 1;
  let w = 0;
  for (const ch of word) w += LOGO[ch][0].length + gap;
  w -= gap;
  const cv = document.createElement('canvas');
  cv.width = w * cell + depth + 8; cv.height = 5 * cell + depth + 8;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const stoneT = getTileCanvas(tileIndex('stone'));
  const cobT = getTileCanvas(tileIndex('cobblestone'));
  const cells: [number, number][] = [];
  let ox = 0;
  for (const ch of word) {
    const g = LOGO[ch];
    for (let y = 0; y < 5; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] === '1') cells.push([ox + x, y]);
    ox += g[0].length + gap;
  }
  // extrusion
  for (let d = depth; d > 0; d--) {
    for (const [x, y] of cells) {
      ctx.fillStyle = d === depth ? '#1a1a1a' : `rgb(${50 + d * 4},${50 + d * 4},${50 + d * 4})`;
      ctx.fillRect(4 + x * cell + d, 4 + y * cell + d, cell, cell);
    }
  }
  for (const [x, y] of cells) {
    ctx.drawImage((x + y) % 3 === 0 ? cobT : stoneT, 0, 0, 16, 16, 4 + x * cell, 4 + y * cell, cell, cell);
  }
  // highlight gradient
  const grd = ctx.createLinearGradient(0, 0, 0, cv.height);
  grd.addColorStop(0, 'rgba(255,255,255,0.22)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv.toDataURL();
}
