import * as THREE from 'three';
import { World } from './world';
import { BLOCKS, SOLID, B } from './blocks';
import { tileUV } from './tiles';
import { DEFAULT_TINTS } from './textures';
import { Sound } from './audio';
import { mulberry32 } from './noise';

// ---------------- light helpers ----------------
export function curve(l: number) { const f = Math.max(0, Math.min(1, l)); return f / (4 - 3 * f); }
export function brightnessAt(world: World, x: number, y: number, z: number, daylight: number) {
  const L = world.getLight(Math.floor(x), Math.floor(y), Math.floor(z));
  const s = (L >> 4) / 15 * daylight, b = (L & 15) / 15;
  return Math.max(0.06, curve(Math.max(s, b))) * 0.95 + 0.05;
}

// ---------------- physics ----------------
const EPS = 1e-5;
function solid(world: World, x: number, y: number, z: number) { return SOLID[world.getBlock(x, y, z)] === 1; }

export function boxHitsSolid(world: World, px: number, py: number, pz: number, hw: number, h: number) {
  const x0 = Math.floor(px - hw), x1 = Math.floor(px + hw - 1e-7);
  const y0 = Math.floor(py), y1 = Math.floor(py + h - 1e-7);
  const z0 = Math.floor(pz - hw), z1 = Math.floor(pz + hw - 1e-7);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (solid(world, x, y, z)) return true;
  return false;
}

function collideAxis(world: World, p: THREE.Vector3, hw: number, h: number, axis: 0 | 1 | 2, d: number): boolean {
  if (axis === 0) p.x += d; else if (axis === 1) p.y += d; else p.z += d;
  const x0 = Math.floor(p.x - hw), x1 = Math.floor(p.x + hw - 1e-7);
  const y0 = Math.floor(p.y), y1 = Math.floor(p.y + h - 1e-7);
  const z0 = Math.floor(p.z - hw), z1 = Math.floor(p.z + hw - 1e-7);
  let hit = false;
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (!solid(world, x, y, z)) continue;
    hit = true;
    if (axis === 0) p.x = d > 0 ? Math.min(p.x, x - hw - EPS) : Math.max(p.x, x + 1 + hw + EPS);
    else if (axis === 1) p.y = d > 0 ? Math.min(p.y, y - h - EPS) : Math.max(p.y, y + 1);
    else p.z = d > 0 ? Math.min(p.z, z - hw - EPS) : Math.max(p.z, z + 1 + hw + EPS);
  }
  return hit;
}

export interface MoveResult { onGround: boolean; hitX: boolean; hitZ: boolean; hitUp: boolean; }
export function moveBox(world: World, p: THREE.Vector3, v: THREE.Vector3, dt: number, hw: number, h: number, sneakEdge = false): MoveResult {
  const res: MoveResult = { onGround: false, hitX: false, hitZ: false, hitUp: false };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt / 0.3));
  const sdt = dt / steps;
  for (let s = 0; s < steps; s++) {
    const dy = v.y * sdt;
    if (dy !== 0 && collideAxis(world, p, hw, h, 1, dy)) {
      if (dy < 0) res.onGround = true; else res.hitUp = true;
      v.y = 0;
    }
    for (const ax of [0, 2] as const) {
      const d = (ax === 0 ? v.x : v.z) * sdt;
      if (d === 0) continue;
      if (sneakEdge) {
        // prevent walking off edges while sneaking
        const nx = ax === 0 ? p.x + d : p.x, nz = ax === 2 ? p.z + d : p.z;
        if (!boxHitsSolid(world, nx, p.y - 0.6, nz, hw, 0.6)) { if (ax === 0) v.x = 0; else v.z = 0; continue; }
      }
      if (collideAxis(world, p, hw, h, ax, d)) {
        if (ax === 0) { res.hitX = true; v.x = 0; } else { res.hitZ = true; v.z = 0; }
      }
    }
  }
  return res;
}

