export type RelicTier = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'special' | 'shop';

export interface RelicDef {
  id: string;
  name: string;
  tier: RelicTier;
  icon: string;
  desc: string;
  flavor?: string;
  counter?: boolean;
}

const list: RelicDef[] = [
  { id: 'burning_blood', name: '燃烧之血', tier: 'starter', icon: '🩸', desc: '在战斗结束时，回复 6 点生命。', flavor: '你的身体里流淌着滚烫的鲜血……' },
  // common
  { id: 'anchor', name: '锚', tier: 'common', icon: '⚓', desc: '每场战斗开始时获得 10 点格挡。' },
  { id: 'bag_of_marbles', name: '弹珠袋', tier: 'common', icon: '🔮', desc: '每场战斗开始时，给予所有敌人 1 层易伤。' },
  { id: 'blood_vial', name: '小血瓶', tier: 'common', icon: '🧪', desc: '每场战斗开始时，回复 2 点生命。' },
  { id: 'bronze_scales', name: '铜制鳞片', tier: 'common', icon: '🐉', desc: '每场战斗开始时获得 3 层荆棘。' },
  { id: 'centennial_puzzle', name: '百年积木', tier: 'common', icon: '🧩', desc: '每场战斗中第一次失去生命时，抽 3 张牌。' },
  { id: 'happy_flower', name: '开心小花', tier: 'common', icon: '🌼', desc: '每 3 回合，获得 1 点能量。', counter: true },
  { id: 'lantern', name: '灯笼', tier: 'common', icon: '🏮', desc: '每场战斗的第一回合获得 1 点能量。' },
  { id: 'oddly_smooth_stone', name: '意外光滑的石头', tier: 'common', icon: '🪨', desc: '每场战斗开始时获得 1 点敏捷。' },
  { id: 'orichalcum', name: '奥利哈钢', tier: 'common', icon: '🟠', desc: '如果你在回合结束时没有格挡，获得 6 点格挡。' },
  { id: 'pen_nib', name: '钢笔尖', tier: 'common', icon: '✒️', desc: '每打出第 10 张攻击牌时，其伤害翻倍。', counter: true },
  { id: 'vajra', name: '金刚杵', tier: 'common', icon: '🔱', desc: '每场战斗开始时获得 1 点力量。' },
  { id: 'akabeko', name: '赤牛', tier: 'common', icon: '🐂', desc: '每场战斗中你的第一张攻击牌额外造成 8 点伤害。' },
  { id: 'red_skull', name: '红头骨', tier: 'common', icon: '💀', desc: '当你的生命值不高于 50% 时，获得额外 3 点力量。' },
  { id: 'meal_ticket', name: '餐券', tier: 'common', icon: '🎫', desc: '每次进入商店时，回复 15 点生命。' },
  { id: 'strawberry', name: '草莓', tier: 'common', icon: '🍓', desc: '拾起时，最大生命值 +7。' },
  { id: 'regal_pillow', name: '皇家枕头', tier: 'common', icon: '🛏️', desc: '在休息处休息时，额外回复 15 点生命。' },
  { id: 'toy_ornithopter', name: '玩具扑翼飞机', tier: 'common', icon: '🛩️', desc: '每当你使用药水时，回复 5 点生命。' },
  { id: 'potion_belt', name: '药水腰带', tier: 'common', icon: '👝', desc: '拾起时，获得 2 个药水栏位。' },
  { id: 'preserved_insect', name: '昆虫标本', tier: 'common', icon: '🦗', desc: '精英敌人的生命值减少 25%。' },
  { id: 'war_paint', name: '战纹涂料', tier: 'common', icon: '🎨', desc: '拾起时，升级 2 张随机技能牌。' },
  { id: 'whetstone', name: '磨刀石', tier: 'common', icon: '🔪', desc: '拾起时，升级 2 张随机攻击牌。' },
  // uncommon
  { id: 'kunai', name: '苦无', tier: 'uncommon', icon: '🗡️', desc: '每当你在一回合内打出 3 张攻击牌时，获得 1 点敏捷。', counter: true },
  { id: 'shuriken', name: '手里剑', tier: 'uncommon', icon: '⭐', desc: '每当你在一回合内打出 3 张攻击牌时，获得 1 点力量。', counter: true },
  { id: 'ornamental_fan', name: '精致折扇', tier: 'uncommon', icon: '🪭', desc: '每当你在一回合内打出 3 张攻击牌时，获得 4 点格挡。', counter: true },
  { id: 'letter_opener', name: '开信刀', tier: 'uncommon', icon: '✉️', desc: '每当你在一回合内打出 3 张技能牌时，对所有敌人造成 5 点伤害。', counter: true },
  { id: 'horn_cleat', name: '船夹板', tier: 'uncommon', icon: '🪝', desc: '在你的第 2 回合开始时，获得 14 点格挡。' },
  { id: 'pear', name: '梨子', tier: 'uncommon', icon: '🍐', desc: '拾起时，最大生命值 +10。' },
  { id: 'meat_on_the_bone', name: '带骨肉', tier: 'uncommon', icon: '🍖', desc: '如果你在战斗结束时生命值不高于 50%，回复 12 点生命。' },
  { id: 'paper_phrog', name: '纸蛙', tier: 'uncommon', icon: '🐸', desc: '易伤状态的敌人受到 75% 而非 50% 的额外伤害。' },
  { id: 'self_forming_clay', name: '自成型黏土', tier: 'uncommon', icon: '🏺', desc: '每当你在战斗中失去生命时，下回合获得 3 点格挡。' },
  { id: 'eternal_feather', name: '永恒羽毛', tier: 'uncommon', icon: '🪶', desc: '你牌组中每有 5 张牌，进入休息处时回复 3 点生命。' },
  { id: 'gremlin_horn', name: '地精之角', tier: 'uncommon', icon: '📯', desc: '每当一名敌人死亡时，获得 1 点能量并抽 1 张牌。' },
  { id: 'mercury_hourglass', name: '水银沙漏', tier: 'uncommon', icon: '⏳', desc: '在你的回合开始时，对所有敌人造成 3 点伤害。' },
  // rare
  { id: 'ice_cream', name: '冰淇淋', tier: 'rare', icon: '🍦', desc: '未使用的能量会保留到下一回合。' },
  { id: 'dead_branch', name: '枯木树枝', tier: 'rare', icon: '🌿', desc: '每当你消耗一张牌时，将一张随机卡牌加入你的手牌。' },
  { id: 'mango', name: '芒果', tier: 'rare', icon: '🥭', desc: '拾起时，最大生命值 +14。' },
  { id: 'captains_wheel', name: '舵盘', tier: 'rare', icon: '☸️', desc: '在你的第 3 回合开始时，获得 18 点格挡。' },
  { id: 'calipers', name: '卡钳', tier: 'rare', icon: '📐', desc: '在你的回合开始时，只失去 15 点格挡，而不是全部。' },
  { id: 'torii', name: '鸟居', tier: 'rare', icon: '⛩️', desc: '每当你受到 5 点或更少的未被格挡的攻击伤害时，将其降低为 1。' },
  { id: 'tungsten_rod', name: '钨合金棍', tier: 'rare', icon: '🔩', desc: '每当你失去生命时，少失去 1 点。' },
  { id: 'girya', name: '壶铃', tier: 'rare', icon: '🏋️', desc: '你可以在休息处“举重”来永久获得 1 点力量（最多 3 次）。', counter: true },
  // boss
  { id: 'black_blood', name: '黑色之血', tier: 'boss', icon: '🖤', desc: '替换燃烧之血。在战斗结束时，回复 12 点生命。' },
  { id: 'coffee_dripper', name: '咖啡滤杯', tier: 'boss', icon: '☕', desc: '每回合开始时获得 1 点能量。你不能再在休息处休息。' },
  { id: 'fusion_hammer', name: '融合之锤', tier: 'boss', icon: '🔨', desc: '每回合开始时获得 1 点能量。你不能再在休息处锻造。' },
  { id: 'ectoplasm', name: '灵体外质', tier: 'boss', icon: '👻', desc: '每回合开始时获得 1 点能量。你不能再获得金币。' },
  { id: 'sozu', name: '添水', tier: 'boss', icon: '🎍', desc: '每回合开始时获得 1 点能量。你不能再获得药水。' },
  { id: 'philosophers_stone', name: '贤者之石', tier: 'boss', icon: '🔴', desc: '每回合开始时获得 1 点能量。所有敌人开始战斗时拥有 1 点力量。' },
  { id: 'mark_of_pain', name: '疼痛印记', tier: 'boss', icon: '❣️', desc: '每回合开始时获得 1 点能量。战斗开始时，将 2 张伤口放入你的抽牌堆。' },
  { id: 'cursed_key', name: '诅咒钥匙', tier: 'boss', icon: '🗝️', desc: '每回合开始时获得 1 点能量。每次打开非Boss宝箱时，获得一张诅咒。' },
  { id: 'velvet_choker', name: '天鹅绒颈圈', tier: 'boss', icon: '🎀', desc: '每回合开始时获得 1 点能量。你每回合最多只能打出 6 张牌。', counter: true },
  { id: 'busted_crown', name: '破碎金冠', tier: 'boss', icon: '👑', desc: '每回合开始时获得 1 点能量。卡牌奖励的选项减少 2 个。' },
  { id: 'runic_pyramid', name: '符文金字塔', tier: 'boss', icon: '🔺', desc: '在你的回合结束时，不再丢弃手牌。' },
  // special
  { id: 'golden_idol', name: '金色神像', tier: 'special', icon: '🗿', desc: '敌人掉落的金币增加 25%。' },
  { id: 'neows_lament', name: '涅奥的悲恸', tier: 'special', icon: '🐋', desc: '接下来的 3 场战斗中，敌人只有 1 点生命。', counter: true },
];

export const RELIC_LIST = list;
export const RELICS: Record<string, RelicDef> = Object.fromEntries(list.map((r) => [r.id, r]));
export const ENERGY_RELICS = ['coffee_dripper', 'fusion_hammer', 'ectoplasm', 'sozu', 'philosophers_stone', 'mark_of_pain', 'cursed_key', 'velvet_choker', 'busted_crown'];
