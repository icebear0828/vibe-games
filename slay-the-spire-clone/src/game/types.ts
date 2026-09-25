export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
export type Rarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'special' | 'curse';
export type TargetType = 'enemy' | 'all' | 'self' | 'none';
export type CardColor = 'red' | 'colorless' | 'status' | 'curse';

export interface CardInst {
  uid: number;
  id: string;
  up: number; // upgrade count (0 = not upgraded)
  misc?: number; // extra data (rampage bonus etc.)
  costTurn?: number | null; // cost override this turn
  costCombat?: number | null; // cost override this combat
}

export interface Vals {
  dmg: number;
  blk: number;
  mag: number;
}

export interface Fx {
  id: number;
  text: string;
  cls: string;
  dx: number;
}

export interface Creature {
  uid: number;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  powers: Record<string, number>;
  fx: Fx[];
  anim: string;
  animKey: number;
  justApplied: Record<string, boolean>;
}

export type IntentType =
  | 'attack'
  | 'attack_block'
  | 'attack_buff'
  | 'attack_debuff'
  | 'block'
  | 'buff'
  | 'debuff'
  | 'strong_debuff'
  | 'block_buff'
  | 'sleep'
  | 'stun'
  | 'unknown'
  | 'magic';

export interface Move {
  id: string;
  name: string;
  intent: IntentType;
  dmg?: number;
  hits?: number;
}

export interface Enemy extends Creature {
  id: string;
  dead: boolean;
  dying: boolean;
  move: Move | null;
  history: string[];
  data: Record<string, any>;
}

export type NodeType = 'monster' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss';

export interface MapNode {
  row: number;
  col: number;
  type: NodeType;
  next: number[]; // columns in row+1
  jx: number;
  jy: number;
}

export interface MapData {
  rows: (MapNode | null)[][];
  bossId: string;
}

export interface RelicInst {
  id: string;
  counter: number;
  used?: boolean;
}

export interface RunState {
  act: number;
  floor: number;
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInst[];
  relics: RelicInst[];
  potions: (string | null)[];
  map: MapData;
  pos: { row: number; col: number } | null;
  visited: { row: number; col: number }[];
  cardRemoveCost: number;
  potionChance: number;
  rareOffset: number;
  monstersFought: number;
  seenEvents: string[];
  seenBosses: string[];
  elitesKilled: number;
  monstersKilled: number;
  bossesKilled: number;
  neowOneHp: number;
  uid: number;
  seedName: string;
  startTime: number;
}

export type Screen =
  | 'title'
  | 'neow'
  | 'map'
  | 'combat'
  | 'reward'
  | 'rest'
  | 'shop'
  | 'event'
  | 'treasure'
  | 'bossRelic'
  | 'gameover'
  | 'victory'
  | 'library';

export type RewardItem =
  | { kind: 'gold'; amount: number; taken?: boolean }
  | { kind: 'potion'; id: string; taken?: boolean }
  | { kind: 'relic'; id: string; taken?: boolean }
  | { kind: 'card'; cards: CardInst[]; taken?: boolean };

export interface SelectReq {
  title: string;
  cards: CardInst[];
  min: number;
  max: number;
  canCancel: boolean;
  preview?: 'upgrade';
  resolve: (cards: CardInst[] | null) => void;
}

export interface EventOption {
  label: string;
  disabled?: boolean;
  pick: () => void | Promise<void>;
}

export interface EventPage {
  text: string;
  options: EventOption[];
}
