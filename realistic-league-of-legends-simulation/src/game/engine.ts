import { CHAMPIONS } from './champions';
import { DD_CHAMPIONS } from './dd';
import { ITEMS, buyCost } from './items';
import {
  W, STRUCTS, FOUNTAIN, LANES, CAMPS, isWalk, findPath, lineWalkable, nearestWalkable, bushAt, buildBushes,
} from './map';
import type { Buff, ChampionDef, DmgType, FX, Kind, Role, Team, Vec, CastTarget } from './types';
import { botThink } from './ai';

export const XP_TABLE = [0, 280, 660, 1140, 1720, 2400, 3180, 4060, 5040, 6120, 7300, 8580, 9960, 11440, 13020, 14700, 16480, 18360, 99999999];
const KILL_XP = [42, 114, 144, 174, 204, 234, 308, 392, 486, 590, 640, 690, 740, 790, 840, 890, 940, 990];
const DEATH_TIME = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5];
const ROLE_LANE: Record<Role, number> = { top: 0, jungle: 1, mid: 1, adc: 2, support: 2 };

const MINION: Record<string, any> = {
  melee: { hp: 477, ad: 12, as: 1.25, range: 110, r: 42, gold: 21, xp: 60.45, ms: 325, armor: 0, mr: 0, hpG: 22, adG: 1 },
  caster: { hp: 296, ad: 23.5, as: 0.667, range: 550, r: 38, gold: 14, xp: 29.76, ms: 325, armor: 0, mr: 0, ranged: true, hpG: 8, adG: 1.5 },
  siege: { hp: 912, ad: 41, as: 1, range: 300, r: 58, gold: 60, xp: 93.24, ms: 325, armor: 20, mr: 0, ranged: true, hpG: 50, adG: 1.5 },
  super: { hp: 1600, ad: 230, as: 0.85, range: 170, r: 64, gold: 40, xp: 97, ms: 325, armor: 30, mr: -30, hpG: 100, adG: 5 },
};
export const MONSTER: Record<string, any> = {
  blue: { name: '蓝色岗哨', hp: 2300, ad: 72, as: 0.49, range: 150, r: 75, gold: 90, xp: 195, armor: 10, mr: -15, color: '#3a7bd5', buff: 'blue' },
  red: { name: '红色树精', hp: 2300, ad: 72, as: 0.49, range: 150, r: 75, gold: 90, xp: 195, armor: 10, mr: -15, color: '#d5503a', buff: 'red' },
  gromp: { name: '魔沼蛙', hp: 2050, ad: 70, as: 0.6, range: 250, r: 65, gold: 80, xp: 150, armor: 0, mr: -15, color: '#6aa54a', ranged: true },
  wolf: { name: '暗影狼', hp: 1600, ad: 35, as: 0.6, range: 175, r: 55, gold: 55, xp: 95, armor: 10, mr: 0, color: '#6c7a90' },
  wolfs: { name: '幼狼', hp: 420, ad: 16, as: 0.6, range: 150, r: 38, gold: 15, xp: 20, armor: 0, mr: 0, color: '#8795aa' },
  raptor: { name: '锋喙鸟', hp: 1200, ad: 20, as: 0.8, range: 300, r: 50, gold: 35, xp: 20, armor: 30, mr: 30, color: '#e0e0e0', ranged: true },
  raptors: { name: '小锋喙鸟', hp: 350, ad: 13, as: 1, range: 300, r: 32, gold: 10, xp: 15, armor: 0, mr: 0, color: '#d0b0a0', ranged: true },
  krug: { name: '远古石甲虫', hp: 1350, ad: 57, as: 0.61, range: 150, r: 62, gold: 55, xp: 100, armor: 15, mr: 0, color: '#8a7050' },
  krugs: { name: '石甲虫', hp: 500, ad: 25, as: 0.6, range: 150, r: 40, gold: 15, xp: 30, armor: 0, mr: 0, color: '#a08a6a' },
  dragon: { name: '元素巨龙', hp: 3600, ad: 110, as: 0.5, range: 500, r: 115, gold: 25, xp: 400, armor: 21, mr: 30, color: '#d06a3a', ranged: true, epic: true },
  baron: { name: '纳什男爵', hp: 9000, ad: 160, as: 0.75, range: 300, r: 150, gold: 300, xp: 800, armor: 120, mr: 70, color: '#7a4ad0', epic: true },
};
export const DRAGONS = [
  { id: 'infernal', name: '炼狱亚龙', color: '#ff6a2a', desc: '+8% 攻击力和法术强度' },
  { id: 'mountain', name: '山脉亚龙', color: '#b08a5a', desc: '+8% 护甲和魔抗' },
  { id: 'ocean', name: '海洋亚龙', color: '#3ac0d0', desc: '持续回复已损失生命值' },
  { id: 'cloud', name: '云端亚龙', color: '#c0e0ff', desc: '+7% 移动速度' },
];
export const SUMMONER_CD: Record<string, number> = { SummonerFlash: 300, SummonerDot: 180, SummonerHeal: 240, SummonerSmite: 60, SummonerHaste: 240, SummonerBarrier: 180, SummonerExhaust: 240, SummonerBoost: 240 };

let UID = 1;
export class Unit {
  id = UID++;
  kind: Kind; team: Team; x: number; y: number; r = 40;
  name = '';
  hp = 100; maxHp = 100; mana = 0; maxMana = 0; alive = true;
  b: any = { ad: 0, as: 1, armor: 0, mr: 0, range: 125, ms: 325, hpRegen: 0, mpRegen: 0 };
  st: any = { ad: 0, bonusAd: 0, ap: 0, armor: 0, bonusArmor: 0, mr: 0, as: 1, ms: 325, range: 125, crit: 0, lifesteal: 0, haste: 0, bonusHp: 0, magicPen: 0, magicPenPct: 0, armorPenPct: 0, lethality: 0, critDmg: 0, omnivamp: 0, healAmp: 0 };
  buffs: Buff[] = []; shields: { amount: number; t: number; id: string }[] = [];
  target: Unit | null = null; attackCd = 0; windup = 0; windTarget: Unit | null = null;
  path: Vec[] = []; pathGoal: Vec | null = null; pathT = 0;
  facing = 0; lastCombat = -99; lastDamaged = -99; lastAttackT = -99; animT = 0;
  dash: any = null; invisible = false; attackMove = false;
  vis: [boolean, boolean] = [true, true]; bush = -1; revealT = 0;
  // champion
  def?: ChampionDef; champId = ''; level = 1; xp = 0; gold = 500; items: (number | null)[] = [null, null, null, null, null, null];
  itemCd: number[] = [0, 0, 0, 0, 0, 0]; stacks: number[] = [0, 0, 0, 0, 0, 0]; wardCd = 0; wards = 2;
  abil = [0, 0, 0, 0]; cds = [0, 0, 0, 0]; points = 1; summ: { id: string; cd: number }[] = [];
  kills = 0; deaths = 0; assists = 0; cs = 0; respawn = 0; isPlayer = false; role: Role = 'mid'; lane = 1;
  streak = 0; deathStreak = 0; multi = { n: 0, t: 0 }; assistMap = new Map<Unit, number>();
  recall: { t: number; max: number } | null = null; data: any = {}; pendingCast: { slot: number; unit: Unit } | null = null;
  ai: any = {}; totalDmg = 0; gaCd = 0; sterakCd = 0; spellblade = 0; spellbladeCd = 0; atkCount = 0;
  // minion / monster / structure
  mtype = ''; wp = 1; laneIdx = 0; tier = 0; heat = 0; heatTarget: Unit | null = null; camp: any = null; home: Vec = { x: 0, y: 0 }; resetting = false;
  owner: Unit | null = null; life = 0; aura = 0; color = '#888'; respawnAt = 0; gold0 = 0; xp0 = 0; ranged = false; projSpeed = 2000;
  constructor(kind: Kind, team: Team, x: number, y: number) { this.kind = kind; this.team = team; this.x = x; this.y = y; }
  get isStructure() { return this.kind === 'turret' || this.kind === 'inhib' || this.kind === 'nexus'; }
}

export interface GameConfig { playerChamp: string; playerRole: Role; playerTeam: 0 | 1; summoners: [string, string]; speed: number; blue: { champ: string; role: Role }[]; red: { champ: string; role: Role }[] }

export class Game {
  time = 0; speed = 1; paused = false;
  units: Unit[] = []; champs: Unit[] = []; structs: Unit[] = [];
  projectiles: any[] = []; zones: any[] = []; timers: { t: number; fn: () => void }[] = []; fx: FX[] = []; visions: any[] = [];
  player!: Unit; playerTeam: 0 | 1 = 0;
  camps: any[] = [];
  nextWave = 65; wave = 0;
  announcements: { text: string; sub?: string; t: number; color: string; icons?: string[] }[] = [];
  feed: { t: number; killer?: string; victim?: string; kteam: number; text?: string; icon?: string; assists?: string[] }[] = [];
  chat: { t: number; text: string; color: string }[] = [];
  teamKills = [0, 0]; teamTowers = [0, 0]; dragons: string[][] = [[], []]; dragonNext = 0; baronBuffUntil = [0, 0];
  firstBlood = false; firstTower = false; winner: number | null = null; endT = 0;
  shakeAmt = 0; announced = new Set<string>();
  onSound: (name: string, x?: number, y?: number) => void = () => {};
  onVoice: (text: string) => void = () => {};
  visT = 0; rngSeed = 12345;
  teamLane: number[] | null = null; teamLaneT = 0;
  cfg: GameConfig;

  constructor(cfg: GameConfig) {
    this.cfg = cfg; this.speed = cfg.speed; this.playerTeam = cfg.playerTeam;
    buildBushes();
    this.dragonNext = Math.floor(Math.random() * 4);
    for (const s of STRUCTS) {
      const p = nearestWalkable(s.x, s.y);
      const u = new Unit(s.kind, s.team, s.kind === 'turret' ? p.x : s.x, s.kind === 'turret' ? p.y : s.y);
      u.laneIdx = s.lane; u.tier = s.tier;
      if (s.kind === 'turret') { u.r = 88; u.maxHp = s.tier === 1 ? 5000 : s.tier === 2 ? 5000 : s.tier === 3 ? 4000 : 2700; u.b = { ad: s.tier === 4 ? 180 : 170 + s.tier * 10, as: 0.833, armor: 40, mr: 40, range: 775 }; u.name = ['', '外塔', '内塔', '高地塔', '门牙塔'][s.tier]; }
      if (s.kind === 'inhib') { u.r = 110; u.maxHp = 4000; u.b = { armor: 20, mr: 20 }; u.name = '水晶'; }
      if (s.kind === 'nexus') { u.r = 170; u.maxHp = 5500; u.b = { armor: 0, mr: 0 }; u.name = '主水晶'; }
      u.hp = u.maxHp;
      u.st = { ...u.st, ...u.b };
      this.units.push(u); this.structs.push(u);
    }
    const mk = (list: { champ: string; role: Role }[], team: 0 | 1) => list.forEach((p, i) => {
      const isPlayer = team === cfg.playerTeam && p.champ === cfg.playerChamp && p.role === cfg.playerRole;
      const summs: [string, string] = isPlayer ? cfg.summoners : p.role === 'jungle' ? ['SummonerFlash', 'SummonerSmite'] : p.role === 'adc' ? ['SummonerFlash', 'SummonerHeal'] : p.role === 'support' ? ['SummonerFlash', 'SummonerExhaust'] : ['SummonerFlash', 'SummonerDot'];
      const c = this.makeChamp(p.champ, team, p.role, summs, i);
      c.isPlayer = isPlayer;
      if (isPlayer) this.player = c;
    });
    mk(cfg.blue, 0); mk(cfg.red, 1);
    for (const cd of CAMPS) this.camps.push({ def: cd, alive: false, spawnAt: cd.first, units: [] as Unit[] });
    this.announce('欢迎来到英雄联盟', '', '#e8d9a8', true);
  }

  rand() { this.rngSeed = (this.rngSeed * 16807) % 2147483647; return this.rngSeed / 2147483647; }

