export const VIEW_W = 900;
export const VIEW_H = 600;
export const LAWN_X = 140;
export const LAWN_Y = 90;
export const CELL_W = 80;
export const CELL_H = 100;
export const COLS = 9;
export const ROWS = 5;
export const WORLD_W = 1400;
export const SPAWN_X = 930;
export const LAWN_RIGHT = LAWN_X + COLS * CELL_W; // 860

export const rowFeetY = (r: number) => LAWN_Y + r * CELL_H + CELL_H - 16;
export const colCenterX = (c: number) => LAWN_X + c * CELL_W + CELL_W / 2;

export type PlantType =
  | 'peashooter'
  | 'sunflower'
  | 'cherrybomb'
  | 'wallnut'
  | 'potatomine'
  | 'snowpea'
  | 'chomper'
  | 'repeater'
  | 'squash'
  | 'threepeater'
  | 'jalapeno'
  | 'spikeweed'
  | 'torchwood'
  | 'tallnut';

export interface PlantDef {
  name: string;
  en: string;
  cost: number;
  recharge: number; // seconds
  hp: number;
  desc: string;
  stat: string;
  rechargeLabel: string;
}

export const PLANTS: Record<PlantType, PlantDef> = {
  peashooter: {
    name: '豌豆射手', en: 'Peashooter', cost: 100, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '伤害：中等', desc: '豌豆射手是你的第一道防线。它们朝来袭的僵尸发射豌豆。"我怎么能这么厉害？"他说，"我就是这么做的，全靠刻苦练习。"',
  },
  sunflower: {
    name: '向日葵', en: 'Sunflower', cost: 50, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '产出：每次 25 阳光', desc: '向日葵是你获取额外阳光的必需品。为什么不多种几棵呢？向日葵总忍不住随着节拍跳舞。什么节拍？当然是大地自己的生命律动。',
  },
  cherrybomb: {
    name: '樱桃炸弹', en: 'Cherry Bomb', cost: 150, recharge: 50, hp: 300, rechargeLabel: '很慢',
    stat: '伤害：巨大 · 范围：中等范围内所有僵尸', desc: '樱桃炸弹能炸掉一定区域内的所有僵尸。它们有一个短暂的引信，所以要种在僵尸附近。"我想要爆炸，"樱桃一号说。"不，我们应该引爆！"他的兄弟樱桃二号说。',
  },
  wallnut: {
    name: '坚果墙', en: 'Wall-nut', cost: 50, recharge: 30, hp: 4000, rechargeLabel: '慢',
    stat: '韧性：高', desc: '坚果墙拥有坚硬的外壳，你可以用它来保护其他植物。"人们想知道我在面对僵尸的不断攻击时是什么感受，"坚果墙说，"他们不知道的是，我躺在这里，除了坚持没别的选择。"',
  },
  potatomine: {
    name: '土豆地雷', en: 'Potato Mine', cost: 25, recharge: 30, hp: 300, rechargeLabel: '慢',
    stat: '伤害：巨大 · 范围：一个小区域内的僵尸 · 用法：单独使用，需要一段时间准备', desc: '土豆地雷威力巨大，但需要一段时间来准备。你应该把它种在僵尸前进的路上，当僵尸碰到它时它就会爆炸。',
  },
  snowpea: {
    name: '寒冰射手', en: 'Snow Pea', cost: 175, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '伤害：中等，减速', desc: '寒冰射手发射寒冰豌豆，能伤害并减速敌人。人们常说寒冰射手很"酷"，或者说很"冷淡"。告诉他们说，他才不是呢。',
  },
  chomper: {
    name: '大嘴花', en: 'Chomper', cost: 150, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '伤害：巨大 · 范围：非常近 · 特点：咀嚼时非常脆弱', desc: '大嘴花可以一口吞掉一整个僵尸，但是在咀嚼时很脆弱。大嘴花差一点就参加了"恐怖小店"的演出，但他的经纪人压低了他的报酬，所以没去成。',
  },
  repeater: {
    name: '双发射手', en: 'Repeater', cost: 200, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '伤害：中等（每颗）· 发射速度：每次两颗', desc: '双发射手一次发射两颗豌豆。双发射手很凶悍，他来自街头。他不在乎任何人的看法，无论是植物还是僵尸。',
  },
  squash: {
    name: '倭瓜', en: 'Squash', cost: 50, recharge: 30, hp: 300, rechargeLabel: '慢',
    stat: '伤害：巨大 · 范围：短距离，压扁第一个接近的僵尸 · 用法：单次使用', desc: '倭瓜会压扁第一个接近它的僵尸。"我准备好了！"倭瓜大喊道，"来吧！我就在这里！我已经做好了准备！"',
  },
  threepeater: {
    name: '三线射手', en: 'Threepeater', cost: 325, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '伤害：普通（每颗）· 范围：三行', desc: '三线射手可以在三条线上同时射出豌豆。三线射手喜欢读书、下棋和坐在公园里。他害怕深度。',
  },
  jalapeno: {
    name: '火爆辣椒', en: 'Jalapeno', cost: 125, recharge: 50, hp: 300, rechargeLabel: '很慢',
    stat: '伤害：巨大 · 范围：整行僵尸 · 用法：单次使用', desc: '火爆辣椒可以摧毁一整行的敌人。"嘎嘎嘎嘎嘎！！！"火爆辣椒说。他不会爆炸，今天还不会，现在还不会。',
  },
  spikeweed: {
    name: '地刺', en: 'Spikeweed', cost: 100, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '伤害：普通 · 范围：所有走过它的僵尸 · 特点：不会被僵尸吃掉', desc: '地刺可以扎破轮胎，并对踩在它上面的僵尸造成伤害。地刺痴迷冰球，他买了季票，一直关注他喜欢的球员。',
  },
  torchwood: {
    name: '火炬树桩', en: 'Torchwood', cost: 175, recharge: 7.5, hp: 300, rechargeLabel: '快',
    stat: '特点：通过它的豌豆会变成火球，造成双倍伤害', desc: '火炬树桩可以把穿过它的豌豆变成火球，造成两倍伤害。大家都喜欢火炬树桩。他们喜欢他的正直，喜欢他坚定的友谊，喜欢他烤香肠的本领。',
  },
  tallnut: {
    name: '高坚果', en: 'Tall-nut', cost: 125, recharge: 30, hp: 8000, rechargeLabel: '慢',
    stat: '韧性：非常高 · 特点：不能被跳过', desc: '高坚果是重型墙体植物，而且不会被跨过。人们想知道坚果墙和高坚果之间是否存在竞争。高坚果笑着说："怎么可能会有竞争？我可是个高个子。"',
  },
};

