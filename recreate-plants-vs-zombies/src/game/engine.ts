import {
  VIEW_W, VIEW_H, LAWN_X, LAWN_Y, CELL_W, CELL_H, COLS, ROWS, WORLD_W, SPAWN_X,
  rowFeetY, colCenterX, PLANTS, ZOMBIES, type PlantType, type ZombieType, type ArmorKind, type LevelDef,
} from './data';
import { sfx, playMusic, stopMusic } from './audio';
import { drawPlant, drawPea, drawSun, drawFlame } from './draw/plants';
import { drawZombie, drawZombieHeadPart, drawZombieArmPart, drawArmorPart } from './draw/zombies';
import { buildBackground, drawMower, drawSeedPacket, drawShovel, drawBankFrame, drawProgress, getPlantIcon, PACKET_W, PACKET_H } from './draw/scene';
import { Ctx, circ, ell, rrect, outlinedText, radial, easeOut, clamp, linear } from './draw/util';

type Phase = 'panRight' | 'hold' | 'choose' | 'panLeft' | 'ready' | 'playing' | 'lost' | 'won';

interface Plant {
  id: number; type: PlantType; row: number; col: number; hp: number; maxHp: number;
  timer: number; state: string; stateTime: number; shoot: number; seed: number;
  burst: number; burstT: number; flash: number; offX: number; targetX: number; headShoot: number[];
  born: number;
}
type ZState = 'walk' | 'eat' | 'dying' | 'burnt' | 'vault' | 'idle' | 'angry';
interface Zombie {
  id: number; type: ZombieType; row: number; x: number; hp: number; maxHp: number;
  armor: ArmorKind | null; armorHp: number; armorMax: number; speed: number;
  state: ZState; stateTime: number; phase: number; slow: number; flash: number;
  armLost: boolean; headLost: boolean; hasPole: boolean; angry: boolean; seed: number;
  chompT: number; vaultFrom: number; vaultTo: number; preview?: boolean; ashDone?: boolean; eaten?: boolean;
}
interface Pea { x: number; y: number; ty: number; row: number; kind: 'pea' | 'snow' | 'fire'; lastTorch: number; }
interface Sun { x: number; y: number; vx: number; vy: number; ty: number; life: number; value: number; collecting: boolean; sky: boolean; t: number; }
interface Particle {
  kind: 'splat' | 'head' | 'arm' | 'armor' | 'dirt' | 'boom' | 'text' | 'ash' | 'smoke' | 'rowfire' | 'spark';
  x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; max: number;
  ground: number; color?: string; size?: number; ztype?: ZombieType; armor?: ArmorKind; text?: string; slowed?: boolean;
}
interface Mower { row: number; x: number; state: 'idle' | 'run' | 'gone'; }
interface Banner { text: string; t: number; dur: number; color: string; size: number; y: number; }
interface Seed { type: PlantType; cd: number; }

export interface GameCallbacks {
  onChooser: () => void;
  onLose: () => void;
  onWin: (unlock?: PlantType) => void;
  onPause: () => void;
}

const BANK_X = 8, BANK_Y = 4, SLOT0 = 84, SLOT_GAP = 56;
const CAM_MAX = WORLD_W - VIEW_W;
const ZW: Partial<Record<ZombieType, number>> = { normal: 4, cone: 3, pole: 2, newspaper: 2, bucket: 1.4, door: 1.4, football: 1 };

export class Game {
  ctx: Ctx;
  bg: HTMLCanvasElement;
  phase: Phase = 'panRight';
  phaseT = 0;
  time = 0;
  camX = 0;
  paused = false;
  speed = 1;
  sun: number;
  seeds: Seed[] = [];
  selected = -1;
  shovel = false;
  mouse = { x: -100, y: -100, inside: false };
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  peas: Pea[] = [];
  suns: Sun[] = [];
  parts: Particle[] = [];
  mowers: Mower[] = [];
  banners: Banner[] = [];
  wave = 0;
  waveTimer = 20;
  waveStart = 0;
  waveIds = new Set<number>();
  waveHp0 = 1;
  warned = false;
  skyTimer = 5;
  shake = 0;
  reward: { x: number; y: number; t: number; collected: boolean; vy: number; gy: number } | null = null;
  lastKill = { x: 600, y: 300 };
  nid = 1;
  raf = 0;
  last = 0;
  sunFlash = 0;
  tipT = 0;
  placedAny = false;
  flagWaves: number[] = [];
  chooserNeeded: boolean;
  destroyed = false;

  constructor(public canvas: HTMLCanvasElement, public level: LevelDef, public cb: GameCallbacks) {
    this.ctx = canvas.getContext('2d')!;
    this.bg = buildBackground(level.rows);
    this.sun = level.startSun;
    this.chooserNeeded = level.plants.length > level.slots;
    if (!this.chooserNeeded) this.setSeeds(level.plants);
    for (let i = 1; i <= level.waves && i < 200; i++) if (this.isFlag(i)) this.flagWaves.push(i);
    this.spawnPreview();
    (window as unknown as { __pvz: Game }).__pvz = this;
    this.last = performance.now();
    playMusic('chooser');
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
  }

  setSeeds(types: PlantType[]) {
    this.seeds = types.map((t) => ({ type: t, cd: PLANTS[t].recharge >= 30 && t !== 'potatomine' ? PLANTS[t].recharge : 0 }));
  }

  startBattle(types: PlantType[]) {
    this.setSeeds(types);
    this.setPhase('panLeft');
  }

  isFlag(i: number) {
    return i % this.level.flagEvery === 0 || i === this.level.waves;
  }

  setPhase(p: Phase) {
    this.phase = p;
    this.phaseT = 0;
  }

  // ---------------- main loop ----------------
  loop(now: number) {
    if (this.destroyed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) {
      const steps = this.phase === 'playing' ? this.speed : 1;
      for (let i = 0; i < steps; i++) this.update(dt);
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt: number) {
    this.time += dt;
    this.phaseT += dt;
    this.shake = Math.max(0, this.shake - dt);
    if (this.sunFlash > 0) this.sunFlash = Math.max(0, this.sunFlash - dt);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < b.dur);

    switch (this.phase) {
      case 'panRight': {
        const k = clamp(this.phaseT / 1.8, 0, 1);
        this.camX = easeOut(k) * CAM_MAX;
        if (k >= 1) {
          if (this.chooserNeeded) { this.setPhase('choose'); this.cb.onChooser(); }
          else this.setPhase('hold');
        }
        break;
      }
      case 'hold':
        if (this.phaseT > 1.6) this.setPhase('panLeft');
        break;
      case 'choose':
        break;
      case 'panLeft': {
        const k = clamp(this.phaseT / 1.5, 0, 1);
        this.camX = (1 - easeOut(k)) * CAM_MAX;
        if (k >= 1) {
          this.zombies = [];
          this.setPhase('ready');
          this.mowers = this.level.rows.map((r) => ({ row: r, x: -60, state: 'idle' as const }));
          stopMusic();
        }
        break;
      }
      case 'ready': {
        const steps = [0, 0.75, 1.5];
        steps.forEach((s, i) => {
          if (this.phaseT - dt < s && this.phaseT >= s) sfx.readySetPlant(i);
        });
        for (const m of this.mowers) m.x = Math.min(LAWN_X - 40, -60 + this.phaseT * 200);
        if (this.phaseT > 2.3) {
          this.setPhase('playing');
          playMusic('day');
        }
        break;
      }
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'lost':
        if (this.phaseT > 3.2 && this.phaseT - dt <= 3.2) this.cb.onLose();
        break;
      case 'won':
        this.updateEffects(dt);
        if (this.reward) {
          const r = this.reward;
          r.t += dt;
          const tx = VIEW_W / 2 + this.camX, ty = VIEW_H / 2 - 20;
          r.x += (tx - r.x) * Math.min(1, dt * 2.5);
          r.y += (ty - r.y) * Math.min(1, dt * 2.5);
        }
        if (this.phaseT > 3.2 && this.phaseT - dt <= 3.2) this.cb.onWin(this.level.unlock);
        break;
    }
    if (this.phase === 'panRight' || this.phase === 'hold' || this.phase === 'choose' || this.phase === 'panLeft') {
      for (const z of this.zombies) z.phase += dt;
    }
  }

