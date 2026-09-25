import { Simplex, hash2, hash3, mulberry32 } from './noise';
import { B, OPAQUE, EMIT, ATTEN, BLOCKS } from './blocks';

export const CW = 16;
export const CH = 128;
export const SEA = 62;

export type Biome = 'ocean' | 'frozen_ocean' | 'beach' | 'plains' | 'forest' | 'birch_forest' | 'desert' | 'snowy_taiga' | 'mountains';
export const BIOME_NAMES: Record<Biome, string> = {
  ocean: 'minecraft:ocean', frozen_ocean: 'minecraft:frozen_ocean', beach: 'minecraft:beach', plains: 'minecraft:plains',
  forest: 'minecraft:forest', birch_forest: 'minecraft:birch_forest', desert: 'minecraft:desert',
  snowy_taiga: 'minecraft:snowy_taiga', mountains: 'minecraft:windswept_hills',
};

export const idx = (x: number, y: number, z: number) => (y << 8) | (z << 4) | x;
export const ckey = (cx: number, cz: number) => (cx + 32768) * 65536 + (cz + 32768);

export class Chunk {
  blocks = new Uint8Array(CW * CW * CH);
  light = new Uint8Array(CW * CW * CH); // sky<<4 | block
  lit = false;
  dirty = true;
  modified = false;
  maxY = 0;
  maxTop = 0;
  meshVersion = 0;
  meshes: any[] = [];
  constructor(public cx: number, public cz: number) {}
}

interface Column { h: number; biome: Biome; temp: number; hum: number; }

class Queue {
  buf = new Int32Array(3 * 65536);
  head = 0; tail = 0;
  push(x: number, y: number, z: number) {
    if (this.tail + 3 > this.buf.length) {
      if (this.head > 0) { this.buf.copyWithin(0, this.head, this.tail); this.tail -= this.head; this.head = 0; }
      if (this.tail + 3 > this.buf.length) { const n = new Int32Array(this.buf.length * 2); n.set(this.buf); this.buf = n; }
    }
    this.buf[this.tail++] = x; this.buf[this.tail++] = y; this.buf[this.tail++] = z;
  }
  get empty() { return this.head >= this.tail; }
  reset() { this.head = 0; this.tail = 0; }
}
class Queue4 {
  buf: number[] = [];
  head = 0;
  push(x: number, y: number, z: number, v: number) { this.buf.push(x, y, z, v); }
  get empty() { return this.head >= this.buf.length; }
  reset() { this.buf.length = 0; this.head = 0; }
}