  makeChamp(id: string, team: 0 | 1, role: Role, summs: [string, string], idx: number) {
    const f = FOUNTAIN[team];
    const a = (idx / 5) * Math.PI * 0.5 + (team === 0 ? 0 : Math.PI);
    const c = new Unit('champion', team, f.x + Math.cos(a) * 180 + (team === 0 ? 150 : -150), f.y - Math.sin(a) * 180 * (team === 0 ? 1 : -1) + (team === 0 ? -150 : 150));
    c.def = CHAMPIONS[id]; c.champId = id; c.name = DD_CHAMPIONS[id].title; c.role = role; c.lane = ROLE_LANE[role];
    c.ranged = c.def.ranged; c.r = 45; c.projSpeed = c.ranged ? 2000 : 0;
    c.summ = summs.map(s => ({ id: s, cd: 0 }));
    c.gold = 500;
    this.calcStats(c, true);
    c.hp = c.maxHp; c.mana = c.maxMana;
    this.units.push(c); this.champs.push(c);
    return c;
  }

  // ---------------- helpers ----------------
  after(t: number, fn: () => void) { this.timers.push({ t, fn }); }
  fxPush(f: FX) { this.fx.push(f); }
  shake(a: number) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  floatText(u: Unit, text: string, color: string, size = 18) { this.fx.push({ type: 'text', x: u.x + (Math.random() - 0.5) * 30, y: u.y - 100, t: 0, dur: 1.1, text, color, size, vy: -60 }); }
  hasBuff(u: Unit, id: string) { return u.buffs.find(b => b.id === id); }
  removeBuff(u: Unit, id: string) { u.buffs = u.buffs.filter(b => b.id !== id); }
  addBuff(u: Unit, b: Partial<Buff> & { id: string; dur: number }) {
    const old = u.buffs.findIndex(x => x.id === b.id);
    const nb = { t: 0, ...b } as Buff;
    if (old >= 0) u.buffs[old] = nb; else u.buffs.push(nb);
    return nb;
  }
  addShield(u: Unit, amount: number, dur: number, id: string) {
    amount *= 1 + (u.st.healAmp || 0);
    const s = u.shields.find(x => x.id === id);
    if (s) { s.amount = amount; s.t = dur; } else u.shields.push({ amount, t: dur, id });
  }
  shieldTotal(u: Unit) { return u.shields.reduce((a, s) => a + s.amount, 0); }
  heal(u: Unit, amt: number) {
    if (!u.alive) return;
    if (u.buffs.some(b => b.grievous)) amt *= 0.6;
    amt *= 1 + (u.st.healAmp || 0);
    u.hp = Math.min(u.maxHp, u.hp + amt);
    if (amt > 25 && (u === this.player)) this.fx.push({ type: 'text', x: u.x, y: u.y - 110, t: 0, dur: 1, text: '+' + Math.round(amt), color: '#6f6', size: 16, vy: -50 });
  }
  cleanse(u: Unit, slowsOnly = false) {
    u.buffs = u.buffs.filter(b => !(b.debuff && (b.slow || (!slowsOnly && (b.stun || b.root || b.silence || b.charm)))));
  }
  cc(u: Unit, type: 'stun' | 'root' | 'slow' | 'silence' | 'knockup' | 'charm', dur: number, src: Unit, amt = 0) {
    if (!u.alive || u.isStructure) return;
    if (u.kind === 'monster' && (u.mtype === 'baron' || u.mtype === 'dragon') && type !== 'slow') return;
    if (type === 'slow' && u.buffs.some(b => b.slowImmune)) return;
    if (u.buffs.some(b => b.stasis)) return;
    const id = 'cc_' + type + '_' + src.id;
    const b: any = { id, dur, debuff: true, src, name: { stun: '眩晕', root: '禁锢', slow: '减速', silence: '沉默', knockup: '击飞', charm: '魅惑' }[type] };
    b[type] = type === 'slow' ? amt : true;
    this.addBuff(u, b);
    if (type !== 'slow') { u.windup = 0; if (type !== 'root' && type !== 'silence') { u.recall = null; } }
    if (type === 'knockup' || type === 'stun' || type === 'charm') { u.dash = u.dash && u.dash.unstoppable ? u.dash : null; }
    if (u.def && type !== 'slow') this.fx.push({ type: 'text', x: u.x, y: u.y - 130, t: 0, dur: 0.9, text: b.name, color: '#ffd84a', size: 15, vy: -30 });
  }
  isCC(u: Unit) { return u.buffs.some(b => b.stun || b.knockup || b.stasis || b.charm); }
  canMove(u: Unit) { return !u.buffs.some(b => b.stun || b.knockup || b.stasis || b.root || b.charm); }
  canCast(u: Unit) { return !u.buffs.some(b => b.stun || b.knockup || b.stasis || b.silence || b.charm); }
  targetable(u: Unit) { return u.alive && !u.buffs.some(b => b.untargetable || b.stasis) && !this.isInvuln(u); }
  resetAttack(c: Unit) { c.attackCd = 0; }