  updatePlaying(dt: number) {
    this.tipT += dt;
    for (const s of this.seeds) s.cd = Math.max(0, s.cd - dt);
    // sky sun
    this.skyTimer -= dt;
    if (this.skyTimer <= 0) {
      this.skyTimer = 9 + Math.random() * 4;
      this.suns.push({ x: LAWN_X + 40 + Math.random() * (COLS * CELL_W - 80), y: -40, vx: 0, vy: 55, ty: LAWN_Y + 60 + Math.random() * (ROWS * CELL_H - 120), life: 0, value: 25, collecting: false, sky: true, t: Math.random() * 10 });
    }
    this.updateWaves(dt);
    this.updatePlants(dt);
    this.updateZombies(dt);
    this.updatePeas(dt);
    this.updateMowers(dt);
    this.updateEffects(dt);
    this.checkWin();
  }

  updateEffects(dt: number) {
    // suns
    for (const s of this.suns) {
      s.t += dt;
      if (s.collecting) {
        const tx = BANK_X + 38 + this.camX, ty = BANK_Y + 30;
        s.x += (tx - s.x) * Math.min(1, dt * 7);
        s.y += (ty - s.y) * Math.min(1, dt * 7);
        if (Math.hypot(tx - s.x, ty - s.y) < 12) {
          s.life = -1;
          this.sun += s.value;
          this.sunFlash = 0.3;
        }
        continue;
      }
      if (s.sky) {
        if (s.y < s.ty) s.y = Math.min(s.ty, s.y + s.vy * dt);
        else s.life += dt;
      } else {
        s.vy += 520 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.y >= s.ty && s.vy > 0) { s.y = s.ty; s.vx = 0; s.vy = 0; }
        if (s.vy === 0) s.life += dt;
      }
    }
    this.suns = this.suns.filter((s) => s.life >= 0 && s.life < 9);
    // particles
    for (const p of this.parts) {
      p.life += dt;
      if (p.kind === 'head' || p.kind === 'arm' || p.kind === 'armor' || p.kind === 'dirt' || p.kind === 'ash' || p.kind === 'splat' || p.kind === 'spark') {
        p.vy += (p.kind === 'splat' || p.kind === 'spark' ? 400 : 900) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > p.ground) {
          p.y = p.ground;
          if (p.kind === 'head' || p.kind === 'armor' || p.kind === 'arm') {
            if (Math.abs(p.vy) > 120) sfx.zombieFall();
            p.vy = -p.vy * 0.35;
            p.vx *= 0.5;
            p.vr *= 0.5;
            if (Math.abs(p.vy) < 60) { p.vy = 0; p.vr = 0; p.vx = 0; }
          } else {
            p.vy = 0; p.vx *= 0.8;
          }
        }
      } else if (p.kind === 'smoke') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else if (p.kind === 'text') {
        p.y -= 20 * dt;
      }
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
  }

  // ---------------- waves ----------------
  updateWaves(dt: number) {
    const L = this.level;
    if (this.wave >= L.waves) return;
    this.waveTimer -= dt;
    // early trigger when current wave mostly dead
    if (this.wave > 0 && this.time - this.waveStart > 6) {
      let hp = 0;
      for (const z of this.zombies) if (this.waveIds.has(z.id) && this.alive(z)) hp += z.hp + z.armorHp;
      if (hp < this.waveHp0 * 0.45) this.waveTimer = Math.min(this.waveTimer, this.isFlag(this.wave + 1) ? 7 : 2.5);
    }
    const next = this.wave + 1;
    if (this.isFlag(next) && !this.warned && this.waveTimer <= 6.5) {
      this.warned = true;
      this.banner('一大波僵尸正在接近！', 4, '#ff2a1a', 44, VIEW_H / 2);
      sfx.hugeWave();
    }
    if (this.waveTimer <= 0) {
      this.spawnWave(next);
      this.wave = next;
      this.warned = false;
      this.waveTimer = 24 + Math.random() * 6;
      this.waveStart = this.time;
      if (next === 1) sfx.firstZombies();
      if (next === L.waves && !L.endless) {
        setTimeout(() => { if (!this.destroyed) { this.banner('最后一波', 3, '#ff2a1a', 64, VIEW_H / 2); sfx.finalWave(); } }, 1500);
      }
    }
  }

  spawnWave(i: number) {
    const L = this.level;
    const flag = this.isFlag(i);
    let budget = Math.max(1, Math.round((i * 0.45 + 0.6) * L.difficulty));
    if (L.endless) budget = Math.round(budget * (1 + i / 40));
    if (flag) budget = Math.round(budget * 2.5);
    const list: ZombieType[] = [];
    if (flag) list.push('flag');
    const pool = L.zombies.filter((z) => z !== 'flag');
    let guard = 0;
    while (budget > 0 && guard++ < 200) {
      const opts = pool.filter((z) => ZOMBIES[z].cost <= budget && (ZOMBIES[z].cost < 4 || i >= 3 || flag) && (ZOMBIES[z].cost < 7 || i >= 5 || flag));
      if (!opts.length) break;
      let tot = 0;
      for (const o of opts) tot += ZW[o] ?? 1;
      let r = Math.random() * tot;
      let pick = opts[0];
      for (const o of opts) { r -= ZW[o] ?? 1; if (r <= 0) { pick = o; break; } }
      list.push(pick);
      budget -= ZOMBIES[pick].cost;
    }
    this.waveIds.clear();
    const rowCount: Record<number, number> = {};
    let hp0 = 0;
    list.forEach((t, idx) => {
      const rows = L.rows;
      let row = rows[0];
      let best = -1;
      for (const r of rows) {
        const w = Math.random() / (1 + (rowCount[r] ?? 0));
        if (w > best) { best = w; row = r; }
      }
      rowCount[row] = (rowCount[row] ?? 0) + 1;
      const x = SPAWN_X + (t === 'flag' ? 0 : 10 + Math.random() * 40 + idx * (list.length > 6 ? 12 : 20));
      const z = this.makeZombie(t, row, x);
      this.zombies.push(z);
      this.waveIds.add(z.id);
      hp0 += z.hp + z.armorHp;
    });
    this.waveHp0 = hp0;
  }

  makeZombie(type: ZombieType, row: number, x: number): Zombie {
    const d = ZOMBIES[type];
    return {
      id: this.nid++, type, row, x, hp: d.hp, maxHp: d.hp, armor: d.armor ?? null, armorHp: d.armorHp ?? 0, armorMax: d.armorHp ?? 1,
      speed: d.speed * (0.88 + Math.random() * 0.24), state: 'walk', stateTime: 0, phase: Math.random() * 6, slow: 0, flash: 0,
      armLost: false, headLost: false, hasPole: type === 'pole', angry: false, seed: Math.random() * 10, chompT: 0, vaultFrom: 0, vaultTo: 0,
    };
  }

  spawnPreview() {
    const types = this.level.zombies;
    const n = Math.min(12, 4 + Math.round(this.level.waves / 3));
    for (let i = 0; i < n; i++) {
      const t = types[i % types.length];
      const z = this.makeZombie(t, i % 5, 990 + Math.random() * 330);
      z.state = 'idle';
      z.preview = true;
      z.row = Math.floor(Math.random() * 5);
      this.zombies.push(z);
    }
    this.zombies.sort((a, b) => a.row - b.row);
  }

  alive(z: Zombie) {
    return z.state !== 'dying' && z.state !== 'burnt' && !z.eaten;
  }

  // ---------------- plants ----------------
  plantAt(row: number, col: number) {
    return this.plants.find((p) => p.row === row && p.col === col);
  }

  zombieAhead(row: number, x: number) {
    return this.zombies.some((z) => z.row === row && this.alive(z) && z.x > x - 20 && z.x < VIEW_W - 15 + this.camX && z.state !== 'vault');
  }

  placePlant(type: PlantType, row: number, col: number) {
    const def = PLANTS[type];
    const p: Plant = {
      id: this.nid++, type, row, col, hp: def.hp, maxHp: def.hp, timer: 0, state: 'idle', stateTime: 0, shoot: 0,
      seed: Math.random() * 10, burst: 0, burstT: 0, flash: 0, offX: 0, targetX: 0, headShoot: [0, 0, 0], born: this.time,
    };
    if (type === 'peashooter' || type === 'snowpea' || type === 'repeater' || type === 'threepeater') p.timer = 0.4 + Math.random() * 0.6;
    if (type === 'sunflower') p.timer = 5 + Math.random() * 5;
    if (type === 'cherrybomb' || type === 'jalapeno') p.state = 'fuse';
    if (type === 'potatomine') { p.state = 'arming'; p.timer = 15; }
    if (type === 'spikeweed') p.timer = 1;
    this.plants.push(p);
    this.plants.sort((a, b) => a.row - b.row || a.col - b.col);
    sfx.plant();
    for (let i = 0; i < 8; i++) this.addPart('dirt', colCenterX(col) + (Math.random() - 0.5) * 30, rowFeetY(row) - 4, (Math.random() - 0.5) * 120, -100 - Math.random() * 150, 0.8, rowFeetY(row) + 2, { color: '#6b4423', size: 2 + Math.random() * 3 });
  }

  removePlant(p: Plant) {
    this.plants = this.plants.filter((q) => q !== p);
  }

  updatePlants(dt: number) {
    for (const p of [...this.plants]) {
      p.stateTime += dt;
      p.shoot = Math.max(0, p.shoot - dt * 4);
      p.flash = Math.max(0, p.flash - dt);
      for (let i = 0; i < 3; i++) p.headShoot[i] = Math.max(0, p.headShoot[i] - dt * 4);
      const cx = colCenterX(p.col);
      const fy = rowFeetY(p.row);
      switch (p.type) {
        case 'peashooter': case 'snowpea': case 'repeater': {
          p.timer -= dt;
          if (p.burst > 0) {
            p.burstT -= dt;
            if (p.burstT <= 0) { p.burst--; this.firePea(p, p.row, 'pea'); }
          }
          if (p.timer <= 0 && this.zombieAhead(p.row, cx)) {
            p.timer = 1.42;
            this.firePea(p, p.row, p.type === 'snowpea' ? 'snow' : 'pea');
            if (p.type === 'repeater') { p.burst = 1; p.burstT = 0.18; }
          }
          break;
        }
        case 'threepeater': {
          p.timer -= dt;
          if (p.timer <= 0) {
            const rows = [p.row - 1, p.row, p.row + 1].filter((r) => r >= 0 && r < ROWS && this.level.rows.includes(r));
            if (rows.some((r) => this.zombieAhead(r, cx))) {
              p.timer = 1.42;
              rows.forEach((r) => this.firePea(p, r, 'pea'));
              p.headShoot = [1, 1, 1];
            }
          }
          break;
        }
        case 'sunflower': {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.timer = 24;
            this.suns.push({ x: cx, y: fy - 50, vx: (Math.random() - 0.5) * 80, vy: -240, ty: fy - 20, life: 0, value: 25, collecting: false, sky: false, t: 0 });
            sfx.sunPop();
          }
          break;
        }
        case 'cherrybomb':
          if (p.stateTime > 1.2) {
            this.removePlant(p);
            this.explode(cx, fy, p.row, 1, 1.5 * CELL_W);
          }
          break;
        case 'jalapeno':
          if (p.stateTime > 1.0) {
            this.removePlant(p);
            this.fireRow(p.row);
          }
          break;
        case 'potatomine':
          if (p.state === 'arming') {
            p.timer -= dt;
            if (p.timer <= 0) {
              p.state = 'armed'; p.stateTime = 0;
              for (let i = 0; i < 6; i++) this.addPart('dirt', cx + (Math.random() - 0.5) * 30, fy - 6, (Math.random() - 0.5) * 100, -120 - Math.random() * 100, 0.8, fy, { color: '#6b4423', size: 3 });
              sfx.plant();
            }
          } else if (p.state === 'armed') {
            const hit = this.zombies.some((z) => z.row === p.row && this.alive(z) && z.state !== 'vault' && Math.abs(z.x - 18 - cx) < 36);
            if (hit) {
              this.removePlant(p);
              for (const z of this.zombies) if (z.row === p.row && this.alive(z) && z.state !== 'vault' && Math.abs(z.x - cx) < 70) this.damage(z, 1800, 'explode');
              sfx.potatoMine();
              this.shake = 0.3;
              this.addPart('boom', cx, fy - 20, 0, 0, 0.6, 0, { size: 60, color: 'potato' });
              this.addPart('text', cx, fy - 60, 0, 0, 1.4, 0, { text: 'SPUDOW!', color: '#ffe066' });
              for (let i = 0; i < 16; i++) this.addPart('dirt', cx, fy - 10, (Math.random() - 0.5) * 300, -200 - Math.random() * 300, 1.2, fy + 5, { color: Math.random() > 0.5 ? '#6b4423' : '#d9a45a', size: 3 + Math.random() * 4 });
            }
          }
          break;
        case 'chomper':
          if (p.state === 'idle') {
            const t = this.zombies.find((z) => z.row === p.row && this.alive(z) && z.state !== 'vault' && z.x - cx > -20 && z.x - cx < CELL_W * 1.45);
            if (t) { p.state = 'bite'; p.stateTime = 0; p.targetX = t.id; }
          } else if (p.state === 'bite') {
            if (p.stateTime >= 0.45 && p.stateTime - dt < 0.45) {
              const t = this.zombies.find((z) => z.id === p.targetX && this.alive(z) && z.x - cx < CELL_W * 1.6);
              if (t) {
                t.eaten = true;
                t.hp = 0;
                this.lastKill = { x: t.x, y: rowFeetY(t.row) - 40 };
                sfx.bigChomp();
              }
            }
            if (p.stateTime > 0.7) {
              const ate = this.zombies.some((z) => z.id === p.targetX && z.eaten);
              p.state = ate ? 'chew' : 'idle';
              p.stateTime = 0;
              p.timer = 42;
            }
          } else if (p.state === 'chew') {
            p.timer -= dt;
            if (p.timer <= 0) { p.state = 'idle'; p.stateTime = 0; sfx.gulp(); }
          }
          break;
        case 'squash': {
          if (p.state === 'idle') {
            const t = this.zombies.find((z) => z.row === p.row && this.alive(z) && z.state !== 'vault' && z.x - cx > -45 && z.x - cx < 110);
            if (t) { p.state = 'aim'; p.stateTime = 0; p.targetX = t.x - 10; }
          } else if (p.state === 'aim') {
            if (p.stateTime > 0.45) { p.state = 'jump'; p.stateTime = 0; sfx.squashJump(); }
          } else if (p.state === 'jump') {
            const t = this.zombies.find((z) => z.row === p.row && this.alive(z) && z.x - cx > -60 && z.x - cx < 160);
            if (t) p.targetX = t.x - 10;
            p.offX += (p.targetX - cx - p.offX) * Math.min(1, dt * 8);
            if (p.stateTime > 0.45) { p.state = 'fall'; p.stateTime = 0; }
          } else if (p.state === 'fall') {
            if (p.stateTime > 0.15) {
              p.state = 'smash'; p.stateTime = 0;
              const lx = cx + p.offX;
              for (const z of this.zombies) if (z.row === p.row && this.alive(z) && z.state !== 'vault' && Math.abs(z.x - lx) < 55) this.damage(z, 1800, 'squash');
              sfx.squashLand();
              this.shake = 0.25;
              for (let i = 0; i < 10; i++) this.addPart('dirt', lx + (Math.random() - 0.5) * 50, fy - 2, (Math.random() - 0.5) * 200, -100 - Math.random() * 150, 0.8, fy + 3, { color: '#5a3a1a', size: 3 });
            }
          } else if (p.state === 'smash') {
            if (p.stateTime > 0.6) this.removePlant(p);
          }
          break;
        }
        case 'spikeweed': {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.timer = 1;
            let hit = false;
            for (const z of this.zombies) {
              if (z.row === p.row && this.alive(z) && z.state !== 'vault' && Math.abs(z.x - 10 - cx) < 42) { this.damage(z, 20, 'spike'); hit = true; }
            }
            if (hit) { p.state = 'attack'; p.stateTime = 0; }
          }
          if (p.state === 'attack' && p.stateTime > 0.3) p.state = 'idle';
          break;
        }
      }
    }
  }

  firePea(p: Plant, row: number, kind: 'pea' | 'snow') {
    const cx = colCenterX(p.col) + p.offX;
    const fy = rowFeetY(p.row);
    let y = fy - 46;
    if (p.type === 'threepeater') y = row === p.row ? fy - 62 : fy - 34;
    this.peas.push({ x: cx + (p.type === 'threepeater' ? 22 : 30), y, ty: rowFeetY(row) - 46, row, kind, lastTorch: -1 });
    p.shoot = 1;
    sfx.shoot();
  }

  explode(cx: number, fy: number, row: number, rowRange: number, xRange: number) {
    for (const z of this.zombies) {
      if (this.alive(z) && Math.abs(z.row - row) <= rowRange && Math.abs(z.x - cx) < xRange) this.damage(z, 1800, 'explode');
    }
    sfx.explode();
    this.shake = 0.5;
    this.addPart('boom', cx, fy - 40, 0, 0, 0.8, 0, { size: 140, color: 'cherry' });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      this.addPart('smoke', cx + Math.cos(a) * 30, fy - 40 + Math.sin(a) * 30, Math.cos(a) * 80, Math.sin(a) * 60 - 30, 1.2, 0, { size: 20 + Math.random() * 20 });
    }
  }

  fireRow(row: number) {
    for (const z of this.zombies) if (z.row === row && this.alive(z)) this.damage(z, 1800, 'explode');
    sfx.fireRow();
    this.shake = 0.4;
    this.addPart('rowfire', 0, rowFeetY(row), 0, 0, 1.3, 0, {});
  }

  // ---------------- damage ----------------
  damage(z: Zombie, dmg: number, src: 'pea' | 'snow' | 'fire' | 'explode' | 'spike' | 'squash' | 'mower') {
    if (!this.alive(z)) return;
    const fy = rowFeetY(z.row);
    if (src === 'explode') {
      z.hp = 0; z.armorHp = 0; z.armor = null;
      z.state = 'burnt'; z.stateTime = 0;
      this.lastKill = { x: z.x, y: fy - 40 };
      return;
    }
    if (src !== 'spike') z.flash = 0.1;
    if (src === 'snow' && z.armor !== 'door') {
      if (z.slow <= 0) sfx.frozen();
      z.slow = 10;
    }
    if (src === 'fire') z.slow = 0;
    if (z.armor && src !== 'squash' && src !== 'mower') {
      const a = z.armor;
      if (src !== 'spike' || (a !== 'newspaper' && a !== 'door')) {
        const absorb = Math.min(dmg, z.armorHp);
        z.armorHp -= absorb;
        dmg -= absorb;
        if (a === 'bucket' || a === 'helmet' || a === 'door') sfx.metalHit();
        else if (a === 'cone') sfx.plasticHit();
        else sfx.splat();
        if (z.armorHp <= 0) {
          z.armor = null;
          const hx = z.x - 6, hy = fy - 42 - 58;
          if (a === 'newspaper' || a === 'door') this.addPart('armor', z.x - 30, fy - 60, 40, -100, 2, fy - 5, { armor: a, vr: 2 } as Partial<Particle>);
          else this.addPart('armor', hx, hy - 10, 60 + Math.random() * 40, -250, 2, fy - 8, { armor: a });
          if (a === 'newspaper') { z.state = 'angry'; z.stateTime = 0; sfx.groan(); }
        }
        if (dmg <= 0) return;
      }
    } else if (src === 'pea' || src === 'snow' || src === 'spike') {
      sfx.splat();
    } else if (src === 'fire') sfx.fireHit();
    z.hp -= dmg;
    if (!z.armLost && z.hp < z.maxHp * 0.5 && z.hp > 0) {
      z.armLost = true;
      this.addPart('arm', z.x - 10, fy - 80, -30 + Math.random() * 40, -120, 1.8, fy - 3, { ztype: z.type, slowed: z.slow > 0 });
      sfx.limbPop();
    }
    if (z.hp <= 0) this.killZombie(z);
  }

  killZombie(z: Zombie) {
    const fy = rowFeetY(z.row);
    z.state = 'dying';
    z.stateTime = 0;
    z.headLost = true;
    z.armor = null;
    this.lastKill = { x: z.x, y: fy - 40 };
    this.addPart('head', z.x - 8, fy - 100, 40 + Math.random() * 60, -200 - Math.random() * 100, 2.4, fy - 14, { ztype: z.type, slowed: z.slow > 0, vr: 4 + Math.random() * 4 } as Partial<Particle>);
    sfx.limbPop();
    setTimeout(() => sfx.zombieFall(), 700);
  }

  // ---------------- zombies ----------------
  findEatTarget(z: Zombie) {
    let best: Plant | null = null;
    for (const p of this.plants) {
      if (p.row !== z.row) continue;
      if (p.type === 'spikeweed') continue;
      if (p.type === 'squash' && p.state !== 'idle' && p.state !== 'aim') continue;
      if (p.type === 'potatomine' && p.state === 'armed') continue;
      const cx = colCenterX(p.col);
      if (z.x - 30 < cx + 22 && z.x - 30 > cx - 40) {
        if (!best || colCenterX(best.col) < cx) best = p;
      }
    }
    return best;
  }

  updateZombies(dt: number) {
    for (const z of this.zombies) {
      z.stateTime += dt;
      z.flash = Math.max(0, z.flash - dt);
      if (z.state === 'dying' || z.state === 'burnt') {
        if (z.state === 'burnt' && z.stateTime > 1 && !z.ashDone) {
          z.ashDone = true;
          const fy = rowFeetY(z.row);
          for (let i = 0; i < 18; i++) this.addPart('ash', z.x + (Math.random() - 0.5) * 30, fy - Math.random() * 110, (Math.random() - 0.5) * 60, -20, 1.2, fy, { size: 2 + Math.random() * 4, color: '#1a1a1a' });
        }
        continue;
      }
      if (z.eaten) continue;
      const slowF = z.slow > 0 ? 0.5 : 1;
      z.slow = Math.max(0, z.slow - dt);
      if (Math.random() < dt * 0.04) sfx.groan();

      if (z.state === 'angry') {
        if (z.stateTime > 1.0) { z.state = 'walk'; z.angry = true; z.speed = 42; }
        continue;
      }
      if (z.state === 'vault') {
        const k = clamp(z.stateTime / 0.9, 0, 1);
        z.x = z.vaultFrom + (z.vaultTo - z.vaultFrom) * k;
        if (k >= 1) { z.state = 'walk'; z.hasPole = false; z.speed = 15; z.stateTime = 0; }
        continue;
      }
      const target = this.findEatTarget(z);
      if (target && z.type === 'pole' && z.hasPole) {
        if (target.type === 'potatomine' && target.state === 'arming') {
          // Underground potato mine: pole zombie walks over and eats without vaulting
        } else if (target.type === 'tallnut') {
          z.hasPole = false; z.speed = 15; sfx.plasticHit();
        } else {
          z.state = 'vault'; z.stateTime = 0; z.vaultFrom = z.x; z.vaultTo = colCenterX(target.col) - 50;
          sfx.squashJump();
          continue;
        }
      }
      if (target) {
        if (z.state !== 'eat') { z.state = 'eat'; z.stateTime = 0; }
        target.hp -= 100 * dt * slowF;
        target.flash = 0.1;
        z.chompT -= dt * slowF;
        if (z.chompT <= 0) { z.chompT = 0.45; sfx.chomp(); }
        if (target.hp <= 0) { this.removePlant(target); sfx.gulp(); z.state = 'walk'; }
      } else {
        if (z.state !== 'walk') { z.state = 'walk'; z.stateTime = 0; }
        z.x -= z.speed * slowF * dt;
        z.phase += dt * slowF * (z.speed / 15) * 3.4;
      }
      // mower trigger
      const m = this.mowers.find((mm) => mm.row === z.row);
      if (m && m.state === 'idle' && z.x < LAWN_X + 2) { m.state = 'run'; sfx.mower(); }
      if (z.x < 50 && (!m || m.state === 'gone')) this.lose();
    }
    this.zombies = this.zombies.filter((z) => !(z.state === 'dying' && z.stateTime > 2.4) && !(z.state === 'burnt' && z.stateTime > 1.7) && !z.eaten);
  }

  updatePeas(dt: number) {
    for (const p of this.peas) {
      p.x += 330 * dt;
      p.y += (p.ty - p.y) * Math.min(1, dt * 10);
      // torchwood
      const col = Math.floor((p.x - LAWN_X) / CELL_W);
      if (col >= 0 && col < COLS) {
        const tw = this.plants.find((q) => q.type === 'torchwood' && q.row === p.row && q.col === col);
        if (tw && tw.id !== p.lastTorch && Math.abs(p.x - colCenterX(col)) < 12) {
          p.lastTorch = tw.id;
          if (p.kind === 'snow') p.kind = 'pea';
          else if (p.kind === 'pea') p.kind = 'fire';
        }
      }
      let hit: Zombie | null = null;
      for (const z of this.zombies) {
        if (z.row !== p.row || !this.alive(z) || z.state === 'vault' || z.preview) continue;
        if (p.x > z.x - 26 && p.x < z.x + 22) { if (!hit || z.x < hit.x) hit = z; }
      }
      if (hit) {
        const dmg = p.kind === 'fire' ? 40 : 20;
        this.damage(hit, dmg, p.kind);
        if (p.kind === 'fire') {
          for (const z of this.zombies) if (z !== hit && z.row === p.row && this.alive(z) && Math.abs(z.x - hit.x) < 40) this.damage(z, 13, 'fire');
        }
        const col2 = p.kind === 'snow' ? '#bdefff' : p.kind === 'fire' ? '#ffb020' : '#8fdc4a';
        for (let i = 0; i < 6; i++) this.addPart('splat', p.x, p.y, -Math.random() * 120 - 20, (Math.random() - 0.7) * 160, 0.35, p.y + 30, { color: col2, size: 2 + Math.random() * 3 });
        p.x = 99999;
      }
    }
    this.peas = this.peas.filter((p) => p.x < VIEW_W + this.camX + 40);
  }

  updateMowers(dt: number) {
    for (const m of this.mowers) {
      if (m.state !== 'run') continue;
      m.x += 360 * dt;
      for (const z of this.zombies) {
        if (z.row === m.row && this.alive(z) && Math.abs(z.x - m.x) < 40 && z.x < VIEW_W + 10) this.damage(z, 9999, 'mower');
      }
      if (m.x > VIEW_W + 80) m.state = 'gone';
    }
  }

  checkWin() {
    const L = this.level;
    if (L.endless || this.reward || this.wave < L.waves) return;
    if (this.zombies.some((z) => this.alive(z))) return;
    const gy = clamp(this.lastKill.y + 30, LAWN_Y + 40, VIEW_H - 50);
    this.reward = { x: clamp(this.lastKill.x, LAWN_X + 40, VIEW_W - 60), y: this.lastKill.y - 20, t: 0, collected: false, vy: -300, gy };
  }

  lose() {
    if (this.phase !== 'playing') return;
    this.setPhase('lost');
    sfx.lose();
  }

  collectReward() {
    if (!this.reward || this.reward.collected) return;
    this.reward.collected = true;
    this.reward.t = 0;
    this.setPhase('won');
    sfx.win();
    this.suns.forEach((s) => { if (!s.collecting) s.collecting = true; });
  }

  banner(text: string, dur: number, color: string, size: number, y: number) {
    this.banners.push({ text, t: 0, dur, color, size, y });
  }

  addPart(kind: Particle['kind'], x: number, y: number, vx: number, vy: number, max: number, ground: number, extra: Partial<Particle> & { vr?: number } = {}) {
    this.parts.push({ kind, x, y, vx, vy, rot: 0, vr: extra.vr ?? 0, life: 0, max, ground, ...extra });
  }

  // ---------------- input ----------------
  toLogical(e: { clientX: number; clientY: number }) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW_W, y: ((e.clientY - r.top) / r.height) * VIEW_H };
  }

  slotRect(i: number) {
    return { x: BANK_X + SLOT0 + i * SLOT_GAP, y: BANK_Y + 6, w: PACKET_W, h: PACKET_H };
  }
  bankWidth() {
    return SLOT0 + Math.max(this.seeds.length, 6) * SLOT_GAP + 6;
  }
  shovelRect() {
    return { x: BANK_X + this.bankWidth() + 6, y: BANK_Y, w: 70, h: 80 };
  }
  menuRect() { return { x: VIEW_W - 108, y: 6, w: 100, h: 32 }; }
  speedRect() { return { x: VIEW_W - 108, y: 44, w: 100, h: 28 }; }

  onMove(x: number, y: number) {
    this.mouse.x = x; this.mouse.y = y; this.mouse.inside = true;
  }

  onRightClick() {
    if (this.selected >= 0 || this.shovel) { this.selected = -1; this.shovel = false; sfx.tap(); }
  }

  onClick(x: number, y: number) {
    this.mouse.x = x; this.mouse.y = y;
    const inR = (r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (this.phase !== 'playing') {
      if (this.phase === 'won' || this.phase === 'lost') return;
      if (inR(this.menuRect()) && this.phase !== 'choose') { this.cb.onPause(); }
      return;
    }
    if (this.paused) return;
    const wx = x + this.camX, wy = y;
    // reward
    if (this.reward && !this.reward.collected && Math.hypot(wx - this.reward.x, wy - this.reward.y) < 45) {
      this.collectReward();
      return;
    }
    // suns (topmost first)
    for (let i = this.suns.length - 1; i >= 0; i--) {
      const s = this.suns[i];
      if (!s.collecting && Math.hypot(wx - s.x, wy - s.y) < 38) {
        s.collecting = true;
        sfx.sunCollect();
        return;
      }
    }
    if (inR(this.menuRect())) { this.cb.onPause(); return; }
    if (inR(this.speedRect())) { this.speed = this.speed === 1 ? 2 : 1; sfx.click(); return; }
    // seed packets
    for (let i = 0; i < this.seeds.length; i++) {
      if (inR(this.slotRect(i))) {
        const s = this.seeds[i];
        this.shovel = false;
        if (this.selected === i) { this.selected = -1; sfx.tap(); return; }
        if (s.cd > 0 || this.sun < PLANTS[s.type].cost) {
          sfx.buzzer();
          if (this.sun < PLANTS[s.type].cost) this.sunFlash = -0.6;
          return;
        }
        this.selected = i;
        sfx.seedLift();
        return;
      }
    }
    if (inR(this.shovelRect())) {
      this.selected = -1;
      this.shovel = !this.shovel;
      sfx.shovel();
      return;
    }
    // lawn
    const col = Math.floor((wx - LAWN_X) / CELL_W);
    const row = Math.floor((wy - LAWN_Y) / CELL_H);
    const onLawn = col >= 0 && col < COLS && row >= 0 && row < ROWS && y > BANK_Y + 86;
    if (this.selected >= 0) {
      if (onLawn && this.level.rows.includes(row) && !this.plantAt(row, col)) {
        const s = this.seeds[this.selected];
        this.sun -= PLANTS[s.type].cost;
        s.cd = PLANTS[s.type].recharge;
        this.placePlant(s.type, row, col);
        this.placedAny = true;
        this.selected = -1;
      } else if (!onLawn) {
        this.selected = -1;
      }
      return;
    }
    if (this.shovel) {
      if (onLawn) {
        const p = this.plantAt(row, col);
        if (p) {
          this.removePlant(p);
          sfx.plant();
        }
      }
      this.shovel = false;
    }
  }

  onKey(key: string) {
    if (this.phase !== 'playing') return;
    const n = parseInt(key, 10);
    if (!isNaN(n)) {
      const i = n === 0 ? 9 : n - 1;
      if (i < this.seeds.length) {
        const r = this.slotRect(i);
        this.onClick(r.x + 5, r.y + 5);
      }
    }
    if (key === 's' || key === 'S') { this.shovel = !this.shovel; this.selected = -1; sfx.shovel(); }
  }

  // ---------------- render ----------------
  render() {
    const ctx = this.ctx;
    const t = this.time;
    ctx.setTransform(this.canvas.width / VIEW_W, 0, 0, this.canvas.height / VIEW_H, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    const sx = this.shake > 0 ? (Math.random() - 0.5) * 12 * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * 12 * this.shake : 0;
    ctx.translate(-this.camX + sx, sy);
    ctx.drawImage(this.bg, 0, 0);

    for (const m of this.mowers) if (m.state !== 'gone') drawMower(ctx, m.x, rowFeetY(m.row) + 4, t, m.state === 'run');

    // hovered cell for placement
    const wx = this.mouse.x + this.camX, wy = this.mouse.y;
    const hc = Math.floor((wx - LAWN_X) / CELL_W), hr = Math.floor((wy - LAWN_Y) / CELL_H);
    const hoverValid = this.phase === 'playing' && this.mouse.inside && hc >= 0 && hc < COLS && hr >= 0 && hr < ROWS && this.level.rows.includes(hr) && this.mouse.y > 90;
    const shovelTarget = this.shovel && hoverValid ? this.plantAt(hr, hc) : undefined;

    // row-ordered entity drawing
    for (let r = 0; r < ROWS; r++) {
      for (const p of this.plants) {
        if (p.row !== r) continue;
        ctx.save();
        ctx.translate(colCenterX(p.col) + p.offX, rowFeetY(r));
        const born = clamp((t - p.born) / 0.15, 0, 1);
        if (born < 1) ctx.scale(1 + (1 - born) * 0.2, born * 0.8 + 0.2);
        if (p.flash > 0) ctx.translate(Math.sin(t * 60) * 1.3, 0);
        if (shovelTarget === p) ctx.globalAlpha = 0.6 + Math.sin(t * 12) * 0.2;
        drawPlant(ctx, p.type, t, {
          state: p.state, stateTime: p.stateTime, hpRatio: p.hp / p.maxHp, shoot: p.shoot, seed: p.seed,
          glow: p.type === 'sunflower' && p.timer < 1 ? 1 - p.timer : 0, headShoot: p.headShoot,
        });
        ctx.restore();
      }
      if (hoverValid && hr === r && this.selected >= 0 && !this.plantAt(hr, hc)) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.translate(colCenterX(hc), rowFeetY(hr));
        drawPlant(ctx, this.seeds[this.selected].type, t, { state: this.seeds[this.selected].type === 'potatomine' ? 'arming' : 'idle' });
        ctx.restore();
      }
      const rowZ = this.zombies.filter((z) => z.row === r).sort((a, b) => b.x - a.x);
      for (const z of rowZ) {
        ctx.save();
        ctx.translate(z.x, rowFeetY(r));
        drawZombie(ctx, {
          type: z.type, phase: z.phase, state: z.state, stateTime: z.stateTime, armLost: z.armLost, headLost: z.headLost,
          armor: z.armor, armorRatio: z.armorHp / z.armorMax, slowed: z.slow > 0, flash: z.flash, hasPole: z.hasPole, angry: z.angry, seed: z.seed,
        }, t);
        ctx.restore();
      }
      for (const p of this.peas) if (p.row === r) drawPea(ctx, p.x, p.y, p.kind, t);
    }

    this.renderParticles(ctx, t);

    for (const s of this.suns) {
      const a = s.life > 8 ? 1 - (s.life - 8) : 1;
      drawSun(ctx, s.x, s.y, s.t, s.collecting ? 0.8 : 1, a);
    }

    if (this.reward) this.renderReward(ctx, t);
    ctx.restore();

    this.renderUI(ctx, t);
  }

  renderParticles(ctx: Ctx, t: number) {
    for (const p of this.parts) {
      const k = p.life / p.max;
      const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      switch (p.kind) {
        case 'splat': case 'dirt': case 'ash': case 'spark':
          ctx.globalAlpha = fade;
          circ(ctx, p.x, p.y, p.size ?? 3, p.color ?? '#fff');
          ctx.globalAlpha = 1;
          break;
        case 'head':
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          drawZombieHeadPart(ctx, p.ztype ?? 'normal', !!p.slowed);
          ctx.restore();
          break;
        case 'arm':
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot + 1.3);
          drawZombieArmPart(ctx, p.ztype ?? 'normal', !!p.slowed);
          ctx.restore();
          break;
        case 'armor':
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          if (p.armor) drawArmorPart(ctx, p.armor);
          ctx.restore();
          break;
        case 'boom': {
          const sz = (p.size ?? 100) * (0.4 + easeOut(k) * 0.8);
          ctx.globalAlpha = 1 - k;
          const cherry = p.color === 'cherry';
          circ(ctx, p.x, p.y, sz, radial(ctx, p.x, p.y, sz, '#fffbe0', cherry ? '#ff5a00' : '#ffb347', 0, 0));
          circ(ctx, p.x, p.y, sz * 0.6, 'rgba(255,255,200,0.8)');
          if (cherry && k < 0.6) outlinedText(ctx, 'POWIE!', p.x, p.y - 10, 34, '#ffec3d', '#b3120c', 6);
          ctx.globalAlpha = 1;
          break;
        }
        case 'smoke':
          ctx.globalAlpha = (1 - k) * 0.6;
          circ(ctx, p.x, p.y, (p.size ?? 20) * (1 + k), '#555');
          ctx.globalAlpha = 1;
          break;
        case 'text':
          ctx.globalAlpha = fade;
          outlinedText(ctx, p.text ?? '', p.x, p.y, 30, p.color ?? '#fff', '#6b2a00', 6);
          ctx.globalAlpha = 1;
          break;
        case 'rowfire': {
          const a = k < 0.15 ? k / 0.15 : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
          for (let x = LAWN_X - 10; x < VIEW_W + this.camX + 20; x += 34) {
            drawFlame(ctx, x, p.y + 4, 44, 70 + Math.sin(x + t * 10) * 15, t + x * 0.1, a);
          }
          break;
        }
      }
    }
  }

  renderReward(ctx: Ctx, t: number) {
    const r = this.reward!;
    if (!r.collected) {
      r.vy += 600 * 0.016;
      r.y = Math.min(r.gy, r.y + r.vy * 0.016);
      if (r.y >= r.gy) r.vy = 0;
    }
    ctx.save();
    ctx.translate(r.x, r.y);
    const glowR = 60 + Math.sin(t * 5) * 8 + (r.collected ? r.t * 120 : 0);
    circ(ctx, 0, 0, glowR, radial(ctx, 0, 0, glowR, 'rgba(255,255,220,0.95)', 'rgba(255,240,150,0)', 0, 0));
    if (r.collected) {
      ctx.save();
      ctx.rotate(t);
      ctx.fillStyle = 'rgba(255,255,200,0.35)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, -400);
        ctx.lineTo(20, -400);
        ctx.fill();
      }
      ctx.restore();
    }
    const sc = r.collected ? 1 + Math.min(1, r.t) * 0.8 : 1 + Math.sin(t * 4) * 0.04;
    ctx.scale(sc, sc);
    if (this.level.unlock) {
      drawSeedPacket(ctx, -PACKET_W / 2, -PACKET_H / 2, this.level.unlock, {});
    } else {
      // trophy
      ctx.beginPath();
      ctx.moveTo(-22, -30);
      ctx.lineTo(22, -30);
      ctx.quadraticCurveTo(22, 6, 0, 10);
      ctx.quadraticCurveTo(-22, 6, -22, -30);
      ctx.fillStyle = linear(ctx, -22, 0, 22, 0, [[0, '#d4a017'], [0.5, '#fff1a8'], [1, '#b8860b']]);
      ctx.fill();
      ctx.strokeStyle = '#6b4a00';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#c99a12';
      ctx.fillRect(-5, 10, 10, 14);
      rrect(ctx, -16, 22, 32, 8, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderUI(ctx: Ctx, t: number) {
    const showBank = this.phase !== 'panRight' && this.phase !== 'hold' && this.phase !== 'choose' || this.chooserNeeded === false;
    const bankVisible = this.phase === 'playing' || this.phase === 'ready' || this.phase === 'lost' || this.phase === 'won' || this.phase === 'panLeft' || (showBank && this.phase !== 'panRight');
    let bankY = 0;
    if (this.phase === 'panLeft') bankY = -100 * (1 - clamp(this.phaseT / 1.2, 0, 1));
    if (this.phase === 'panRight' || this.phase === 'hold' || this.phase === 'choose') bankY = -100;
    if (bankVisible || bankY > -100) {
      ctx.save();
      ctx.translate(0, bankY);
      const bw = this.bankWidth();
      drawBankFrame(ctx, BANK_X, BANK_Y, bw, 84);
      // sun counter
      drawSun(ctx, BANK_X + 38, BANK_Y + 30, t * 0.3, 0.62);
      rrect(ctx, BANK_X + 10, BANK_Y + 58, 58, 20, 6);
      ctx.fillStyle = this.sunFlash < 0 && Math.floor(t * 10) % 2 === 0 ? '#ff6b6b' : '#f5ecd0';
      ctx.fill();
      ctx.strokeStyle = '#5a3a16';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#111';
      ctx.fillText(String(this.sun), BANK_X + 39, BANK_Y + 69);
      if (this.sunFlash < 0) this.sunFlash = Math.min(0, this.sunFlash + 0.016);
      // packets
      this.seeds.forEach((s, i) => {
        const r = this.slotRect(i);
        const hover = this.mouse.x >= r.x && this.mouse.x <= r.x + r.w && this.mouse.y >= r.y && this.mouse.y <= r.y + r.h;
        drawSeedPacket(ctx, r.x, r.y, s.type, {
          cooldown: s.cd / PLANTS[s.type].recharge,
          affordable: this.sun >= PLANTS[s.type].cost,
          selected: this.selected === i,
          hover,
        });
      });
      // shovel
      const sr = this.shovelRect();
      drawBankFrame(ctx, sr.x, sr.y, sr.w, sr.h);
      rrect(ctx, sr.x + 8, sr.y + 8, sr.w - 16, sr.h - 16, 6);
      ctx.fillStyle = '#3a2410';
      ctx.fill();
      if (!this.shovel) drawShovel(ctx, sr.x + sr.w / 2, sr.y + sr.h / 2 + 4, 1);
      ctx.restore();
    }

    // menu button
    const mr = this.menuRect();
    if (this.phase !== 'choose') {
      rrect(ctx, mr.x, mr.y, mr.w, mr.h, 8);
      ctx.fillStyle = linear(ctx, 0, mr.y, 0, mr.y + mr.h, [[0, '#a3e05a'], [1, '#4a8f1c']]);
      ctx.fill();
      ctx.strokeStyle = '#1f3d08';
      ctx.lineWidth = 2;
      ctx.stroke();
      outlinedText(ctx, '菜单', mr.x + mr.w / 2, mr.y + mr.h / 2 + 1, 17, '#fff', '#1f3d08', 4);
    }
    if (this.phase === 'playing') {
      const spr = this.speedRect();
      rrect(ctx, spr.x, spr.y, spr.w, spr.h, 8);
      ctx.fillStyle = this.speed === 2 ? 'rgba(255,170,40,0.9)' : 'rgba(0,0,0,0.35)';
      ctx.fill();
      outlinedText(ctx, this.speed === 2 ? '加速 ×2' : '速度 ×1', spr.x + spr.w / 2, spr.y + spr.h / 2 + 1, 14, '#fff', '#222', 3);
    }

    // progress bar
    if (this.phase === 'playing' || this.phase === 'won' || this.phase === 'lost') {
      const label = this.level.endless ? `无尽 · 第${this.wave}波` : `关卡 ${this.level.name}`;
      if (this.level.endless) {
        outlinedText(ctx, label, VIEW_W - 20, VIEW_H - 22, 18, '#ffe9a8', '#3a2208', 5, 'right');
      } else if (this.wave > 0) {
        const W = this.level.waves;
        const flags = this.flagWaves.map((f) => f / W);
        const passed = this.flagWaves.map((f, i) => (this.wave >= f ? i : -1)).filter((i) => i >= 0);
        drawProgress(ctx, VIEW_W - 180, VIEW_H - 32, this.wave / W, flags, passed, label);
      } else {
        outlinedText(ctx, label, VIEW_W - 20, VIEW_H - 22, 18, '#ffe9a8', '#3a2208', 5, 'right');
      }
    }

    // tip
    if (this.phase === 'playing' && this.level.tip && !this.placedAny && this.tipT < 30) {
      const w = 560;
      rrect(ctx, VIEW_W / 2 - w / 2, VIEW_H - 70, w, 44, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill();
      ctx.font = 'bold 16px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.fillStyle = '#fff5c0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.level.tip, VIEW_W / 2, VIEW_H - 48);
    }

    // ready set plant
    if (this.phase === 'ready') {
      const p = this.phaseT;
      const txt = p < 0.75 ? '准备...' : p < 1.5 ? '安放...' : '植物！';
      const local = p < 0.75 ? p : p < 1.5 ? p - 0.75 : p - 1.5;
      const s = txt === '植物！' ? 1 + Math.max(0, 0.4 - local) : 1.3 - Math.min(0.3, local * 0.8);
      ctx.save();
      ctx.translate(VIEW_W / 2, VIEW_H / 2);
      ctx.scale(s, s);
      outlinedText(ctx, txt, 0, 0, txt === '植物！' ? 84 : 64, '#e8261a', '#fff', 8);
      ctx.restore();
    }

    // banners
    for (const b of this.banners) {
      const a = b.t < 0.2 ? b.t / 0.2 : b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(VIEW_W / 2, b.y);
      const sc = 1 + Math.max(0, 0.3 - b.t) * 1.5;
      ctx.scale(sc, sc);
      outlinedText(ctx, b.text, 0, 0, b.size, b.color, '#000', 7);
      ctx.restore();
    }

    // cursor-held items
    if (this.phase === 'playing' && this.mouse.inside) {
      if (this.selected >= 0) {
        ctx.save();
        ctx.translate(this.mouse.x, this.mouse.y + 30);
        ctx.globalAlpha = 0.9;
        const heldType = this.seeds[this.selected].type;
        drawPlant(ctx, heldType, t, { state: heldType === 'potatomine' ? 'armed' : 'idle' });
        ctx.restore();
      } else if (this.shovel) {
        drawShovel(ctx, this.mouse.x + 10, this.mouse.y - 10, 1.1);
      }
    }

    // lose
    if (this.phase === 'lost') {
      const k = clamp(this.phaseT / 1, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${k * 0.6})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      if (this.phaseT > 0.6) {
        const s = Math.min(1, (this.phaseT - 0.6) * 2);
        ctx.save();
        ctx.translate(VIEW_W / 2 + (Math.random() - 0.5) * 4, VIEW_H / 2 + (Math.random() - 0.5) * 4);
        ctx.scale(0.3 + s * 0.7, 0.3 + s * 0.7);
        ctx.rotate(-0.04);
        outlinedText(ctx, '僵尸吃掉了', 0, -45, 64, '#7ec850', '#1b3a0a', 10);
        outlinedText(ctx, '你的脑子！', 0, 40, 76, '#7ec850', '#1b3a0a', 10);
        ctx.restore();
      }
    }
    if (this.phase === 'won' && this.phaseT > 2.2) {
      ctx.fillStyle = `rgba(255,255,255,${clamp((this.phaseT - 2.2) / 1, 0, 1)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    void ell;
    void getPlantIcon;
  }
}
