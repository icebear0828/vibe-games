import * as THREE from 'three';
import { World, CH, SEA, ckey, Chunk, BIOME_NAMES } from './world';
import { BLOCKS, B, SOLID, isPlant, CREATIVE_ORDER } from './blocks';
import { meshChunk, MeshData } from './mesher';
import { getAtlas, makeSunCanvas, makeCloudCanvas } from './textures';
import { tileIndex, tileUV } from './tiles';
import { Sound } from './audio';
import { Particles, ItemEntity, FallingBlock, PrimedTNT, Mob, moveBox, blockGeometry, brightnessAt, boxHitsSolid } from './entities';
import { hash2 } from './noise';

THREE.ColorManagement.enabled = false;

export type GameMode = 'survival' | 'creative';
export interface Slot { id: number; count: number; }
export interface Settings { renderDistance: number; fov: number; sensitivity: number; music: boolean; volume: number; viewBobbing: boolean; clouds: boolean; }
export const DEFAULT_SETTINGS: Settings = { renderDistance: 6, fov: 70, sensitivity: 100, music: true, volume: 80, viewBobbing: true, clouds: true };
export interface SaveData {
  player: { x: number; y: number; z: number; yaw: number; pitch: number; health: number; flying: boolean };
  spawn: [number, number, number];
  time: number; mode: GameMode; inventory: (Slot | null)[]; edits: [number, number[]][];
}
export interface UIState {
  mode: GameMode; selected: number; inventory: (Slot | null)[]; invVersion: number; health: number; air: number;
  dead: boolean; debug: string[] | null; loading: number; hurt: number; underwater: boolean; inLava: boolean; hideHud: boolean;
}
export interface EngineOptions {
  seed: number; mode: GameMode | 'menu'; save?: SaveData | null; settings: Settings;
  onUI?: (s: UIState) => void; onPause?: () => void; onInventory?: () => void; onChat?: (prefix: string) => void; onMessage?: (m: string) => void;
}

const CHUNK_VERT = `
attribute vec2 light;
varying vec2 vUv; varying vec3 vColor; varying vec2 vLight; varying float vDist;
uniform float uTime; uniform float uWave;
void main(){
  vUv = uv; vColor = color; vLight = light;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  if (uWave > 0.5) { wp.y += (sin(wp.x * 1.3 + uTime * 1.6) + sin(wp.z * 1.1 + uTime * 1.3)) * 0.025 - 0.05; }
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const CHUNK_FRAG = `
uniform sampler2D map; uniform float uDaylight; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
uniform float uAlphaTest; uniform float uOpacity; uniform float uGamma;
varying vec2 vUv; varying vec3 vColor; varying vec2 vLight; varying float vDist;
void main(){
  vec4 t = texture2D(map, vUv);
  if (t.a < uAlphaTest) discard;
  float sky = vLight.x * uDaylight;
  float blk = vLight.y;
  float sb = sky / (4.0 - 3.0 * sky);
  float bb = blk / (4.0 - 3.0 * blk);
  sb = mix(sb, sqrt(sky), uGamma); bb = mix(bb, sqrt(blk), uGamma);
  vec3 skyTint = mix(vec3(0.62, 0.72, 1.0), vec3(1.0), smoothstep(0.1, 0.6, uDaylight));
  vec3 lc = max(vec3(sb) * skyTint, vec3(bb, bb * 0.88, bb * 0.72));
  lc = max(lc, vec3(0.035));
  vec3 col = t.rgb * vColor * lc;
  float fog = smoothstep(uFogNear, uFogFar, vDist);
  gl_FragColor = vec4(mix(col, uFogColor, fog), t.a * uOpacity);
}`;
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunset; uniform float uSunsetK; uniform float uUnder;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, smoothstep(-0.05, 0.4, h));
  if (h < -0.05) col = mix(col, uTop * 0.35 + uHorizon * 0.15, smoothstep(-0.05, -0.4, h));
  float sd = max(0.0, dot(normalize(vec3(d.x, d.y * 0.6, d.z)), uSunDir));
  col = mix(col, uSunset, pow(sd, 4.0) * uSunsetK * (1.0 - smoothstep(0.0, 0.6, abs(h - 0.05))));
  col = mix(col, uHorizon, uUnder);
  gl_FragColor = vec4(col, 1.0);
}`;
const CLOUD_VERT = `attribute vec3 color; varying vec3 vC; varying float vD; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = length(mv.xz); gl_Position = projectionMatrix * mv; }`;
const CLOUD_FRAG = `uniform vec3 uColor; uniform vec3 uFog; uniform float uFar; varying vec3 vC; varying float vD;
void main(){ float f = smoothstep(uFar * 0.35, uFar, vD); gl_FragColor = vec4(mix(uColor * vC, uFog, f), 0.8 * (1.0 - f * f)); }`;

const DIR_NAMES = ['south', 'west', 'north', 'east'];

export class Engine {
  opts: EngineOptions;
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  handScene = new THREE.Scene();
  handCamera: THREE.PerspectiveCamera;
  atlas: THREE.CanvasTexture;
  chunkMat: THREE.ShaderMaterial;
  transMat: THREE.ShaderMaterial;
  world: World;
  settings: Settings;
  menu: boolean;
  mode: GameMode = 'creative';

  // sky
  skyMat: THREE.ShaderMaterial;
  sky: THREE.Mesh;
  celestial = new THREE.Group();
  stars: THREE.Points;
  cloudGroup = new THREE.Group();
  cloudMat: THREE.ShaderMaterial;
  cloudPeriod = 0;

  // player
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0; pitch = 0;
  onGround = false; flying = false; sprinting = false; sneaking = false;
  inWater = false; headInWater = false; inLava = false; headInLava = false;
  health = 20; air = 300; dead = false; hurtTime = 0; regenTimer = 0; damageTimer = 0;
  fallStart = 0; spawn: [number, number, number] = [0, 80, 0];
  bobPhase = 0; bobAmt = 0; stepDist = 0; fovCur = 70; eyeCur = 1.62;
  lastSpace = 0; lastW = 0; hideHud = false; debug = false;

  // inventory
  inventory: (Slot | null)[] = new Array(36).fill(null);
  selected = 0; invVersion = 0;

  // input
  keys = new Set<string>();
  mouseL = false; mouseR = false; locked = false; intentionalUnlock = false;
  breakTarget: { x: number; y: number; z: number } | null = null; breakProgress = 0; breakSoundT = 0;
  actionCooldown = 0; placeCooldown = 0;
  swing = 1; equip = 1; lastHeld = -1;

  // entities
  particles: Particles;
  items: ItemEntity[] = [];
  falling: FallingBlock[] = [];
  tnts: PrimedTNT[] = [];
  mobs: Mob[] = [];