export const PLANT_ORDER: PlantType[] = [
  'peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper',
  'repeater', 'squash', 'threepeater', 'jalapeno', 'spikeweed', 'torchwood', 'tallnut',
];

export type ZombieType = 'normal' | 'flag' | 'cone' | 'pole' | 'bucket' | 'newspaper' | 'door' | 'football';
export type ArmorKind = 'cone' | 'bucket' | 'helmet' | 'newspaper' | 'door';

export interface ZombieDef {
  name: string;
  hp: number;
  armor?: ArmorKind;
  armorHp?: number;
  speed: number;
  cost: number;
  desc: string;
  stat: string;
}

export const ZOMBIES: Record<ZombieType, ZombieDef> = {
  normal: { name: '普通僵尸', hp: 200, speed: 15, cost: 1, stat: '韧性：低', desc: '这种僵尸喜爱脑髓，贪婪而不知足。脑髓，脑髓，脑髓，夜以继日地追求着。' },
  flag: { name: '旗帜僵尸', hp: 200, speed: 20, cost: 1, stat: '韧性：低 · 速度：较快', desc: '旗帜僵尸标志着即将来袭的一大堆僵尸"流"。毫无疑问，摇旗僵尸喜爱脑髓。但在私下里他也迷恋旗帜。' },
  cone: { name: '路障僵尸', hp: 200, armor: 'cone', armorHp: 370, speed: 15, cost: 2, stat: '韧性：中', desc: '他的路障头盔，使他两倍坚韧于普通僵尸。路障僵尸出生时就戴着交通路障。别问为什么，他自己也不知道。' },
  pole: { name: '撑杆僵尸', hp: 340, speed: 32, cost: 2, stat: '韧性：中 · 速度：快 · 特点：跳过遇到的第一棵植物', desc: '撑杆僵尸运用标杆高高地跃过障碍物。一些僵尸渴望走得更远、得到更多，这也促使他们由普通成为非凡。那就是撑杆僵尸。' },
  bucket: { name: '铁桶僵尸', hp: 200, armor: 'bucket', armorHp: 1100, speed: 15, cost: 4, stat: '韧性：高 · 弱点：磁力菇', desc: '他的铁桶帽子，能极大程度地承受伤害。铁桶头僵尸经常戴着水桶，在冷漠的世界里显得独一无二。但事实上，他只是忘记了那铁桶还在他头上。' },
  newspaper: { name: '读报僵尸', hp: 200, armor: 'newspaper', armorHp: 150, speed: 15, cost: 2, stat: '韧性：低（报纸：低）· 速度：普通，报纸破后变快', desc: '他的报纸只能提供有限的防御。读报僵尸正痛苦地接近他的数独谜题的完成，难怪他这么暴躁。' },
  door: { name: '铁栅门僵尸', hp: 200, armor: 'door', armorHp: 1100, speed: 15, cost: 4, stat: '韧性：低（铁门：高）', desc: '他的铁栅门是有效的盾牌。那扇铁栅门是从坚不可摧的房子里偷来的，然后他就对自己的身份产生了怀疑。' },
  football: { name: '橄榄球僵尸', hp: 200, armor: 'helmet', armorHp: 1400, speed: 28, cost: 7, stat: '韧性：极高 · 速度：快', desc: '在球场上，橄榄球僵尸表现出110%的激情，他进攻防守样样在行。虽然他完全不知道橄榄球是什么。' },
};

