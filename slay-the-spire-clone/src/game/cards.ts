import type { CardColor, CardInst, CardType, Rarity, TargetType, Vals, Enemy } from './types';
import type { Game } from './engine';
import { pick } from './util';

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  rarity: Rarity;
  color: CardColor;
  cost: number; // -1 = X, -2 = unplayable
  costUp?: number;
  target: TargetType;
  dmg?: number;
  dmgUp?: number;
  blk?: number;
  blkUp?: number;
  mag?: number;
  magUp?: number;
  exhaust?: boolean;
  exhaustUp?: boolean;
  ethereal?: boolean;
  etherealUp?: boolean;
  innate?: boolean;
  innateUp?: boolean;
  desc: string;
  descUp?: string;
  icon: string;
  multiUpgrade?: boolean;
  strMult?: boolean; // heavy blade: mag = strength multiplier
  calc?: (g: Game | null, c: CardInst, v: Vals) => void;
  canPlay?: (g: Game, c: CardInst) => string | null;
  play?: (g: Game, c: CardInst, t: Enemy | null, v: Vals, x: number) => void | Promise<void>;
}

const hits = (g: Game, t: Enemy | null, dmg: number, n: number) => {
  for (let i = 0; i < n; i++) {
    if (!t || t.dead) break;
    g.attack(t, dmg);
  }
};

