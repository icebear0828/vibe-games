import type { Enemy, IntentType } from './types';
import type { Game } from './engine';
import { chance, pick, rand } from './util';

export interface MoveDef {
  name: string;
  intent: IntentType;
  dmg?: number | ((e: Enemy, g: Game) => number);
  hits?: number;
  act?: (e: Enemy, g: Game) => void | Promise<void>;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: [number, number];
  img: string;
  size: number;
  hue?: number;
  init?: (e: Enemy, g: Game, index: number) => void;
  next: (e: Enemy, g: Game) => string;
  moves: Record<string, MoveDef>;
}

const last = (e: Enemy, n = 1) => e.history.slice(-n);
const lastIs = (e: Enemy, id: string) => e.history[e.history.length - 1] === id;
const lastTwoAre = (e: Enemy, id: string) => { const l = last(e, 2); return l.length === 2 && l.every((x) => x === id); };

const slimed = (n: number) => (_e: Enemy, g: Game) => { for (let i = 0; i < n; i++) g.addToDiscard(g.makeCard('slimed')); };

const list: EnemyDef[] = [
  {
    id: 'jaw_worm', name: '大颚虫', hp: [40, 44], img: 'jawworm', size: 230,
    next: (e) => {
      if (e.history.length === 0) return 'chomp';
      for (let i = 0; i < 20; i++) {
        const r = Math.random();
        if (r < 0.25) { if (!lastIs(e, 'chomp')) return 'chomp'; }
        else if (r < 0.55) { if (!lastTwoAre(e, 'thrash')) return 'thrash'; }
        else if (!lastIs(e, 'bellow')) return 'bellow';
      }
      return 'thrash';
    },
    moves: {
      chomp: { name: '咬击', intent: 'attack', dmg: 11 },
      thrash: { name: '痛殴', intent: 'attack_block', dmg: 7, act: (e, g) => g.addBlock(e, 5) },
      bellow: { name: '咆哮', intent: 'block_buff', act: (e, g) => { g.apply(e, 'strength', 3); g.addBlock(e, 6); } },
    },
  },
  {
    id: 'cultist', name: '邪教徒', hp: [48, 54], img: 'cultist', size: 280,
    next: (e) => (e.history.length === 0 ? 'incantation' : 'dark_strike'),
    moves: {
      incantation: { name: '咒语', intent: 'buff', act: (e, g) => { g.apply(e, 'ritual', 3); e.data.ritualSkip = true; g.say(e, '咔咔！！'); } },
      dark_strike: { name: '黑暗打击', intent: 'attack', dmg: 6 },
    },
  },
  {
    id: 'red_louse', name: '红虱虫', hp: [10, 15], img: 'louse', size: 110,
    init: (e) => { e.data.bite = rand(5, 7); e.powers.curlup = rand(3, 7); },
    next: (e) => {
      for (let i = 0; i < 20; i++) {
        if (chance(0.25)) { if (!lastIs(e, 'grow')) return 'grow'; }
        else if (!lastTwoAre(e, 'bite')) return 'bite';
      }
      return 'bite';
    },
    moves: {
      bite: { name: '撕咬', intent: 'attack', dmg: (e) => e.data.bite },
      grow: { name: '成长', intent: 'buff', act: (e, g) => g.apply(e, 'strength', 3) },
    },
  },
  {
    id: 'green_louse', name: '绿虱虫', hp: [11, 17], img: 'louse', size: 110, hue: 95,
    init: (e) => { e.data.bite = rand(5, 7); e.powers.curlup = rand(3, 7); },
    next: (e) => {
      for (let i = 0; i < 20; i++) {
        if (chance(0.25)) { if (!lastIs(e, 'spit')) return 'spit'; }
        else if (!lastTwoAre(e, 'bite')) return 'bite';
      }
      return 'bite';
    },
    moves: {
      bite: { name: '撕咬', intent: 'attack', dmg: (e) => e.data.bite },
      spit: { name: '吐网', intent: 'debuff', act: (_e, g) => g.apply(g.p, 'weak', 2) },
    },
  },
  {
    id: 'acid_slime_s', name: '酸液史莱姆（小）', hp: [8, 12], img: 'slime', size: 100,
    next: (e) => (e.history.length === 0 ? pick(['lick', 'tackle']) : lastIs(e, 'lick') ? 'tackle' : 'lick'),
    moves: {
      lick: { name: '舔舐', intent: 'debuff', act: (_e, g) => g.apply(g.p, 'weak', 1) },
      tackle: { name: '撞击', intent: 'attack', dmg: 3 },
    },
  },
  {
    id: 'acid_slime_m', name: '酸液史莱姆（中）', hp: [28, 32], img: 'slime', size: 140,
    next: (e) => {
      for (let i = 0; i < 20; i++) {
        const r = Math.random();
        if (r < 0.3) { if (!lastTwoAre(e, 'spit')) return 'spit'; }
        else if (r < 0.7) { if (!lastIs(e, 'tackle')) return 'tackle'; }
        else if (!lastTwoAre(e, 'lick')) return 'lick';
      }
      return 'spit';
    },
    moves: {
      spit: { name: '腐蚀喷吐', intent: 'attack_debuff', dmg: 7, act: slimed(1) },
      tackle: { name: '撞击', intent: 'attack', dmg: 10 },
      lick: { name: '舔舐', intent: 'debuff', act: (_e, g) => g.apply(g.p, 'weak', 1) },
    },
  },
  {
    id: 'acid_slime_l', name: '酸液史莱姆（大）', hp: [65, 69], img: 'slime', size: 220,
    init: (e) => { e.powers.split = 1; },
    next: (e) => {
      for (let i = 0; i < 20; i++) {
        const r = Math.random();
        if (r < 0.3) { if (!lastTwoAre(e, 'spit')) return 'spit'; }
        else if (r < 0.7) { if (!lastIs(e, 'tackle')) return 'tackle'; }
        else if (!lastTwoAre(e, 'lick')) return 'lick';
      }
      return 'spit';
    },
    moves: {
      spit: { name: '腐蚀喷吐', intent: 'attack_debuff', dmg: 11, act: slimed(2) },
      tackle: { name: '撞击', intent: 'attack', dmg: 16 },
      lick: { name: '舔舐', intent: 'debuff', act: (_e, g) => g.apply(g.p, 'weak', 2) },
      split: { name: '分裂', intent: 'unknown', act: (e, g) => g.split(e, ['acid_slime_m', 'acid_slime_m']) },
    },
  },
  {
    id: 'spike_slime_s', name: '尖刺史莱姆（小）', hp: [10, 14], img: 'slime', size: 100, hue: 210,
    next: () => 'tackle',
    moves: { tackle: { name: '撞击', intent: 'attack', dmg: 5 } },
  },
  {
    id: 'spike_slime_m', name: '尖刺史莱姆（中）', hp: [28, 32], img: 'slime', size: 140, hue: 210,
    next: (e) => {
      for (let i = 0; i < 20; i++) {
        if (chance(0.3)) { if (!lastTwoAre(e, 'flame')) return 'flame'; }
        else if (!lastTwoAre(e, 'lick')) return 'lick';
      }
      return 'flame';
    },
    moves: {
      flame: { name: '烈焰撞击', intent: 'attack_debuff', dmg: 8, act: slimed(1) },
      lick: { name: '舔舐', intent: 'debuff', act: (_e, g) => g.apply(g.p, 'frail', 1) },
    },
  },
  {
    id: 'spike_slime_l', name: '尖刺史莱姆（大）', hp: [64, 70], img: 'slime', size: 220, hue: 210,
    init: (e) => { e.powers.split = 1; },
    next: (e) => {
      for (let i = 0; i < 20; i++) {
        if (chance(0.3)) { if (!lastTwoAre(e, 'flame')) return 'flame'; }
        else if (!lastTwoAre(e, 'lick')) return 'lick';
      }
      return 'flame';
    },
    moves: {
      flame: { name: '烈焰撞击', intent: 'attack_debuff', dmg: 16, act: slimed(2) },
      lick: { name: '舔舐', intent: 'debuff', act: (_e, g) => g.apply(g.p, 'frail', 2) },
      split: { name: '分裂', intent: 'unknown', act: (e, g) => g.split(e, ['spike_slime_m', 'spike_slime_m']) },
    },
  },
  // ====== ELITES ======
  {
    id: 'gremlin_nob', name: '地精大块头', hp: [82, 86], img: 'nob', size: 300,
    next: (e) => {
      if (e.history.length === 0) return 'bellow';
      if (chance(0.33)) return 'skull_bash';
      if (lastTwoAre(e, 'rush')) return 'skull_bash';
      return 'rush';
    },
    moves: {
      bellow: { name: '咆哮', intent: 'buff', act: (e, g) => { g.apply(e, 'enrage', 2); g.say(e, '嗷嗷嗷嗷！！！'); } },
      rush: { name: '冲撞', intent: 'attack', dmg: 14 },
      skull_bash: { name: '碎颅', intent: 'attack_debuff', dmg: 6, act: (_e, g) => g.apply(g.p, 'vulnerable', 2) },
    },
  },
  {
    id: 'lagavulin', name: '乐加维林', hp: [109, 111], img: 'lagavulin', size: 250,
    init: (e) => { e.powers.asleep = 1; e.powers.metallicize = 8; e.data.sleepTurns = 0; e.data.cycle = 0; },
    next: (e) => {
      if (e.powers.asleep) return 'sleep';
      const c = e.data.cycle++ % 3;
      return c === 2 ? 'siphon' : 'attack';
    },
    moves: {
      sleep: { name: '沉睡', intent: 'sleep', act: (e, g) => {
        e.data.sleepTurns++;
        if (e.data.sleepTurns >= 3) g.wakeLagavulin(e, false);
      } },
      stun: { name: '眩晕', intent: 'stun' },
      attack: { name: '攻击', intent: 'attack', dmg: 18 },
      siphon: { name: '灵魂虹吸', intent: 'strong_debuff', act: (_e, g) => { g.apply(g.p, 'strength', -1); g.apply(g.p, 'dexterity', -1); } },
    },
  },
  {
    id: 'sentry', name: '哨卫', hp: [38, 42], img: 'sentry', size: 200,
    init: (e, _g, i) => { e.powers.artifact = 1; e.data.first = i % 2 === 0 ? 'bolt' : 'beam'; },
    next: (e) => (e.history.length === 0 ? e.data.first : lastIs(e, 'bolt') ? 'beam' : 'bolt'),
    moves: {
      bolt: { name: '螺栓', intent: 'debuff', act: (_e, g) => { g.addToDiscard(g.makeCard('dazed')); g.addToDiscard(g.makeCard('dazed')); } },
      beam: { name: '光束', intent: 'attack', dmg: 9 },
    },
  },
  // ====== BOSSES ======
  {
    id: 'hexaghost', name: '六火亡魂', hp: [250, 250], img: 'hexaghost', size: 360,
    init: (e) => { e.data.step = -1; },
    next: (e, g) => {
      if (e.history.length === 0) return 'activate';
      if (e.history.length === 1) { e.data.divider = Math.floor(g.p.hp / 12) + 1; return 'divider'; }
      const seq = ['sear', 'tackle', 'sear', 'inflame', 'tackle', 'sear', 'inferno'];
      e.data.step = (e.data.step + 1) % seq.length;
      return seq[e.data.step];
    },
    moves: {
      activate: { name: '激活', intent: 'unknown', act: (e, g) => g.say(e, '……') },
      divider: { name: '分裂', intent: 'attack', dmg: (e) => e.data.divider, hits: 6 },
      sear: { name: '灼烧', intent: 'attack_debuff', dmg: 6, act: (e, g) => g.addToDiscard(g.makeCard('burn', e.data.burnUp ? 1 : 0)) },
      tackle: { name: '撞击', intent: 'attack', dmg: 5, hits: 2 },
      inflame: { name: '燃烧', intent: 'block_buff', act: (e, g) => { g.addBlock(e, 12); g.apply(e, 'strength', 2); } },
      inferno: { name: '地狱火', intent: 'attack_debuff', dmg: 2, hits: 6, act: (e, g) => {
        e.data.burnUp = true;
        for (let i = 0; i < 3; i++) g.addToDiscard(g.makeCard('burn', 1));
        g.upgradeAllBurns();
      } },
    },
  },
  {
    id: 'slime_boss', name: '史莱姆老大', hp: [140, 140], img: 'slime', size: 330, hue: -15,
    init: (e) => { e.powers.split = 1; e.data.cycle = 0; },
    next: (e) => ['goop', 'prepare', 'slam'][e.data.cycle++ % 3],
    moves: {
      goop: { name: '黏液喷射', intent: 'strong_debuff', act: slimed(3) },
      prepare: { name: '蓄力', intent: 'unknown', act: (e, g) => g.say(e, '准备好了……') },
      slam: { name: '猛击', intent: 'attack', dmg: 35 },
      split: { name: '分裂', intent: 'unknown', act: (e, g) => g.split(e, ['spike_slime_l', 'acid_slime_l']) },
    },
  },
  {
    id: 'guardian', name: '守护者', hp: [240, 240], img: 'guardian', size: 380,
    init: (e) => { e.powers.modeshift = 30; e.data.threshold = 30; e.data.mode = 'off'; e.data.off = 0; e.data.def = 0; },
    next: (e) => {
      if (e.data.mode === 'def') {
        const seq = ['def_mode', 'roll', 'twin_slam'];
        const m = seq[e.data.def++];
        return m ?? 'whirlwind';
      }
      const seq = ['charge', 'fierce_bash', 'vent', 'whirlwind'];
      return seq[e.data.off++ % 4];
    },
    moves: {
      charge: { name: '充能', intent: 'block', act: (e, g) => g.addBlock(e, 9) },
      fierce_bash: { name: '猛烈重击', intent: 'attack', dmg: 32 },
      vent: { name: '排气', intent: 'strong_debuff', act: (_e, g) => { g.apply(g.p, 'weak', 2); g.apply(g.p, 'vulnerable', 2); } },
      whirlwind: { name: '旋风', intent: 'attack', dmg: 5, hits: 4 },
      def_mode: { name: '防御模式', intent: 'buff', act: (e, g) => g.apply(e, 'sharphide', 3) },
      roll: { name: '翻滚攻击', intent: 'attack', dmg: 9 },
      twin_slam: { name: '双重猛击', intent: 'attack_buff', dmg: 8, hits: 2, act: (e, g) => {
        delete e.powers.sharphide;
        e.data.mode = 'off'; e.data.def = 0; e.data.threshold += 10; e.powers.modeshift = e.data.threshold; e.data.off = 3;
        g.say(e, '切换为攻击形态');
      } },
    },
  },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(list.map((e) => [e.id, e]));

const louse = () => pick(['red_louse', 'green_louse']);

export interface Encounter { id: string; name: string; enemies: () => string[] }

export const WEAK_ENCOUNTERS: Encounter[] = [
  { id: 'cultist', name: '邪教徒', enemies: () => ['cultist'] },
  { id: 'jaw_worm', name: '大颚虫', enemies: () => ['jaw_worm'] },
  { id: 'two_louse', name: '两只虱虫', enemies: () => [louse(), louse()] },
  { id: 'small_slimes', name: '小史莱姆', enemies: () => ['spike_slime_s', 'acid_slime_m'] },
];
export const STRONG_ENCOUNTERS: Encounter[] = [
  { id: 'large_slime', name: '大史莱姆', enemies: () => [pick(['acid_slime_l', 'spike_slime_l'])] },
  { id: 'lots_of_slimes', name: '一大群史莱姆', enemies: () => ['spike_slime_s', 'spike_slime_s', 'acid_slime_s', 'spike_slime_s', 'acid_slime_s'] },
  { id: 'three_louse', name: '三只虱虫', enemies: () => [louse(), louse(), louse()] },
  { id: 'wildlife', name: '底层野生动物', enemies: () => [louse(), 'jaw_worm'] },
  { id: 'cult_slime', name: '邪教与黏液', enemies: () => ['acid_slime_m', 'cultist'] },
  { id: 'two_cultists', name: '邪教徒们', enemies: () => ['cultist', 'cultist'] },
  { id: 'worm_slime', name: '蠕虫与史莱姆', enemies: () => ['spike_slime_m', 'jaw_worm'] },
];
export const ELITE_ENCOUNTERS: Encounter[] = [
  { id: 'gremlin_nob', name: '地精大块头', enemies: () => ['gremlin_nob'] },
  { id: 'lagavulin', name: '乐加维林', enemies: () => ['lagavulin'] },
  { id: 'three_sentries', name: '三个哨卫', enemies: () => ['sentry', 'sentry', 'sentry'] },
];
export const BOSSES: Record<string, { name: string; icon: string; enemies: () => string[] }> = {
  hexaghost: { name: '六火亡魂', icon: 'hexaghost', enemies: () => ['hexaghost'] },
  slime_boss: { name: '史莱姆老大', icon: 'slime', enemies: () => ['slime_boss'] },
  guardian: { name: '守护者', icon: 'guardian', enemies: () => ['guardian'] },
};