// ---------------- geometry for a block item ----------------
export function blockGeometry(id: number, size: number): THREE.BufferGeometry {
  const bd = BLOCKS[id];
  const tint = bd.tint ? DEFAULT_TINTS[bd.tint] : null;
  if (bd.shape === 'cross' || bd.shape === 'torch') {
    const g = new THREE.PlaneGeometry(size, size);
    const [u0, v0, u1, v1] = tileUV(bd.tex[0]);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    const col = new Float32Array(uv.count * 3);
    for (let i = 0; i < uv.count; i++) { col[i * 3] = tint ? tint[0] / 255 : 1; col[i * 3 + 1] = tint ? tint[1] / 255 : 1; col[i * 3 + 2] = tint ? tint[2] / 255 : 1; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  const g = new THREE.BoxGeometry(size, size, size);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const col = new Float32Array(uv.count * 3);
  const shades = [0.6, 0.6, 1, 0.5, 0.8, 0.8];
  for (let f = 0; f < 6; f++) {
    const [u0, v0, u1, v1] = tileUV(bd.tex[f]);
    const useTint = tint && (!bd.tintTopOnly || f === 2);
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
      const s = shades[f];
      col[i * 3] = s * (useTint ? tint![0] / 255 : 1);
      col[i * 3 + 1] = s * (useTint ? tint![1] / 255 : 1);
      col[i * 3 + 2] = s * (useTint ? tint![2] / 255 : 1);
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------------- particles ----------------
const PVERT = `
attribute vec2 uvo; attribute vec3 pcolor; attribute float psize;
uniform float scale;
varying vec2 vUvo; varying vec3 vCol;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = psize*scale/max(0.1,-mv.z); vUvo=uvo; vCol=pcolor; }`;
const PFRAG = `
uniform sampler2D map; uniform float uvSize;
varying vec2 vUvo; varying vec3 vCol;
void main(){ vec2 uv = vUvo + vec2(gl_PointCoord.x, 1.0-gl_PointCoord.y)*uvSize; vec4 t = texture2D(map, uv); if(t.a<0.5) discard; gl_FragColor = vec4(t.rgb*vCol,1.0); }`;

export class Particles {
  max = 4000;
  n = 0;
  pos: Float32Array; vel: Float32Array; life: Float32Array; uvo: Float32Array; col: Float32Array; size: Float32Array; grav: Float32Array;
  geo = new THREE.BufferGeometry();
  points: THREE.Points;
  mat: THREE.ShaderMaterial;
  constructor(atlas: THREE.Texture) {
    this.pos = new Float32Array(this.max * 3); this.vel = new Float32Array(this.max * 3); this.life = new Float32Array(this.max);
    this.uvo = new Float32Array(this.max * 2); this.col = new Float32Array(this.max * 3); this.size = new Float32Array(this.max);
    this.grav = new Float32Array(this.max);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('uvo', new THREE.BufferAttribute(this.uvo, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('psize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({ vertexShader: PVERT, fragmentShader: PFRAG, uniforms: { map: { value: atlas }, uvSize: { value: 4 / 256 }, scale: { value: 500 } } });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }
  add(x: number, y: number, z: number, vx: number, vy: number, vz: number, tile: number, r: number, g: number, b: number, life: number, size: number, grav = 1) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    const [u0, v0] = tileUV(tile);
    this.uvo[i * 2] = u0 + Math.floor(Math.random() * 12) / 256;
    this.uvo[i * 2 + 1] = v0 + Math.floor(Math.random() * 12) / 256;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.life[i] = life; this.size[i] = size; this.grav[i] = grav;
  }
  blockBreak(world: World, x: number, y: number, z: number, id: number, daylight: number, count = 4) {
    const bd = BLOCKS[id];
    if (!bd) return;
    const br = brightnessAt(world, x + 0.5, y + 0.5, z + 0.5, daylight);
    const t = bd.tint && !bd.tintTopOnly ? DEFAULT_TINTS[bd.tint] : [255, 255, 255];
    for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) for (let k = 0; k < count; k++) {
      const px = x + (i + 0.5) / count, py = y + (j + 0.5) / count, pz = z + (k + 0.5) / count;
      this.add(px, py, pz, (px - x - 0.5) * 3 + (Math.random() - 0.5), (py - y - 0.5) * 3 + Math.random() * 2, (pz - z - 0.5) * 3 + (Math.random() - 0.5),
        bd.tex[0], br * t[0] / 255, br * t[1] / 255, br * t[2] / 255, 0.5 + Math.random() * 0.8, 0.08 + Math.random() * 0.06);
    }
  }
  hit(world: World, x: number, y: number, z: number, id: number, nx: number, ny: number, nz: number, daylight: number) {
    const bd = BLOCKS[id];
    const br = brightnessAt(world, x + 0.5 + nx, y + 0.5 + ny, z + 0.5 + nz, daylight);
    const t = bd.tint && !bd.tintTopOnly ? DEFAULT_TINTS[bd.tint] : [255, 255, 255];
    for (let i = 0; i < 2; i++) {
      const px = x + 0.5 + nx * 0.52 + (nx ? 0 : Math.random() - 0.5), py = y + 0.5 + ny * 0.52 + (ny ? 0 : Math.random() - 0.5), pz = z + 0.5 + nz * 0.52 + (nz ? 0 : Math.random() - 0.5);
      this.add(px, py, pz, nx + (Math.random() - 0.5), ny + Math.random(), nz + (Math.random() - 0.5), bd.tex[0], br * t[0] / 255, br * t[1] / 255, br * t[2] / 255, 0.4 + Math.random() * 0.4, 0.07);
    }
  }
  smoke(x: number, y: number, z: number, n: number, spread: number, big = false) {
    const tile = BLOCKS[B.WHITE_WOOL].tex[0];
    for (let i = 0; i < n; i++) {
      const g = 0.5 + Math.random() * 0.5;
      this.add(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, z + (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2, tile, g, g, g, 0.6 + Math.random() * (big ? 1.5 : 0.6), big ? 0.5 + Math.random() * 0.6 : 0.15 + Math.random() * 0.1, -0.15);
    }
  }
  bubble(x: number, y: number, z: number) {
    const tile = BLOCKS[B.WATER].tex[0];
    this.add(x, y, z, (Math.random() - 0.5) * 0.3, 1.5, (Math.random() - 0.5) * 0.3, tile, 1.4, 1.5, 1.8, 0.8, 0.05, -0.3);
  }
  update(dt: number, world: World) {
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) continue;
      let vx = this.vel[i * 3], vy = this.vel[i * 3 + 1], vz = this.vel[i * 3 + 2];
      vy -= 18 * this.grav[i] * dt;
      vx *= 0.98; vz *= 0.98;
      let x = this.pos[i * 3] + vx * dt, y = this.pos[i * 3 + 1] + vy * dt, z = this.pos[i * 3 + 2] + vz * dt;
      if (SOLID[world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) {
        y = this.pos[i * 3 + 1]; x = this.pos[i * 3]; z = this.pos[i * 3 + 2];
        vy = 0; vx *= 0.5; vz *= 0.5;
      }
      const o3 = j * 3, o2 = j * 2;
      this.pos[o3] = x; this.pos[o3 + 1] = y; this.pos[o3 + 2] = z;
      this.vel[o3] = vx; this.vel[o3 + 1] = vy; this.vel[o3 + 2] = vz;
      if (j !== i) {
        this.uvo[o2] = this.uvo[i * 2]; this.uvo[o2 + 1] = this.uvo[i * 2 + 1];
        this.col[o3] = this.col[i * 3]; this.col[o3 + 1] = this.col[i * 3 + 1]; this.col[o3 + 2] = this.col[i * 3 + 2];
        this.life[j] = this.life[i]; this.size[j] = this.size[i]; this.grav[j] = this.grav[i];
      }
      j++;
    }
    this.n = j;
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'uvo', 'pcolor', 'psize']) (this.geo.attributes[k] as THREE.BufferAttribute).needsUpdate = true;
  }
}

// ---------------- simple entities ----------------
export class ItemEntity {
  mesh: THREE.Mesh;
  pos: THREE.Vector3; vel: THREE.Vector3;
  age = 0; pickupDelay = 0.5; dead = false;
  constructor(public id: number, public count: number, x: number, y: number, z: number, atlas: THREE.Texture, vel?: THREE.Vector3) {
    const mat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(blockGeometry(id, 0.25), mat);
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = vel || new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2);
  }
  update(dt: number, world: World, daylight: number) {
    this.age += dt;
    this.pickupDelay -= dt;
    this.vel.y -= 20 * dt;
    const r = moveBox(world, this.pos, this.vel, dt, 0.125, 0.25);
    if (r.onGround) { this.vel.x *= 0.6; this.vel.z *= 0.6; }
    else { this.vel.x *= 0.98; this.vel.z *= 0.98; }
    if (world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z)) === B.WATER) { this.vel.y += 24 * dt; this.vel.y *= 0.9; }
    this.mesh.position.set(this.pos.x, this.pos.y + 0.15 + Math.sin(this.age * 3) * 0.06, this.pos.z);
    this.mesh.rotation.y = this.age * 1.5;
    const b = brightnessAt(world, this.pos.x, this.pos.y + 0.2, this.pos.z, daylight);
    (this.mesh.material as THREE.MeshBasicMaterial).color.setScalar(b);
    if (this.age > 300) this.dead = true;
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}

export class FallingBlock {
  mesh: THREE.Mesh; pos: THREE.Vector3; vel = new THREE.Vector3(); dead = false;
  constructor(public id: number, x: number, y: number, z: number, atlas: THREE.Texture) {
    this.mesh = new THREE.Mesh(blockGeometry(id, 1), new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true }));
    this.pos = new THREE.Vector3(x + 0.5, y, z + 0.5);
  }
  update(dt: number, world: World, daylight: number): boolean {
    this.vel.y = Math.max(-40, this.vel.y - 25 * dt);
    const r = moveBox(world, this.pos, this.vel, dt, 0.49, 0.98);
    this.mesh.position.set(this.pos.x, this.pos.y + 0.5, this.pos.z);
    (this.mesh.material as THREE.MeshBasicMaterial).color.setScalar(brightnessAt(world, this.pos.x, this.pos.y + 0.5, this.pos.z, daylight));
    return r.onGround || this.pos.y < 0;
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}

export class PrimedTNT {
  mesh: THREE.Mesh; pos: THREE.Vector3; vel = new THREE.Vector3(0, 4, 0); fuse: number; dead = false;
  constructor(x: number, y: number, z: number, atlas: THREE.Texture, fuse = 4) {
    this.mesh = new THREE.Mesh(blockGeometry(B.TNT, 0.98), new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true }));
    this.pos = new THREE.Vector3(x + 0.5, y, z + 0.5);
    this.fuse = fuse;
    this.vel.x = (Math.random() - 0.5) * 0.8; this.vel.z = (Math.random() - 0.5) * 0.8;
  }
  update(dt: number, world: World, daylight: number): boolean {
    this.fuse -= dt;
    this.vel.y -= 25 * dt;
    const r = moveBox(world, this.pos, this.vel, dt, 0.49, 0.98);
    if (r.onGround) { this.vel.x *= 0.7; this.vel.z *= 0.7; }
    const flash = Math.floor(this.fuse * 4) % 2 === 0;
    const m = this.mesh.material as THREE.MeshBasicMaterial;
    const b = brightnessAt(world, this.pos.x, this.pos.y + 0.5, this.pos.z, daylight);
    m.color.setScalar(flash ? 2.2 : b);
    const s = this.fuse < 0.5 ? 1 + (0.5 - this.fuse) * 0.4 : 1;
    this.mesh.scale.setScalar(s);
    this.mesh.position.set(this.pos.x, this.pos.y + 0.5, this.pos.z);
    return this.fuse <= 0;
  }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}