export const ZOMBIE_ORDER: ZombieType[] = ['normal', 'flag', 'cone', 'pole', 'bucket', 'newspaper', 'door', 'football'];

export interface LevelDef {
  id: string;
  name: string;
  waves: number;
  flagEvery: number;
  zombies: ZombieType[];
  rows: number[];
  startSun: number;
  plants: PlantType[];
  unlock?: PlantType;
  slots: number;
  difficulty: number;
  endless?: boolean;
  tip?: string;
}

const ALL_ROWS = [0, 1, 2, 3, 4];

function plantsUpTo(n: number): PlantType[] {
  return PLANT_ORDER.slice(0, n);
}

export const LEVELS: LevelDef[] = [
  { id: '1-1', name: '1-1', waves: 4, flagEvery: 4, zombies: ['normal'], rows: [2], startSun: 150, plants: plantsUpTo(1), unlock: 'sunflower', slots: 6, difficulty: 0.6, tip: '点击豌豆射手卡片，然后点击草地种下它！点击掉落的阳光来收集。' },
  { id: '1-2', name: '1-2', waves: 6, flagEvery: 6, zombies: ['normal'], rows: [1, 2, 3], startSun: 50, plants: plantsUpTo(2), unlock: 'cherrybomb', slots: 6, difficulty: 0.8, tip: '多种向日葵！向日葵是你获取阳光的关键。' },
  { id: '1-3', name: '1-3', waves: 8, flagEvery: 8, zombies: ['normal', 'cone'], rows: [1, 2, 3], startSun: 50, plants: plantsUpTo(3), unlock: 'wallnut', slots: 6, difficulty: 0.9 },
  { id: '1-4', name: '1-4', waves: 10, flagEvery: 10, zombies: ['normal', 'cone'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(4), unlock: 'potatomine', slots: 6, difficulty: 1 },
  { id: '1-5', name: '1-5', waves: 10, flagEvery: 10, zombies: ['normal', 'cone', 'pole'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(5), unlock: 'snowpea', slots: 6, difficulty: 1.05 },
  { id: '1-6', name: '1-6', waves: 10, flagEvery: 10, zombies: ['normal', 'cone', 'pole'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(6), unlock: 'chomper', slots: 6, difficulty: 1.1 },
  { id: '1-7', name: '1-7', waves: 20, flagEvery: 10, zombies: ['normal', 'cone', 'pole', 'bucket'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(7), unlock: 'repeater', slots: 6, difficulty: 1.1 },
  { id: '1-8', name: '1-8', waves: 20, flagEvery: 10, zombies: ['normal', 'cone', 'newspaper', 'bucket'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(8), unlock: 'squash', slots: 7, difficulty: 1.15 },
  { id: '1-9', name: '1-9', waves: 20, flagEvery: 10, zombies: ['normal', 'cone', 'pole', 'newspaper', 'bucket'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(9), unlock: 'threepeater', slots: 7, difficulty: 1.2 },
  { id: '1-10', name: '1-10', waves: 20, flagEvery: 10, zombies: ['normal', 'cone', 'door', 'newspaper', 'bucket'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(10), unlock: 'jalapeno', slots: 7, difficulty: 1.25 },
  { id: '1-11', name: '1-11', waves: 20, flagEvery: 10, zombies: ['normal', 'cone', 'pole', 'football', 'bucket'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(11), unlock: 'spikeweed', slots: 8, difficulty: 1.3 },
  { id: '1-12', name: '1-12', waves: 20, flagEvery: 10, zombies: ['normal', 'cone', 'door', 'football', 'newspaper'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(12), unlock: 'torchwood', slots: 8, difficulty: 1.35 },
  { id: '1-13', name: '1-13', waves: 30, flagEvery: 10, zombies: ['normal', 'cone', 'pole', 'bucket', 'door', 'newspaper', 'football'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(13), unlock: 'tallnut', slots: 8, difficulty: 1.4 },
  { id: '1-14', name: '1-14', waves: 30, flagEvery: 10, zombies: ['normal', 'cone', 'pole', 'bucket', 'door', 'newspaper', 'football'], rows: ALL_ROWS, startSun: 50, plants: plantsUpTo(14), slots: 9, difficulty: 1.55 },
];

export const ENDLESS_LEVEL: LevelDef = {
  id: 'endless', name: '无尽生存', waves: 9999, flagEvery: 10,
  zombies: ['normal', 'cone', 'pole', 'bucket', 'door', 'newspaper', 'football'],
  rows: ALL_ROWS, startSun: 50, plants: PLANT_ORDER, slots: 10, difficulty: 1.2, endless: true,
};