  // misc
  highlight: THREE.LineSegments;
  crack: THREE.Mesh;
  handMesh: THREE.Object3D | null = null;
  handMat = new THREE.MeshBasicMaterial({ vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
  armMat: THREE.MeshBasicMaterial;
  time = 1000;
  running = true;
  raf = 0;
  lastT = performance.now();
  fps = 0; frames = 0; fpsT = 0;
  loadOrder: [number, number][] = [];
  lastPC = [NaN, NaN];
  ready = false;
  uiTimer = 0;
  target: { x: number; y: number; z: number; nx: number; ny: number; nz: number; id: number; t: number } | null = null;
  menuAngle = 0;
  daylight = 1;
  unloadTimer = 0;
  private listeners: [EventTarget, string, any, any?][] = [];

  constructor(container: HTMLElement, opts: EngineOptions) {
    this.opts = opts;
    this.container = container;
    this.settings = { ...opts.settings };
    this.menu = opts.mode === 'menu';
    if (!this.menu) this.mode = opts.mode as GameMode;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.autoClear = false;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';

    this.camera = new THREE.PerspectiveCamera(this.settings.fov, container.clientWidth / container.clientHeight, 0.05, 1200);
    this.camera.rotation.order = 'YXZ';
    this.handCamera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.01, 10);

    this.atlas = new THREE.CanvasTexture(getAtlas());
    this.atlas.magFilter = THREE.NearestFilter;
    this.atlas.minFilter = THREE.NearestFilter;
    this.atlas.generateMipmaps = false;
    this.atlas.colorSpace = THREE.NoColorSpace;
    this.handMat.map = this.atlas;

    const common = () => ({
      map: { value: this.atlas }, uDaylight: { value: 1 }, uFogColor: { value: new THREE.Color() }, uFogNear: { value: 50 }, uFogFar: { value: 90 },
      uAlphaTest: { value: 0.5 }, uOpacity: { value: 1 }, uTime: { value: 0 }, uWave: { value: 0 }, uGamma: { value: 0.1 },
    });
    this.chunkMat = new THREE.ShaderMaterial({ vertexShader: CHUNK_VERT, fragmentShader: CHUNK_FRAG, uniforms: common(), vertexColors: true });
    const tu = common();
    tu.uAlphaTest.value = 0.01; tu.uOpacity.value = 0.72;
    this.transMat = new THREE.ShaderMaterial({ vertexShader: CHUNK_VERT, fragmentShader: CHUNK_FRAG, uniforms: tu, vertexColors: true, transparent: true, depthWrite: false });
    this.transMat.uniforms = tu;
    // share fog/daylight uniforms
    this.transMat.uniforms.uDaylight = this.chunkMat.uniforms.uDaylight;
    this.transMat.uniforms.uFogColor = this.chunkMat.uniforms.uFogColor;
    this.transMat.uniforms.uFogNear = this.chunkMat.uniforms.uFogNear;
    this.transMat.uniforms.uFogFar = this.chunkMat.uniforms.uFogFar;
    this.transMat.uniforms.uTime = this.chunkMat.uniforms.uTime;

    // sky
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunset: { value: new THREE.Color(1, 0.45, 0.15) }, uSunsetK: { value: 0 }, uUnder: { value: 0 } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    const mkCel = (moon: boolean) => {
      const t = new THREE.CanvasTexture(makeSunCanvas(moon));
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.NoColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(moon ? 70 : 90, moon ? 70 : 90), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: moon ? THREE.NormalBlending : THREE.AdditiveBlending }));
      m.position.set(moon ? -400 : 400, 0, 0);
      m.rotation.y = moon ? Math.PI / 2 : -Math.PI / 2;
      m.renderOrder = -8;
      this.celestial.add(m);
    };
    mkCel(false); mkCel(true);
    const sp: number[] = [];
    for (let i = 0; i < 1400; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      sp.push(Math.cos(th) * r * 420, u * 420, Math.sin(th) * r * 420);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
    this.stars.renderOrder = -9;
    this.celestial.add(this.stars);
    this.scene.add(this.celestial);

    // clouds
    this.cloudMat = new THREE.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uFog: { value: new THREE.Color() }, uFar: { value: 600 } } });
    this.buildClouds(opts.seed);
    this.scene.add(this.cloudGroup);

    this.world = new World(opts.seed);
    this.particles = new Particles(this.atlas);
    this.scene.add(this.particles.points);

    // highlight
    const hg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), new THREE.MeshBasicMaterial({ map: this.atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    this.crack.visible = false;
    this.scene.add(this.crack);

    // arm
    const ac = document.createElement('canvas'); ac.width = 4; ac.height = 12;
    const actx = ac.getContext('2d')!;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 4; x++) {
      const f = 0.92 + Math.random() * 0.12;
      actx.fillStyle = y < 3 ? `rgb(${0 * f},${170 * f},${170 * f})` : `rgb(${196 * f | 0},${146 * f | 0},${112 * f | 0})`;
      actx.fillRect(x, y, 1, 1);
    }
    const at = new THREE.CanvasTexture(ac); at.magFilter = THREE.NearestFilter; at.minFilter = THREE.NearestFilter; at.colorSpace = THREE.NoColorSpace;
    this.armMat = new THREE.MeshBasicMaterial({ map: at });

    // load save / spawn
    const save = opts.save;
    if (save) {
      for (const [k, arr] of save.edits) {
        const m = new Map<number, number>();
        for (let i = 0; i < arr.length; i += 2) m.set(arr[i], arr[i + 1]);
        this.world.edits.set(k, m);
      }
      this.pos.set(save.player.x, save.player.y, save.player.z);
      this.yaw = save.player.yaw; this.pitch = save.player.pitch;
      this.health = save.player.health; this.flying = save.player.flying && this.mode === 'creative';
      this.time = save.time; this.spawn = save.spawn;
      this.inventory = save.inventory.map((s) => (s ? { ...s } : null));
      while (this.inventory.length < 36) this.inventory.push(null);
    } else {
      this.spawn = this.world.findSpawn();
      this.pos.set(...this.spawn);
      this.yaw = Math.random() * Math.PI * 2;
      if (this.mode === 'creative') {
        const start = [B.GRASS, B.COBBLESTONE, B.OAK_PLANKS, B.OAK_LOG, B.GLASS, B.TORCH, B.STONE_BRICKS, B.GLOWSTONE, B.TNT];
        start.forEach((id, i) => (this.inventory[i] = { id, count: 1 }));
      }
    }
    if (this.menu) {
      const sp = this.world.findSpawn();
      this.pos.set(sp[0], Math.max(sp[1] + 12, SEA + 18), sp[2]);
      this.pitch = -0.12;
      this.settings.renderDistance = Math.min(this.settings.renderDistance, 5);
    }
    this.fovCur = this.settings.fov;
    Sound.musicEnabled = this.settings.music;
    Sound.setVolume(this.settings.volume / 100);

    this.bindEvents();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------------------------------------------------------- setup helpers
  private buildClouds(seed: number) {
    const cv = makeCloudCanvas(seed);
    const N = 128, cell = 12, thick = 4;
    const data = cv.getContext('2d')!.getImageData(0, 0, 256, 256).data;
    const on = (x: number, z: number) => data[((((z % N) + N) % N) * 2 * 256 + (((x % N) + N) % N) * 2) * 4 + 3] > 0;
    const pos: number[] = [], col: number[] = [];
    const quad = (v: number[][], s: number) => {
      for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...v[i]); col.push(s, s, s); }
    };
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      if (!on(x, z)) continue;
      const x0 = x * cell, x1 = x0 + cell, z0 = z * cell, z1 = z0 + cell, y0 = 0, y1 = thick;
      quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], 1);
      quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 0.72);
      if (!on(x + 1, z)) quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], 0.86);
      if (!on(x - 1, z)) quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 0.86);
      if (!on(x, z + 1)) quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.93);
      if (!on(x, z - 1)) quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], 0.93);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.cloudPeriod = N * cell;
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(g, this.cloudMat);
      m.frustumCulled = false;
      this.cloudGroup.add(m);
    }
  }

  private on(t: EventTarget, ev: string, fn: any, o?: any) { t.addEventListener(ev, fn, o); this.listeners.push([t, ev, fn, o]); }

  private bindEvents() {
    this.on(window, 'resize', () => {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.handCamera.aspect = w / h; this.handCamera.updateProjectionMatrix();
    });
    if (this.menu) return;
    this.on(document, 'pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === this.renderer.domElement;
      if (!this.locked) { this.keys.clear(); this.mouseL = false; this.mouseR = false; this.sprinting = false; }
      if (was && !this.locked && !this.intentionalUnlock && !this.dead) this.opts.onPause?.();
      this.intentionalUnlock = false;
    });
    this.on(document, 'mousemove', (e: MouseEvent) => {
      if (!this.locked) return;
      const s = 0.0022 * this.settings.sensitivity / 100;
      this.yaw -= e.movementX * s;
      this.pitch -= e.movementY * s;
      this.pitch = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, this.pitch));
    });
    this.on(document, 'mousedown', (e: MouseEvent) => {
      if (!this.locked) return;
      Sound.ensure();
      if (e.button === 0) { this.mouseL = true; this.actionCooldown = 0.3; this.attackOrStartBreak(); }
      else if (e.button === 2) { this.mouseR = true; this.placeCooldown = 0; this.use(); this.placeCooldown = 0.25; }
      else if (e.button === 1) { e.preventDefault(); this.pickBlock(); }
    });
    this.on(document, 'mouseup', (e: MouseEvent) => {
      if (e.button === 0) { this.mouseL = false; this.breakTarget = null; this.breakProgress = 0; }
      if (e.button === 2) this.mouseR = false;
    });
    this.on(document, 'contextmenu', (e: Event) => e.preventDefault());
    this.on(window, 'wheel', (e: WheelEvent) => {
      if (!this.locked) return;
      this.select((this.selected + (e.deltaY > 0 ? 1 : -1) + 9) % 9);
    }, { passive: true });
    this.on(window, 'keydown', (e: KeyboardEvent) => {
      if (!this.locked) return;
      if (['F1', 'F3', 'Tab', 'Space', 'Slash'].includes(e.code) || e.ctrlKey) e.preventDefault();
      if (e.repeat) { this.keys.add(e.code); return; }
      const now = performance.now();
      switch (e.code) {
        case 'Space':
          if (this.mode === 'creative' && now - this.lastSpace < 300) { this.flying = !this.flying; this.vel.y = 0; this.lastSpace = 0; }
          else this.lastSpace = now;
          break;
        case 'KeyW':
          if (now - this.lastW < 280) this.sprinting = true;
          this.lastW = now;
          break;
        case 'ControlLeft': case 'ControlRight': this.sprinting = true; break;
        case 'KeyE': this.intentionalUnlock = true; document.exitPointerLock(); this.opts.onInventory?.(); break;
        case 'KeyT': this.intentionalUnlock = true; document.exitPointerLock(); this.opts.onChat?.(''); e.preventDefault(); break;
        case 'Slash': this.intentionalUnlock = true; document.exitPointerLock(); this.opts.onChat?.('/'); break;
        case 'F3': this.debug = !this.debug; break;
        case 'F1': this.hideHud = !this.hideHud; break;
        case 'KeyQ': this.dropSelected(e.ctrlKey); break;
      }
      if (e.code.startsWith('Digit')) { const n = parseInt(e.code.slice(5), 10); if (n >= 1 && n <= 9) this.select(n - 1); }
      this.keys.add(e.code);
    });
    this.on(window, 'keyup', (e: KeyboardEvent) => { this.keys.delete(e.code); });
  }

  lock() {
    if (this.menu) return;
    Sound.ensure();
    try { const p = this.renderer.domElement.requestPointerLock() as any; if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ }
  }

  select(i: number) { if (this.selected !== i) { this.selected = i; this.equip = 0; this.pushUI(true); } }

  setSettings(s: Settings) {
    const rdChanged = s.renderDistance !== this.settings.renderDistance;
    this.settings = { ...s };
    Sound.musicEnabled = s.music;
    Sound.setVolume(s.volume / 100);
    if (rdChanged) this.lastPC = [NaN, NaN];
  }

  setInventory(inv: (Slot | null)[]) { this.inventory = inv.map((s) => (s ? { ...s } : null)); this.invVersion++; this.pushUI(true); }

  // ---------------------------------------------------------------- chunks
  private updateChunks(budgetMs: number) {
    const pcx = Math.floor(this.pos.x / 16), pcz = Math.floor(this.pos.z / 16);
    const R = this.settings.renderDistance;
    if (pcx !== this.lastPC[0] || pcz !== this.lastPC[1]) {
      this.lastPC = [pcx, pcz];
      const list: [number, number, number][] = [];
      for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
        const d = dx * dx + dz * dz;
        if (d <= (R + 1.5) * (R + 1.5)) list.push([pcx + dx, pcz + dz, d]);
      }
      list.sort((a, b) => a[2] - b[2]);
      this.loadOrder = list.map((l) => [l[0], l[1]]);
    }
    const t0 = performance.now();
    // generate
    for (const [cx, cz] of this.loadOrder) {
      if (performance.now() - t0 > budgetMs * 0.5) break;
      if (!this.world.getChunk(cx, cz)) {
        const c = this.world.generate(cx, cz);
        this.world.lightChunk(c);
        this.maybeSpawnMobs(c);
      }
    }
    // mesh
    const R2 = (R + 0.5) * (R + 0.5);
    for (const [cx, cz] of this.loadOrder) {
      if (performance.now() - t0 > budgetMs) break;
      const dx = cx - pcx, dz = cz - pcz;
      if (dx * dx + dz * dz > R2) continue;
      const c = this.world.getChunk(cx, cz);
      if (!c || !c.dirty) continue;
      if (!this.neighborsReady(cx, cz)) continue;
      this.buildMesh(c);
    }
  }

  private neighborsReady(cx: number, cz: number) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!this.world.getChunk(cx + dx, cz + dz)) return false;
    return true;
  }

  private flushDirtyNear() {
    const pcx = Math.floor(this.pos.x / 16), pcz = Math.floor(this.pos.z / 16);
    const R = this.settings.renderDistance;
    for (const c of this.world.chunks.values()) {
      if (!c.dirty) continue;
      if (Math.abs(c.cx - pcx) > R || Math.abs(c.cz - pcz) > R) continue;
      if (c.meshes.length === 0 && Math.abs(c.cx - pcx) > 2) continue;
      if (this.neighborsReady(c.cx, c.cz)) this.buildMesh(c);
    }
  }

  private buildMesh(c: Chunk) {
    const data = meshChunk(this.world, c);
    this.disposeMeshes(c);
    const mk = (d: MeshData, mat: THREE.ShaderMaterial) => {
      if (d.ind.length === 0) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
      g.setAttribute('color', new THREE.BufferAttribute(d.col, 3));
      g.setAttribute('light', new THREE.BufferAttribute(d.lig, 2));
      g.setIndex(new THREE.BufferAttribute(d.ind, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(c.cx * 16 + 8, CH / 2, c.cz * 16 + 8), Math.sqrt(8 * 8 * 2 + (CH / 2) * (CH / 2)));
      const m = new THREE.Mesh(g, mat);
      m.matrixAutoUpdate = false;
      this.scene.add(m);
      c.meshes.push(m);
    };
    mk(data.opaque, this.chunkMat);
    mk(data.trans, this.transMat);
    c.dirty = false;
  }

  private disposeMeshes(c: Chunk) {
    for (const m of c.meshes) { this.scene.remove(m); m.geometry.dispose(); }
    c.meshes = [];
  }

  private unloadFar() {
    const pcx = Math.floor(this.pos.x / 16), pcz = Math.floor(this.pos.z / 16);
    const R = this.settings.renderDistance;
    for (const [k, c] of this.world.chunks) {
      const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
      if (d > R + 1 && c.meshes.length) { this.disposeMeshes(c); c.dirty = true; }
      if (d > R + 3) { this.disposeMeshes(c); this.world.chunks.delete(k); }
    }
    (this.world as any).lastKey = -1;
  }

  private maybeSpawnMobs(c: Chunk) {
    if (this.mobs.length > 28) return;
    const r = hash2(c.cx, c.cz, this.world.seed + 77);
    if (r > 0.14) return;
    const kinds: ('pig' | 'cow' | 'sheep')[] = ['pig', 'cow', 'sheep'];
    const kind = kinds[Math.floor(hash2(c.cx, c.cz, 5) * 3)];
    const n = 2 + Math.floor(hash2(c.cx, c.cz, 9) * 3);
    for (let i = 0; i < n; i++) {
      const lx = Math.floor(hash2(c.cx * 7 + i, c.cz, 3) * 14) + 1, lz = Math.floor(hash2(c.cx, c.cz * 7 + i, 4) * 14) + 1;
      let y = CH - 2;
      while (y > 0 && c.blocks[(y << 8) | (lz << 4) | lx] === B.AIR) y--;
      const g = c.blocks[(y << 8) | (lz << 4) | lx];
      if (g !== B.GRASS) continue;
      const m = new Mob(kind, c.cx * 16 + lx + 0.5, y + 1, c.cz * 16 + lz + 0.5);
      this.mobs.push(m);
      this.scene.add(m.group);
    }
  }

  // ---------------------------------------------------------------- interaction
  private eye() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeCur, this.pos.z); }
  private lookDir() {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  raycast(o: THREE.Vector3, d: THREE.Vector3, maxD: number) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
    let tmx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
    let tmy = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
    let tmz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxD) {
      const id = this.world.getBlock(x, y, z);
      if (id && BLOCKS[id].selectable) return { x, y, z, nx, ny, nz, id, t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }

  private reach() { return this.mode === 'creative' ? 5 : 4.5; }

  private attackOrStartBreak() {
    this.swing = 0;
    const o = this.eye(), d = this.lookDir();
    const bt = this.target ? this.target.t : this.reach();
    let best: Mob | null = null, bd = Math.min(bt, 3.5);
    for (const m of this.mobs) { const t = m.rayHit(o, d, bd); if (t >= 0 && t < bd) { bd = t; best = m; } }
    if (best) {
      if (best.damage(this.mode === 'creative' ? 100 : 2, this.pos) && best.health <= 0) this.particles.smoke(best.pos.x, best.pos.y + 0.5, best.pos.z, 12, 1);
      this.mouseL = false;
      return;
    }
    if (this.mode === 'creative' && this.target) this.breakBlock(this.target.x, this.target.y, this.target.z, true);
  }

  breakBlock(x: number, y: number, z: number, byPlayer: boolean) {
    const id = this.world.getBlock(x, y, z);
    if (!id || BLOCKS[id].hardness < 0 && byPlayer && this.mode !== 'creative') return;
    if (id === B.BEDROCK && this.mode !== 'creative') return;
    let fill: number = B.AIR;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
      if (this.world.getBlock(x + dx, y + dy, z + dz) === B.WATER) { fill = B.WATER; break; }
    }
    this.world.setBlock(x, y, z, fill);
    this.particles.blockBreak(this.world, x, y, z, id, this.daylight);
    Sound.dig(BLOCKS[id].sound);
    if (byPlayer && this.mode === 'survival') {
      const drop = BLOCKS[id].drop;
      if (drop) this.spawnItem(drop, 1, x + 0.5, y + 0.3, z + 0.5);
    }
    this.afterChange(x, y, z);
  }

  private afterChange(x: number, y: number, z: number) {
    // plants / torches above lose support
    const above = this.world.getBlock(x, y + 1, z);
    const below = this.world.getBlock(x, y, z);
    if (above && (isPlant(above) || above === B.CACTUS) && !SOLID[below] && below !== above) {
      this.breakBlock(x, y + 1, z, this.mode === 'survival');
    }
    if (above === B.SAND || above === B.GRAVEL) this.startFalling(x, y + 1, z);
    this.flushDirtyNear();
  }

  private startFalling(x: number, y: number, z: number) {
    const id = this.world.getBlock(x, y, z);
    if ((id !== B.SAND && id !== B.GRAVEL) || SOLID[this.world.getBlock(x, y - 1, z)]) return;
    this.world.setBlock(x, y, z, B.AIR);
    const f = new FallingBlock(id, x, y, z, this.atlas);
    this.falling.push(f); this.scene.add(f.mesh);
    this.startFalling(x, y + 1, z);
    this.flushDirtyNear();
  }

  private use() {
    if (!this.target) return;
    const t = this.target;
    this.swing = 0;
    if (t.id === B.TNT && !this.sneaking) {
      this.world.setBlock(t.x, t.y, t.z, B.AIR);
      this.primeTNT(t.x, t.y, t.z, 4);
      this.flushDirtyNear();
      return;
    }
    const slot = this.inventory[this.selected];
    if (!slot) return;
    const id = slot.id;
    let px = t.x + t.nx, py = t.y + t.ny, pz = t.z + t.nz;
    const tb = this.world.getBlock(t.x, t.y, t.z);
    if (tb === B.TALL_GRASS || tb === B.DEAD_BUSH) { px = t.x; py = t.y; pz = t.z; }
    if (py < 0 || py >= CH) return;
    const cur = this.world.getBlock(px, py, pz);
    if (cur !== B.AIR && cur !== B.WATER && cur !== B.TALL_GRASS && cur !== B.LAVA) return;
    const below = this.world.getBlock(px, py - 1, pz);
    const bd = BLOCKS[id];
    if (bd.shape === 'cross') {
      if (id === B.CACTUS || id === B.SUGAR_CANE || id === B.DEAD_BUSH) { if (![B.SAND, B.GRASS, B.DIRT, id].includes(below as any)) return; }
      else if (![B.GRASS, B.DIRT, B.SNOW_GRASS].includes(below as any) && !(id === B.BROWN_MUSHROOM || id === B.RED_MUSHROOM)) return;
      if (cur === B.WATER) return;
    }
    if (bd.shape === 'torch' && !SOLID[below]) return;
    if (bd.solid) {
      const hw = 0.3;
      if (px + 1 > this.pos.x - hw && px < this.pos.x + hw && pz + 1 > this.pos.z - hw && pz < this.pos.z + hw && py + 1 > this.pos.y && py < this.pos.y + 1.8) return;
      for (const m of this.mobs) if (px + 1 > m.pos.x - m.hw && px < m.pos.x + m.hw && pz + 1 > m.pos.z - m.hw && pz < m.pos.z + m.hw && py + 1 > m.pos.y && py < m.pos.y + m.h) return;
    }
    this.world.setBlock(px, py, pz, id);
    Sound.place(bd.sound);
    if (this.mode === 'survival') {
      slot.count--;
      if (slot.count <= 0) this.inventory[this.selected] = null;
      this.invVersion++; this.pushUI(true);
    }
    if (id === B.SAND || id === B.GRAVEL) this.startFalling(px, py, pz);
    this.flushDirtyNear();
  }

  private pickBlock() {
    if (!this.target) return;
    const id = this.target.id;
    for (let i = 0; i < 9; i++) if (this.inventory[i]?.id === id) { this.select(i); return; }
    if (this.mode !== 'creative') return;
    let slot = this.selected;
    for (let i = 0; i < 9; i++) if (!this.inventory[i]) { slot = i; break; }
    this.inventory[slot] = { id, count: 1 };
    this.select(slot);
    this.invVersion++; this.pushUI(true);
  }

  private dropSelected(all: boolean) {
    const s = this.inventory[this.selected];
    if (!s) return;
    const n = all ? s.count : 1;
    const d = this.lookDir();
    const e = this.eye();
    this.spawnItem(s.id, n, e.x + d.x * 0.3, e.y - 0.3, e.z + d.z * 0.3, new THREE.Vector3(d.x * 6, d.y * 6 + 2, d.z * 6), 1.5);
    if (this.mode === 'survival') { s.count -= n; if (s.count <= 0) this.inventory[this.selected] = null; this.invVersion++; this.pushUI(true); }
    this.swing = 0;
  }

  spawnItem(id: number, count: number, x: number, y: number, z: number, vel?: THREE.Vector3, delay = 0.5) {
    const it = new ItemEntity(id, count, x, y, z, this.atlas, vel);
    it.pickupDelay = delay;
    this.items.push(it); this.scene.add(it.mesh);
  }

  addItem(id: number, count: number): number {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < 36 && count > 0; i++) {
        const s = this.inventory[i];
        if (pass === 0 && s && s.id === id && s.count < 64) { const a = Math.min(64 - s.count, count); s.count += a; count -= a; }
        if (pass === 1 && !s) { const a = Math.min(64, count); this.inventory[i] = { id, count: a }; count -= a; }
      }
    }
    this.invVersion++; this.pushUI(true);
    return count;
  }

  primeTNT(x: number, y: number, z: number, fuse: number) {
    const t = new PrimedTNT(x, y, z, this.atlas, fuse);
    this.tnts.push(t); this.scene.add(t.mesh);
    Sound.fuse();
  }

  explode(cx: number, cy: number, cz: number, power: number) {
    Sound.explode();
    this.particles.smoke(cx, cy, cz, 40, power * 1.5, true);
    const r = Math.ceil(power);
    for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) {
      const d = Math.sqrt(x * x + y * y + z * z);
      if (d > power * (0.75 + hash2(x * 31 + y, z + Math.floor(cx), 1) * 0.5)) continue;
      const bx = Math.floor(cx) + x, by = Math.floor(cy) + y, bz = Math.floor(cz) + z;
      const id = this.world.getBlock(bx, by, bz);
      if (!id || id === B.BEDROCK || id === B.OBSIDIAN || id === B.WATER || id === B.LAVA) continue;
      if (id === B.TNT) { this.world.setBlock(bx, by, bz, B.AIR); this.primeTNT(bx, by, bz, 0.5 + Math.random()); continue; }
      this.world.setBlock(bx, by, bz, B.AIR);
      if (this.mode === 'survival' && Math.random() < 0.25 && BLOCKS[id].drop) this.spawnItem(BLOCKS[id].drop, 1, bx + 0.5, by + 0.5, bz + 0.5);
      if (Math.random() < 0.08) this.particles.blockBreak(this.world, bx, by, bz, id, this.daylight, 2);
    }
    const pd = this.pos.distanceTo(new THREE.Vector3(cx, cy, cz));
    if (pd < power * 2) {
      const k = 1 - pd / (power * 2);
      this.damage(Math.floor(k * 16));
      const dir = new THREE.Vector3(this.pos.x - cx, this.pos.y + 1 - cy, this.pos.z - cz).normalize();
      this.vel.addScaledVector(dir, k * 14);
    }
    for (const m of this.mobs) {
      const md = m.pos.distanceTo(new THREE.Vector3(cx, cy, cz));
      if (md < power * 2) { m.hurtTime = 0; m.damage(20 * (1 - md / (power * 2)), new THREE.Vector3(cx, cy, cz)); }
    }
    for (const it of this.items) { const dd = new THREE.Vector3().subVectors(it.pos, new THREE.Vector3(cx, cy, cz)); if (dd.length() < power * 1.5) it.vel.addScaledVector(dd.normalize(), 8); }
    this.flushDirtyNear();
  }

  damage(n: number) {
    if (this.mode === 'creative' || this.dead || n <= 0) return;
    this.health = Math.max(0, this.health - n);
    this.hurtTime = 0.5;
    Sound.hurt();
    if (this.health <= 0) {
      this.dead = true;
      this.intentionalUnlock = true;
      document.exitPointerLock();
      // drop inventory
      for (let i = 0; i < 36; i++) { const s = this.inventory[i]; if (s) { this.spawnItem(s.id, s.count, this.pos.x, this.pos.y + 1, this.pos.z, new THREE.Vector3((Math.random() - 0.5) * 6, 4, (Math.random() - 0.5) * 6), 2); this.inventory[i] = null; } }
      this.invVersion++;
    }
    this.pushUI(true);
  }

  respawn() {
    this.dead = false; this.health = 20; this.air = 300;
    this.pos.set(this.spawn[0], this.spawn[1], this.spawn[2]);
    const sy = this.world.surfaceY(Math.floor(this.spawn[0]), Math.floor(this.spawn[2]));
    this.pos.y = Math.max(sy, this.spawn[1]);
    this.vel.set(0, 0, 0); this.fallStart = this.pos.y;
    this.pushUI(true);
  }

  // ---------------------------------------------------------------- commands
  runCommand(cmd: string): string {
    const p = cmd.trim().replace(/^\//, '').split(/\s+/);
    const c = p[0]?.toLowerCase();
    switch (c) {
      case 'gamemode': case 'gm': {
        const m = (p[1] || '').toLowerCase();
        if (['creative', 'c', '1'].includes(m)) { this.mode = 'creative'; this.health = 20; }
        else if (['survival', 's', '0'].includes(m)) { this.mode = 'survival'; this.flying = false; }
        else return '用法: /gamemode <survival|creative>';
        this.pushUI(true);
        return `已将自己的游戏模式设置为${this.mode === 'creative' ? '创造' : '生存'}模式`;
      }
      case 'time': {
        const v = (p[2] || p[1] || '').toLowerCase();
        const map: Record<string, number> = { day: 1000, noon: 6000, sunset: 12000, night: 13000, midnight: 18000, sunrise: 23000 };
        const n = map[v] ?? parseInt(v, 10);
        if (isNaN(n)) return '用法: /time set <day|night|noon|midnight|数值>';
        if (p[1] === 'add') this.time += n; else this.time = n;
        return `已将时间设为 ${Math.floor(this.time) % 24000}`;
      }
      case 'tp': case 'teleport': {
        const rel = (s: string, base: number) => s.startsWith('~') ? base + (parseFloat(s.slice(1)) || 0) : parseFloat(s);
        const x = rel(p[1] || '~', this.pos.x), y = rel(p[2] || '~', this.pos.y), z = rel(p[3] || '~', this.pos.z);
        if ([x, y, z].some(isNaN)) return '用法: /tp <x> <y> <z>';
        this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.fallStart = y;
        return `已将玩家传送到 ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
      }
      case 'seed': return `种子: [${this.world.seed}]`;
      case 'kill': this.mode === 'creative' ? (this.mode = 'survival', this.damage(999), this.mode = 'creative') : this.damage(999); return '玩家被杀死了';
      case 'spawnpoint': this.spawn = [this.pos.x, this.pos.y, this.pos.z]; return '已设置出生点';
      case 'give': {
        const name = (p[1] || '').replace('minecraft:', '');
        const b = BLOCKS.find((bb) => bb && bb.key === name);
        if (!b || !b.selectable) return `未知的物品 '${name}'`;
        const n = Math.min(64 * 36, parseInt(p[2] || '1', 10) || 1);
        this.addItem(b.id, n);
        return `已将 [${b.name}] × ${n} 给予玩家`;
      }
      case 'summon': {
        const k = (p[1] || '').replace('minecraft:', '');
        const d = this.lookDir();
        const x = this.pos.x + d.x * 3, z = this.pos.z + d.z * 3;
        if (k === 'tnt') { this.primeTNT(Math.floor(x), this.pos.y, Math.floor(z), 4); return '成功生成新的TNT'; }
        if (['pig', 'cow', 'sheep'].includes(k)) { const m = new Mob(k as any, x, this.pos.y + 0.5, z); this.mobs.push(m); this.scene.add(m.group); return `成功生成新的${k}`; }
        return '用法: /summon <pig|cow|sheep|tnt>';
      }
      case 'clear': this.inventory = new Array(36).fill(null); this.invVersion++; this.pushUI(true); return '已清除物品栏';
      case 'help': return '可用命令: /gamemode /time /tp /give /summon /seed /kill /spawnpoint /clear';
      default: return `未知的命令: ${c}。输入 /help 查看帮助`;
    }
  }

  // ---------------------------------------------------------------- player physics
  private updatePlayer(dt: number) {
    const k = this.keys;
    const fwd = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    const str = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    this.sneaking = k.has('ShiftLeft') && !this.flying;
    if (fwd <= 0 || this.sneaking || (this.mode === 'survival' && false)) this.sprinting = false;
    const feet = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.1), Math.floor(this.pos.z));
    const head = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + this.eyeCur), Math.floor(this.pos.z));
    const wasWater = this.inWater;
    this.inWater = feet === B.WATER || this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.8), Math.floor(this.pos.z)) === B.WATER;
    this.headInWater = head === B.WATER;
    this.inLava = feet === B.LAVA || this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.8), Math.floor(this.pos.z)) === B.LAVA;
    this.headInLava = head === B.LAVA;
    if (this.inWater && !wasWater && this.vel.y < -4) { Sound.splash(); for (let i = 0; i < 12; i++) this.particles.bubble(this.pos.x + Math.random() - 0.5, this.pos.y + 0.5, this.pos.z + Math.random() - 0.5); }
    if (this.inWater || this.inLava) this.flying = this.flying && this.mode === 'creative';

    let speed = this.flying ? (this.sprinting ? 21.6 : 10.9) : this.sneaking ? 1.31 : this.sprinting ? 5.612 : 4.317;
    if ((this.inWater || this.inLava) && !this.flying) speed = this.inLava ? 1.5 : (this.sprinting ? 5.6 : 2.2);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let mx = -sy * fwd + cy * str, mz = -cy * fwd - sy * str;
    const ml = Math.hypot(mx, mz);
    if (ml > 0) { mx /= ml; mz /= ml; }
    const accel = this.flying ? 8 : this.onGround ? 18 : (this.inWater ? 6 : 3.2);
    const f = Math.min(1, accel * dt);
    this.vel.x += (mx * speed - this.vel.x) * f;
    this.vel.z += (mz * speed - this.vel.z) * f;

    if (this.flying) {
      const vy = (k.has('Space') ? 1 : 0) - (k.has('ShiftLeft') ? 1 : 0);
      this.vel.y += (vy * 8 - this.vel.y) * Math.min(1, 10 * dt);
    } else if (this.inWater || this.inLava) {
      this.vel.y -= (this.inLava ? 6 : 9) * dt;
      this.vel.y *= Math.pow(this.inLava ? 0.1 : 0.25, dt);
      if (k.has('Space')) { this.vel.y = Math.min(this.vel.y + 30 * dt, this.inLava ? 2 : 3.2); }
      if (this.sneaking) this.vel.y = Math.max(this.vel.y - 20 * dt, -3);
      this.fallStart = this.pos.y;
    } else {
      this.vel.y -= 32 * dt;
      this.vel.y = Math.max(this.vel.y, -78);
      if (k.has('Space') && this.onGround) {
        this.vel.y = 9.0;
        if (this.sprinting) { this.vel.x += -sy * 2.2; this.vel.z += -cy * 2.2; }
      }
    }
    const prevGround = this.onGround;
    const r = moveBox(this.world, this.pos, this.vel, dt, 0.3, 1.8, this.sneaking && this.onGround);
    // water edge climb
    if ((r.hitX || r.hitZ) && this.inWater && k.has('Space')) this.vel.y = 4;
    this.onGround = r.onGround;
    if (this.onGround && this.flying && this.mode === 'creative' && this.vel.y <= 0 && k.has('ShiftLeft')) this.flying = false;
    if (r.hitX || r.hitZ) if (this.sprinting && !this.flying && Math.hypot(this.vel.x, this.vel.z) < 0.5) this.sprinting = false;
    // fall damage
    if (!this.onGround && !this.flying && !this.inWater) { if (this.vel.y > 0 || prevGround) this.fallStart = Math.max(this.fallStart, this.pos.y); if (prevGround) this.fallStart = this.pos.y; }
    if (this.onGround && !prevGround) {
      const fall = this.fallStart - this.pos.y;
      if (fall > 3.5 && this.mode === 'survival') this.damage(Math.floor(fall - 3));
      if (fall > 1) { const gb = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.2), Math.floor(this.pos.z)); if (gb) Sound.step(BLOCKS[gb].sound); }
      this.fallStart = this.pos.y;
    }
    if (this.onGround || this.flying) this.fallStart = this.pos.y;
    // footsteps / bobbing
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 0.5) {
      this.stepDist += hs * dt;
      this.bobPhase += hs * dt * 1.35;
      if (this.stepDist > 1.7) {
        this.stepDist = 0;
        const gb = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.2), Math.floor(this.pos.z));
        if (gb) Sound.step(BLOCKS[gb].sound);
      }
    }
    if (this.inWater && hs > 1 && Math.random() < dt * 2) Sound.swim();
    this.bobAmt += ((this.onGround && !this.flying ? Math.min(1, hs / 4.3) : 0) - this.bobAmt) * Math.min(1, dt * 10);
    // air / hazards (survival)
    if (this.mode === 'survival') {
      if (this.headInWater) {
        this.air = Math.max(-20, this.air - dt * 20);
        if (Math.random() < dt * 3) this.particles.bubble(this.pos.x, this.pos.y + this.eyeCur, this.pos.z);
        if (this.air <= 0) { this.damageTimer -= dt; if (this.damageTimer <= 0) { this.damageTimer = 1; this.damage(2); } }
      } else this.air = Math.min(300, this.air + dt * 100);
      if (this.inLava) { this.damageTimer -= dt; if (this.damageTimer <= 0) { this.damageTimer = 0.5; this.damage(4); } }
      if (this.pos.y < -30) { this.damageTimer -= dt; if (this.damageTimer <= 0) { this.damageTimer = 0.5; this.damage(4); } }
      const cactusNear = [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35], [0, 0]].some(([dx, dz]) => this.world.getBlock(Math.floor(this.pos.x + dx), Math.floor(this.pos.y + 0.5), Math.floor(this.pos.z + dz)) === B.CACTUS || this.world.getBlock(Math.floor(this.pos.x + dx), Math.floor(this.pos.y - 0.05), Math.floor(this.pos.z + dz)) === B.CACTUS);
      if (cactusNear) { this.damageTimer -= dt; if (this.damageTimer <= 0) { this.damageTimer = 0.5; this.damage(1); } }
      this.regenTimer += dt;
      if (this.regenTimer > 4 && this.health < 20 && this.health > 0) { this.regenTimer = 0; this.health++; this.pushUI(true); }
    } else {
      this.air = 300;
      if (this.pos.y < -64) { this.pos.y = CH + 10; this.vel.y = 0; }
    }
    // eye height
    const targetEye = this.sneaking ? 1.32 : 1.62;
    this.eyeCur += (targetEye - this.eyeCur) * Math.min(1, dt * 14);
  }

  private updateBreaking(dt: number) {
    this.actionCooldown -= dt;
    this.placeCooldown -= dt;
    if (this.mouseR && this.placeCooldown <= 0) { this.use(); this.placeCooldown = 0.22; }
    if (!this.mouseL) { this.crack.visible = false; return; }
    if (!this.target) { this.breakTarget = null; this.breakProgress = 0; this.crack.visible = false; return; }
    const t = this.target;
    if (this.swing >= 1) this.swing = 0;
    if (this.mode === 'creative') {
      if (this.actionCooldown <= 0) { this.actionCooldown = 0.3; this.swing = 0; this.breakBlock(t.x, t.y, t.z, true); }
      return;
    }
    if (!this.breakTarget || this.breakTarget.x !== t.x || this.breakTarget.y !== t.y || this.breakTarget.z !== t.z) {
      this.breakTarget = { x: t.x, y: t.y, z: t.z }; this.breakProgress = 0;
    }
    const hard = BLOCKS[t.id].hardness;
    if (hard < 0) return;
    this.breakProgress += hard === 0 ? 1 : dt / (hard * (this.onGround || this.flying ? 1 : 5) * (this.headInWater ? 5 : 1));
    this.breakSoundT -= dt;
    if (this.breakSoundT <= 0) { this.breakSoundT = 0.25; Sound.hit(BLOCKS[t.id].sound); this.particles.hit(this.world, t.x, t.y, t.z, t.id, t.nx, t.ny, t.nz, this.daylight); }
    if (this.breakProgress >= 1) {
      this.breakBlock(t.x, t.y, t.z, true);
      this.breakTarget = null; this.breakProgress = 0; this.crack.visible = false;
      return;
    }
    const stage = Math.min(9, Math.floor(this.breakProgress * 10));
    const [u0, v0, u1, v1] = tileUV(tileIndex('destroy_' + stage));
    const uv = this.crack.geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) { const k = i % 4; uv.setXY(i, k % 2 ? u1 : u0, k < 2 ? v1 : v0); }
    uv.needsUpdate = true;
    this.crack.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5);
    this.crack.visible = true;
  }

  // ---------------------------------------------------------------- held item
  private updateHand(dt: number) {
    const s = this.inventory[this.selected];
    const id = s ? s.id : 0;
    if (id !== this.lastHeld) {
      if (this.handMesh) { this.handScene.remove(this.handMesh); if ((this.handMesh as THREE.Mesh).geometry) (this.handMesh as THREE.Mesh).geometry.dispose(); }
      if (id) {
        const g = blockGeometry(id, 0.4);
        const m = new THREE.Mesh(g, this.handMat);
        this.handMesh = m;
      } else {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.7), [this.armMat, this.armMat, this.armMat, this.armMat, this.armMat, this.armMat]);
        this.handMesh = m;
      }
      this.handScene.add(this.handMesh);
      this.lastHeld = id;
    }
    this.swing = Math.min(1, this.swing + dt / 0.3);
    this.equip = Math.min(1, this.equip + dt / 0.2);
    const h = this.handMesh!;
    const sp = this.swing < 1 ? this.swing : 1;
    const sw = Math.sin(sp * Math.PI);
    const sw2 = Math.sin(Math.sqrt(sp) * Math.PI);
    const bobX = this.settings.viewBobbing ? Math.sin(this.bobPhase * Math.PI) * 0.03 * this.bobAmt : 0;
    const bobY = this.settings.viewBobbing ? -Math.abs(Math.cos(this.bobPhase * Math.PI)) * 0.04 * this.bobAmt : 0;
    const eq = (1 - this.equip) * -0.5;
    const plant = id && (BLOCKS[id].shape === 'cross' || BLOCKS[id].shape === 'torch');
    if (id) {
      h.position.set(0.56 - sw2 * 0.25 + bobX, -0.42 + sw * 0.18 + bobY + eq, -0.8 - sw * 0.2);
      h.rotation.set(-sw2 * 0.5, plant ? -0.3 : Math.PI / 4 - sw2 * 0.5, plant ? 0 : sw * 0.3);
    } else {
      h.position.set(0.55 - sw2 * 0.25 + bobX, -0.5 + sw * 0.2 + bobY + eq, -0.62 - sw * 0.25);
      h.rotation.set(0.1 - sw2 * 0.9, -0.25 - sw2 * 0.2, -0.2 + sw * 0.4);
    }
    const b = brightnessAt(this.world, this.pos.x, this.pos.y + this.eyeCur, this.pos.z, this.daylight);
    this.handMat.color.setScalar(b);
    this.armMat.color.setScalar(b);
  }

  // ---------------------------------------------------------------- environment
  private updateEnvironment() {
    const th = (this.time % 24000) / 24000 * Math.PI * 2;
    const sunH = Math.sin(th);
    const dl = Math.max(0, Math.min(1, 0.5 + sunH * 2.5));
    this.daylight = 0.1 + dl * 0.9;
    const u = this.chunkMat.uniforms;
    u.uDaylight.value = this.daylight;
    const dayTop = new THREE.Color(0.47, 0.65, 1.0), dayHor = new THREE.Color(0.73, 0.83, 1.0);
    const nightTop = new THREE.Color(0.0, 0.0, 0.02), nightHor = new THREE.Color(0.02, 0.03, 0.07);
    const top = nightTop.clone().lerp(dayTop, dl), hor = nightHor.clone().lerp(dayHor, dl);
    const sunsetK = Math.max(0, 1 - Math.abs(sunH) * 3.5) * (Math.cos(th) > -2 ? 1 : 0);
    const sunDir = new THREE.Vector3(Math.cos(th), Math.sin(th), 0);
    // horizon toward sun takes sunset tint in fog
    const lookD = this.lookDir();
    const facing = Math.max(0, lookD.x * Math.sign(sunDir.x || 1)) * sunsetK;
    const fogC = hor.clone().lerp(new THREE.Color(1.0, 0.5, 0.2), facing * 0.45);
    let fogNear = this.settings.renderDistance * 16 * 0.55, fogFar = this.settings.renderDistance * 16 * 0.95;
    let under = 0;
    if (this.headInWater && !this.menu) { fogC.setRGB(0.04, 0.12, 0.38).multiplyScalar(0.3 + this.daylight * 0.7); fogNear = 1; fogFar = 24; under = 1; }
    else if (this.headInLava && !this.menu) { fogC.setRGB(0.8, 0.25, 0.02); fogNear = 0; fogFar = 2.5; under = 1; }
    u.uFogColor.value.copy(fogC);
    u.uFogNear.value = fogNear; u.uFogFar.value = fogFar;
    this.skyMat.uniforms.uTop.value.copy(top);
    this.skyMat.uniforms.uHorizon.value.copy(under ? fogC : hor);
    this.skyMat.uniforms.uSunDir.value.copy(sunDir);
    this.skyMat.uniforms.uSunsetK.value = sunsetK;
    this.skyMat.uniforms.uUnder.value = under;
    const cam = this.camera.position;
    this.sky.position.copy(cam);
    this.celestial.position.copy(cam);
    this.celestial.rotation.z = th;
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - dl * 1.6) * 0.9;
    this.celestial.visible = !under;
    // clouds
    this.cloudGroup.visible = this.settings.clouds && !under;
    const P = this.cloudPeriod;
    const drift = (performance.now() / 1000) * 0.6;
    const cx = cam.x - drift, cz = cam.z;
    const ox = Math.floor(cx / P - 0.5) * P, oz = Math.floor(cz / P - 0.5) * P;
    this.cloudGroup.children.forEach((m, i) => m.position.set(ox + (i % 2) * P + drift, 0, oz + Math.floor(i / 2) * P));
    this.cloudGroup.position.y = 140;
    const cc = new THREE.Color(0.16, 0.18, 0.24).lerp(new THREE.Color(1, 1, 1), dl);
    cc.lerp(new THREE.Color(1, 0.65, 0.45), sunsetK * 0.5);
    this.cloudMat.uniforms.uColor.value.copy(cc);
    this.cloudMat.uniforms.uFog.value.copy(hor);
    this.renderer.setClearColor(hor);
  }

  // ---------------------------------------------------------------- main loop
  private loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    this.frames++; this.fpsT += dt;
    if (this.fpsT >= 1) { this.fps = Math.round(this.frames / this.fpsT); this.frames = 0; this.fpsT = 0; }

    this.updateChunks(this.ready ? 7 : 22);
    this.unloadTimer += dt;
    if (this.unloadTimer > 2) { this.unloadTimer = 0; this.unloadFar(); }
    this.chunkMat.uniforms.uTime.value = now / 1000;

    if (this.menu) {
      this.menuAngle += dt * 0.04;
      this.yaw = this.menuAngle;
      this.time = 3000;
    } else {
      if (!this.ready) {
        const pc = this.world.getChunk(Math.floor(this.pos.x / 16), Math.floor(this.pos.z / 16));
        let meshed = 0, total = 0;
        const pcx = Math.floor(this.pos.x / 16), pcz = Math.floor(this.pos.z / 16);
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { total++; const c = this.world.getChunk(pcx + dx, pcz + dz); if (c && !c.dirty) meshed++; }
        if (pc && meshed === total) {
          this.ready = true;
          if (!this.opts.save) { this.pos.y = this.world.surfaceY(Math.floor(this.pos.x), Math.floor(this.pos.z)); this.spawn[1] = this.pos.y; }
          else if (boxHitsSolid(this.world, this.pos.x, this.pos.y, this.pos.z, 0.3, 1.8)) this.pos.y = this.world.surfaceY(Math.floor(this.pos.x), Math.floor(this.pos.z));
          this.fallStart = this.pos.y;
        }
        this.loadingP = meshed / total;
      } else {
        this.time += dt * 20;
        if (!this.dead) this.updatePlayer(dt);
        const eye = this.eye();
        this.target = this.dead ? null : this.raycast(eye, this.lookDir(), this.reach());
        if (this.target) { this.highlight.visible = true; this.highlight.position.set(this.target.x + 0.5, this.target.y + 0.5, this.target.z + 0.5); }
        else this.highlight.visible = false;
        if (this.locked) this.updateBreaking(dt); else this.crack.visible = false;
        this.updateEntities(dt);
        Sound.updateMusic(dt);
      }
    }
    // camera
    const bob = !this.menu && this.settings.viewBobbing ? this.bobAmt : 0;
    const bx = Math.sin(this.bobPhase * Math.PI) * 0.05 * bob, byy = -Math.abs(Math.cos(this.bobPhase * Math.PI)) * 0.07 * bob;
    this.camera.position.set(this.pos.x + Math.cos(this.yaw) * bx, this.pos.y + this.eyeCur + byy, this.pos.z - Math.sin(this.yaw) * bx);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    const hurtRoll = this.hurtTime > 0 ? Math.sin(this.hurtTime * 12) * 0.12 * (this.hurtTime / 0.5) : 0;
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bobPhase * Math.PI) * 0.012 * bob + hurtRoll);
    let fovT = this.settings.fov * (this.sprinting ? 1.15 : 1) * (this.flying ? 1.05 : 1);
    if (this.headInWater) fovT *= 0.9;
    this.fovCur += (fovT - this.fovCur) * Math.min(1, dt * 10);
    if (Math.abs(this.camera.fov - this.fovCur) > 0.01) { this.camera.fov = this.fovCur; this.camera.updateProjectionMatrix(); }
    this.updateEnvironment();
    if (!this.menu) this.updateHand(dt);
    this.particles.mat.uniforms.scale.value = this.renderer.domElement.height / (2 * Math.tan(this.camera.fov * Math.PI / 360));

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (!this.menu && this.ready && !this.hideHud && !this.dead) { this.renderer.clearDepth(); this.renderer.render(this.handScene, this.handCamera); }

    this.uiTimer += dt;
    if (this.uiTimer > 0.1) { this.uiTimer = 0; this.pushUI(false); }
  }
  loadingP = 0;

  private updateEntities(dt: number) {
    this.particles.update(dt, this.world);
    const center = new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z);
    for (const it of this.items) {
      it.update(dt, this.world, this.daylight);
      if (!this.dead && it.pickupDelay <= 0) {
        const d = it.pos.distanceTo(center);
        if (d < 1.8) {
          if (d < 0.9) {
            const left = this.addItem(it.id, it.count);
            if (left < it.count) Sound.pop();
            it.count = left;
            if (left <= 0) it.dead = true;
          } else it.vel.addScaledVector(new THREE.Vector3().subVectors(center, it.pos).normalize(), dt * 40);
        }
      }
    }
    // merge nothing; remove dead
    this.items = this.items.filter((it) => { if (it.dead) { this.scene.remove(it.mesh); it.dispose(); return false; } return true; });
    this.falling = this.falling.filter((f) => {
      if (f.update(dt, this.world, this.daylight)) {
        this.scene.remove(f.mesh); f.dispose();
        const x = Math.floor(f.pos.x), y = Math.round(f.pos.y), z = Math.floor(f.pos.z);
        const cur = this.world.getBlock(x, y, z);
        if (cur === B.AIR || cur === B.WATER || isPlant(cur)) { this.world.setBlock(x, y, z, f.id); Sound.place(BLOCKS[f.id].sound); }
        else if (this.mode === 'survival') this.spawnItem(f.id, 1, f.pos.x, f.pos.y + 0.5, f.pos.z);
        this.flushDirtyNear();
        return false;
      }
      return true;
    });
    const exploding: PrimedTNT[] = [];
    this.tnts = this.tnts.filter((t) => { if (t.update(dt, this.world, this.daylight)) { exploding.push(t); this.scene.remove(t.mesh); t.dispose(); return false; } return true; });
    for (const t of exploding) this.explode(t.pos.x, t.pos.y + 0.5, t.pos.z, 4);
    const maxD = (this.settings.renderDistance + 1) * 16;
    this.mobs = this.mobs.filter((m) => {
      const c = this.world.getChunk(Math.floor(m.pos.x / 16), Math.floor(m.pos.z / 16));
      if (c && !c.dirty || c && c.meshes.length) m.update(dt, this.world, this.daylight, this.pos);
      const far = Math.hypot(m.pos.x - this.pos.x, m.pos.z - this.pos.z) > maxD;
      if (m.dead || far || !c) {
        if (m.dead) this.particles.smoke(m.pos.x, m.pos.y + 0.5, m.pos.z, 15, 1);
        this.scene.remove(m.group); m.dispose(); return false;
      }
      return true;
    });
  }

  private pushUI(force: boolean) {
    if (!this.opts.onUI || this.menu) return;
    if (!force && !this.debug && this.ready && this.uiTimer !== 0) return;
    const s: UIState = {
      mode: this.mode, selected: this.selected, inventory: this.inventory, invVersion: this.invVersion,
      health: this.health, air: this.air, dead: this.dead, debug: this.debug ? this.debugLines() : null,
      loading: this.ready ? 1 : this.loadingP, hurt: this.hurtTime, underwater: this.headInWater && this.ready, inLava: this.headInLava && this.ready, hideHud: this.hideHud,
    };
    this.opts.onUI(s);
  }

  private debugLines(): string[] {
    const p = this.pos;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    const col = this.world.column(bx, bz);
    const L = this.world.getLight(bx, Math.floor(p.y + 0.5), bz);
    let deg = ((-this.yaw * 180 / Math.PI) % 360 + 540) % 360 - 180; // MC yaw: 0 = south
    deg = ((deg + 180 + 540) % 360) - 180;
    const dirIdx = Math.round(((deg % 360) + 360) % 360 / 90) % 4;
    const axis = ['Towards positive Z', 'Towards negative X', 'Towards negative Z', 'Towards positive X'][dirIdx];
    let rendered = 0;
    for (const c of this.world.chunks.values()) if (c.meshes.length) rendered++;
    const day = Math.floor(this.time / 24000);
    const t = this.target;
    const lines = [
      'Minecraft 1.20.1 (React WebGL 版)',
      `${this.fps} fps  C: ${rendered} 已渲染 / ${this.world.chunks.size} 已加载  D: ${this.settings.renderDistance}`,
      `E: ${this.mobs.length} 实体, ${this.items.length} 物品, P: ${this.particles.n}`,
      '',
      `XYZ: ${p.x.toFixed(3)} / ${p.y.toFixed(5)} / ${p.z.toFixed(3)}`,
      `Block: ${bx} ${by} ${bz}`,
      `Chunk: ${bx & 15} ${by} ${bz & 15} in ${bx >> 4} ${by >> 4} ${bz >> 4}`,
      `Facing: ${DIR_NAMES[dirIdx]} (${axis}) (${deg.toFixed(1)} / ${(-this.pitch * 180 / Math.PI).toFixed(1)})`,
      `Light: ${Math.max(L >> 4, L & 15)} (${L >> 4} sky, ${L & 15} block)`,
      `Biome: ${BIOME_NAMES[col.biome]}`,
      `Local Difficulty: 1.50 // Day ${day}  Time: ${Math.floor(this.time % 24000)}`,
      `Seed: ${this.world.seed}`,
      `Mode: ${this.mode}${this.flying ? ' (flying)' : ''}${this.sprinting ? ' (sprinting)' : ''}`,
    ];
    if (t) { lines.push('', `Targeted Block: ${t.x}, ${t.y}, ${t.z}`, `minecraft:${BLOCKS[t.id].key}`); }
    return lines;
  }

  getSaveData(): SaveData {
    const edits: [number, number[]][] = [];
    for (const [k, m] of this.world.edits) {
      const arr: number[] = [];
      for (const [i, id] of m) arr.push(i, id);
      edits.push([k, arr]);
    }
    return {
      player: { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, pitch: this.pitch, health: this.dead ? 20 : this.health, flying: this.flying },
      spawn: this.spawn, time: this.time, mode: this.mode, inventory: this.inventory, edits,
    };
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    for (const [t, ev, fn, o] of this.listeners) t.removeEventListener(ev, fn, o);
    if (document.pointerLockElement) { this.intentionalUnlock = true; document.exitPointerLock(); }
    for (const c of this.world.chunks.values()) this.disposeMeshes(c);
    for (const m of this.mobs) m.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export { CREATIVE_ORDER, ckey };
