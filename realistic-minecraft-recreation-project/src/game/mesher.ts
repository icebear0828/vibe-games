import { BLOCKS, OPAQUE, B } from './blocks';
import { CH, World, Chunk, idx } from './world';
import { tileUV } from './tiles';
import { DEFAULT_TINTS } from './textures';
import { hash3 } from './noise';

export class Buf {
  pos: Float32Array; uv: Float32Array; col: Float32Array; lig: Float32Array; ind: Uint32Array;
  v = 0; i = 0;
  constructor(cap = 16384) {
    this.pos = new Float32Array(cap * 3); this.uv = new Float32Array(cap * 2); this.col = new Float32Array(cap * 3);
    this.lig = new Float32Array(cap * 2); this.ind = new Uint32Array(cap * 1.5);
  }
  reset() { this.v = 0; this.i = 0; }
  ensure(nv: number) {
    if ((this.v + nv) * 3 <= this.pos.length) return;
    const cap = Math.max(this.pos.length / 3 * 2, this.v + nv);
    const g = <T extends Float32Array | Uint32Array>(a: T, n: number): T => { const b = new (a.constructor as any)(n); b.set(a); return b; };
    this.pos = g(this.pos, cap * 3); this.uv = g(this.uv, cap * 2); this.col = g(this.col, cap * 3);
    this.lig = g(this.lig, cap * 2); this.ind = g(this.ind, Math.ceil(cap * 1.5));
  }
  vert(x: number, y: number, z: number, u: number, v: number, r: number, g: number, b: number, s: number, bl: number) {
    const k = this.v;
    this.pos[k * 3] = x; this.pos[k * 3 + 1] = y; this.pos[k * 3 + 2] = z;
    this.uv[k * 2] = u; this.uv[k * 2 + 1] = v;
    this.col[k * 3] = r; this.col[k * 3 + 1] = g; this.col[k * 3 + 2] = b;
    this.lig[k * 2] = s; this.lig[k * 2 + 1] = bl;
    this.v++;
  }
  quad(flip: boolean) {
    const b = this.v - 4;
    if (this.i + 6 > this.ind.length) { const n = new Uint32Array(this.ind.length * 2); n.set(this.ind); this.ind = n; }
    if (!flip) { this.ind[this.i++] = b; this.ind[this.i++] = b + 1; this.ind[this.i++] = b + 2; this.ind[this.i++] = b; this.ind[this.i++] = b + 2; this.ind[this.i++] = b + 3; }
    else { this.ind[this.i++] = b + 1; this.ind[this.i++] = b + 2; this.ind[this.i++] = b + 3; this.ind[this.i++] = b + 1; this.ind[this.i++] = b + 3; this.ind[this.i++] = b; }
  }
  out() {
    return {
      pos: this.pos.slice(0, this.v * 3), uv: this.uv.slice(0, this.v * 2), col: this.col.slice(0, this.v * 3),
      lig: this.lig.slice(0, this.v * 2), ind: this.ind.slice(0, this.i),
    };
  }
}
export type MeshData = ReturnType<Buf['out']>;

// Face table: normal, 4 corners (BL, BR, TR, TL), shade
const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.6 },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.6 },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0 },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.5 },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.8 },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.8 },
];
const FACE_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
const AO_CURVE = [0.48, 0.66, 0.83, 1.0];

const PW = 18;
const padB = new Uint8Array(PW * PW * CH);
const padL = new Uint8Array(PW * PW * CH);
const pi = (x: number, y: number, z: number) => (y * PW + (z + 1)) * PW + (x + 1);
const tintArr = new Float32Array(16 * 16 * 3);

const opaqueBuf = new Buf(65536);
const transBuf = new Buf(16384);

