export interface PotionDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare';
  target: boolean;
  combatOnly: boolean;
  desc: string;
}

export const POTION_LIST: PotionDef[] = [
  { id: 'fire', name: '火焰药水', icon: '🔥', color: '#e2532b', rarity: 'common', target: true, combatOnly: true, desc: '对目标敌人造成 20 点伤害。' },
  { id: 'explosive', name: '爆炸药水', icon: '💣', color: '#e2932b', rarity: 'common', target: false, combatOnly: true, desc: '对所有敌人造成 10 点伤害。' },
  { id: 'block', name: '格挡药水', icon: '🛡️', color: '#4a8fe0', rarity: 'common', target: false, combatOnly: true, desc: '获得 12 点格挡。' },
  { id: 'strength', name: '力量药水', icon: '💪', color: '#c03030', rarity: 'common', target: false, combatOnly: true, desc: '获得 2 点力量。' },
  { id: 'dexterity', name: '敏捷药水', icon: '🦶', color: '#40b060', rarity: 'common', target: false, combatOnly: true, desc: '获得 2 点敏捷。' },
  { id: 'energy', name: '能量药水', icon: '⚡', color: '#f0c020', rarity: 'common', target: false, combatOnly: true, desc: '获得 2 点能量。' },
  { id: 'swift', name: '迅捷药水', icon: '💨', color: '#80d0f0', rarity: 'common', target: false, combatOnly: true, desc: '抽 3 张牌。' },
  { id: 'weak', name: '虚弱药水', icon: '🥀', color: '#9060c0', rarity: 'common', target: true, combatOnly: true, desc: '给予 3 层虚弱。' },
  { id: 'fear', name: '恐惧药水', icon: '😱', color: '#303030', rarity: 'common', target: true, combatOnly: true, desc: '给予 3 层易伤。' },
  { id: 'blood', name: '鲜血药水', icon: '🩸', color: '#a01020', rarity: 'uncommon', target: false, combatOnly: false, desc: '回复 20% 最大生命值。' },
  { id: 'ancient', name: '远古药水', icon: '🏺', color: '#d0b060', rarity: 'uncommon', target: false, combatOnly: true, desc: '获得 1 层人工制品。' },
  { id: 'steroid', name: '类固醇药水', icon: '💉', color: '#e06080', rarity: 'uncommon', target: false, combatOnly: true, desc: '获得 5 点力量。回合结束时失去 5 点力量。' },
  { id: 'fairy', name: '瓶中精灵', icon: '🧚', color: '#f0a0e0', rarity: 'rare', target: false, combatOnly: true, desc: '当你将要死亡时，自动使用并回复 30% 最大生命值。' },
];

export const POTIONS: Record<string, PotionDef> = Object.fromEntries(POTION_LIST.map((p) => [p.id, p]));