  isEnemy(a: Unit, b: Unit) { return a.team !== b.team; }
  enemiesNear(team: Team, x: number, y: number, r: number, o: { champs?: boolean; structures?: boolean } = {}) {
    const out: Unit[] = [];
    for (const u of this.units) {
      if (!u.alive || u.team === team || u.kind === 'ward') continue;
      if (u.isStructure && !o.structures) continue;
      if (o.champs && u.kind !== 'champion') continue;
      if (u.buffs.some(b => b.untargetable || b.stasis)) continue;
      if (u.kind === 'monster' && u.resetting) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d <= r + u.r * 0.5) out.push(u);
    }
    return out;
  }
  alliesNear(team: Team, x: number, y: number, r: number, champsOnly = true) {
    return this.units.filter(u => u.alive && u.team === team && (!champsOnly || u.kind === 'champion') && Math.hypot(u.x - x, u.y - y) <= r);
  }
  cone(c: Unit, a: number, range: number, half: number) {
    return this.enemiesNear(c.team, c.x, c.y, range).filter(e => {
      let d = Math.atan2(e.y - c.y, e.x - c.x) - a;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      return Math.abs(d) <= half + Math.atan2(e.r, Math.max(1, Math.hypot(e.x - c.x, e.y - c.y)));
    });
  }
  addVision(team: Team, x: number, y: number, r: number, dur: number) { this.visions.push({ team, x, y, r, t: dur }); }

  isInvuln(u: Unit): boolean {
    if (!u.isStructure) return false;
    const same = (k: string, tier: number, lane?: number) => this.structs.some(s => s.alive && s.team === u.team && s.kind === k && s.tier === tier && (lane === undefined || s.laneIdx === lane));
    if (u.kind === 'turret') {
      if (u.tier === 1) return false;
      if (u.tier === 4) return !this.structs.some(s => s.team === u.team && s.kind === 'inhib' && !s.alive);
      return same('turret', u.tier - 1, u.laneIdx);
    }
    if (u.kind === 'inhib') return same('turret', 3, u.laneIdx);
    if (u.kind === 'nexus') return same('turret', 4);
    return false;
  }

  // ---------------- stats ----------------
  calcStats(c: Unit, init = false) {
    const s = DD_CHAMPIONS[c.champId].stats;
    const n = c.level;
    const f = (n - 1) * (0.7025 + 0.0175 * (n - 1));
    const it: any = {};
    for (const id of c.items) if (id) { const st = ITEMS[id].stats as any; for (const k in st) it[k] = (it[k] || 0) + st[k]; }
    const bf: any = {}; let maxSlow = 0;
    for (const b of c.buffs) {
      for (const k of ['ms', 'msFlat', 'as', 'ad', 'ap', 'armor', 'mr', 'haste', 'range', 'adPct', 'apPct'] as const) if ((b as any)[k]) bf[k] = (bf[k] || 0) + (b as any)[k];
      if (b.slow) maxSlow = Math.max(maxSlow, b.slow);
    }
    // team buffs
    const dr = this.dragons[c.team as 0 | 1] || [];
    const inf = dr.filter(d => d === 'infernal').length, mtn = dr.filter(d => d === 'mountain').length, cld = dr.filter(d => d === 'cloud').length;
    const baron = this.baronBuffUntil[c.team as 0 | 1] > this.time;
    const baseAd = s.attackdamage + c.def!.adGrowth * f;
    let ad = baseAd + (it.ad || 0) + (bf.ad || 0) + (baron ? 20 + this.time / 60 : 0);
    ad *= 1 + inf * 0.08 + (bf.adPct || 0);
    let ap = ((it.ap || 0) + (bf.ap || 0) + (baron ? 30 + this.time / 30 : 0)) * (1 + (it.apPct || 0) + inf * 0.08 + (bf.apPct || 0));
    const baseArmor = s.armor + s.armorperlevel * f;
    const armor = (baseArmor + (it.armor || 0) + (bf.armor || 0)) * (1 + mtn * 0.08);
    const mr = (s.spellblock + s.spellblockperlevel * f + (it.mr || 0) + (bf.mr || 0)) * (1 + mtn * 0.08);
    const bonusAs = (s.attackspeedperlevel / 100) * f + (it.as || 0) + (bf.as || 0);
    const as = Math.max(0.2, Math.min(2.5, s.attackspeed * (1 + bonusAs)));
    let ms = (s.movespeed + (it.ms || 0) + (bf.msFlat || 0)) * (1 + (it.msPct || 0) + (bf.ms || 0) + cld * 0.07) * (1 - maxSlow);
    if (ms > 490) ms = 490 + (ms - 490) * 0.5;
    const maxHp = s.hp + s.hpperlevel * f + (it.hp || 0);
    const maxMana = s.mp + s.mpperlevel * f + (it.mp || 0);
    if (!init) { if (maxHp > c.maxHp) c.hp += maxHp - c.maxHp; if (maxMana > c.maxMana) c.mana += maxMana - c.maxMana; }
    c.maxHp = maxHp; c.maxMana = maxMana; c.hp = Math.min(c.hp, maxHp); c.mana = Math.min(c.mana, maxMana);
    c.st = {
      ad, baseAd, bonusAd: ad - baseAd, ap, armor, bonusArmor: armor - baseArmor, mr, as, ms: Math.max(110, ms),
      range: s.attackrange + (bf.range || 0) + (c.data.rangeBonus || 0), crit: Math.min(1, it.crit || 0), lifesteal: it.lifesteal || 0,
      haste: (it.haste || 0) + (bf.haste || 0), bonusHp: it.hp || 0, magicPen: it.magicPen || 0, magicPenPct: it.magicPenPct || 0,
      armorPenPct: it.armorPenPct || 0, lethality: it.lethality || 0, critDmg: it.critDmg || 0, omnivamp: it.omnivamp || 0, healAmp: it.healAmp || 0,
      hpRegen: (s.hpregen + s.hpregenperlevel * f) / 5 + (it.hpRegen || 0) / 5, mpRegen: (s.mpregen + s.mpregenperlevel * f) / 5 + (it.mpRegen || 0),
    };
  }
  calcSimpleStats(u: Unit) {
    let ms = u.b.ms || 0, maxSlow = 0, as = 0, armor = 0, mr = 0;
    for (const b of u.buffs) { if (b.slow) maxSlow = Math.max(maxSlow, b.slow); if (b.ms) ms *= 1 + b.ms; if (b.as) as += b.as; if (b.armor) armor += b.armor; if (b.mr) mr += b.mr; }
    u.st = { ...u.st, ad: u.b.ad, as: Math.max(0.1, u.b.as * (1 + as)), armor: u.b.armor + armor, mr: u.b.mr + mr, range: u.b.range, ms: ms * (1 - maxSlow) };
  }
  hasItem(c: Unit, id: number) { return c.items.includes(id); }

  // ---------------- announcements ----------------
  announce(text: string, sub = '', color = '#e8d9a8', voice = true, icons?: string[]) {
    this.announcements.push({ text, sub, t: 0, color, icons });
    if (this.announcements.length > 3) this.announcements.shift();
    if (voice) this.onVoice(text);
  }
  chatMsg(text: string, color = '#e8d9a8') { this.chat.push({ t: this.time, text, color }); if (this.chat.length > 8) this.chat.shift(); }

  // ---------------- damage ----------------
  dmg(src: Unit, t: Unit, amount: number, type: DmgType, o: any = {}): any {
    if (!t.alive || amount <= 0) return 0;
    if (t.buffs.some(b => b.stasis)) return 0;
    if (this.isInvuln(t)) return 0;
    if (t.kind === 'monster' && t.resetting) return 0;
    const srcChamp = src.kind === 'champion' ? src : src.owner && src.owner.kind === 'champion' ? src.owner : null;
    let res = 0;
    if (type === 'physical') {
      res = t.st.armor;
      if (srcChamp) { res *= 1 - (srcChamp.st.armorPenPct || 0); res -= (srcChamp.st.lethality || 0); }
      const bc = this.hasBuff(t, 'bcShred'); if (bc) res *= 1 - 0.06 * (bc.stacks || 1);
    } else if (type === 'magic') {
      res = t.st.mr;
      if (srcChamp) { res *= 1 - (srcChamp.st.magicPenPct || 0); res -= (srcChamp.st.magicPen || 0); }
    }
    let mult = type === 'true' ? 1 : res >= 0 ? 100 / (100 + res) : 2 - 100 / (100 - res);
    for (const b of t.buffs) if (b.dr) mult *= 1 - b.dr;
    if (t.kind === 'champion' && o.attack && this.hasItem(t, 3047)) mult *= 0.88;
    if (t.kind === 'champion' && o.crit && this.hasItem(t, 3143)) mult *= 0.7;
    // backdoor protection
    if (t.isStructure && srcChamp) {
      const minions = this.units.some(m => m.alive && m.kind === 'minion' && m.team === srcChamp.team && Math.hypot(m.x - t.x, m.y - t.y) < 1100);
      if (!minions) mult *= 0.34;
      if (t.kind === 'turret' && o.ability) mult *= 0.5;
    }
    if (src.kind === 'minion' && t.kind === 'champion') mult *= 0.6;
    // jungle companion (smite holders)
    if (t.kind === 'monster' && srcChamp && srcChamp.summ.some(s => s.id === 'SummonerSmite')) mult *= 1.8;
    if (src.kind === 'monster' && t.kind === 'champion' && t.summ.some(s => s.id === 'SummonerSmite')) mult *= 0.55;
    if (src.kind === 'minion' && t.kind === 'minion' && src.mtype !== 'super') mult *= 1;
    let d = amount * mult;
    // shields
    for (const s of t.shields) {
      if (d <= 0) break;
      const a = Math.min(s.amount, d); s.amount -= a; d -= a;
    }
    t.shields = t.shields.filter(s => s.amount > 0.5);
    const dealt = amount * mult;
    t.hp -= d;
    t.lastDamaged = this.time; t.lastCombat = this.time; src.lastCombat = this.time;
    if (t.recall) { t.recall = null; }
    if (t.data && t.data.aiLastHitBy !== undefined) t.data.aiLastHitBy = src;
    t.data.lastAttacker = src;
    if (srcChamp) {
      srcChamp.totalDmg += t.kind === 'champion' ? dealt : 0;
      if (t.kind === 'champion') t.assistMap.set(srcChamp, this.time);
      // turret aggro: champion hurting champion under turret
      if (t.kind === 'champion') {
        for (const tw of this.structs) if (tw.alive && tw.kind === 'turret' && tw.team === t.team && Math.hypot(tw.x - srcChamp.x, tw.y - srcChamp.y) < 800 + srcChamp.r && Math.hypot(tw.x - t.x, tw.y - t.y) < 1100) { if (tw.target !== srcChamp) { tw.target = srcChamp; tw.heat = 0; } }
        // minions call for help
        for (const m of this.units) if (m.alive && m.kind === 'minion' && m.team === t.team && Math.hypot(m.x - srcChamp.x, m.y - srcChamp.y) < 700) { m.data.help = srcChamp; m.data.helpT = this.time; }
      }
      // sunlight (Leona)
      const sun = t.buffs.find(b => b.id === 'sunlight');
      if (sun && sun.src && sun.src !== srcChamp && sun.src.team === srcChamp.team && t.kind === 'champion') {
        this.removeBuff(t, 'sunlight');
        this.dmg(sun.src, t, 18 + 7 * sun.src.level, 'magic', {});
      }
      if (o.ability && !o.noProc) {
        if (this.hasItem(srcChamp, 3116) && !t.isStructure) this.cc(t, 'slow', 1, srcChamp, 0.3);
        if (this.hasItem(srcChamp, 3165) && t.kind === 'champion') this.addBuff(t, { id: 'grievous', name: '重伤', dur: 3, grievous: true, debuff: true });
      }
      if (srcChamp.st.omnivamp && !t.isStructure) this.heal(srcChamp, d * srcChamp.st.omnivamp * (o.aoe ? 0.33 : 1));
      if (t.kind === 'monster' && !t.target && !t.resetting) this.aggroCamp(t, src);
      if (t.kind === 'monster' && t.target && t.target.kind !== 'champion') t.target = src;
    }
    if (t.kind === 'monster' && !t.target) this.aggroCamp(t, src);
    if (src.kind === 'champion' && t.kind !== 'ward') src.revealT = this.time + 1.5;
    // floating numbers
    const show = srcChamp === this.player || t === this.player;
    if (show && d + (dealt - d) > 0.5) {
      const col = t === this.player ? '#ff4a4a' : type === 'physical' ? (o.crit ? '#ff8a2a' : '#f0e0c0') : type === 'magic' ? '#6fa8ff' : '#ffffff';
      this.fx.push({ type: 'text', x: t.x + (Math.random() - 0.5) * 50, y: t.y - 80, t: 0, dur: 0.9, text: Math.round(dealt) + (o.crit ? '!' : ''), color: col, size: o.crit ? 24 : t === this.player ? 15 : 17, vy: -70, vx: (Math.random() - 0.5) * 40 });
    }
    if (srcChamp && srcChamp.def?.onDamageDealt) srcChamp.def.onDamageDealt(this, srcChamp, t, d, !!o.ability);
    if (t.hp <= 0) {
      // Guardian Angel
      if (t.kind === 'champion' && this.hasItem(t, 3026) && t.gaCd <= 0) {
        t.hp = 1; t.gaCd = 300;
        this.addBuff(t, { id: 'ga', name: '守护天使', dur: 4, stasis: true, untargetable: true });
        this.after(4, () => { if (t.alive) { t.hp = DD_CHAMPIONS[t.champId].stats.hp * 0.5 + t.maxHp * 0.1; t.mana = t.maxMana * 0.3; } });
        return o.returnKill ? 'saved' : dealt;
      }
      this.kill(t, src);
      return o.returnKill ? 'kill' : dealt;
    }
    // Sterak
    if (t.kind === 'champion' && this.hasItem(t, 3053) && t.sterakCd <= 0 && t.hp < t.maxHp * 0.3) { t.sterakCd = 90; this.addShield(t, t.st.bonusHp * 0.6 + 100, 4, 'sterak'); this.fx.push({ type: 'ring', x: t.x, y: t.y, r: 90, t: 0, dur: 1, color: '#ff8040', follow: t }); }
    return o.returnKill ? 'hit' : dealt;
  }

  aggroCamp(m: Unit, src: Unit) {
    const s = src.owner || src;
    if (m.camp) { for (const u of m.camp.units) if (u.alive && !u.resetting) u.target = s; }
    else m.target = s;
  }

  giveGold(c: Unit, g: number, show = true) {
    c.gold += g;
    if (show && c === this.player && g >= 1) { this.fx.push({ type: 'gold', x: c.x, y: c.y - 60, t: 0, dur: 1.2, text: '+' + Math.round(g), color: '#ffd84a', size: 16, vy: -40 }); this.onSound('gold'); }
  }
  giveXp(c: Unit, xp: number) {
    if (!c.alive && c.kind === 'champion' && xp < 0) return;
    c.xp += xp;
    while (c.level < 18 && c.xp >= XP_TABLE[c.level]) {
      c.level++; c.points++;
      this.calcStats(c);
      this.fx.push({ type: 'levelup', x: c.x, y: c.y, t: 0, dur: 1.2, follow: c, color: '#7ad0ff' });
      if (c === this.player) this.onSound('levelup');
    }
  }

  kill(t: Unit, src: Unit) {
    t.alive = false; t.hp = 0; t.target = null; t.path = []; t.dash = null; t.recall = null; t.windup = 0;
    const killer = src.kind === 'champion' ? src : src.owner && src.owner.kind === 'champion' ? src.owner : null;
    if (t.kind === 'minion') {
      if (killer) { this.giveGold(killer, t.gold0); killer.cs++; }
      const near = this.champs.filter(c => c.alive && c.team !== t.team && Math.hypot(c.x - t.x, c.y - t.y) < 1600);
      const share = near.length > 1 ? t.xp0 * 1.25 / near.length : t.xp0;
      for (const c of near) this.giveXp(c, share);
      this.fx.push({ type: 'burst', x: t.x, y: t.y, r: 40, t: 0, dur: 0.4, color: t.team === 0 ? '#5aa0ff' : '#ff5a5a' });
    } else if (t.kind === 'monster') {
      const k = killer || (t.data.lastAttacker && (t.data.lastAttacker.owner || t.data.lastAttacker));
      const md = MONSTER[t.mtype];
      if (k && k.kind === 'champion') {
        if (md.epic) {
          const team = k.team as 0 | 1;
          if (t.mtype === 'dragon') {
            const d = DRAGONS[this.dragonNext];
            this.dragons[team].push(d.id);
            this.dragonNext = Math.floor(Math.random() * 4);
            for (const c of this.champs) if (c.team === team) { this.giveGold(c, 25); this.giveXp(c, 150); }
            this.announce(team === this.playerTeam ? '我方已击杀' + d.name : '敌方已击杀' + d.name, '', team === this.playerTeam ? '#6ab0ff' : '#ff6a6a');
            this.feed.push({ t: this.time, killer: k.champId, kteam: team, text: d.name, icon: 'dragon' });
          } else {
            this.baronBuffUntil[team] = this.time + 180;
            for (const c of this.champs) if (c.team === team) { this.giveGold(c, 300); this.giveXp(c, 300); }
            this.announce(team === this.playerTeam ? '我方已击杀纳什男爵' : '敌方已击杀纳什男爵', '', team === this.playerTeam ? '#b07aff' : '#ff6a6a');
            this.feed.push({ t: this.time, killer: k.champId, kteam: team, text: '纳什男爵', icon: 'baron' });
          }
        } else {
          this.giveGold(k, md.gold); this.giveXp(k, md.xp); k.cs += md.gold >= 50 ? 4 : 1;
        }
        if (md.buff === 'blue') this.addBuff(k, { id: 'blueBuff', name: '奥术之力(蓝BUFF)', dur: 120, haste: 10, data: 'blue' });
        if (md.buff === 'red') this.addBuff(k, { id: 'redBuff', name: '灼热(红BUFF)', dur: 120, data: 'red' });
      }
    } else if (t.kind === 'champion') this.onChampDeath(t, killer, src);
    else if (t.isStructure) this.onStructDeath(t, killer || src);
    else if (t.kind === 'pet') { /* */ }
    // buff transfer
    if (t.kind === 'champion' && killer) {
      for (const id of ['blueBuff', 'redBuff']) { const b = this.hasBuff(t, id); if (b) this.addBuff(killer, { ...b, t: 0, dur: Math.max(60, b.dur - b.t) }); }
    }
    if (t.kind === 'champion') t.buffs = t.buffs.filter(b => b.id === 'ezP' && false);
  }

  onChampDeath(t: Unit, killer: Unit | null, src: Unit) {
    t.deaths++; t.deathStreak++;
    t.respawn = DEATH_TIME[t.level - 1] * (1 + Math.max(0, this.time / 60 - 15) * 0.02);
    const assisters = [...t.assistMap.entries()].filter(([c, time]) => this.time - time < 10 && c !== killer && c.team !== t.team).map(([c]) => c);
    t.assistMap.clear();
    let bounty = 300;
    if (t.streak >= 2) bounty += Math.min(700, (t.streak - 1) * 100);
    if (t.deathStreak > 1) bounty = Math.max(100, bounty * Math.pow(0.85, t.deathStreak - 1));
    const shutdown = t.streak >= 3;
    const kTeam = killer ? killer.team : t.team === 0 ? 1 : 0;
    this.teamKills[kTeam as 0 | 1]++;
    const lines: string[] = [];
    if (killer) {
      if (!this.firstBlood) { this.firstBlood = true; bounty += 100; lines.push('第一滴血!'); }
      this.giveGold(killer, bounty);
      const xpShare = KILL_XP[t.level - 1] / (1 + assisters.length * 0.6);
      this.giveXp(killer, xpShare);
      killer.kills++; killer.streak++; killer.deathStreak = 0;
      if (this.time - killer.multi.t < 10) killer.multi.n++; else killer.multi.n = 1;
      killer.multi.t = this.time;
      for (const a of assisters) { a.assists++; this.giveGold(a, bounty * 0.5 / assisters.length); this.giveXp(a, xpShare * 0.6); }
      const multiName = ['', '', '双杀!', '三杀!', '四杀!', '五杀!'][Math.min(5, killer.multi.n)];
      const spree = ['', '', '', '大杀特杀!', '杀人如麻!', '主宰比赛!', '接近神了!', '超神!'][Math.min(7, killer.streak)];
      if (multiName) lines.push(multiName);
      else if (shutdown) lines.push('终结!');
      else if (spree && killer.streak >= 3) lines.push(killer.name + ' ' + spree);
      // passive hooks
      if (killer.champId === 'Jinx' || assisters.some(a => a.champId === 'Jinx')) {
        for (const j of [killer, ...assisters]) if (j.champId === 'Jinx') this.addBuff(j, { id: 'jinxP', name: '罪恶快感', dur: 6, ms: 1.75 * 0.5, as: 0.25 });
      }
      for (const y of [killer, ...assisters]) if (y.champId === 'MasterYi') { const b = this.hasBuff(y, 'yiR'); if (b) b.dur += 7; for (let i = 0; i < 3; i++) y.cds[i] *= 0.3; }
    } else {
      lines.push(t.name + ' 已被处决');
    }
    t.streak = 0;
    const mine = t.team === this.playerTeam;
    let main = '';
    if (t === this.player) main = '你被击杀了';
    else if (killer === this.player) main = '你击杀了一名敌人';
    else main = mine ? '一名友方英雄被击杀' : '一名敌方英雄被击杀';
    const text = lines.length && lines[0] !== t.name + ' 已被处决' ? lines[0] : main;
    this.announce(text, killer ? `${killer.name} 击杀了 ${t.name}` : lines[0], mine ? '#ff6a6a' : '#6ab0ff', true, killer ? [killer.champId, t.champId] : [t.champId]);
    this.feed.push({ t: this.time, killer: killer ? killer.champId : undefined, victim: t.champId, kteam: kTeam, assists: assisters.map(a => a.champId) });
    if (this.feed.length > 6) this.feed.shift();
    // ace
    const enemyTeam = t.team;
    if (this.champs.filter(c => c.team === enemyTeam).every(c => !c.alive)) this.after(1.2, () => this.announce('团灭!', '', mine ? '#ff6a6a' : '#6ab0ff'));
    this.fx.push({ type: 'nova', x: t.x, y: t.y, r: 120, t: 0, dur: 0.8, color: '#aaa' });
    if (t === this.player) this.onSound('death');
  }

  onStructDeath(t: Unit, killer: Unit) {
    const mine = t.team === this.playerTeam;
    const enemyTeam = (t.team === 0 ? 1 : 0) as 0 | 1;
    this.shake(15);
    this.fx.push({ type: 'nova', x: t.x, y: t.y, r: 350, t: 0, dur: 1.2, color: t.team === 0 ? '#6ab0ff' : '#ff6a6a' });
    if (t.kind === 'turret') {
      this.teamTowers[enemyTeam]++;
      const g = this.firstTower ? 250 : 400;
      this.firstTower = true;
      for (const c of this.champs) if (c.team === enemyTeam) this.giveGold(c, Math.round(g / 2 + (Math.hypot(c.x - t.x, c.y - t.y) < 1500 ? g / 2 : 0)));
      this.announce(mine ? '我方防御塔已被摧毁' : '已摧毁一座敌方防御塔', '', mine ? '#ff6a6a' : '#6ab0ff');
      this.feed.push({ t: this.time, killer: killer.kind === 'champion' ? killer.champId : undefined, kteam: enemyTeam, text: '防御塔', icon: 'turret' });
    } else if (t.kind === 'inhib') {
      t.respawnAt = this.time + 300;
      for (const c of this.champs) if (c.team === enemyTeam) this.giveGold(c, 10);
      this.announce(mine ? '我方水晶已被摧毁' : '已摧毁一座敌方水晶', '', mine ? '#ff6a6a' : '#6ab0ff');
      this.feed.push({ t: this.time, killer: killer.kind === 'champion' ? killer.champId : undefined, kteam: enemyTeam, text: '水晶', icon: 'inhib' });
    } else if (t.kind === 'nexus') {
      this.winner = enemyTeam; this.endT = this.time;
      this.shake(40);
      for (let i = 0; i < 6; i++) this.after(i * 0.3, () => this.fx.push({ type: 'nova', x: t.x + (Math.random() - 0.5) * 200, y: t.y + (Math.random() - 0.5) * 200, r: 500, t: 0, dur: 1.5, color: t.team === 0 ? '#6ab0ff' : '#ff6a6a' }));
      this.onVoice(enemyTeam === this.playerTeam ? '胜利' : '失败');
    }
  }

  // ---------------- projectiles / zones ----------------
  homing(o: any) {
    const p = { kind: 'homing', x: o.owner.x, y: o.owner.y, ...o, t: 0 };
    if (o.from) { p.x = o.from.x; p.y = o.from.y; }
    this.projectiles.push(p);
    return p;
  }
  skillshot(o: any) {
    const p = { kind: 'skill', x: o.owner.x, y: o.owner.y, sx: o.owner.x, sy: o.owner.y, traveled: 0, hit: o.sharedHit || new Set(), hits: 0, maxHits: 1, ...o, t: 0 };
    this.projectiles.push(p);
    this.onSound('cast', o.owner.x, o.owner.y);
    return p;
  }
  zone(o: any) {
    const z: any = { x: 0, y: 0, age: 0, tickT: 0, alive: true, ...o };
    z.detonate = () => { if (!z.alive) return; z.alive = false; if (z.onEnd) z.onEnd(this, z); };
    z.kill = () => { z.alive = false; };
    this.zones.push(z);
    return z;
  }
  delayedAoe(o: any) {
    this.fx.push({ type: 'warn', x: o.x, y: o.y, r: o.r, t: 0, dur: o.delay, color: o.color });
    this.after(o.delay, () => o.onDetonate(this));
  }
  laser(o: any) {
    const c = o.owner;
    this.addBuff(c, { id: 'laserCast', dur: o.delay, root: true, noAttack: true, hidden: true });
    const sx = c.x, sy = c.y;
    const ex = sx + Math.cos(o.angle) * o.length, ey = sy + Math.sin(o.angle) * o.length;
    this.fx.push({ type: 'line', x: sx, y: sy, x2: ex, y2: ey, t: 0, dur: o.delay, color: 'rgba(255,240,150,0.25)', width: o.width });
    this.after(o.delay, () => {
      this.fx.push({ type: 'beam', x: sx, y: sy, x2: ex, y2: ey, t: 0, dur: 0.6, color: o.color, width: o.width });
      this.shake(6);
      this.onSound('laser', sx, sy);
      for (const e of this.enemiesNear(c.team, (sx + ex) / 2, (sy + ey) / 2, o.length / 2 + 200)) {
        if (distToSeg(e.x, e.y, sx, sy, ex, ey) <= o.width / 2 + e.r) o.onHit(this, e);
      }
    });
  }
  dash(u: Unit, x: number, y: number, speed: number, onEnd: (() => void) | null, o: any = {}) {
    if (!o.forced && !this.canMove(u) && !o.unstoppable) return;
    let tx = x, ty = y;
    if (o.stopDist) { const d = Math.hypot(x - u.x, y - u.y); if (d > o.stopDist) { tx = u.x + (x - u.x) * (1 - o.stopDist / d); ty = u.y + (y - u.y) * (1 - o.stopDist / d); } else { tx = u.x; ty = u.y; } }
    if (!isWalk(tx, ty)) { const p = nearestWalkable(tx, ty); tx = p.x; ty = p.y; }
    u.dash = { x: tx, y: ty, speed, onEnd, unstoppable: !!o.unstoppable };
    u.windup = 0; u.recall = null;
  }
  blink(u: Unit, x: number, y: number, noCheck = false) {
    let p = { x, y };
    if (!noCheck && !isWalk(x, y)) p = nearestWalkable(x, y);
    u.x = p.x; u.y = p.y; u.path = []; u.windup = 0;
  }
  spawnPet(owner: Unit, x: number, y: number, o: any) {
    const old = this.units.find(u => u.kind === 'pet' && u.owner === owner && u.alive);
    if (old) old.alive = false;
    const p = new Unit('pet', owner.team, x, y);
    p.owner = owner; p.name = o.name; p.maxHp = p.hp = o.hp; p.r = o.r; p.life = o.dur; p.aura = o.aura; p.color = o.color;
    p.b = { ad: o.ad, as: 0.9, armor: 60, mr: 60, range: 150, ms: 400 };
    this.calcSimpleStats(p);
    this.units.push(p);
    return p;
  }

  // ---------------- commands ----------------
  cmdMove(c: Unit, x: number, y: number) {
    if (!c.alive) return;
    const yw = this.hasBuff(c, 'yiW'); if (yw) this.removeBuff(c, 'yiW');
    c.target = null; c.pendingCast = null; c.attackMove = false; c.recall = null;
    c.windup = 0;
    this.setPath(c, x, y);
  }
  setPath(c: Unit, x: number, y: number) {
    c.path = findPath(c.x, c.y, x, y); c.pathGoal = { x, y }; c.pathT = this.time;
  }
  cmdAttack(c: Unit, t: Unit) {
    if (!c.alive || !t.alive || t.team === c.team) return;
    if (c.target !== t) c.windup = 0;
    c.target = t; c.pendingCast = null; c.recall = null; c.attackMove = false; c.path = [];
  }
  cmdAttackMove(c: Unit, x: number, y: number) {
    if (!c.alive) return;
    const t = this.nearestEnemyTarget(c, x, y, 600, true) || this.nearestEnemyTarget(c, c.x, c.y, c.st.range + 150, true);
    if (t) { this.cmdAttack(c, t); c.attackMove = true; c.data.amGoal = { x, y }; return; }
    this.cmdMove(c, x, y); c.attackMove = true; c.data.amGoal = { x, y };
  }
  cmdStop(c: Unit) { c.path = []; c.target = null; c.pendingCast = null; c.attackMove = false; c.windup = 0; }
  nearestEnemyTarget(c: Unit, x: number, y: number, r: number, preferChamp = false) {
    let best: Unit | null = null, bd = 1e9;
    for (const u of this.units) {
      if (!u.alive || u.team === c.team || u.kind === 'ward' || !this.targetable(u)) continue;
      if (c.kind === 'champion' && !u.vis[c.team as 0 | 1]) continue;
      let d = Math.hypot(u.x - x, u.y - y) - u.r;
      if (d > r) continue;
      if (preferChamp && u.kind === 'champion') d -= 60;
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }
  cmdLevel(c: Unit, slot: number): boolean {
    if (c.points <= 0) return false;
    const l = c.abil[slot];
    if (slot === 3) { const allowed = c.level >= 16 ? 3 : c.level >= 11 ? 2 : c.level >= 6 ? 1 : 0; if (l >= allowed) return false; }
    else { if (l >= 5 || l >= Math.floor((c.level + 1) / 2)) return false; }
    c.abil[slot]++; c.points--;
    if (c === this.player) this.onSound('levelskill');
    return true;
  }
  cmdCast(c: Unit, slot: number, t: CastTarget): string | true {
    if (!c.alive) return '已阵亡';
    if (!this.canCast(c)) return '无法施放';
    if (c.dash) return '无法施放';
    const def = c.def!.abilities[slot];
    const lvl = c.abil[slot];
    if (!lvl) return '技能尚未学习';
    if (def.recast && def.recast(this, c, t)) { c.recall = null; return true; }
    if (c.cds[slot] > 0) return '技能冷却中';
    const cost = def.cost[lvl - 1];
    if (c.mana < cost) return '法力不足';
    if (def.target === 'unit') {
      const u = t.unit;
      if (!u || !u.alive || u.team === c.team || !this.targetable(u) || u.isStructure) return '无效目标';
      if (Math.hypot(u.x - c.x, u.y - c.y) > def.range + c.r + u.r) { c.pendingCast = { slot, unit: u }; c.target = null; c.path = []; return true; }
    }
    return this.doCast(c, slot, t) ? true : '无法施放';
  }
  doCast(c: Unit, slot: number, t: CastTarget) {
    const def = c.def!.abilities[slot];
    const lvl = c.abil[slot];
    const r = def.cast(this, c, t, lvl);
    if (r === false) return false;
    c.mana -= def.cost[lvl - 1];
    const haste = c.st.haste;
    c.cds[slot] = def.cd[lvl - 1] * 100 / (100 + haste);
    c.recall = null; c.pendingCast = null;
    if (def.target !== 'self') c.facing = Math.atan2(t.y - c.y, t.x - c.x);
    c.animT = 0.3; c.revealT = this.time + 1.5;
    if (def.key !== 'Q' || c.champId !== 'Jinx') {
      if ((this.hasItem(c, 3057) || this.hasItem(c, 3078) || this.hasItem(c, 3100)) && c.spellbladeCd <= 0) c.spellblade = this.time + 10;
    }
    c.def!.onAbilityCast?.(this, c, def.key);
    if (c === this.player) this.onSound('cast');
    return true;
  }
  cmdSummoner(c: Unit, i: number, t: CastTarget): string | true {
    const s = c.summ[i];
    if (!c.alive || !s) return '无法施放';
    if (s.cd > 0) return '召唤师技能冷却中';
    if (this.isCC(c) && s.id !== 'SummonerBoost') return '无法施放';
    const sLvl = c.level;
    switch (s.id) {
      case 'SummonerFlash': {
        if (this.buffBlocksMove(c)) return '无法施放';
        const d = Math.min(400, Math.hypot(t.x - c.x, t.y - c.y)), a = Math.atan2(t.y - c.y, t.x - c.x);
        this.fx.push({ type: 'burst', x: c.x, y: c.y, r: 60, t: 0, dur: 0.4, color: '#ffe680' });
        let nx = c.x + Math.cos(a) * d, ny = c.y + Math.sin(a) * d;
        if (!isWalk(nx, ny)) { const p = nearestWalkable(nx, ny); nx = p.x; ny = p.y; }
        c.x = nx; c.y = ny; c.path = []; c.dash = null; c.windup = 0;
        this.fx.push({ type: 'burst', x: c.x, y: c.y, r: 60, t: 0, dur: 0.4, color: '#ffe680' });
        this.onSound('flash', c.x, c.y);
        break;
      }
      case 'SummonerDot': {
        const u = t.unit && t.unit.kind === 'champion' && t.unit.team !== c.team ? t.unit : this.enemiesNear(c.team, c.x, c.y, 600, { champs: true }).sort((a, b) => a.hp - b.hp)[0];
        if (!u || Math.hypot(u.x - c.x, u.y - c.y) > 650) return '目标超出范围';
        this.addBuff(u, { id: 'ignite', name: '引燃', dur: 5, dot: (70 + 20 * sLvl) / 5, dotType: 'true', src: c, grievous: true, debuff: true });
        this.fx.push({ type: 'burst', x: u.x, y: u.y, r: 70, t: 0, dur: 0.5, color: '#ff7a2a' });
        break;
      }
      case 'SummonerHeal': {
        const amt = 80 + 15 * sLvl;
        this.heal(c, amt); this.addBuff(c, { id: 'healMs', name: '治疗术', dur: 1, ms: 0.3 });
        const ally = this.alliesNear(c.team, c.x, c.y, 850).filter(a => a !== c).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (ally) { this.heal(ally, amt); this.addBuff(ally, { id: 'healMs', dur: 1, ms: 0.3 }); }
        this.fx.push({ type: 'nova', x: c.x, y: c.y, r: 200, t: 0, dur: 0.6, color: '#7aff9a' });
        break;
      }
      case 'SummonerSmite': {
        const u = t.unit && (t.unit.kind === 'monster' || t.unit.kind === 'minion') && t.unit.team !== c.team ? t.unit : this.enemiesNear(c.team, c.x, c.y, 650).filter(e => e.kind === 'monster').sort((a, b) => b.maxHp - a.maxHp)[0];
        if (!u || Math.hypot(u.x - c.x, u.y - c.y) > 650) return '没有可惩戒的目标';
        this.fx.push({ type: 'beam', x: u.x, y: u.y - 400, x2: u.x, y2: u.y, t: 0, dur: 0.4, color: '#ffe680', width: 30 });
        this.dmg(c, u, 600 + (sLvl >= 9 ? 300 : 0), 'true', {});
        if (u.alive === false || u.hp < 0) { /* */ }
        this.heal(c, 90);
        break;
      }
      case 'SummonerHaste': this.addBuff(c, { id: 'ghost', name: '幽灵疾步', dur: 10, ms: 0.35 }); break;
      case 'SummonerBarrier': this.addShield(c, 105 + 25 * sLvl, 2.5, 'barrier'); this.fx.push({ type: 'ring', x: c.x, y: c.y, r: 90, t: 0, dur: 2.5, color: '#ffe9a0', follow: c }); break;
      case 'SummonerExhaust': {
        const u = t.unit && t.unit.kind === 'champion' && t.unit.team !== c.team ? t.unit : this.enemiesNear(c.team, c.x, c.y, 650, { champs: true }).sort((a, b) => b.st.ad - a.st.ad)[0];
        if (!u || Math.hypot(u.x - c.x, u.y - c.y) > 700) return '目标超出范围';
        this.addBuff(u, { id: 'exhaust', name: '虚弱', dur: 3, debuff: true, slow: 0.3, dr: -0 });
        this.addBuff(u, { id: 'exhaustDmg', name: '虚弱', dur: 3, debuff: true, adPct: -0.35, apPct: -0.35, hidden: true });
        break;
      }
      case 'SummonerBoost': this.cleanse(c); this.fx.push({ type: 'burst', x: c.x, y: c.y, r: 80, t: 0, dur: 0.5, color: '#fff' }); break;
    }
    s.cd = SUMMONER_CD[s.id];
    c.recall = null;
    return true;
  }
  buffBlocksMove(c: Unit) { return c.buffs.some(b => b.root || b.stun || b.knockup || b.stasis); }
  cmdItem(c: Unit, slot: number, t: CastTarget): string | true {
    const id = c.items[slot];
    if (!id || !c.alive) return '无法使用';
    const it = ITEMS[id];
    if (!it.active) return '该装备没有主动效果';
    if (c.itemCd[slot] > 0) return '装备冷却中';
    if (it.active === 'potion') {
      this.addBuff(c, { id: 'potion', name: '生命药水', dur: 15, hot: 8 });
      c.stacks[slot]--; if (c.stacks[slot] <= 0) c.items[slot] = null;
      this.onSound('potion');
    } else if (it.active === 'stasis') {
      this.addBuff(c, { id: 'zhonya', name: '凝滞', dur: 2.5, stasis: true, untargetable: true });
      c.target = null; c.path = []; c.recall = null;
      this.onSound('stasis');
    } else if (it.active === 'rocketbelt') {
      const a = Math.atan2(t.y - c.y, t.x - c.x);
      this.dash(c, c.x + Math.cos(a) * 275, c.y + Math.sin(a) * 275, 1200, () => {
        for (const e of this.cone(c, a, 500, 0.5)) this.dmg(c, e, 125 + 0.15 * c.st.ap, 'magic', { ability: true, aoe: true });
        this.fx.push({ type: 'cone', x: c.x, y: c.y, r: 500, angle: a, width: 0.5, t: 0, dur: 0.4, color: '#ff9a3a' });
      });
    } else if (it.active === 'youmuu') this.addBuff(c, { id: 'youmuu', name: '幽梦之灵', dur: 6, ms: 0.2 });
    c.itemCd[slot] = it.activeCd || 0;
    return true;
  }
  cmdWard(c: Unit, x: number, y: number): string | true {
    if (!c.alive) return '已阵亡';
    if (c.wards <= 0) return '没有可用守卫';
    if (Math.hypot(x - c.x, y - c.y) > 650) { const a = Math.atan2(y - c.y, x - c.x); x = c.x + Math.cos(a) * 600; y = c.y + Math.sin(a) * 600; }
    if (!isWalk(x, y)) return '无法放置';
    c.wards--; if (c.wardCd <= 0) c.wardCd = 120;
    const w = new Unit('ward', c.team, x, y);
    w.life = 90 + c.level * 3; w.r = 20; w.maxHp = w.hp = 3; w.owner = c; w.name = '侦查守卫';
    this.units.push(w);
    const mine = this.units.filter(u => u.kind === 'ward' && u.alive && u.owner === c);
    if (mine.length > 3) mine[0].alive = false;
    this.onSound('ward');
    return true;
  }
  cmdRecall(c: Unit) {
    if (!c.alive || c.recall) return;
    c.path = []; c.target = null; c.pendingCast = null; c.windup = 0;
    const t = this.baronBuffUntil[c.team as 0 | 1] > this.time ? 4 : 8;
    c.recall = { t, max: t };
    if (c === this.player) this.onSound('recall');
  }
  inShop(c: Unit) { return !c.alive || Math.hypot(c.x - FOUNTAIN[c.team as 0 | 1].x, c.y - FOUNTAIN[c.team as 0 | 1].y) < 1150; }
  buy(c: Unit, id: number): string | true {
    if (!this.inShop(c)) return '必须在泉水处购买';
    const it = ITEMS[id];
    if (!it) return '未知装备';
    if (it.boots && c.items.some(x => x && ITEMS[x].boots) && !it.from.some(f => c.items.includes(f))) return '只能拥有一双鞋子';
    if (it.stack) {
      const si = c.items.findIndex(x => x === id);
      if (si >= 0 && c.stacks[si] < it.stack) { if (c.gold < it.gold) return '金币不足'; c.gold -= it.gold; c.stacks[si]++; this.onSound('buy'); return true; }
    }
    const [cost, used] = buyCost(id, c.items);
    if (c.gold < cost) return '金币不足';
    const inv = [...c.items];
    for (const i of used) inv[i] = null;
    const slot = inv.findIndex(x => x === null);
    if (slot < 0) return '背包已满';
    c.gold -= cost;
    for (const i of used) { c.items[i] = null; c.stacks[i] = 0; }
    c.items[slot] = id; c.stacks[slot] = 1; c.itemCd[slot] = 0;
    this.calcStats(c);
    if (c === this.player) this.onSound('buy');
    return true;
  }
  sell(c: Unit, slot: number): string | true {
    if (!this.inShop(c)) return '必须在泉水处出售';
    const id = c.items[slot]; if (!id) return '空';
    c.gold += Math.floor(ITEMS[id].gold * 0.7) * (ITEMS[id].stack ? c.stacks[slot] : 1);
    c.items[slot] = null; c.stacks[slot] = 0;
    this.calcStats(c);
    return true;
  }

  // ---------------- update ----------------
  update(rdt: number) {
    if (this.paused) return;
    const dt = Math.min(0.05, rdt) * this.speed;
    if (this.winner !== null) { this.time += dt; this.updateFx(dt); return; }
    this.time += dt;
    const T = this.time;
    // timeline announcements
    const once = (k: string, fn: () => void) => { if (!this.announced.has(k)) { this.announced.add(k); fn(); } };
    if (T > 35) once('30s', () => this.announce('距离小兵出击还有30秒', '', '#e8d9a8'));
    if (T > 65) once('spawn', () => this.announce('全军出击', '', '#e8d9a8'));
    if (T > 300 - 30) once('drag30', () => this.chatMsg('元素巨龙将在30秒后刷新', '#ffb070'));
    if (T > 1200 - 30) once('baron30', () => this.chatMsg('纳什男爵将在30秒后刷新', '#c090ff'));
    // passive gold
    if (T > 65) for (const c of this.champs) c.gold += 2.04 * dt;
    // waves
    if (T >= this.nextWave) { this.spawnWave(); this.nextWave += 30; }
    // camps
    for (const cp of this.camps) {
      if (!cp.alive && T >= cp.spawnAt) this.spawnCamp(cp);
      if (cp.alive && cp.units.every((u: Unit) => !u.alive)) { cp.alive = false; cp.spawnAt = T + cp.def.respawn; }
    }
    // inhib respawn
    for (const s of this.structs) if (s.kind === 'inhib' && !s.alive && T >= s.respawnAt) { s.alive = true; s.hp = s.maxHp; this.announce(s.team === this.playerTeam ? '我方水晶正在重生' : '敌方水晶正在重生', '', '#e8d9a8'); }
    // timers
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    // units
    for (const u of this.units) this.updateUnit(u, dt);
    this.separate();
    this.updateProjectiles(dt);
    for (const z of this.zones) {
      if (!z.alive) continue;
      z.age += dt;
      if (z.follow) { z.x = z.follow.x; z.y = z.follow.y; if (!z.follow.alive) z.kill(); }
      if (z.tick) { z.tickT -= dt; if (z.tickT <= 0) { z.tickT += z.tick; z.onTick?.(this, z); } }
      if (z.age >= z.dur && z.alive) z.detonate();
    }
    this.zones = this.zones.filter(z => z.alive);
    for (const v of this.visions) v.t -= dt;
    this.visions = this.visions.filter(v => v.t > 0);
    this.visT -= dt;
    if (this.visT <= 0) { this.visT = 0.1; this.updateVision(); }
    this.updateFx(dt);
    this.units = this.units.filter(u => u.alive || u.kind === 'champion' || u.isStructure);
    for (const a of this.announcements) a.t += dt;
    this.announcements = this.announcements.filter(a => a.t < 4);
  }
  updateFx(dt: number) {
    for (const f of this.fx) { f.t += dt; if (f.vy) f.y += f.vy * dt; if (f.vx) f.x += f.vx * dt; if (f.follow) { f.x = f.follow.x; f.y = f.follow.y; } }
    this.fx = this.fx.filter(f => f.t < f.dur);
    this.shakeAmt *= Math.pow(0.02, dt);
  }

  spawnWave() {
    this.wave++;
    const tmin = this.time / 60;
    const cannon = this.time > 1500 ? true : this.time > 900 ? this.wave % 2 === 0 : this.wave % 3 === 0;
    for (const team of [0, 1] as const) for (let lane = 0; lane < 3; lane++) {
      const enemy = team === 0 ? 1 : 0;
      const inhibDown = this.structs.some(s => s.kind === 'inhib' && s.team === enemy && s.laneIdx === lane && !s.alive);
      const allDown = this.structs.filter(s => s.kind === 'inhib' && s.team === enemy).every(s => !s.alive);
      const types: string[] = [];
      if (inhibDown) types.push('super'); if (allDown) types.push('super');
      types.push('melee', 'melee', 'melee');
      if (cannon) types.push('siege');
      types.push('caster', 'caster', 'caster');
      types.forEach((ty, i) => this.after(i * 0.7, () => this.spawnMinion(team, lane, ty, tmin)));
    }
  }
  spawnMinion(team: 0 | 1, lane: number, ty: string, tmin: number) {
    const path = team === 0 ? LANES[lane] : [...LANES[lane]].reverse();
    const st = MINION[ty];
    const p0 = path[0], p1 = path[1];
    const a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const m = new Unit('minion', team, p0.x + Math.cos(a) * 350, p0.y + Math.sin(a) * 350);
    m.mtype = ty; m.laneIdx = lane; m.wp = 1; m.r = st.r; m.ranged = !!st.ranged; m.projSpeed = ty === 'siege' ? 1200 : 900;
    const k = Math.max(0, Math.floor((tmin - 1.5) / 1.5));
    m.maxHp = m.hp = st.hp + st.hpG * k;
    m.b = { ad: st.ad + st.adG * k, as: st.as, armor: st.armor + Math.min(16, k * 0.8), mr: st.mr + Math.min(16, k), range: st.range, ms: st.ms + Math.min(100, tmin * 2) };
    m.gold0 = st.gold + (ty === 'siege' ? Math.min(30, k * 3) : k * 0.25); m.xp0 = st.xp;
    m.name = { melee: '近战小兵', caster: '远程小兵', siege: '炮车', super: '超级兵' }[ty] as string;
    m.facing = a;
    this.calcSimpleStats(m);
    this.units.push(m);
  }
  spawnCamp(cp: any) {
    cp.alive = true; cp.units = [];
    const tmin = this.time / 60;
    for (const md of cp.def.monsters) {
      const d = MONSTER[md.type];
      const p = nearestWalkable(cp.def.x + md.dx, cp.def.y + md.dy);
      const u = new Unit('monster', 2, p.x, p.y);
      u.mtype = md.type; u.camp = cp; u.home = { x: p.x, y: p.y }; u.r = d.r; u.name = d.name; u.color = d.color; u.ranged = !!d.ranged; u.projSpeed = 1000;
      const scale = 1 + tmin * 0.025;
      u.maxHp = u.hp = d.hp * scale;
      u.b = { ad: d.ad * (1 + tmin * 0.02), as: d.as, armor: d.armor, mr: d.mr, range: d.range, ms: 380 };
      if (md.type === 'dragon') { const dd = DRAGONS[this.dragonNext]; u.name = dd.name; u.color = dd.color; u.data.drake = dd.id; }
      u.facing = Math.PI / 2;
      this.calcSimpleStats(u);
      cp.units.push(u); this.units.push(u);
    }
    if (cp.def.id === 'dragon') this.chatMsg(DRAGONS[this.dragonNext].name + '已经刷新!', '#ffb070');
    if (cp.def.id === 'baron') this.announce('纳什男爵已经刷新', '', '#c090ff');
  }

  updateVision() {
    for (const team of [0, 1] as const) {
      const src = this.units.filter(u => u.alive && u.team === team && u.kind !== 'inhib' && u.kind !== 'nexus');
      for (const u of this.units) {
        if (u.team === team) { u.vis[team] = true; continue; }
        if (u.isStructure) { u.vis[team] = true; continue; }
        if (!u.alive) { u.vis[team] = false; continue; }
        if (u.invisible) { u.vis[team] = false; continue; }
        if (u.kind === 'ward') { u.vis[team] = false; continue; }
        const inBush = u.bush >= 0 && u.revealT < this.time;
        let seen = false;
        for (const s of src) {
          const r = s.kind === 'champion' ? 1200 : s.kind === 'turret' ? 1350 : s.kind === 'ward' ? 900 : s.kind === 'minion' ? 1000 : 800;
          const dx = s.x - u.x, dy = s.y - u.y;
          if (dx * dx + dy * dy > r * r) continue;
          if (inBush && s.bush !== u.bush && !(s.kind === 'ward' && bushAt(s.x, s.y) === u.bush)) continue;
          seen = true; break;
        }
        if (!seen && !inBush) for (const v of this.visions) if (v.team === team && Math.hypot(v.x - u.x, v.y - u.y) < v.r) { seen = true; break; }
        if (!seen && inBush) for (const v of this.visions) if (v.team === team && Math.hypot(v.x - u.x, v.y - u.y) < v.r * 0.5) { seen = true; break; }
        u.vis[team] = seen;
      }
    }
  }

  moveToward(u: Unit, tx: number, ty: number, dt: number, stop = 0) {
    const dx = tx - u.x, dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d <= stop + 1) return true;
    const step = Math.min(d - stop, u.st.ms * dt);
    const nx = u.x + dx / d * step, ny = u.y + dy / d * step;
    u.facing = Math.atan2(dy, dx);
    if (isWalk(nx, ny)) { u.x = nx; u.y = ny; }
    else if (isWalk(nx, u.y)) u.x = nx;
    else if (isWalk(u.x, ny)) u.y = ny;
    else return true;
    return false;
  }
  followPath(u: Unit, dt: number) {
    if (!u.path.length) return true;
    const p = u.path[0];
    let remaining = u.st.ms * dt;
    while (u.path.length && remaining > 0) {
      const q = u.path[0];
      const d = Math.hypot(q.x - u.x, q.y - u.y);
      if (d <= remaining) { if (isWalk(q.x, q.y) || true) { u.x = q.x; u.y = q.y; } remaining -= d; u.path.shift(); }
      else { this.moveToward(u, q.x, q.y, remaining / Math.max(1, u.st.ms), 0); remaining = 0; }
    }
    void p;
    return u.path.length === 0;
  }
  chase(u: Unit, t: Unit, dt: number, stop: number) {
    if (u.kind !== 'champion' || lineWalkable(u.x, u.y, t.x, t.y)) { u.path = []; this.moveToward(u, t.x, t.y, dt, stop); return; }
    if (!u.path.length || !u.pathGoal || Math.hypot(u.pathGoal.x - t.x, u.pathGoal.y - t.y) > 200 || this.time - u.pathT > 1) this.setPath(u, t.x, t.y);
    this.followPath(u, dt);
  }

  updateUnit(u: Unit, dt: number) {
    if (u.kind === 'champion') this.updateChampTimers(u, dt);
    if (!u.alive) return;
    // buffs
    for (const b of u.buffs) {
      b.t += dt;
      if (b.dot && b.src) this.dmg(b.src, u, b.dot * dt, b.dotType || 'magic', { noProc: true, dot: true });
      if (b.hot) this.heal(u, b.hot * dt);
      if (!u.alive) return;
    }
    const exp = u.buffs.filter(b => b.t >= b.dur);
    if (exp.length) { u.buffs = u.buffs.filter(b => b.t < b.dur); for (const b of exp) b.onExpire?.(this, u); }
    for (const s of u.shields) s.t -= dt;
    u.shields = u.shields.filter(s => s.t > 0 && s.amount > 0);
    u.attackCd -= dt; u.animT -= dt;
    u.bush = u.kind === 'champion' || u.kind === 'ward' || u.kind === 'minion' ? bushAt(u.x, u.y) : -1;
    if (u.kind === 'champion') this.calcStats(u); else if (!u.isStructure) this.calcSimpleStats(u);
    if (u.kind === 'ward') { u.life -= dt; if (u.life <= 0) u.alive = false; return; }
    if (u.kind === 'inhib' || u.kind === 'nexus') return;
    if (u.kind === 'turret') { this.updateTurret(u, dt); return; }
    // dash
    if (u.dash) {
      const d = u.dash;
      const dist = Math.hypot(d.x - u.x, d.y - u.y);
      const step = d.speed * dt;
      if (dist <= step) { u.x = d.x; u.y = d.y; u.dash = null; d.onEnd?.(); }
      else { u.x += (d.x - u.x) / dist * step; u.y += (d.y - u.y) / dist * step; u.facing = Math.atan2(d.y - u.y, d.x - u.x); }
      return;
    }
    if (u.buffs.some(b => b.stun || b.knockup || b.stasis)) { u.windup = 0; return; }
    const charm = u.buffs.find(b => b.charm);
    if (charm) { u.windup = 0; const s = u.st.ms; u.st.ms = s * 0.5; this.moveToward(u, charm.src.x, charm.src.y, dt, 50); u.st.ms = s; return; }
    if (u.kind === 'champion') {
      if (!u.isPlayer) botThink(this, u, dt);
      this.champAct(u, dt);
    } else if (u.kind === 'minion') this.minionAct(u, dt);
    else if (u.kind === 'monster') this.monsterAct(u, dt);
    else if (u.kind === 'pet') this.petAct(u, dt);
  }

  updateChampTimers(c: Unit, dt: number) {
    for (let i = 0; i < 4; i++) if (c.cds[i] > 0) c.cds[i] = Math.max(0, c.cds[i] - dt);
    for (const s of c.summ) if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
    for (let i = 0; i < 6; i++) if (c.itemCd[i] > 0) c.itemCd[i] -= dt;
    c.gaCd -= dt; c.sterakCd -= dt; c.spellbladeCd -= dt;
    if (c.wards < 2) { c.wardCd -= dt; if (c.wardCd <= 0) { c.wards++; c.wardCd = c.wards < 2 ? 120 : 0; } }
    if (!c.alive) {
      c.respawn -= dt;
      if (c.respawn <= 0) {
        const f = FOUNTAIN[c.team as 0 | 1];
        c.alive = true; c.x = f.x + (c.team === 0 ? 200 : -200); c.y = f.y + (c.team === 0 ? -200 : 200);
        this.calcStats(c); c.hp = c.maxHp; c.mana = c.maxMana; c.path = []; c.target = null; c.buffs = []; c.shields = [];
        if (c === this.player) this.onSound('respawn');
      }
      return;
    }
    // regen
    c.hp = Math.min(c.maxHp, c.hp + c.st.hpRegen * dt);
    if (c.def!.abilities[0] && DD_CHAMPIONS[c.champId].partype !== '无') c.mana = Math.min(c.maxMana, c.mana + c.st.mpRegen * dt);
    if (this.hasBuff(c, 'blueBuff')) c.mana = Math.min(c.maxMana, c.mana + c.maxMana * 0.01 * dt);
    if (this.hasBuff(c, 'redBuff')) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.01 * dt * (this.time - c.lastCombat > 3 ? 1 : 0.3));
    const ocean = this.dragons[c.team as 0 | 1].filter(d => d === 'ocean').length;
    if (ocean) c.hp = Math.min(c.maxHp, c.hp + (c.maxHp - c.hp) * 0.006 * ocean * dt);
    // fountain
    const f = FOUNTAIN[c.team as 0 | 1], ef = FOUNTAIN[c.team === 0 ? 1 : 0];
    if (Math.hypot(c.x - f.x, c.y - f.y) < 1100) { c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.1 * dt); c.mana = Math.min(c.maxMana, c.mana + c.maxMana * 0.1 * dt); }
    if (Math.hypot(c.x - ef.x, c.y - ef.y) < 1300) { c.data.fountT = (c.data.fountT || 0) - dt; if (c.data.fountT <= 0) { c.data.fountT = 0.3; this.fx.push({ type: 'beam', x: ef.x, y: ef.y - 150, x2: c.x, y2: c.y, t: 0, dur: 0.2, color: c.team === 0 ? '#ff4040' : '#40a0ff', width: 14 }); const dummy = this.structs.find(s => s.kind === 'nexus' && s.team !== c.team)!; this.dmg(dummy, c, 400, 'true', {}); } }
    // items passives
    if (this.hasItem(c, 3068) || this.hasItem(c, 3084)) {
      c.data.sunT = (c.data.sunT || 0) - dt;
      if (c.data.sunT <= 0 && this.hasItem(c, 3068)) { c.data.sunT = 1; for (const e of this.enemiesNear(c.team, c.x, c.y, 325)) this.dmg(c, e, (20 + 0.01 * c.st.bonusHp) * (e.kind === 'monster' ? 1.5 : 1), 'magic', { noProc: true, aoe: true }); }
    }
    if (this.hasItem(c, 3083) && c.st.bonusHp >= 1100 && this.time - c.lastDamaged > 6) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.05 * dt);
    if (this.hasItem(c, 3110)) for (const e of this.enemiesNear(c.team, c.x, c.y, 700, { champs: true })) this.addBuff(e, { id: 'frozenHeart', name: '冰霜之心', dur: 0.5, as: -0.15, debuff: true });
    // recall
    if (c.recall) {
      c.recall.t -= dt;
      if (c.recall.t <= 0) {
        c.recall = null;
        const fp = FOUNTAIN[c.team as 0 | 1];
        c.x = fp.x + (c.team === 0 ? 150 : -150); c.y = fp.y + (c.team === 0 ? -150 : 150); c.path = [];
        this.fx.push({ type: 'nova', x: c.x, y: c.y, r: 150, t: 0, dur: 0.7, color: '#7ab0ff' });
        if (c === this.player) this.onSound('recallDone');
      }
    }
    c.def!.onUpdate?.(this, c, dt);
  }

  champAct(c: Unit, dt: number) {
    const rooted = this.buffBlocksMove(c);
    // pending cast
    if (c.pendingCast) {
      const pc = c.pendingCast; const u = pc.unit; const def = c.def!.abilities[pc.slot];
      if (!u.alive || !this.targetable(u) || !u.vis[c.team as 0 | 1]) { c.pendingCast = null; }
      else if (Math.hypot(u.x - c.x, u.y - c.y) <= def.range + c.r + u.r) { c.pendingCast = null; if (c.cds[pc.slot] <= 0 && this.canCast(c)) this.doCast(c, pc.slot, { x: u.x, y: u.y, unit: u }); }
      else { if (!rooted) this.chase(c, u, dt, 0); return; }
    }
    if (c.target) {
      const t = c.target;
      if (!t.alive || !this.targetable(t) || (!t.vis[c.team as 0 | 1] && !t.isStructure)) { c.target = null; c.windup = 0; if (c.attackMove && c.data.amGoal) this.cmdAttackMove(c, c.data.amGoal.x, c.data.amGoal.y); return; }
      this.attackLogic(c, t, dt, rooted);
      return;
    }
    if (c.attackMove) {
      const t = this.nearestEnemyTarget(c, c.x, c.y, c.st.range + 250, true);
      if (t) { c.target = t; return; }
    }
    if (c.path.length && !rooted && !c.buffs.some(b => b.data && b.data.channel)) {
      if (this.followPath(c, dt)) c.attackMove = false;
    }
  }
  attackLogic(u: Unit, t: Unit, dt: number, rooted: boolean) {
    const range = u.st.range + u.r + t.r;
    const d = Math.hypot(t.x - u.x, t.y - u.y);
    if (u.windup > 0) {
      u.windup -= dt;
      u.facing = Math.atan2(t.y - u.y, t.x - u.x);
      if (u.windup <= 0) { u.windup = 0; this.fireAttack(u, u.windTarget || t); }
      return;
    }
    if (d > range) { if (!rooted) { if (u.kind === 'champion') this.chase(u, t, dt, range - 10); else this.moveToward(u, t.x, t.y, dt, range - 10); } return; }
    u.path = [];
    u.facing = Math.atan2(t.y - u.y, t.x - u.x);
    if (u.attackCd <= 0 && !u.buffs.some(b => b.noAttack)) {
      const period = 1 / u.st.as;
      u.windup = Math.max(0.06, period * (u.kind === 'champion' ? 0.22 : 0.3));
      u.windTarget = t; u.attackCd = period; u.animT = u.windup + 0.12; u.lastAttackT = this.time;
      if (u.kind === 'champion') u.recall = null;
    }
  }
  fireAttack(u: Unit, t: Unit) {
    if (!t.alive) return;
    if (u.bush >= 0) u.revealT = this.time + 1.5;
    if (u.ranged) {
      const color = u.kind === 'champion' ? u.def!.projColor : u.kind === 'minion' ? (u.team === 0 ? '#7ab8ff' : '#ff7a7a') : u.kind === 'monster' ? u.color : '#fff';
      const style = u.kind === 'champion' && u.champId === 'Jinx' && u.data.rocket ? 'rocket' : u.kind === 'minion' && u.mtype === 'siege' ? 'cannon' : 'attack';
      this.homing({ owner: u, target: t, speed: u.projSpeed || 1500, color, size: u.kind === 'champion' ? 9 : 7, style, isAttack: true, onHit: (g: Game, tg: Unit) => g.applyAttack(u, tg) });
    } else this.applyAttack(u, t);
    if (u.kind === 'champion' && (u === this.player || t === this.player)) this.onSound(u.ranged ? 'shoot' : 'hit', u.x, u.y);
  }
  applyAttack(u: Unit, t: Unit) {
    if (!u.alive && u.kind !== 'turret') return;
    if (!t.alive) return;
    if (u.kind === 'champion') this.champAttackHit(u, t);
    else {
      let dmg = u.st.ad;
      if (u.kind === 'minion' && t.isStructure) dmg *= u.mtype === 'siege' ? 0.9 : u.mtype === 'super' ? 0.5 : 0.45;
      if (u.kind === 'pet' && t.isStructure) dmg *= 0.5;
      this.dmg(u, t, dmg, 'physical', { attack: true });
    }
    if (!u.ranged && u.kind !== 'turret') this.fx.push({ type: 'spark', x: t.x, y: t.y, r: 30, t: 0, dur: 0.2, color: '#fff', angle: u.facing });
  }
  champAttackHit(c: Unit, t: Unit) {
    const mod = c.def!.attackMod?.(this, c, t) || {};
    let dmg = c.st.ad * (mod.mult || 1) + (mod.extra || 0);
    let crit = false;
    if (c.st.crit > 0 && Math.random() < c.st.crit) { crit = true; dmg *= 1.75 + c.st.critDmg; }
    if (this.hasItem(c, 3153) && !t.isStructure) dmg += Math.min(t.kind === 'monster' ? 60 : 9999, t.hp * 0.08);
    const dealt = this.dmg(c, t, dmg, 'physical', { attack: true, crit });
    if (c.st.lifesteal && !t.isStructure) this.heal(c, dealt * c.st.lifesteal);
    if (!t.alive && t.kind !== 'champion') { /* */ }
    // on-hit items
    if (!t.isStructure) {
      if (this.hasItem(c, 3124)) this.dmg(c, t, 30, 'magic', { noProc: true });
      if (this.hasItem(c, 3115)) this.dmg(c, t, 15 + 0.2 * c.st.ap, 'magic', { noProc: true });
      if (this.hasItem(c, 3071)) { const b = this.hasBuff(t, 'bcShred'); this.addBuff(t, { id: 'bcShred', name: '碎甲', dur: 6, stacks: Math.min(5, (b ? b.stacks! : 0) + 1), debuff: true }); }
      if (this.hasItem(c, 3074)) for (const e of this.enemiesNear(c.team, t.x, t.y, 300)) if (e !== t) this.dmg(c, e, c.st.ad * 0.4, 'physical', { aoe: true, noProc: true });
      c.atkCount++;
      if (c.atkCount % 3 === 0) {
        if (this.hasItem(c, 3087)) { const es = this.enemiesNear(c.team, t.x, t.y, 500).slice(0, 5); let px = c.x, py = c.y; for (const e of es) { this.dmg(c, e, 90, 'magic', { noProc: true }); this.fx.push({ type: 'line', x: px, y: py, x2: e.x, y2: e.y, t: 0, dur: 0.25, color: '#9af', width: 4 }); px = e.x; py = e.y; } }
        if (this.hasItem(c, 3094)) this.dmg(c, t, 120, 'magic', { noProc: true });
      }
      if (t.kind === 'champion' && this.hasItem(t, 3075)) { this.dmg(t, c, 25 + 0.1 * t.st.bonusArmor, 'magic', { noProc: true }); this.addBuff(c, { id: 'grievous', name: '重伤', dur: 3, grievous: true, debuff: true }); }
      if (this.hasBuff(c, 'redBuff')) this.addBuff(t, { id: 'redBurn', name: '灼烧', dur: 3, dot: 4 + c.level * 1.5, dotType: 'true', src: c, debuff: true, slow: t.kind === 'champion' ? 0.1 : 0 });
    }
    // spellblade
    if (c.spellblade > this.time && c.spellbladeCd <= 0) {
      c.spellblade = 0; c.spellbladeCd = 1.5;
      if (this.hasItem(c, 3100)) this.dmg(c, t, c.st.baseAd * 0.75 + c.st.ap * 0.45, 'magic', { noProc: true });
      else if (this.hasItem(c, 3078)) this.dmg(c, t, c.st.baseAd * 2, 'physical', { noProc: true });
      else if (this.hasItem(c, 3057)) this.dmg(c, t, c.st.baseAd, 'physical', { noProc: true });
      this.fx.push({ type: 'burst', x: t.x, y: t.y, r: 60, t: 0, dur: 0.3, color: '#9ad0ff' });
    }
    // splash (Jinx rockets)
    if (mod.splash) { for (const e of this.enemiesNear(c.team, t.x, t.y, mod.splash)) if (e !== t) this.dmg(c, e, dmg, 'physical', { aoe: true }); this.fx.push({ type: 'nova', x: t.x, y: t.y, r: mod.splash, t: 0, dur: 0.3, color: '#ff8a3a' }); }
    // next-attack buffs
    for (const b of [...c.buffs]) if (b.onHit && t.alive !== undefined) { b.onHit(this, c, t); if (b.consume) this.removeBuff(c, b.id); }
    c.def!.onAttackHit?.(this, c, t);
  }

  minionAct(m: Unit, dt: number) {
    m.data.scanT = (m.data.scanT || 0) - dt;
    if (m.data.help && this.time - m.data.helpT < 2 && m.data.help.alive && Math.hypot(m.data.help.x - m.x, m.data.help.y - m.y) < 800) { if (m.target !== m.data.help) { m.target = m.data.help; m.windup = 0; } m.data.help = null; }
    if (m.target && (!m.target.alive || !this.targetable(m.target) || Math.hypot(m.target.x - m.x, m.target.y - m.y) > 900)) { m.target = null; m.windup = 0; }
    if (!m.target && m.data.scanT <= 0) {
      m.data.scanT = 0.25;
      let best: Unit | null = null, bs = 1e9;
      for (const u of this.units) {
        if (!u.alive || u.team === m.team || u.team === 2 || u.kind === 'ward' || !this.targetable(u)) continue;
        const d = Math.hypot(u.x - m.x, u.y - m.y);
        if (d > 700 + u.r) continue;
        const pri = u.kind === 'minion' || u.kind === 'pet' ? 0 : u.isStructure ? 400 : 800;
        if (d + pri < bs) { bs = d + pri; best = u; }
      }
      m.target = best;
    }
    if (m.target) { this.attackLogic(m, m.target, dt, false); return; }
    const path = m.team === 0 ? LANES[m.laneIdx] : [...LANES[m.laneIdx]].reverse();
    if (m.wp >= path.length) m.wp = path.length - 1;
    // advance waypoint if closer to next
    let p = path[m.wp];
    if (Math.hypot(p.x - m.x, p.y - m.y) < 180 && m.wp < path.length - 1) { m.wp++; p = path[m.wp]; }
    else if (m.wp < path.length - 1) { const n = path[m.wp + 1]; if (Math.hypot(n.x - m.x, n.y - m.y) < Math.hypot(n.x - p.x, n.y - p.y)) m.wp++; }
    this.moveToward(m, p.x + ((m.id % 5) - 2) * 25, p.y + ((m.id % 3) - 1) * 25, dt);
  }
  monsterAct(m: Unit, dt: number) {
    if (m.resetting) {
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.3 * dt);
      if (this.moveToward(m, m.home.x, m.home.y, dt, 5) || Math.hypot(m.home.x - m.x, m.home.y - m.y) < 10) { m.resetting = false; m.hp = m.maxHp; m.buffs = []; m.facing = Math.PI / 2; }
      return;
    }
    const t = m.target;
    if (t) {
      const leash = MONSTER[m.mtype].epic ? 1100 : 750;
      if (!t.alive || !this.targetable(t) || Math.hypot(m.x - m.home.x, m.y - m.home.y) > leash || Math.hypot(t.x - m.home.x, t.y - m.home.y) > leash + 300) { m.target = null; m.resetting = true; m.windup = 0; return; }
      this.attackLogic(m, t, dt, false);
      if (m.mtype === 'baron' || m.mtype === 'dragon') {
        m.data.aoeT = (m.data.aoeT || 4) - dt;
        if (m.data.aoeT <= 0) {
          m.data.aoeT = 5;
          const p = { x: t.x, y: t.y };
          this.delayedAoe({ owner: m, x: p.x, y: p.y, r: 250, delay: 0.8, color: m.mtype === 'baron' ? '#a060ff' : '#ff8040', onDetonate: (g: Game) => { g.fxPush({ type: 'nova', x: p.x, y: p.y, r: 250, t: 0, dur: 0.5, color: m.mtype === 'baron' ? '#a060ff' : '#ff8040' }); for (const e of g.enemiesNear(2, p.x, p.y, 250)) g.dmg(m, e, m.st.ad * 1.2, 'magic', {}); } });
        }
      }
    } else if (Math.hypot(m.home.x - m.x, m.home.y - m.y) > 20) m.resetting = true;
  }
  petAct(p: Unit, dt: number) {
    p.life -= dt;
    const o = p.owner!;
    if (p.life <= 0 || !o.alive) { p.alive = false; return; }
    p.data.auraT = (p.data.auraT || 0) - dt;
    if (p.data.auraT <= 0) { p.data.auraT = 1; for (const e of this.enemiesNear(p.team, p.x, p.y, 280)) this.dmg(p, e, p.aura, 'magic', { noProc: true }); }
    if (p.target && (!p.target.alive || !this.targetable(p.target) || Math.hypot(p.target.x - o.x, p.target.y - o.y) > 1200)) p.target = null;
    if (!p.target) {
      const pref = o.target && o.target.alive && o.target.team !== p.team ? o.target : null;
      p.target = pref || this.nearestEnemyTarget(p, p.x, p.y, 700, true);
    }
    if (p.target) this.attackLogic(p, p.target, dt, false);
    else if (Math.hypot(o.x - p.x, o.y - p.y) > 250) this.moveToward(p, o.x, o.y, dt, 150);
  }
  updateTurret(t: Unit, dt: number) {
    const range = 775;
    if (t.target && (!t.target.alive || !this.targetable(t.target) || Math.hypot(t.target.x - t.x, t.target.y - t.y) > range + t.target.r)) { t.target = null; t.heat = 0; }
    if (!t.target) {
      let best: Unit | null = null, bs = 1e9;
      for (const u of this.units) {
        if (!u.alive || u.team === t.team || u.team === 2 || u.isStructure || u.kind === 'ward' || !this.targetable(u)) continue;
        const d = Math.hypot(u.x - t.x, u.y - t.y);
        if (d > range + u.r) continue;
        const s = d + (u.kind === 'champion' ? 2000 : u.kind === 'minion' && u.mtype === 'siege' ? -200 : 0);
        if (s < bs) { bs = s; best = u; }
      }
      if (best !== t.target) t.heat = 0;
      t.target = best;
    }
    if (t.windup > 0) {
      t.windup -= dt;
      if (t.windup <= 0 && t.target) {
        const tg = t.target;
        this.homing({ owner: t, from: { x: t.x, y: t.y - 160 }, target: tg, speed: 1300, color: t.team === 0 ? '#8ac8ff' : '#ff8a8a', size: 16, style: 'turret', isAttack: true, onHit: (g: Game, u: Unit) => {
          let d = t.b.ad + g.time / 60 * 9;
          if (u.kind === 'minion') d = u.maxHp * (u.mtype === 'melee' ? 0.45 : u.mtype === 'caster' ? 0.7 : u.mtype === 'siege' ? 0.14 : 0.08) * 1;
          else if (u.kind === 'champion') { if (t.heatTarget === u) t.heat = Math.min(3, t.heat + 1); else { t.heat = 0; t.heatTarget = u; } d *= 1 + 0.4 * t.heat; }
          else if (u.kind === 'pet') d = u.maxHp * 0.25;
          g.dmg(t, u, d, u.kind === 'minion' ? 'true' : 'physical', { attack: true });
        } });
        if (tg === this.player || Math.hypot(tg.x - this.player.x, tg.y - this.player.y) < 1200) this.onSound('turret', t.x, t.y);
      }
      return;
    }
    t.attackCd -= 0; // decremented in updateUnit
    if (t.target && t.attackCd <= 0) { t.attackCd = 1 / t.b.as; t.windup = 0.15; }
  }

  updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.t += dt;
      if (p.kind === 'homing') {
        const tg = p.target;
        const tx = tg ? tg.x : p.targetPos.x, ty = tg ? tg.y : p.targetPos.y;
        if (tg && !tg.alive) { p.dead = true; continue; }
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        const step = p.speed * dt;
        p.angle = Math.atan2(dy, dx);
        if (d <= step + (tg ? tg.r * 0.3 : 0)) { p.dead = true; p.onHit?.(this, tg); }
        else { p.x += dx / d * step; p.y += dy / d * step; }
      } else {
        if (p.accel) p.speed = Math.min(2500, p.speed * (1 + (p.accel - 1) * dt));
        const step = p.speed * dt;
        let ang = p.angle;
        if (p.returning) { const o = p.owner; ang = Math.atan2(o.y - p.y, o.x - p.x); if (Math.hypot(o.x - p.x, o.y - p.y) < step + 40) { p.dead = true; continue; } }
        const ox = p.x, oy = p.y;
        p.x += Math.cos(ang) * step; p.y += Math.sin(ang) * step; p.traveled += step; p.dir = ang;
        const cands = p.ally ? this.units.filter(u => u.alive && u.team === p.owner.team && u.kind === 'champion' && u !== p.owner) : this.units;
        for (const u of cands) {
          if (!u.alive || p.hit.has(u)) continue;
          if (!p.ally) {
            if (u.team === p.owner.team || u.kind === 'ward') continue;
            if (u.isStructure && !p.hitStructures) continue;
            if (u.isStructure && p.hitStructures && u.kind !== 'turret') continue;
            if (p.champsOnly && u.kind !== 'champion' && !(p.hitStructures && u.kind === 'turret')) continue;
            if (!this.targetable(u) && !u.isStructure) continue;
            if (u.kind === 'monster' && u.resetting) continue;
          }
          if (distToSeg(u.x, u.y, ox, oy, p.x, p.y) <= p.width / 2 + u.r * 0.8) {
            p.hit.add(u); p.hits++;
            p.onHit?.(this, u, p);
            if ((p.stopOnChamp && u.kind === 'champion') || p.hits >= p.maxHits) { if (!p.returns || p.maxHits < 99) { p.dead = true; } break; }
          }
        }
        if (!p.dead && p.traveled >= p.range) {
          if (p.returns && !p.returning) { p.returning = true; p.hit = new Set(); }
          else if (!p.returns) { p.dead = true; p.onEnd?.(this, p); }
        }
        if (p.x < -500 || p.y < -500 || p.x > W + 500 || p.y > W + 500) p.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  separate() {
    const mov = this.units.filter(u => u.alive && (u.kind === 'champion' || u.kind === 'minion' || u.kind === 'monster' || u.kind === 'pet') && !u.dash);
    for (let i = 0; i < mov.length; i++) {
      const a = mov[i];
      for (let j = i + 1; j < mov.length; j++) {
        const b = mov[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const rr = (a.r + b.r) * 0.75;
        if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < rr) {
          if (a.kind === 'champion' && b.kind === 'champion') continue;
          const push = (rr - d) * 0.35;
          const wa = a.kind === 'champion' ? 0.3 : 1, wb = b.kind === 'champion' ? 0.3 : 1;
          const nx = dx / d, ny = dy / d;
          const ax = a.x - nx * push * wa, ay = a.y - ny * push * wa, bx = b.x + nx * push * wb, by = b.y + ny * push * wb;
          if (isWalk(ax, ay)) { a.x = ax; a.y = ay; }
          if (isWalk(bx, by)) { b.x = bx; b.y = by; }
        }
      }
      for (const s of this.structs) {
        if (!s.alive) continue;
        const dx = a.x - s.x, dy = a.y - s.y; const d = Math.hypot(dx, dy) || 0.01;
        const rr = s.r * 0.8 + a.r * 0.5;
        if (d < rr) { a.x = s.x + dx / d * rr; a.y = s.y + dy / d * rr; }
      }
    }
  }
}

export function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