export function meshChunk(world: World, c: Chunk): { opaque: MeshData; trans: MeshData } {
  const maxY = Math.min(CH - 1, c.maxY + 1);
  // build padded arrays
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const n = world.getChunk(c.cx + dx, c.cz + dz);
    const x0 = dx === -1 ? 15 : 0, x1 = dx === 1 ? 0 : 15;
    const z0 = dz === -1 ? 15 : 0, z1 = dz === 1 ? 0 : 15;
    for (let y = 0; y <= maxY; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const p = pi(x + dx * 16, y, z + dz * 16);
      if (n) { const i = idx(x, y, z); padB[p] = n.blocks[i]; padL[p] = n.light[i]; }
      else { padB[p] = 0; padL[p] = 0xf0; }
    }
  }
  // clear row above maxY
  if (maxY + 1 < CH) for (let z = -1; z <= 16; z++) for (let x = -1; x <= 16; x++) { const p = pi(x, maxY + 1, z); padB[p] = 0; padL[p] = 0xf0; }
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const g = world.grassColor(c.cx * 16 + x, c.cz * 16 + z);
    const k = (z * 16 + x) * 3;
    tintArr[k] = g[0] / 255; tintArr[k + 1] = g[1] / 255; tintArr[k + 2] = g[2] / 255;
  }
  const ob = opaqueBuf, tb = transBuf;
  ob.reset(); tb.reset();
  const ox = c.cx * 16, oz = c.cz * 16;

  for (let y = 0; y <= maxY; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const id = padB[pi(x, y, z)];
    if (id === 0) continue;
    const bd = BLOCKS[id];
    const shape = bd.shape;
    // tint
    let tr = 1, tg = 1, tbv = 1;
    if (bd.tint) {
      if (bd.tint === 'grass' || bd.tint === 'foliage') {
        const k = (z * 16 + x) * 3;
        tr = tintArr[k]; tg = tintArr[k + 1]; tbv = tintArr[k + 2];
        if (bd.tint === 'foliage') { tr *= 0.82; tg *= 0.92; tbv *= 0.62; }
      } else { const t = DEFAULT_TINTS[bd.tint]; tr = t[0] / 255; tg = t[1] / 255; tbv = t[2] / 255; }
    }
    const wx = ox + x, wz = oz + z;
    if (shape === 'cross') {
      const L = padL[pi(x, y, z)];
      const s = (L >> 4) / 15, bl = (L & 15) / 15;
      const [u0, v0, u1, v1] = tileUV(bd.tex[0]);
      let jx = 0, jz = 0;
      if (id === B.TALL_GRASS || id === B.POPPY || id === B.DANDELION) {
        jx = (hash3(wx, y, wz, 1) - 0.5) * 0.4; jz = (hash3(wx, y, wz, 2) - 0.5) * 0.4;
      }
      const a = 0.15, b2 = 0.85;
      const quads = [[a, a, b2, b2], [a, b2, b2, a]];
      for (const [x0, z0, x1, z1] of quads) {
        for (let side = 0; side < 2; side++) {
          ob.ensure(4);
          const X0 = side ? x1 : x0, Z0 = side ? z1 : z0, X1 = side ? x0 : x1, Z1 = side ? z0 : z1;
          ob.vert(wx + X0 + jx, y, wz + Z0 + jz, u0, v0, tr, tg, tbv, s, bl);
          ob.vert(wx + X1 + jx, y, wz + Z1 + jz, u1, v0, tr, tg, tbv, s, bl);
          ob.vert(wx + X1 + jx, y + 1, wz + Z1 + jz, u1, v1, tr, tg, tbv, s, bl);
          ob.vert(wx + X0 + jx, y + 1, wz + Z0 + jz, u0, v1, tr, tg, tbv, s, bl);
          ob.quad(false);
        }
      }
      continue;
    }
    if (shape === 'torch') {
      const L = padL[pi(x, y, z)];
      const s = (L >> 4) / 15, bl = Math.max((L & 15) / 15, 14 / 15);
      const [u0, v0, u1, v1] = tileUV(bd.tex[0]);
      const du = (u1 - u0) / 16, dv = (v1 - v0) / 16;
      const x0 = 7 / 16, x1 = 9 / 16, h = 10 / 16;
      const su0 = u0 + 7 * du, su1 = u0 + 9 * du, sv0 = v0, sv1 = v0 + 10 * dv;
      const box: [number[][], number][] = [
        [[[x1, 0, x1], [x1, 0, x0], [x1, h, x0], [x1, h, x1]], 0.8],
        [[[x0, 0, x0], [x0, 0, x1], [x0, h, x1], [x0, h, x0]], 0.8],
        [[[x0, 0, x1], [x1, 0, x1], [x1, h, x1], [x0, h, x1]], 0.9],
        [[[x1, 0, x0], [x0, 0, x0], [x0, h, x0], [x1, h, x0]], 0.9],
      ];
      for (const [vs, sh] of box) {
        ob.ensure(4);
        ob.vert(wx + vs[0][0], y + vs[0][1], wz + vs[0][2], su0, sv0, sh, sh, sh, s, bl);
        ob.vert(wx + vs[1][0], y + vs[1][1], wz + vs[1][2], su1, sv0, sh, sh, sh, s, bl);
        ob.vert(wx + vs[2][0], y + vs[2][1], wz + vs[2][2], su1, sv1, sh, sh, sh, s, bl);
        ob.vert(wx + vs[3][0], y + vs[3][1], wz + vs[3][2], su0, sv1, sh, sh, sh, s, bl);
        ob.quad(false);
      }
      // top
      const tv0 = v0 + 8 * dv, tv1 = v0 + 10 * dv;
      ob.ensure(4);
      ob.vert(wx + x0, y + h, wz + x1, su0, tv0, 1, 1, 1, s, bl);
      ob.vert(wx + x1, y + h, wz + x1, su1, tv0, 1, 1, 1, s, bl);
      ob.vert(wx + x1, y + h, wz + x0, su1, tv1, 1, 1, 1, s, bl);
      ob.vert(wx + x0, y + h, wz + x0, su0, tv1, 1, 1, 1, s, bl);
      ob.quad(false);
      continue;
    }
    const liquid = shape === 'liquid';
    const translucent = bd.translucent;
    const buf = translucent ? tb : ob;
    const cactus = shape === 'cactus';
    let topH = 1;
    if (liquid) {
      const above = padB[pi(x, y + 1, z)];
      if (above !== id) topH = 14 / 16;
    }
    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
      if (ny < 0) continue;
      const nb = ny >= CH ? 0 : padB[pi(nx, ny, nz)];
      if (!(cactus && F.n[1] === 0)) {
        if (OPAQUE[nb]) continue;
        if (nb === id && (liquid || translucent || id === B.GLASS)) continue;
        if (liquid && nb !== 0 && BLOCKS[nb].shape === 'liquid') continue;
        if (translucent && !liquid && nb === B.WATER) continue;
      }
      if (liquid && F.n[1] === 0 && nb !== 0 && BLOCKS[nb].solid && !OPAQUE[nb] && BLOCKS[nb].shape !== 'cactus') { /* draw against glass etc */ }
      const tile = bd.tex[f];
      const [u0, v0, u1, v1] = tileUV(tile);
      const useTint = bd.tint && (!bd.tintTopOnly || f === 2);
      const cr = useTint ? tr : 1, cg = useTint ? tg : 1, cb = useTint ? tbv : 1;
      const nL = ny >= CH ? 0xf0 : padL[pi(nx, ny, nz)];
      // tangent axes
      const ax = F.n[0] !== 0 ? 0 : F.n[1] !== 0 ? 1 : 2;
      const t1 = ax === 0 ? 1 : 0, t2 = ax === 2 ? 1 : 2;
      buf.ensure(4);
      const bright: number[] = [0, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const V = F.v[k];
        let px = V[0], py = V[1], pz = V[2];
        let sk: number, bk: number, ao = 3;
        if (liquid || shape === 'cactus') {
          sk = (nL >> 4) / 15; bk = (nL & 15) / 15;
          if (cactus && F.n[1] === 0) { const L = padL[pi(x, y, z)]; sk = (L >> 4) / 15; bk = (L & 15) / 15; }
        } else {
          const o = [0, 0, 0];
          o[t1] = V[t1] ? 1 : -1;
          const o2 = [0, 0, 0];
          o2[t2] = V[t2] ? 1 : -1;
          const ay = ny, ax2 = nx, az = nz;
          const s1y = ay + o[1], s2y = ay + o2[1], cy = ay + o[1] + o2[1];
          const inb = (yy: number) => yy >= 0 && yy < CH;
          const p1 = inb(s1y) ? pi(ax2 + o[0], s1y, az + o[2]) : -1;
          const p2 = inb(s2y) ? pi(ax2 + o2[0], s2y, az + o2[2]) : -1;
          const pc = inb(cy) ? pi(ax2 + o[0] + o2[0], cy, az + o[2] + o2[2]) : -1;
          const b1 = p1 >= 0 ? OPAQUE[padB[p1]] : 0;
          const b2 = p2 >= 0 ? OPAQUE[padB[p2]] : 0;
          const bc = pc >= 0 ? OPAQUE[padB[pc]] : 0;
          ao = b1 && b2 ? 0 : 3 - (b1 + b2 + bc);
          let ssum = nL >> 4, bsum = nL & 15, cnt = 1;
          if (!b1) { const l = p1 >= 0 ? padL[p1] : 0xf0; ssum += l >> 4; bsum += l & 15; cnt++; }
          if (!b2) { const l = p2 >= 0 ? padL[p2] : 0xf0; ssum += l >> 4; bsum += l & 15; cnt++; }
          if (!bc && !(b1 && b2)) { const l = pc >= 0 ? padL[pc] : 0xf0; ssum += l >> 4; bsum += l & 15; cnt++; }
          sk = ssum / cnt / 15; bk = bsum / cnt / 15;
        }
        if (liquid && py === 1) py = topH;
        if (cactus) {
          if (F.n[0] !== 0) px = F.n[0] > 0 ? 15 / 16 : 1 / 16;
          if (F.n[2] !== 0) pz = F.n[2] > 0 ? 15 / 16 : 1 / 16;
        }
        const aoF = AO_CURVE[ao] * F.s;
        bright[k] = aoF * (sk + bk + 0.1);
        let uu = FACE_UV[k][0], vv = FACE_UV[k][1];
        if (liquid && F.n[1] === 0 && vv === 1) vv = topH;
        buf.vert(wx + px, y + py, wz + pz, u0 + (u1 - u0) * uu, v0 + (v1 - v0) * vv, cr * aoF, cg * aoF, cb * aoF, sk, bk);
      }
      buf.quad(bright[0] + bright[2] < bright[1] + bright[3]);
      // water surface: also render underside so it is visible from below
      if (liquid && f === 2 && topH < 1 && translucent) {
        buf.ensure(4);
        const base = buf.v - 4;
        for (const k of [3, 2, 1, 0]) {
          const p = base + k;
          buf.vert(buf.pos[p * 3], buf.pos[p * 3 + 1], buf.pos[p * 3 + 2], buf.uv[p * 2], buf.uv[p * 2 + 1], buf.col[p * 3] * 0.8, buf.col[p * 3 + 1] * 0.8, buf.col[p * 3 + 2] * 0.8, buf.lig[p * 2], buf.lig[p * 2 + 1]);
        }
        buf.quad(false);
      }
    }
  }
  return { opaque: ob.out(), trans: tb.out() };
}
