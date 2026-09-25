import { DD_ITEMS, DD_VERSION } from './dd';

export interface ItemStats {
  ad?: number; ap?: number; hp?: number; mp?: number; armor?: number; mr?: number; as?: number; crit?: number;
  ms?: number; msPct?: number; lifesteal?: number; hpRegen?: number; mpRegen?: number; haste?: number;
  magicPen?: number; magicPenPct?: number; armorPenPct?: number; lethality?: number; apPct?: number; critDmg?: number; healAmp?: number; omnivamp?: number;
}
export interface ItemDef {
  id: number; name: string; gold: number; from: number[]; stats: ItemStats; desc: string; plain: string;
  cat: 'starter' | 'boots' | 'basic' | 'epic' | 'legendary' | 'consumable';
  passive?: string; active?: string; activeCd?: number; consumable?: boolean; stack?: number; boots?: boolean;
}

const EXTRA: Record<number, Partial<ItemDef> & { x?: ItemStats }> = {
  2003: { active: 'potion', activeCd: 0.5, consumable: true, stack: 5, passive: '主动：在15秒内回复120生命值' },
  1055: { x: { omnivamp: 0.035 }, passive: '+3.5%全能吸血' },
  1056: { x: { mpRegen: 1.5 }, passive: '每秒回复1.5法力' },
  1054: { passive: '受到伤害后回复生命' },
  3006: { boots: true }, 3020: { boots: true, x: { magicPen: 12 } }, 3047: { boots: true, passive: '减少受到的普攻伤害12%' },
  3111: { boots: true, passive: '韧性' }, 3009: { boots: true }, 1001: { boots: true },
  3057: { passive: '咒刃：施放技能后，下次普攻额外造成100%基础攻击力的物理伤害' },
  3078: { x: { haste: 20 }, passive: '咒刃：施放技能后，下次普攻额外造成200%基础攻击力伤害' },
  3100: { x: { haste: 10 }, passive: '咒刃：施放技能后，下次普攻额外造成75%基础攻击力+45%法强的魔法伤害' },
  3089: { x: { apPct: 0.3 }, passive: '法术强度提升30%' },
  3157: { x: { haste: 15 }, active: 'stasis', activeCd: 120, passive: '主动-凝滞：进入2.5秒的无敌和无法被选取状态' },
  3135: { x: { magicPenPct: 0.4 }, passive: '+40%法术穿透' },
  3036: { x: { armorPenPct: 0.35 }, passive: '+35%护甲穿透' },
  3031: { x: { critDmg: 0.4 }, passive: '暴击伤害提升40%' },
  3071: { x: { haste: 20 }, passive: '普攻使目标护甲降低6%，最多叠加5层' },
  3110: { x: { haste: 20 }, passive: '附近敌人的攻击速度降低15%' },
  3165: { x: { haste: 15 }, passive: '技能伤害施加重伤效果' },
  3152: { x: { haste: 15 }, active: 'rocketbelt', activeCd: 40, passive: '主动：向前冲刺并发射火箭造成125+15%法强魔法伤害' },
  3065: { x: { haste: 10, healAmp: 0.25 }, passive: '受到的治疗和护盾效果提升25%' },
  3068: { passive: '献祭：每秒对附近敌人造成20+1%额外生命值的魔法伤害' },
  3075: { passive: '被普攻时反弹25+10%额外护甲的魔法伤害，并施加重伤' },
  3083: { passive: '若额外生命≥1100，6秒未受伤后每秒回复5%最大生命值' },
  3143: { passive: '受到的暴击伤害降低30%' },
  3026: { passive: '致命伤害时复活：4秒后以50%基础生命值复活（冷却300秒）' },
  3153: { passive: '普攻造成目标当前生命值8%的额外物理伤害' },
  3124: { passive: '普攻附带30魔法伤害' },
  3115: { passive: '普攻附带15+20%法强魔法伤害' },
  3087: { passive: '每第3次普攻释放闪电链，造成90魔法伤害' },
  3094: { passive: '每第3次普攻额外造成120魔法伤害' },
  3074: { x: { omnivamp: 0.05 }, passive: '普攻对周围敌人造成40%攻击力的溅射伤害' },
  3053: { passive: '生命值低于30%时获得等同60%额外生命值的护盾（冷却90秒）' },
  3084: { passive: '每30秒对英雄的下次普攻造成额外伤害并永久提升生命值' },
  3142: { x: { lethality: 18, haste: 15 }, active: 'youmuu', activeCd: 45, passive: '主动：获得20%移动速度，持续6秒' },
  3116: { passive: '技能伤害减速30%' },
  3072: { passive: '溢出的生命偷取转化为护盾' },
};

