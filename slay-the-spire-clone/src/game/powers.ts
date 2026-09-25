export interface PowerDef {
  name: string;
  icon: string;
  debuff?: boolean;
  desc: (n: number) => string;
  showAmount?: boolean;
  negIsDebuff?: boolean;
}

export const POWERS: Record<string, PowerDef> = {
  strength: { name: '力量', icon: '💪', negIsDebuff: true, desc: (n) => n >= 0 ? `攻击伤害提升 ${n} 点。` : `攻击伤害降低 ${-n} 点。` },
  dexterity: { name: '敏捷', icon: '🦶', negIsDebuff: true, desc: (n) => n >= 0 ? `从卡牌获得的格挡提升 ${n} 点。` : `从卡牌获得的格挡降低 ${-n} 点。` },
  vulnerable: { name: '易伤', icon: '💔', debuff: true, desc: (n) => `受到攻击伤害增加 50%，持续 ${n} 回合。` },
  weak: { name: '虚弱', icon: '🥀', debuff: true, desc: (n) => `攻击造成的伤害减少 25%，持续 ${n} 回合。` },
  frail: { name: '脆弱', icon: '🦴', debuff: true, desc: (n) => `从卡牌获得的格挡减少 25%，持续 ${n} 回合。` },
  artifact: { name: '人工制品', icon: '🔷', desc: (n) => `抵消接下来 ${n} 次负面效果。` },
  metallicize: { name: '金属化', icon: '⚙️', desc: (n) => `在你的回合结束时，获得 ${n} 点格挡。` },
  plated: { name: '多层护甲', icon: '🛡️', desc: (n) => `回合结束时获得 ${n} 点格挡。受到未被格挡的攻击伤害时层数减少 1。` },
  ritual: { name: '仪式', icon: '🐦', desc: (n) => `在回合结束时，获得 ${n} 点力量。` },
  thorns: { name: '荆棘', icon: '🌵', desc: (n) => `受到攻击时，对攻击者造成 ${n} 点伤害。` },
  enrage: { name: '激怒', icon: '😡', desc: (n) => `每当你打出一张技能牌，它获得 ${n} 点力量。` },
  curlup: { name: '蜷身', icon: '🐚', desc: (n) => `第一次受到攻击伤害时，蜷缩起来并获得 ${n} 点格挡。` },
  asleep: { name: '沉睡', icon: '💤', desc: () => `正在沉睡。受到伤害或 3 回合后醒来。` , showAmount: false },
  modeshift: { name: '模式转换', icon: '🔄', desc: (n) => `再受到 ${n} 点伤害后，切换为防御形态。` },
  sharphide: { name: '尖刺外壳', icon: '🦔', desc: (n) => `每当你打出一张攻击牌，受到 ${n} 点伤害。` },
  split: { name: '分裂', icon: '🧬', desc: () => `生命值降到一半或以下时，分裂成两个更小的史莱姆。`, showAmount: false },
  demonform: { name: '恶魔形态', icon: '😈', desc: (n) => `在你的回合开始时，获得 ${n} 点力量。` },
  barricade: { name: '壁垒', icon: '🏰', desc: () => `格挡不会在你的回合开始时消失。`, showAmount: false },
  feelnopain: { name: '无惧疼痛', icon: '😤', desc: (n) => `每当一张牌被消耗时，获得 ${n} 点格挡。` },
  darkembrace: { name: '黑暗之拥', icon: '🌑', desc: (n) => `每当一张牌被消耗时，抽 ${n} 张牌。` },
  rage: { name: '狂怒', icon: '💢', desc: (n) => `本回合每当你打出一张攻击牌，获得 ${n} 点格挡。` },
  combust: { name: '自燃', icon: '🔥', desc: (n) => `在你的回合结束时，失去 1 点生命，对所有敌人造成 ${n} 点伤害。` },
  rupture: { name: '撕裂', icon: '🩸', desc: (n) => `每当你因为卡牌失去生命时，获得 ${n} 点力量。` },
  juggernaut: { name: '势不可挡', icon: '🗿', desc: (n) => `每当你获得格挡时，对随机敌人造成 ${n} 点伤害。` },
  flamebarrier: { name: '火焰屏障', icon: '🔥', desc: (n) => `本回合受到攻击时，对攻击者造成 ${n} 点伤害。` },
  doubletap: { name: '双发', icon: '🎯', desc: (n) => `你接下来的 ${n} 张攻击牌会被打出两次。` },
  corruption: { name: '腐化', icon: '☠️', desc: () => `技能牌耗能变为 0。每当你打出一张技能牌时，将其消耗。`, showAmount: false },
  brutality: { name: '残暴', icon: '🩹', desc: (n) => `在你的回合开始时，失去 ${n} 点生命并抽 ${n} 张牌。` },
  evolve: { name: '进化', icon: '🧪', desc: (n) => `每当你抽到状态牌时，抽 ${n} 张牌。` },
  firebreathing: { name: '火焰吐息', icon: '🐲', desc: (n) => `每当你抽到状态牌或诅咒牌时，对所有敌人造成 ${n} 点伤害。` },
  berserk: { name: '狂暴', icon: '👹', desc: (n) => `在你的回合开始时，获得 ${n} 点能量。` },
  flex: { name: '力量下降', icon: '📉', debuff: true, desc: (n) => `在你的回合结束时，失去 ${n} 点力量。` },
  nodraw: { name: '无法抽牌', icon: '🚫', debuff: true, desc: () => `本回合你不能再抽任何牌。`, showAmount: false },
  vigor: { name: '活力', icon: '✨', desc: (n) => `你的下一张攻击牌额外造成 ${n} 点伤害。` },
  nextblock: { name: '下回合格挡', icon: '🧱', desc: (n) => `下回合开始时获得 ${n} 点格挡。` },
  angry: { name: '愤怒', icon: '😠', desc: (n) => `受到攻击伤害时，获得 ${n} 点力量。` },
};

export const isDebuff = (id: string, amt: number) => {
  const d = POWERS[id];
  if (!d) return false;
  if (d.debuff) return true;
  if (d.negIsDebuff && amt < 0) return true;
  return false;
};