const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export class World {
  chunks = new Map<number, Chunk>();
  edits = new Map<number, Map<number, number>>();
  seed: number;
  private nCont: Simplex; private nDet: Simplex; private nMount: Simplex; private nRidge: Simplex;
  private nTemp: Simplex; private nHum: Simplex; private nCave1: Simplex; private nCave2: Simplex; private nCave3: Simplex;
  private lastKey = -1; private lastChunk: Chunk | undefined;
  private skyQ = new Queue(); private blkQ = new Queue();
  private remQ = new Queue4();
  onChunkDirty?: (c: Chunk) => void;

  constructor(seed: number) {
    this.seed = seed;
    this.nCont = new Simplex(seed);
    this.nDet = new Simplex(seed + 1);
    this.nMount = new Simplex(seed + 2);
    this.nRidge = new Simplex(seed + 3);
    this.nTemp = new Simplex(seed + 4);
    this.nHum = new Simplex(seed + 5);
    this.nCave1 = new Simplex(seed + 6);
    this.nCave2 = new Simplex(seed + 7);
    this.nCave3 = new Simplex(seed + 8);
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    const k = ckey(cx, cz);
    if (k === this.lastKey) return this.lastChunk;
    const c = this.chunks.get(k);
    this.lastKey = k; this.lastChunk = c;
    return c;
  }

  getBlock(x: number, y: number, z: number): number {
    if (y < 0) return B.BEDROCK;
    if (y >= CH) return B.AIR;
    const c = this.getChunk(x >> 4, z >> 4);
    if (!c) return B.AIR;
    return c.blocks[idx(x & 15, y, z & 15)];
  }

  getLight(x: number, y: number, z: number): number {
    if (y >= CH) return 0xf0;
    if (y < 0) return 0;
    const c = this.getChunk(x >> 4, z >> 4);
    if (!c) return 0xf0;
    return c.light[idx(x & 15, y, z & 15)];
  }

  // ---------------- terrain ----------------
  column(wx: number, wz: number): Column {
    const cont = this.nCont.fbm2(wx / 700, wz / 700, 4);
    const det = this.nDet.fbm2(wx / 140, wz / 140, 4);
    const small = this.nDet.noise2(wx / 28 + 500, wz / 28);
    const temp = this.nTemp.fbm2(wx / 900, wz / 900, 3) * 1.4;
    const hum = this.nHum.fbm2(wx / 800, wz / 800, 3) * 1.4;
    let h = SEA + 3 + cont * 26 + det * 7 + small * 1.5;
    const mf = smooth(0.15, 0.6, this.nMount.fbm2(wx / 500, wz / 500, 2));
    if (mf > 0) {
      const ridge = 1 - Math.abs(this.nRidge.fbm2(wx / 180, wz / 180, 4));
      h += mf * (ridge * ridge * 52 + det * 6) * smooth(SEA - 4, SEA + 8, h);
    }
    h = Math.max(4, Math.min(CH - 6, Math.floor(h)));
    let biome: Biome;
    if (h < SEA - 1) biome = temp < -0.5 ? 'frozen_ocean' : 'ocean';
    else if (h > SEA + 34 && mf > 0.2) biome = 'mountains';
    else if (h <= SEA + 1 && temp > -0.45) biome = 'beach';
    else if (temp > 0.35 && hum < 0.05) biome = 'desert';
    else if (temp < -0.4) biome = 'snowy_taiga';
    else if (hum > 0.25) biome = temp > 0.1 ? 'birch_forest' : 'forest';
    else if (hum > 0.05) biome = 'forest';
    else biome = 'plains';
    return { h, biome, temp, hum };
  }

  grassColor(wx: number, wz: number): [number, number, number] {
    const temp = this.nTemp.fbm2(wx / 900, wz / 900, 3) * 1.4;
    const hum = this.nHum.fbm2(wx / 800, wz / 800, 3) * 1.4;
    const cold: C3 = [128, 180, 151], dry: C3 = [145, 189, 89], wet: C3 = [95, 185, 72], hot: C3 = [191, 183, 85];
    const h01 = clamp01((hum + 0.6) / 1.2);
    let c = mix3(dry, wet, h01);
    c = mix3(cold, c, smooth(-0.6, -0.2, temp));
    c = mix3(c, hot, smooth(0.2, 0.6, temp) * (1 - h01));
    return c;
  }

  private caveAt(wx: number, y: number, wz: number): boolean {
    const a = this.nCave1.noise3(wx / 42, y / 22, wz / 42);
    const b = this.nCave2.noise3(wx / 42, y / 22, wz / 42);
    if (a * a + b * b < 0.011) return true;
    if (y < 48) {
      const c = this.nCave3.noise3(wx / 64, y / 28, wz / 64);
      if (c > 0.64 - (48 - y) * 0.002) return true;
    }
    return false;
  }

  generate(cx: number, cz: number): Chunk {
    const c = new Chunk(cx, cz);
    const bl = c.blocks;
    const rnd = mulberry32(this.seed ^ (cx * 73856093) ^ (cz * 19349663));
    const cols: Column[] = [];
    let maxY = 0;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const wx = cx * 16 + x, wz = cz * 16 + z;
      const col = this.column(wx, wz);
      cols.push(col);
      const { h, biome } = col;
      let top: number = B.GRASS, fill: number = B.DIRT, depth = 3 + Math.floor(rnd() * 2);
      if (biome === 'desert') { top = B.SAND; fill = B.SAND; depth = 4; }
      else if (biome === 'beach') { top = B.SAND; fill = B.SAND; }
      else if (biome === 'snowy_taiga') top = B.SNOW_GRASS;
      else if (biome === 'mountains') {
        if (h > SEA + 50) { top = B.SNOW_BLOCK; fill = B.STONE; }
        else if (h > SEA + 38) { top = B.STONE; fill = B.STONE; }
      }
      if (h < SEA) {
        const g = this.nDet.noise2(wx / 12, wz / 12);
        top = g > 0.4 ? B.GRAVEL : g < -0.5 ? B.CLAY : B.SAND; fill = top === B.CLAY ? B.CLAY : B.SAND;
        if (h < SEA - 8) { top = g > 0 ? B.GRAVEL : B.DIRT; fill = B.DIRT; }
      }
      const underwater = h < SEA + 1;
      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0 || (y < 5 && rnd() < (5 - y) / 5)) id = B.BEDROCK;
        else if (y < h - depth) id = B.STONE;
        else if (y < h) id = fill;
        else id = top;
        if (biome === 'desert' && id === B.SAND && y < h - 2) id = B.SANDSTONE;
        if (id !== B.BEDROCK && y > 0 && !(underwater && y > h - 6) && this.caveAt(wx, y, wz)) {
          id = y <= 10 ? B.LAVA : B.AIR;
        }
        bl[idx(x, y, z)] = id;
      }
      if (h < SEA) {
        for (let y = h + 1; y <= SEA; y++) bl[idx(x, y, z)] = B.WATER;
        if (biome === 'frozen_ocean') bl[idx(x, SEA, z)] = B.ICE;
      }
      maxY = Math.max(maxY, h, SEA);
      // grass on dirt exposed by caves fix: grass under air only
    }
    // ores
    const ores: [number, number, number, number][] = [
      [B.COAL_ORE, 20, 12, 120], [B.IRON_ORE, 12, 7, 64], [B.GOLD_ORE, 3, 7, 32], [B.REDSTONE_ORE, 6, 6, 16],
      [B.DIAMOND_ORE, 2, 5, 16], [B.EMERALD_ORE, 1, 1, 32], [B.GRAVEL, 6, 20, 90], [B.DIRT, 6, 20, 90],
    ];
    for (const [ore, tries, size, maxH] of ores) {
      for (let t = 0; t < tries; t++) {
        let x = Math.floor(rnd() * 16), y = 1 + Math.floor(rnd() * maxH), z = Math.floor(rnd() * 16);
        for (let s = 0; s < size; s++) {
          if (x >= 0 && x < 16 && z >= 0 && z < 16 && y > 0 && y < CH) {
            const i = idx(x, y, z);
            if (bl[i] === B.STONE) bl[i] = ore;
          }
          const d = Math.floor(rnd() * 6);
          x += DIRS[d][0]; y += DIRS[d][1]; z += DIRS[d][2];
        }
      }
    }
    // surface decoration
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const col = cols[z * 16 + x];
      const h = col.h;
      if (h + 1 >= CH) continue;
      const ground = bl[idx(x, h, z)];
      const above = idx(x, h + 1, z);
      if (bl[above] !== B.AIR) continue;
      const r = rnd();
      if (ground === B.GRASS) {
        const dense = col.biome === 'plains' ? 0.16 : 0.09;
        if (r < dense) bl[above] = B.TALL_GRASS;
        else if (r < dense + 0.012) bl[above] = rnd() < 0.5 ? B.POPPY : B.DANDELION;
        else if (r < dense + 0.0135 && col.biome !== 'plains') bl[above] = rnd() < 0.5 ? B.BROWN_MUSHROOM : B.RED_MUSHROOM;
        else if (r > 0.9993 && col.biome === 'plains') bl[above] = B.PUMPKIN;
      } else if (ground === B.SAND && col.biome === 'desert') {
        if (r < 0.006) {
          const hh = 1 + Math.floor(rnd() * 3);
          for (let k = 1; k <= hh && h + k < CH; k++) bl[idx(x, h + k, z)] = B.CACTUS;
        } else if (r < 0.014) bl[above] = B.DEAD_BUSH;
      } else if (ground === B.SAND && col.biome === 'beach' && h === SEA && r < 0.12) {
        const wet = (x > 0 && bl[idx(x - 1, h, z)] === B.WATER) || (x < 15 && bl[idx(x + 1, h, z)] === B.WATER) ||
          (z > 0 && bl[idx(x, h, z - 1)] === B.WATER) || (z < 15 && bl[idx(x, h, z + 1)] === B.WATER);
        if (wet) { const hh = 1 + Math.floor(rnd() * 3); for (let k = 1; k <= hh; k++) bl[idx(x, h + k, z)] = B.SUGAR_CANE; }
      }
    }
    // trees (may originate in neighbouring chunks)
    for (let wz = cz * 16 - 3; wz < cz * 16 + 19; wz++) for (let wx = cx * 16 - 3; wx < cx * 16 + 19; wx++) {
      const r = hash2(wx, wz, this.seed + 11);
      if (r > 0.06) continue;
      const lx = wx - cx * 16, lz = wz - cz * 16;
      const col = (lx >= 0 && lx < 16 && lz >= 0 && lz < 16) ? cols[lz * 16 + lx] : this.column(wx, wz);
      let dens = 0;
      switch (col.biome) {
        case 'forest': dens = 0.05; break;
        case 'birch_forest': dens = 0.05; break;
        case 'snowy_taiga': dens = 0.035; break;
        case 'plains': dens = 0.0035; break;
        case 'mountains': dens = col.h < SEA + 44 ? 0.01 : 0; break;
      }
      if (r >= dens || col.h <= SEA || col.h > CH - 14) continue;
      if (this.caveAt(wx, col.h, wz)) continue;
      const r2 = hash2(wx, wz, this.seed + 12);
      let type: 'oak' | 'birch' | 'spruce' = 'oak';
      if (col.biome === 'snowy_taiga' || (col.biome === 'mountains' && col.temp < 0)) type = 'spruce';
      else if (col.biome === 'birch_forest') type = r2 < 0.8 ? 'birch' : 'oak';
      else if (col.biome === 'forest') type = r2 < 0.2 ? 'birch' : 'oak';
      this.placeTree(c, lx, col.h + 1, lz, type, hash2(wx, wz, this.seed + 13));
      if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16) {
        const gi = idx(lx, col.h, lz);
        if (bl[gi] === B.GRASS || bl[gi] === B.SNOW_GRASS) bl[gi] = B.DIRT;
      }
    }
    // apply saved edits
    const e = this.edits.get(ckey(cx, cz));
    if (e) { for (const [i, id] of e) bl[i] = id; c.modified = true; maxY = CH - 1; }
    // snow on leaves in taiga: skip. compute maxY
    for (let y = CH - 1; y > maxY; y--) {
      let any = false;
      for (let i = y << 8, n = i + 256; i < n; i++) if (bl[i]) { any = true; break; }
      if (any) { maxY = y; break; }
    }
    c.maxY = Math.min(CH - 1, maxY + 1);
    this.chunks.set(ckey(cx, cz), c);
    this.lastKey = -1;
    return c;
  }

  private placeTree(c: Chunk, x: number, y: number, z: number, type: string, r: number) {
    const bl = c.blocks;
    const set = (lx: number, ly: number, lz: number, id: number, force: boolean) => {
      if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || ly < 0 || ly >= CH) return;
      const i = idx(lx, ly, lz);
      const cur = bl[i];
      if (force || cur === B.AIR || cur === B.TALL_GRASS || cur === B.POPPY || cur === B.DANDELION) bl[i] = id;
    };
    if (type === 'spruce') {
      const hgt = 6 + Math.floor(r * 4);
      let rad = 0;
      for (let dy = hgt; dy >= 2; dy--) {
        const ly = y + dy;
        if (dy === hgt) rad = 0; else if (dy === hgt - 1) rad = 1; else rad = (hgt - dy) % 2 === 0 ? Math.min(3, 1 + Math.floor((hgt - dy) / 3)) : Math.max(1, rad - 1);
        for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
          if (rad > 0 && Math.abs(dx) === rad && Math.abs(dz) === rad) continue;
          set(x + dx, ly, z + dz, B.SPRUCE_LEAVES, false);
        }
      }
      set(x, y + hgt + 1, z, B.SPRUCE_LEAVES, false);
      for (let dy = 0; dy < hgt; dy++) set(x, y + dy, z, B.SPRUCE_LOG, true);
      return;
    }
    const log = type === 'birch' ? B.BIRCH_LOG : B.OAK_LOG;
    const leaf = type === 'birch' ? B.BIRCH_LEAVES : B.OAK_LEAVES;
    const hgt = (type === 'birch' ? 5 : 4) + Math.floor(r * 3);
    let k = 0;
    for (let dy = hgt - 3; dy <= hgt; dy++) {
      const rad = dy >= hgt - 1 ? 1 : 2;
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        const corner = Math.abs(dx) === rad && Math.abs(dz) === rad;
        if (corner) {
          k++;
          if (dy === hgt) continue;
          if (hash3(x + dx, y + dy, z + dz, Math.floor(r * 1000)) < 0.5) continue;
        }
        if (dy === hgt && (dx !== 0 && dz !== 0)) continue;
        set(x + dx, y + dy, z + dz, leaf, false);
      }
    }
    for (let dy = 0; dy < hgt; dy++) set(x, y + dy, z, log, true);
    void k;
  }

  // ---------------- lighting ----------------
  private markDirty(c: Chunk, lx: number, lz: number) {
    if (!c.dirty) { c.dirty = true; this.onChunkDirty?.(c); }
    if (lx === 0) this.dirtyChunk(c.cx - 1, c.cz);
    else if (lx === 15) this.dirtyChunk(c.cx + 1, c.cz);
    if (lz === 0) this.dirtyChunk(c.cx, c.cz - 1);
    else if (lz === 15) this.dirtyChunk(c.cx, c.cz + 1);
  }
  dirtyChunk(cx: number, cz: number) {
    const n = this.getChunk(cx, cz);
    if (n && !n.dirty) { n.dirty = true; this.onChunkDirty?.(n); }
  }

  lightChunk(c: Chunk) {
    const bl = c.blocks, li = c.light;
    li.fill(0);
    let maxTop = 0;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      let l = 15;
      let top = 0;
      for (let y = CH - 1; y >= 0; y--) {
        const i = idx(x, y, z);
        const b = bl[i];
        if (OPAQUE[b]) l = 0;
        else if (ATTEN[b]) l = Math.max(0, l - ATTEN[b]);
        if (l < 15 && top === 0) top = y + 1;
        li[i] = l << 4;
        if (l === 0) break;
      }
      if (top > maxTop) maxTop = top;
    }
    c.maxTop = maxTop;
    c.lit = true;
    let seedTop = maxTop;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = this.getChunk(c.cx + dx, c.cz + dz);
      if (n && n.lit) seedTop = Math.max(seedTop, n.maxTop);
    }
    seedTop = Math.min(CH - 1, seedTop + 1);
    const sq = this.skyQ, bq = this.blkQ;
    sq.reset(); bq.reset();
    const ox = c.cx * 16, oz = c.cz * 16;
    for (let y = 0; y <= c.maxY; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const i = idx(x, y, z);
      const e = EMIT[bl[i]];
      if (e) { li[i] = (li[i] & 0xf0) | e; bq.push(ox + x, y, oz + z); }
    }
    for (let y = 0; y <= seedTop; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      if ((li[idx(x, y, z)] >> 4) > 1) sq.push(ox + x, y, oz + z);
    }
    // seed from neighbour borders
    const seedBorder = (n: Chunk | undefined, bx0: number, bx1: number, bz0: number, bz1: number) => {
      if (!n || !n.lit) return;
      for (let y = 0; y < CH; y++) for (let z = bz0; z <= bz1; z++) for (let x = bx0; x <= bx1; x++) {
        const v = n.light[idx(x, y, z)];
        if ((v >> 4) > 1) sq.push(n.cx * 16 + x, y, n.cz * 16 + z);
        if ((v & 15) > 1) bq.push(n.cx * 16 + x, y, n.cz * 16 + z);
      }
    };
    seedBorder(this.getChunk(c.cx - 1, c.cz), 15, 15, 0, 15);
    seedBorder(this.getChunk(c.cx + 1, c.cz), 0, 0, 0, 15);
    seedBorder(this.getChunk(c.cx, c.cz - 1), 0, 15, 15, 15);
    seedBorder(this.getChunk(c.cx, c.cz + 1), 0, 15, 0, 0);
    this.propagate(sq, true);
    this.propagate(bq, false);
  }

  private propagate(q: Queue, sky: boolean) {
    const buf = () => q.buf;
    while (!q.empty) {
      const b = buf();
      const x = b[q.head++], y = b[q.head++], z = b[q.head++];
      const c = this.getChunk(x >> 4, z >> 4);
      if (!c) continue;
      const v = c.light[idx(x & 15, y, z & 15)];
      const L = sky ? v >> 4 : v & 15;
      if (L <= 1) continue;
      for (let d = 0; d < 6; d++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
        if (ny < 0 || ny >= CH) continue;
        const nc = this.getChunk(nx >> 4, nz >> 4);
        if (!nc || !nc.lit) continue;
        const ni = idx(nx & 15, ny, nz & 15);
        const nb = nc.blocks[ni];
        if (OPAQUE[nb]) continue;
        const nl = (sky && d === 3 && L === 15 && !ATTEN[nb]) ? 15 : L - 1 - ATTEN[nb];
        const cur = nc.light[ni];
        const cl = sky ? cur >> 4 : cur & 15;
        if (nl <= cl) continue;
        nc.light[ni] = sky ? (cur & 15) | (nl << 4) : (cur & 0xf0) | nl;
        this.markDirty(nc, nx & 15, nz & 15);
        q.push(nx, ny, nz);
      }
    }
    q.reset();
  }

  private removeLight(sky: boolean, add: Queue) {
    const rq = this.remQ;
    while (!rq.empty) {
      const x = rq.buf[rq.head++], y = rq.buf[rq.head++], z = rq.buf[rq.head++], val = rq.buf[rq.head++];
      for (let d = 0; d < 6; d++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
        if (ny < 0 || ny >= CH) continue;
        const nc = this.getChunk(nx >> 4, nz >> 4);
        if (!nc || !nc.lit) continue;
        const ni = idx(nx & 15, ny, nz & 15);
        const cur = nc.light[ni];
        const nl = sky ? cur >> 4 : cur & 15;
        if (nl === 0) continue;
        if (nl < val || (sky && d === 3 && val === 15 && nl === 15)) {
          nc.light[ni] = sky ? cur & 15 : cur & 0xf0;
          this.markDirty(nc, nx & 15, nz & 15);
          rq.push(nx, ny, nz, nl);
        } else {
          add.push(nx, ny, nz);
        }
      }
    }
    rq.reset();
  }

  setBlock(x: number, y: number, z: number, id: number, record = true) {
    if (y < 0 || y >= CH) return;
    const c = this.getChunk(x >> 4, z >> 4);
    if (!c) return;
    const lx = x & 15, lz = z & 15;
    const i = idx(lx, y, lz);
    const old = c.blocks[i];
    if (old === id) return;
    c.blocks[i] = id;
    c.modified = true;
    if (y >= c.maxY) c.maxY = Math.min(CH - 1, y + 1);
    if (record) {
      const k = ckey(c.cx, c.cz);
      let m = this.edits.get(k);
      if (!m) { m = new Map(); this.edits.set(k, m); }
      m.set(i, id);
    }
    this.markDirty(c, lx, lz);
    if (lx === 0 || lx === 15 || lz === 0 || lz === 15) {
      // diagonal neighbours for AO
      const dx = lx === 0 ? -1 : lx === 15 ? 1 : 0, dz = lz === 0 ? -1 : lz === 15 ? 1 : 0;
      if (dx && dz) this.dirtyChunk(c.cx + dx, c.cz + dz);
    }
    if (!c.lit) return;
    const sq = this.skyQ, bq = this.blkQ;
    sq.reset(); bq.reset();
    const cur = c.light[i];
    const blocker = OPAQUE[id] || ATTEN[id] > ATTEN[old];
    if (blocker) {
      const sv = cur >> 4, bv = cur & 15;
      c.light[i] = 0;
      if (sv > 0) { this.remQ.reset(); this.remQ.push(x, y, z, sv); this.removeLight(true, sq); }
      if (bv > 0) { this.remQ.reset(); this.remQ.push(x, y, z, bv); this.removeLight(false, bq); }
      if (!OPAQUE[id]) for (const d of DIRS) { sq.push(x + d[0], y + d[1], z + d[2]); bq.push(x + d[0], y + d[1], z + d[2]); }
    } else {
      if (EMIT[old] > 0) {
        const bv = cur & 15;
        c.light[i] = cur & 0xf0;
        this.remQ.reset(); this.remQ.push(x, y, z, bv); this.removeLight(false, bq);
      }
      for (const d of DIRS) { sq.push(x + d[0], y + d[1], z + d[2]); bq.push(x + d[0], y + d[1], z + d[2]); }
    }
    if (EMIT[id] > 0) {
      c.light[i] = (c.light[i] & 0xf0) | EMIT[id];
      bq.push(x, y, z);
    }
    this.propagate(sq, true);
    this.propagate(bq, false);
  }

  // find spawn near origin
  findSpawn(): [number, number, number] {
    for (let r = 0; r < 400; r += 8) {
      for (let a = 0; a < Math.max(1, r); a += 4) {
        const ang = (a / Math.max(1, r)) * Math.PI * 2;
        const x = Math.round(Math.cos(ang) * r), z = Math.round(Math.sin(ang) * r);
        const col = this.column(x, z);
        if (col.h > SEA + 1 && col.biome !== 'mountains' && col.biome !== 'beach') return [x + 0.5, col.h + 1, z + 0.5];
      }
    }
    return [0.5, 100, 0.5];
  }

  surfaceY(x: number, z: number): number {
    for (let y = CH - 1; y > 0; y--) {
      const b = this.getBlock(x, y, z);
      if (b !== B.AIR && BLOCKS[b].solid) return y + 1;
    }
    return this.column(x, z).h + 1;
  }
}

type C3 = [number, number, number];
function smooth(a: number, b: number, x: number) { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function mix3(a: C3, b: C3, t: number): C3 { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