function parseStats(s: any): ItemStats {
  const o: ItemStats = {};
  if (!s) return o;
  if (s.FlatPhysicalDamageMod) o.ad = s.FlatPhysicalDamageMod;
  if (s.FlatMagicDamageMod) o.ap = s.FlatMagicDamageMod;
  if (s.FlatHPPoolMod) o.hp = s.FlatHPPoolMod;
  if (s.FlatMPPoolMod) o.mp = s.FlatMPPoolMod;
  if (s.FlatArmorMod) o.armor = s.FlatArmorMod;
  if (s.FlatSpellBlockMod) o.mr = s.FlatSpellBlockMod;
  if (s.PercentAttackSpeedMod) o.as = s.PercentAttackSpeedMod;
  if (s.FlatCritChanceMod) o.crit = s.FlatCritChanceMod;
  if (s.FlatMovementSpeedMod) o.ms = s.FlatMovementSpeedMod;
  if (s.PercentMovementSpeedMod) o.msPct = s.PercentMovementSpeedMod;
  if (s.PercentLifeStealMod) o.lifesteal = s.PercentLifeStealMod;
  if (s.FlatHPRegenMod) o.hpRegen = s.FlatHPRegenMod;
  return o;
}

const STARTERS = [1055, 1056, 1054];
export const ITEMS: Record<number, ItemDef> = {};
for (const [k, d] of Object.entries(DD_ITEMS)) {
  const id = +k;
  const ex = EXTRA[id] || {};
  const stats = { ...parseStats(d.stats), ...(ex.x || {}) };
  const from = (d.from || []).map((x: string) => +x);
  let cat: ItemDef['cat'] = 'basic';
  if (id === 2003) cat = 'consumable';
  else if (STARTERS.includes(id)) cat = 'starter';
  else if (ex.boots) cat = 'boots';
  else if (d.gold >= 2200) cat = 'legendary';
  else if (from.length) cat = 'epic';
  ITEMS[id] = { id, name: d.name, gold: d.gold, from, stats, desc: d.desc, plain: d.plain, cat, passive: ex.passive, active: ex.active, activeCd: ex.activeCd, consumable: ex.consumable, stack: ex.stack, boots: ex.boots };
}

export const itemIcon = (id: number) => `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/item/${id}.png`;

export const STAT_LABEL: Record<string, string> = {
  ad: '攻击力', ap: '法术强度', hp: '生命值', mp: '法力值', armor: '护甲', mr: '魔法抗性', as: '攻击速度', crit: '暴击几率',
  ms: '移动速度', msPct: '移动速度', lifesteal: '生命偷取', hpRegen: '基础生命回复', haste: '技能急速', magicPen: '法术穿透',
  magicPenPct: '法术穿透', armorPenPct: '护甲穿透', lethality: '穿甲', mpRegen: '法力回复', omnivamp: '全能吸血', apPct: '法术强度', critDmg: '暴击伤害', healAmp: '治疗增强',
};
export const PCT_STATS = new Set(['as', 'crit', 'msPct', 'lifesteal', 'magicPenPct', 'armorPenPct', 'omnivamp', 'apPct', 'critDmg', 'healAmp']);
export function statLines(s: ItemStats): string[] {
  return Object.entries(s).filter(([, v]) => v).map(([k, v]) => `+${PCT_STATS.has(k) ? Math.round((v as number) * 100) + '%' : v} ${STAT_LABEL[k] || k}`);
}

/** cost to buy item given owned inventory (recipe discount); returns [cost, consumedSlotIndices] */
export function buyCost(id: number, inv: (number | null)[]): [number, number[]] {
  const used: number[] = [];
  const avail = inv.map((x, i) => ({ x, i }));
  function rec(iid: number, top: boolean): number {
    if (!top) {
      const f = avail.find(a => a.x === iid && !used.includes(a.i));
      if (f) { used.push(f.i); return 0; }
    }
    const it = ITEMS[iid];
    if (!it) return 0;
    let c = it.gold;
    let comps = 0;
    for (const sub of it.from) comps += ITEMS[sub] ? ITEMS[sub].gold : 0;
    const own = it.gold - comps;
    c = own;
    for (const sub of it.from) c += rec(sub, false);
    return c;
  }
  const cost = rec(id, true);
  return [cost, used];
}

export const SHOP_CATS: { id: ItemDef['cat'] | 'all'; name: string }[] = [
  { id: 'all', name: '全部' }, { id: 'starter', name: '起始' }, { id: 'consumable', name: '消耗品' }, { id: 'boots', name: '鞋子' },
  { id: 'basic', name: '基础' }, { id: 'epic', name: '史诗' }, { id: 'legendary', name: '传说' },
];