// ---------------- mobs ----------------
type MobKind = 'pig' | 'cow' | 'sheep';
function faceTex(w: number, h: number, base: [number, number, number], seed: number, draw?: (ctx: CanvasRenderingContext2D) => void, spots?: [number, number, number]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const r = mulberry32(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const f = 1 + (r() - 0.5) * 0.12;
    let col = base;
    if (spots && r() < 0.02) col = spots;
    ctx.fillStyle = `rgb(${col[0] * f | 0},${col[1] * f | 0},${col[2] * f | 0})`;
    ctx.fillRect(x, y, 1, 1);
  }
  if (spots) {
    for (let i = 0; i < 3; i++) {
      const sx = Math.floor(r() * w), sy = Math.floor(r() * h), sw = 2 + Math.floor(r() * w / 2), sh = 2 + Math.floor(r() * h / 2);
      ctx.fillStyle = `rgb(${spots[0]},${spots[1]},${spots[2]})`;
      ctx.fillRect(sx, sy, sw, sh);
    }
  }
  if (draw) draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.NoColorSpace;
  return t;
}

function boxMesh(sx: number, sy: number, sz: number, mats: THREE.Material[]) {
  return new THREE.Mesh(new THREE.BoxGeometry(sx / 16, sy / 16, sz / 16), mats);
}