const list: CardDef[] = [
  // ============ BASIC ============
  { id: 'strike', name: '打击', type: 'attack', rarity: 'basic', color: 'red', cost: 1, target: 'enemy', dmg: 6, dmgUp: 9, icon: '🗡️',
    desc: '造成 !D! 点伤害。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'defend', name: '防御', type: 'skill', rarity: 'basic', color: 'red', cost: 1, target: 'self', blk: 5, blkUp: 8, icon: '🛡️',
    desc: '获得 !B! 点格挡。', play: (g, _c, _t, v) => g.gainBlock(v.blk) },
  { id: 'bash', name: '痛击', type: 'attack', rarity: 'basic', color: 'red', cost: 2, target: 'enemy', dmg: 8, dmgUp: 10, mag: 2, magUp: 3, icon: '🔨',
    desc: '造成 !D! 点伤害。\n给予 !M! 层易伤。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); g.apply(t!, 'vulnerable', v.mag); } },

  // ============ COMMON ============
  { id: 'anger', name: '愤怒', type: 'attack', rarity: 'common', color: 'red', cost: 0, target: 'enemy', dmg: 6, dmgUp: 8, icon: '😠',
    desc: '造成 !D! 点伤害。\n将一张此牌的复制品加入你的弃牌堆。',
    play: (g, c, t, v) => { g.attack(t!, v.dmg); g.addToDiscard(g.makeCard('anger', c.up)); } },
  { id: 'armaments', name: '武装', type: 'skill', rarity: 'common', color: 'red', cost: 1, target: 'self', blk: 5, icon: '⚒️',
    desc: '获得 !B! 点格挡。\n升级你手牌中的一张牌。', descUp: '获得 !B! 点格挡。\n升级你手牌中的所有牌。',
    play: async (g, c, _t, v) => {
      g.gainBlock(v.blk);
      const up = g.c!.hand.filter((h) => g.canUpgrade(h));
      if (c.up) { up.forEach((h) => g.upgrade(h)); return; }
      if (up.length === 0) return;
      const sel = up.length === 1 ? up : await g.selectCards('选择一张牌升级', up, 1, 1, false, 'upgrade');
      sel?.forEach((h) => g.upgrade(h));
    } },
  { id: 'body_slam', name: '全身撞击', type: 'attack', rarity: 'common', color: 'red', cost: 1, costUp: 0, target: 'enemy', dmg: 0, icon: '🏋️',
    desc: '造成等同于你当前格挡值的伤害。\n（!D! 点）', calc: (g, _c, v) => { v.dmg = g?.c ? g.c.player.block : 0; },
    play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'clash', name: '交锋', type: 'attack', rarity: 'common', color: 'red', cost: 0, target: 'enemy', dmg: 14, dmgUp: 18, icon: '⚔️',
    desc: '只有在手牌中全是攻击牌时才能被打出。\n造成 !D! 点伤害。',
    canPlay: (g, c) => g.c!.hand.every((h) => h.uid === c.uid || g.def(h).type === 'attack') ? null : '我的手牌中还有非攻击牌。',
    play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'cleave', name: '顺劈斩', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'all', dmg: 8, dmgUp: 11, icon: '🪓',
    desc: '对所有敌人造成 !D! 点伤害。', play: (g, _c, _t, v) => { g.attackAll(v.dmg); } },
  { id: 'clothesline', name: '金刚臂', type: 'attack', rarity: 'common', color: 'red', cost: 2, target: 'enemy', dmg: 12, dmgUp: 14, mag: 2, magUp: 3, icon: '💪',
    desc: '造成 !D! 点伤害。\n给予 !M! 层虚弱。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); g.apply(t!, 'weak', v.mag); } },
  { id: 'flex', name: '活动肌肉', type: 'skill', rarity: 'common', color: 'red', cost: 0, target: 'self', mag: 2, magUp: 4, icon: '🤸',
    desc: '获得 !M! 点力量。\n在你的回合结束时，失去 !M! 点力量。',
    play: (g, _c, _t, v) => { g.apply(g.p, 'strength', v.mag); g.apply(g.p, 'flex', v.mag); } },
  { id: 'havoc', name: '破灭', type: 'skill', rarity: 'common', color: 'red', cost: 1, costUp: 0, target: 'none', icon: '🌪️',
    desc: '打出你抽牌堆顶部的牌，并将其消耗。', play: async (g) => { await g.playTopOfDraw(); } },
  { id: 'headbutt', name: '头槌', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'enemy', dmg: 9, dmgUp: 12, icon: '🐏',
    desc: '造成 !D! 点伤害。\n将弃牌堆中的一张牌放到你的抽牌堆顶部。',
    play: async (g, _c, t, v) => {
      g.attack(t!, v.dmg);
      const d = g.c!.discard;
      if (!d.length) return;
      const sel = d.length === 1 ? [d[0]] : await g.selectCards('选择一张牌放到抽牌堆顶部', [...d], 1, 1);
      if (sel && sel[0]) { g.c!.discard = d.filter((x) => x.uid !== sel[0].uid); g.c!.draw.push(sel[0]); }
    } },
  { id: 'heavy_blade', name: '重刃', type: 'attack', rarity: 'common', color: 'red', cost: 2, target: 'enemy', dmg: 14, mag: 3, magUp: 5, strMult: true, icon: '🗡️',
    desc: '造成 !D! 点伤害。\n力量对此牌产生 !M! 倍的效果。', play: (g, _c, t, v) => { g.attack(t!, v.dmg, v.mag); } },
  { id: 'iron_wave', name: '铁斩波', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'enemy', dmg: 5, dmgUp: 7, blk: 5, blkUp: 7, icon: '🌊',
    desc: '获得 !B! 点格挡。\n造成 !D! 点伤害。', play: (g, _c, t, v) => { g.gainBlock(v.blk); g.attack(t!, v.dmg); } },
  { id: 'perfected_strike', name: '完美打击', type: 'attack', rarity: 'common', color: 'red', cost: 2, target: 'enemy', dmg: 6, mag: 2, magUp: 3, icon: '✴️',
    desc: '造成 !D! 点伤害。\n你每有一张名字中带有“打击”的牌，伤害增加 !M!。',
    calc: (g, _c, v) => { if (g?.c) { const all = [...g.c.hand, ...g.c.draw, ...g.c.discard]; v.dmg += v.mag * all.filter((x) => g.def(x).name.includes('打击')).length; } },
    play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'pommel_strike', name: '剑柄打击', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'enemy', dmg: 9, dmgUp: 10, mag: 1, magUp: 2, icon: '🗡️',
    desc: '造成 !D! 点伤害。\n抽 !M! 张牌。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); g.draw(v.mag); } },
  { id: 'shrug_it_off', name: '耸肩无视', type: 'skill', rarity: 'common', color: 'red', cost: 1, target: 'self', blk: 8, blkUp: 11, icon: '🤷',
    desc: '获得 !B! 点格挡。\n抽 1 张牌。', play: (g, _c, _t, v) => { g.gainBlock(v.blk); g.draw(1); } },
  { id: 'sword_boomerang', name: '飞剑回旋镖', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'all', dmg: 3, mag: 3, magUp: 4, icon: '🪃',
    desc: '随机对敌人造成 !D! 点伤害 !M! 次。',
    play: (g, _c, _t, v) => { for (let i = 0; i < v.mag; i++) { const e = g.randomEnemy(); if (e) g.attack(e, v.dmg); } } },
  { id: 'thunderclap', name: '闪电霹雳', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'all', dmg: 4, dmgUp: 7, icon: '⚡',
    desc: '对所有敌人造成 !D! 点伤害，并给予 1 层易伤。',
    play: (g, _c, _t, v) => { g.attackAll(v.dmg); g.alive().forEach((e) => g.apply(e, 'vulnerable', 1)); } },
  { id: 'true_grit', name: '坚毅', type: 'skill', rarity: 'common', color: 'red', cost: 1, target: 'self', blk: 7, blkUp: 9, icon: '🪨',
    desc: '获得 !B! 点格挡。\n随机消耗你手牌中的一张牌。', descUp: '获得 !B! 点格挡。\n消耗你手牌中的一张牌。',
    play: async (g, c, _t, v) => {
      g.gainBlock(v.blk);
      const h = g.c!.hand;
      if (!h.length) return;
      if (!c.up) { g.exhaustCard(pick(h)); return; }
      const sel = h.length === 1 ? [h[0]] : await g.selectCards('选择一张牌消耗', [...h], 1, 1);
      sel?.forEach((x) => g.exhaustCard(x));
    } },
  { id: 'twin_strike', name: '双重打击', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'enemy', dmg: 5, dmgUp: 7, icon: '⚔️',
    desc: '造成 !D! 点伤害两次。', play: (g, _c, t, v) => hits(g, t, v.dmg, 2) },
  { id: 'warcry', name: '战吼', type: 'skill', rarity: 'common', color: 'red', cost: 0, target: 'self', mag: 1, magUp: 2, exhaust: true, icon: '📣',
    desc: '抽 !M! 张牌。\n将一张手牌放到抽牌堆顶部。\n消耗。',
    play: async (g, _c, _t, v) => {
      g.draw(v.mag);
      const h = g.c!.hand;
      if (!h.length) return;
      const sel = h.length === 1 ? [h[0]] : await g.selectCards('选择一张牌放到抽牌堆顶部', [...h], 1, 1);
      if (sel && sel[0]) { g.c!.hand = h.filter((x) => x.uid !== sel[0].uid); g.c!.draw.push(sel[0]); }
    } },
  { id: 'wild_strike', name: '狂野打击', type: 'attack', rarity: 'common', color: 'red', cost: 1, target: 'enemy', dmg: 12, dmgUp: 17, icon: '🐺',
    desc: '造成 !D! 点伤害。\n将一张伤口放入你的抽牌堆。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); g.addToDraw(g.makeCard('wound')); } },

  // ============ UNCOMMON ============
  { id: 'battle_trance', name: '战斗专注', type: 'skill', rarity: 'uncommon', color: 'red', cost: 0, target: 'self', mag: 3, magUp: 4, icon: '🧘',
    desc: '抽 !M! 张牌。\n你在本回合不能再抽任何牌。', play: (g, _c, _t, v) => { g.draw(v.mag); g.apply(g.p, 'nodraw', 1); } },
  { id: 'blood_for_blood', name: '以血还血', type: 'attack', rarity: 'uncommon', color: 'red', cost: 4, costUp: 3, target: 'enemy', dmg: 18, dmgUp: 22, icon: '🩸',
    desc: '在本场战斗中你每失去一次生命，耗能减少 1。\n造成 !D! 点伤害。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'bloodletting', name: '放血', type: 'skill', rarity: 'uncommon', color: 'red', cost: 0, target: 'self', mag: 2, magUp: 3, icon: '💉',
    desc: '失去 3 点生命。\n获得 !M! 点能量。', play: (g, _c, _t, v) => { g.loseHp(3); g.gainEnergy(v.mag); } },
  { id: 'burning_pact', name: '燃烧契约', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 2, magUp: 3, icon: '📜',
    desc: '消耗一张牌。\n抽 !M! 张牌。',
    play: async (g, _c, _t, v) => {
      const h = g.c!.hand;
      if (h.length) { const sel = h.length === 1 ? [h[0]] : await g.selectCards('选择一张牌消耗', [...h], 1, 1); sel?.forEach((x) => g.exhaustCard(x)); }
      g.draw(v.mag);
    } },
  { id: 'carnage', name: '残杀', type: 'attack', rarity: 'uncommon', color: 'red', cost: 2, target: 'enemy', dmg: 20, dmgUp: 28, ethereal: true, icon: '🩸',
    desc: '虚无。\n造成 !D! 点伤害。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'combust', name: '自燃', type: 'power', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 5, magUp: 7, icon: '🔥',
    desc: '在你的回合结束时，失去 1 点生命，对所有敌人造成 !M! 点伤害。', play: (g, _c, _t, v) => g.apply(g.p, 'combust', v.mag) },
  { id: 'dark_embrace', name: '黑暗之拥', type: 'power', rarity: 'uncommon', color: 'red', cost: 2, costUp: 1, target: 'self', icon: '🌑',
    desc: '每当一张牌被消耗时，抽 1 张牌。', play: (g) => g.apply(g.p, 'darkembrace', 1) },
  { id: 'disarm', name: '缴械', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'enemy', mag: 2, magUp: 3, exhaust: true, icon: '🤺',
    desc: '敌人失去 !M! 点力量。\n消耗。', play: (g, _c, t, v) => g.apply(t!, 'strength', -v.mag) },
  { id: 'dropkick', name: '飞身踢', type: 'attack', rarity: 'uncommon', color: 'red', cost: 1, target: 'enemy', dmg: 5, dmgUp: 8, icon: '🦵',
    desc: '造成 !D! 点伤害。\n如果敌人处于易伤状态，获得 1 点能量并抽 1 张牌。',
    play: (g, _c, t, v) => { const vul = (t!.powers.vulnerable || 0) > 0; g.attack(t!, v.dmg); if (vul) { g.gainEnergy(1); g.draw(1); } } },
  { id: 'dual_wield', name: '双持', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 1, magUp: 2, icon: '🔱',
    desc: '选择手牌中的一张攻击牌或能力牌，将 !M! 张复制品加入手牌。',
    play: async (g, _c, _t, v) => {
      const h = g.c!.hand.filter((x) => ['attack', 'power'].includes(g.def(x).type));
      if (!h.length) return;
      const sel = h.length === 1 ? [h[0]] : await g.selectCards('选择一张牌复制', h, 1, 1);
      if (sel && sel[0]) for (let i = 0; i < v.mag; i++) g.addToHand(g.copyCard(sel[0]));
    } },
  { id: 'entrench', name: '巩固', type: 'skill', rarity: 'uncommon', color: 'red', cost: 2, costUp: 1, target: 'self', icon: '🏯',
    desc: '将你当前的格挡值翻倍。', play: (g) => g.addBlock(g.p, g.p.block) },
  { id: 'evolve', name: '进化', type: 'power', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 1, magUp: 2, icon: '🧬',
    desc: '每当你抽到一张状态牌时，抽 !M! 张牌。', play: (g, _c, _t, v) => g.apply(g.p, 'evolve', v.mag) },
  { id: 'feel_no_pain', name: '无惧疼痛', type: 'power', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 3, magUp: 4, icon: '😤',
    desc: '每当一张牌被消耗时，获得 !M! 点格挡。', play: (g, _c, _t, v) => g.apply(g.p, 'feelnopain', v.mag) },
  { id: 'fire_breathing', name: '火焰吐息', type: 'power', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 6, magUp: 10, icon: '🐲',
    desc: '每当你抽到状态牌或诅咒牌时，对所有敌人造成 !M! 点伤害。', play: (g, _c, _t, v) => g.apply(g.p, 'firebreathing', v.mag) },
  { id: 'flame_barrier', name: '火焰屏障', type: 'skill', rarity: 'uncommon', color: 'red', cost: 2, target: 'self', blk: 12, blkUp: 16, mag: 4, magUp: 6, icon: '🔥',
    desc: '获得 !B! 点格挡。\n在本回合中每当你受到攻击时，对攻击者造成 !M! 点伤害。',
    play: (g, _c, _t, v) => { g.gainBlock(v.blk); g.apply(g.p, 'flamebarrier', v.mag); } },
  { id: 'ghostly_armor', name: '幽灵铠甲', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', blk: 10, blkUp: 13, ethereal: true, icon: '👻',
    desc: '虚无。\n获得 !B! 点格挡。', play: (g, _c, _t, v) => g.gainBlock(v.blk) },
  { id: 'hemokinesis', name: '御血术', type: 'attack', rarity: 'uncommon', color: 'red', cost: 1, target: 'enemy', dmg: 15, dmgUp: 20, icon: '🩸',
    desc: '失去 2 点生命。\n造成 !D! 点伤害。', play: (g, _c, t, v) => { g.loseHp(2); g.attack(t!, v.dmg); } },
  { id: 'infernal_blade', name: '地狱之刃', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, costUp: 0, target: 'self', exhaust: true, icon: '🗡️',
    desc: '将一张随机攻击牌加入你的手牌。\n它在本回合耗能为 0。\n消耗。',
    play: (g) => { const pool = CARD_LIST.filter((d) => d.color === 'red' && d.type === 'attack' && d.rarity !== 'basic'); const c = g.makeCard(pick(pool).id); c.costTurn = 0; g.addToHand(c); } },
  { id: 'inflame', name: '燃烧', type: 'power', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 2, magUp: 3, icon: '🔥',
    desc: '获得 !M! 点力量。', play: (g, _c, _t, v) => g.apply(g.p, 'strength', v.mag) },
  { id: 'intimidate', name: '威吓', type: 'skill', rarity: 'uncommon', color: 'red', cost: 0, target: 'all', mag: 1, magUp: 2, exhaust: true, icon: '👁️',
    desc: '给予所有敌人 !M! 层虚弱。\n消耗。', play: (g, _c, _t, v) => g.alive().forEach((e) => g.apply(e, 'weak', v.mag)) },
  { id: 'metallicize', name: '金属化', type: 'power', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 3, magUp: 4, icon: '⚙️',
    desc: '在你的回合结束时，获得 !M! 点格挡。', play: (g, _c, _t, v) => g.apply(g.p, 'metallicize', v.mag) },
  { id: 'power_through', name: '硬撑', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', blk: 15, blkUp: 20, icon: '🧱',
    desc: '将 2 张伤口加入你的手牌。\n获得 !B! 点格挡。',
    play: (g, _c, _t, v) => { g.addToHand(g.makeCard('wound')); g.addToHand(g.makeCard('wound')); g.gainBlock(v.blk); } },
  { id: 'pummel', name: '连续拳', type: 'attack', rarity: 'uncommon', color: 'red', cost: 1, target: 'enemy', dmg: 2, mag: 4, magUp: 5, exhaust: true, icon: '👊',
    desc: '造成 !D! 点伤害 !M! 次。\n消耗。', play: (g, _c, t, v) => hits(g, t, v.dmg, v.mag) },
  { id: 'rage', name: '狂怒', type: 'skill', rarity: 'uncommon', color: 'red', cost: 0, target: 'self', mag: 3, magUp: 5, icon: '💢',
    desc: '在本回合中每当你打出一张攻击牌，获得 !M! 点格挡。', play: (g, _c, _t, v) => g.apply(g.p, 'rage', v.mag) },
  { id: 'rampage', name: '暴走', type: 'attack', rarity: 'uncommon', color: 'red', cost: 1, target: 'enemy', dmg: 8, mag: 5, magUp: 8, icon: '🐗',
    desc: '造成 !D! 点伤害。\n在本场战斗中，这张牌的伤害提升 !M! 点。',
    calc: (_g, c, v) => { v.dmg += c.misc || 0; },
    play: (g, c, t, v) => { g.attack(t!, v.dmg); c.misc = (c.misc || 0) + v.mag; } },
  { id: 'reckless_charge', name: '鲁莽冲锋', type: 'attack', rarity: 'uncommon', color: 'red', cost: 0, target: 'enemy', dmg: 7, dmgUp: 10, icon: '🐂',
    desc: '造成 !D! 点伤害。\n将一张晕眩放入你的抽牌堆。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); g.addToDraw(g.makeCard('dazed')); } },
  { id: 'rupture', name: '撕裂', type: 'power', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', mag: 1, magUp: 2, icon: '🩸',
    desc: '每当你因为卡牌失去生命时，获得 !M! 点力量。', play: (g, _c, _t, v) => g.apply(g.p, 'rupture', v.mag) },
  { id: 'searing_blow', name: '灼热攻击', type: 'attack', rarity: 'uncommon', color: 'red', cost: 2, target: 'enemy', dmg: 12, icon: '☄️', multiUpgrade: true,
    desc: '造成 !D! 点伤害。\n可以被升级任意次数。',
    calc: (_g, c, v) => { const n = c.up; v.dmg = 12 + (n * (n + 7)) / 2; },
    play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'second_wind', name: '重振精神', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', blk: 5, blkUp: 7, icon: '🌬️',
    desc: '消耗所有非攻击牌，每消耗一张牌获得 !B! 点格挡。',
    play: (g, c, _t, v) => { const l = g.c!.hand.filter((x) => x.uid !== c.uid && g.def(x).type !== 'attack'); l.forEach((x) => { g.exhaustCard(x); g.gainBlock(v.blk); }); } },
  { id: 'seeing_red', name: '发怒', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, costUp: 0, target: 'self', exhaust: true, icon: '👺',
    desc: '获得 2 点能量。\n消耗。', play: (g) => g.gainEnergy(2) },
  { id: 'sentinel', name: '哨卫', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'self', blk: 5, blkUp: 8, mag: 2, magUp: 3, icon: '🗼',
    desc: '获得 !B! 点格挡。\n如果这张牌被消耗，获得 !M! 点能量。', play: (g, _c, _t, v) => g.gainBlock(v.blk) },
  { id: 'sever_soul', name: '断魂斩', type: 'attack', rarity: 'uncommon', color: 'red', cost: 2, target: 'enemy', dmg: 16, dmgUp: 22, icon: '💀',
    desc: '消耗你手牌中所有的非攻击牌。\n造成 !D! 点伤害。',
    play: (g, c, t, v) => { g.c!.hand.filter((x) => x.uid !== c.uid && g.def(x).type !== 'attack').forEach((x) => g.exhaustCard(x)); g.attack(t!, v.dmg); } },
  { id: 'shockwave', name: '震荡波', type: 'skill', rarity: 'uncommon', color: 'red', cost: 2, target: 'all', mag: 3, magUp: 5, exhaust: true, icon: '💥',
    desc: '给予所有敌人 !M! 层虚弱和易伤。\n消耗。', play: (g, _c, _t, v) => g.alive().forEach((e) => { g.apply(e, 'weak', v.mag); g.apply(e, 'vulnerable', v.mag); }) },
  { id: 'spot_weakness', name: '观察弱点', type: 'skill', rarity: 'uncommon', color: 'red', cost: 1, target: 'enemy', mag: 3, magUp: 4, icon: '🔍',
    desc: '如果敌人的意图是攻击，获得 !M! 点力量。', play: (g, _c, t, v) => { if (g.intentIsAttack(t!)) g.apply(g.p, 'strength', v.mag); } },
  { id: 'uppercut', name: '上勾拳', type: 'attack', rarity: 'uncommon', color: 'red', cost: 2, target: 'enemy', dmg: 13, mag: 1, magUp: 2, icon: '🥊',
    desc: '造成 !D! 点伤害。\n给予 !M! 层虚弱。\n给予 !M! 层易伤。',
    play: (g, _c, t, v) => { g.attack(t!, v.dmg); g.apply(t!, 'weak', v.mag); g.apply(t!, 'vulnerable', v.mag); } },
  { id: 'whirlwind', name: '旋风斩', type: 'attack', rarity: 'uncommon', color: 'red', cost: -1, target: 'all', dmg: 5, dmgUp: 8, icon: '🌀',
    desc: '对所有敌人造成 !D! 点伤害 X 次。', play: (g, _c, _t, v, x) => { for (let i = 0; i < x; i++) g.attackAll(v.dmg); } },

  // ============ RARE ============
  { id: 'barricade', name: '壁垒', type: 'power', rarity: 'rare', color: 'red', cost: 3, costUp: 2, target: 'self', icon: '🏰',
    desc: '格挡不会在你的回合开始时消失。', play: (g) => g.apply(g.p, 'barricade', 1) },
  { id: 'berserk', name: '狂暴', type: 'power', rarity: 'rare', color: 'red', cost: 0, target: 'self', mag: 2, magUp: 1, icon: '👹',
    desc: '获得 !M! 层易伤。\n在你的回合开始时，获得 1 点能量。', play: (g, _c, _t, v) => { g.apply(g.p, 'vulnerable', v.mag); g.apply(g.p, 'berserk', 1); } },
  { id: 'bludgeon', name: '重锤', type: 'attack', rarity: 'rare', color: 'red', cost: 3, target: 'enemy', dmg: 32, dmgUp: 42, icon: '🔨',
    desc: '造成 !D! 点伤害。', play: (g, _c, t, v) => { g.attack(t!, v.dmg); } },
  { id: 'brutality', name: '残暴', type: 'power', rarity: 'rare', color: 'red', cost: 0, target: 'self', innateUp: true, icon: '🩹',
    desc: '在你的回合开始时，失去 1 点生命并抽 1 张牌。', descUp: '固有。\n在你的回合开始时，失去 1 点生命并抽 1 张牌。', play: (g) => g.apply(g.p, 'brutality', 1) },
  { id: 'corruption', name: '腐化', type: 'power', rarity: 'rare', color: 'red', cost: 3, costUp: 2, target: 'self', icon: '☠️',
    desc: '技能牌耗能变为 0。\n每当你打出一张技能牌时，将其消耗。', play: (g) => g.apply(g.p, 'corruption', 1) },
  { id: 'demon_form', name: '恶魔形态', type: 'power', rarity: 'rare', color: 'red', cost: 3, target: 'self', mag: 2, magUp: 3, icon: '😈',
    desc: '在你的回合开始时，获得 !M! 点力量。', play: (g, _c, _t, v) => g.apply(g.p, 'demonform', v.mag) },
  { id: 'double_tap', name: '双发', type: 'skill', rarity: 'rare', color: 'red', cost: 1, target: 'self', mag: 1, magUp: 2, icon: '🎯',
    desc: '本回合你的下 !M! 张攻击牌会被打出两次。', play: (g, _c, _t, v) => g.apply(g.p, 'doubletap', v.mag) },
  { id: 'exhume', name: '发掘', type: 'skill', rarity: 'rare', color: 'red', cost: 1, costUp: 0, target: 'self', exhaust: true, icon: '⚰️',
    desc: '将一张已消耗的牌放入你的手牌。\n消耗。',
    play: async (g) => {
      const ex = g.c!.exhaust.filter((x) => x.id !== 'exhume');
      if (!ex.length) return;
      const sel = await g.selectCards('选择一张牌放回手牌', ex, 1, 1);
      if (sel && sel[0]) { g.c!.exhaust = g.c!.exhaust.filter((x) => x.uid !== sel[0].uid); g.addToHand(sel[0]); }
    } },
  { id: 'feed', name: '狂宴', type: 'attack', rarity: 'rare', color: 'red', cost: 1, target: 'enemy', dmg: 10, dmgUp: 12, mag: 3, magUp: 4, exhaust: true, icon: '🍖',
    desc: '造成 !D! 点伤害。\n如果这张牌击杀了敌人，永久提升 !M! 点最大生命值。\n消耗。',
    play: (g, _c, t, v) => { g.attack(t!, v.dmg); if (t!.hp <= 0) g.gainMaxHp(v.mag); } },
  { id: 'fiend_fire', name: '恶魔之焰', type: 'attack', rarity: 'rare', color: 'red', cost: 2, target: 'enemy', dmg: 7, dmgUp: 10, exhaust: true, icon: '🔥',
    desc: '消耗你所有的手牌。\n每消耗一张牌，造成 !D! 点伤害。\n消耗。',
    play: (g, c, t, v) => { const l = g.c!.hand.filter((x) => x.uid !== c.uid); l.forEach((x) => g.exhaustCard(x)); hits(g, t, v.dmg, l.length); } },
  { id: 'immolate', name: '燔祭', type: 'attack', rarity: 'rare', color: 'red', cost: 2, target: 'all', dmg: 21, dmgUp: 28, icon: '🌋',
    desc: '对所有敌人造成 !D! 点伤害。\n将一张灼伤放入你的弃牌堆。', play: (g, _c, _t, v) => { g.attackAll(v.dmg); g.addToDiscard(g.makeCard('burn')); } },
  { id: 'impervious', name: '岿然不动', type: 'skill', rarity: 'rare', color: 'red', cost: 2, target: 'self', blk: 30, blkUp: 40, exhaust: true, icon: '🗿',
    desc: '获得 !B! 点格挡。\n消耗。', play: (g, _c, _t, v) => g.gainBlock(v.blk) },
  { id: 'juggernaut', name: '势不可挡', type: 'power', rarity: 'rare', color: 'red', cost: 2, target: 'self', mag: 5, magUp: 7, icon: '🦏',
    desc: '每当你获得格挡时，对随机敌人造成 !M! 点伤害。', play: (g, _c, _t, v) => g.apply(g.p, 'juggernaut', v.mag) },
  { id: 'limit_break', name: '突破极限', type: 'skill', rarity: 'rare', color: 'red', cost: 1, target: 'self', exhaust: true, exhaustUp: false, icon: '⛓️',
    desc: '将你的力量翻倍。\n消耗。', descUp: '将你的力量翻倍。',
    play: (g) => { const s = g.p.powers.strength || 0; if (s > 0) g.apply(g.p, 'strength', s); } },
  { id: 'offering', name: '祭品', type: 'skill', rarity: 'rare', color: 'red', cost: 0, target: 'self', mag: 3, magUp: 5, exhaust: true, icon: '🕯️',
    desc: '失去 6 点生命。\n获得 2 点能量。\n抽 !M! 张牌。\n消耗。', play: (g, _c, _t, v) => { g.loseHp(6); g.gainEnergy(2); g.draw(v.mag); } },
  { id: 'reaper', name: '收割', type: 'attack', rarity: 'rare', color: 'red', cost: 2, target: 'all', dmg: 4, dmgUp: 5, exhaust: true, icon: '🌾',
    desc: '对所有敌人造成 !D! 点伤害。\n回复等同于未被格挡伤害的生命。\n消耗。', play: (g, _c, _t, v) => { const d = g.attackAll(v.dmg); if (d > 0) g.heal(d); } },

  // ============ STATUS ============
  { id: 'wound', name: '伤口', type: 'status', rarity: 'special', color: 'status', cost: -2, target: 'none', icon: '🩹', desc: '不能被打出。' },
  { id: 'dazed', name: '晕眩', type: 'status', rarity: 'special', color: 'status', cost: -2, target: 'none', ethereal: true, icon: '💫', desc: '不能被打出。\n虚无。' },
  { id: 'burn', name: '灼伤', type: 'status', rarity: 'special', color: 'status', cost: -2, target: 'none', mag: 2, magUp: 4, icon: '🔥',
    desc: '不能被打出。\n在你的回合结束时，受到 !M! 点伤害。' },
  { id: 'slimed', name: '黏液', type: 'status', rarity: 'special', color: 'status', cost: 1, target: 'self', exhaust: true, icon: '🟢', desc: '消耗。' , play: () => {} },

  // ============ CURSE ============
  { id: 'regret', name: '悔恨', type: 'curse', rarity: 'curse', color: 'curse', cost: -2, target: 'none', icon: '😞',
    desc: '不能被打出。\n在你的回合结束时，每有一张手牌，失去 1 点生命。' },
  { id: 'doubt', name: '疑虑', type: 'curse', rarity: 'curse', color: 'curse', cost: -2, target: 'none', icon: '😟',
    desc: '不能被打出。\n在你的回合结束时，获得 1 层虚弱。' },
  { id: 'injury', name: '受伤', type: 'curse', rarity: 'curse', color: 'curse', cost: -2, target: 'none', icon: '🤕', desc: '不能被打出。' },
  { id: 'shame', name: '羞耻', type: 'curse', rarity: 'curse', color: 'curse', cost: -2, target: 'none', icon: '😳',
    desc: '不能被打出。\n在你的回合结束时，获得 1 层脆弱。' },
  { id: 'clumsy', name: '笨拙', type: 'curse', rarity: 'curse', color: 'curse', cost: -2, target: 'none', ethereal: true, icon: '🤡', desc: '不能被打出。\n虚无。' },
  { id: 'decay', name: '腐朽', type: 'curse', rarity: 'curse', color: 'curse', cost: -2, target: 'none', icon: '🍂',
    desc: '不能被打出。\n在你的回合结束时，受到 2 点伤害。' },
  { id: 'parasite', name: '寄生', type: 'curse', rarity: 'curse', color: 'curse', cost: -2, target: 'none', icon: '🪱',
    desc: '不能被打出。\n如果将这张牌移出牌组，失去 3 点最大生命值。' },
];

export const CARD_LIST = list;
export const CARDS: Record<string, CardDef> = Object.fromEntries(list.map((c) => [c.id, c]));

export const REWARD_POOL = (rarity: Rarity) => list.filter((c) => c.color === 'red' && c.rarity === rarity);
export const CURSES = ['regret', 'doubt', 'injury', 'shame', 'clumsy', 'decay', 'parasite'];

export const KEYWORDS: Record<string, string> = {
  消耗: '被打出后移出战斗，直到战斗结束。',
  虚无: '如果回合结束时这张牌还在你的手中，它会被消耗。',
  固有: '每场战斗开始时，这张牌会出现在你的起始手牌中。',
  易伤: '易伤状态的生物受到的攻击伤害增加 50%。',
  虚弱: '虚弱状态的生物造成的攻击伤害减少 25%。',
  脆弱: '脆弱状态下，从卡牌获得的格挡减少 25%。',
  力量: '每点力量使攻击伤害增加 1 点。',
  敏捷: '每点敏捷使从卡牌获得的格挡增加 1 点。',
  格挡: '在下个回合前，防止伤害。',
  伤口: '不能被打出。',
  晕眩: '不能被打出。虚无。',
  灼伤: '不能被打出。在回合结束时受到伤害。',
  升级: '升级后的卡牌效果更强。',
  不能被打出: '这张牌无法被打出。',
};

export function cardVals(c: CardInst, g: Game | null): Vals {
  const d = CARDS[c.id];
  const up = c.up > 0;
  const v: Vals = {
    dmg: up && d.dmgUp !== undefined ? d.dmgUp : d.dmg ?? 0,
    blk: up && d.blkUp !== undefined ? d.blkUp : d.blk ?? 0,
    mag: up && d.magUp !== undefined ? d.magUp : d.mag ?? 0,
  };
  d.calc?.(g, c, v);
  return v;
}

export function cardName(c: CardInst) {
  const d = CARDS[c.id];
  if (!c.up) return d.name;
  if (d.multiUpgrade) return `${d.name}+${c.up}`;
  return d.name + '+';
}

export function isExhaust(c: CardInst) {
  const d = CARDS[c.id];
  if (c.up && d.exhaustUp !== undefined) return d.exhaustUp;
  return !!d.exhaust;
}
export function isEthereal(c: CardInst) {
  const d = CARDS[c.id];
  if (c.up && d.etherealUp !== undefined) return d.etherealUp;
  return !!d.ethereal;
}
export function isInnate(c: CardInst) {
  const d = CARDS[c.id];
  if (c.up && d.innateUp !== undefined) return d.innateUp;
  return !!d.innate;
}
export function baseCost(c: CardInst) {
  const d = CARDS[c.id];
  if (c.up && d.costUp !== undefined) return d.costUp;
  return d.cost;
}
export function canUpgradeDef(c: CardInst) {
  const d = CARDS[c.id];
  if (d.type === 'curse' || d.type === 'status') return false;
  return d.multiUpgrade || c.up === 0;
}
export function cardDesc(c: CardInst) {
  const d = CARDS[c.id];
  return c.up && d.descUp ? d.descUp : d.desc;
}