export class Mob {
  group = new THREE.Group();
  head = new THREE.Group();
  legs: THREE.Group[] = [];
  mats: THREE.MeshBasicMaterial[] = [];
  pos: THREE.Vector3; vel = new THREE.Vector3(); yaw = Math.random() * Math.PI * 2;
  targetYaw = this.yaw; walk = 0; state = 0; timer = 0; health = 10; hurtTime = 0; deathTime = 0; dead = false;
  hw: number; h: number; walkPhase = 0; onGround = false; soundTimer = 5 + Math.random() * 20;
  constructor(public kind: MobKind, x: number, y: number, z: number) {
    this.pos = new THREE.Vector3(x, y, z);
    const seed = Math.floor(Math.random() * 1e6);
    let body: [number, number, number], legC: [number, number, number], headC: [number, number, number], spots: [number, number, number] | undefined;
    let bs: number[], hs: number[], ls: number[];
    if (kind === 'pig') { body = [240, 160, 160]; legC = body; headC = body; bs = [10, 8, 16]; hs = [8, 8, 8]; ls = [4, 6, 4]; this.health = 10; }
    else if (kind === 'cow') { body = [80, 56, 40]; legC = [80, 56, 40]; headC = body; spots = [235, 235, 235]; bs = [12, 10, 18]; hs = [8, 8, 6]; ls = [4, 12, 4]; this.health = 10; }
    else { body = [232, 232, 228]; legC = [216, 186, 160]; headC = [216, 186, 160]; bs = [12, 12, 18]; hs = [7, 7, 8]; ls = [4, 12, 4]; this.health = 8; }
    this.hw = bs[0] / 32 + 0.05; this.h = (ls[1] + bs[1]) / 16 + 0.1;
    const mk = (base: [number, number, number], w: number, h: number, draw?: (c: CanvasRenderingContext2D) => void, sp?: [number, number, number]) => {
      const m = new THREE.MeshBasicMaterial({ map: faceTex(w, h, base, seed + this.mats.length, draw, sp) });
      this.mats.push(m);
      return m;
    };
    const bodyM = mk(body, bs[0], bs[2], undefined, spots);
    const bodySide = mk(body, bs[2], bs[1], undefined, spots);
    const bodyEnd = mk(body, bs[0], bs[1], undefined, spots);
    const bodyMesh = boxMesh(bs[0], bs[1], bs[2], [bodySide, bodySide, bodyM, bodyM, bodyEnd, bodyEnd]);
    bodyMesh.position.y = (ls[1] + bs[1] / 2) / 16;
    this.group.add(bodyMesh);
    // head
    const face = mk(headC, hs[0], hs[1], (ctx) => {
      ctx.fillStyle = '#000'; ctx.fillRect(1, hs[1] / 2 - 2, 1, 1); ctx.fillRect(hs[0] - 2, hs[1] / 2 - 2, 1, 1);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, hs[1] / 2 - 2, 1, 1); ctx.fillRect(hs[0] - 1, hs[1] / 2 - 2, 1, 1);
      if (kind === 'sheep') { ctx.fillStyle = '#e8e8e4'; ctx.fillRect(0, 0, hs[0], 2); }
      if (kind === 'cow') { ctx.fillStyle = '#c9a18a'; ctx.fillRect(2, hs[1] - 3, hs[0] - 4, 3); ctx.fillStyle = '#333'; ctx.fillRect(2, hs[1] - 2, 1, 1); ctx.fillRect(hs[0] - 3, hs[1] - 2, 1, 1); }
    });
    const headSide = mk(kind === 'sheep' ? [232, 232, 228] : headC, hs[2], hs[1]);
    const headTop = mk(kind === 'sheep' ? [232, 232, 228] : headC, hs[0], hs[2]);
    const headMesh = boxMesh(hs[0], hs[1], hs[2], [headSide, headSide, headTop, headTop, face, headSide]);
    headMesh.position.z = hs[2] / 32;
    this.head.add(headMesh);
    if (kind === 'pig') {
      const sn = mk([225, 140, 140], 4, 3, (c) => { c.fillStyle = '#8a4a4a'; c.fillRect(0, 1, 1, 1); c.fillRect(3, 1, 1, 1); });
      const snout = boxMesh(4, 3, 1, [sn, sn, sn, sn, sn, sn]);
      snout.position.set(0, -1.5 / 16, hs[2] / 16 + 0.5 / 16);
      this.head.add(snout);
    }
    if (kind === 'cow') {
      const hm = mk([220, 220, 200], 1, 3);
      for (const s of [-1, 1]) { const horn = boxMesh(1, 3, 1, [hm, hm, hm, hm, hm, hm]); horn.position.set(s * 4.5 / 16, 4 / 16, 2 / 16); this.head.add(horn); }
    }
    this.head.position.set(0, (ls[1] + bs[1] - 1) / 16 + (kind === 'pig' ? 0 : 2 / 16), bs[2] / 32);
    this.group.add(this.head);
    const legM = mk(legC, ls[0], ls[1], (c) => { c.fillStyle = kind === 'pig' ? '#b07070' : '#3a2a20'; c.fillRect(0, ls[1] - 1, ls[0], 1); });
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pivot = new THREE.Group();
      const leg = boxMesh(ls[0], ls[1], ls[2], [legM, legM, legM, legM, legM, legM]);
      leg.position.y = -ls[1] / 32;
      pivot.add(leg);
      pivot.position.set(lx * (bs[0] / 2 - ls[0] / 2) / 16, ls[1] / 16, lz * (bs[2] / 2 - ls[2] / 2 - 1) / 16);
      this.group.add(pivot);
      this.legs.push(pivot);
    }
  }
  update(dt: number, world: World, daylight: number, playerPos: THREE.Vector3) {
    if (this.health <= 0) {
      this.deathTime += dt;
      this.group.rotation.z = Math.min(Math.PI / 2, this.deathTime * 4);
      if (this.deathTime > 1) this.dead = true;
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 0 && Math.random() < 0.6) { this.state = 1; this.targetYaw = Math.random() * Math.PI * 2; this.timer = 2 + Math.random() * 4; }
        else { this.state = 0; this.timer = 2 + Math.random() * 5; }
      }
      let d = this.targetYaw - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * 4);
      const speed = this.hurtTime > 0 ? 3 : (this.state === 1 ? 1.1 : 0);
      if (this.hurtTime <= 0.3) {
        this.vel.x += (Math.sin(this.yaw) * speed - this.vel.x) * Math.min(1, dt * 10);
        this.vel.z += (Math.cos(this.yaw) * speed - this.vel.z) * Math.min(1, dt * 10);
      }
      this.soundTimer -= dt;
      if (this.soundTimer < 0) {
        this.soundTimer = 8 + Math.random() * 20;
        const dist = this.pos.distanceTo(playerPos);
        if (dist < 16) Sound.mob(this.kind, 1 - dist / 16);
      }
    }
    const inWater = world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.3), Math.floor(this.pos.z)) === B.WATER;
    this.vel.y -= (inWater ? 4 : 28) * dt;
    if (inWater) { this.vel.y = Math.min(this.vel.y + 12 * dt, 2); this.vel.y *= 0.9; }
    const r = moveBox(world, this.pos, this.vel, dt, this.hw, this.h);
    this.onGround = r.onGround;
    if ((r.hitX || r.hitZ) && this.onGround && this.health > 0) this.vel.y = 8.5;
    if (this.onGround) { this.vel.x *= Math.pow(0.02, dt); this.vel.z *= Math.pow(0.02, dt); }
    this.hurtTime -= dt;
    const moving = Math.hypot(this.vel.x, this.vel.z);
    this.walkPhase += moving * dt * 6;
    const sw = Math.sin(this.walkPhase) * Math.min(1, moving) * 0.7;
    this.legs[0].rotation.x = sw; this.legs[3].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    const b = brightnessAt(world, this.pos.x, this.pos.y + 0.5, this.pos.z, daylight);
    for (const m of this.mats) {
      if (this.hurtTime > 0 || this.health <= 0) m.color.setRGB(b * 1.6, b * 0.4, b * 0.4);
      else m.color.setScalar(b);
    }
  }
  damage(amount: number, from: THREE.Vector3) {
    if (this.health <= 0 || this.hurtTime > 0.2) return false;
    this.health -= amount;
    this.hurtTime = 0.5;
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz) || 1;
    this.vel.x = dx / l * 6; this.vel.z = dz / l * 6; this.vel.y = 6;
    this.targetYaw = Math.atan2(dx, dz);
    this.state = 1; this.timer = 3;
    Sound.mob(this.kind, 1);
    return true;
  }
  rayHit(o: THREE.Vector3, d: THREE.Vector3, maxDist: number): number {
    const min = new THREE.Vector3(this.pos.x - this.hw, this.pos.y, this.pos.z - this.hw);
    const max = new THREE.Vector3(this.pos.x + this.hw, this.pos.y + this.h, this.pos.z + this.hw);
    let t0 = 0, t1 = maxDist;
    for (let a = 0; a < 3; a++) {
      const oa = o.getComponent(a), da = d.getComponent(a);
      if (Math.abs(da) < 1e-9) { if (oa < min.getComponent(a) || oa > max.getComponent(a)) return -1; continue; }
      let ta = (min.getComponent(a) - oa) / da, tb = (max.getComponent(a) - oa) / da;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return -1;
    }
    return t0;
  }
  dispose() {
    this.group.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
    for (const m of this.mats) { m.map?.dispose(); m.dispose(); }
  }
}
