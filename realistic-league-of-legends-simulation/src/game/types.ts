export type Team = 0 | 1 | 2; // 0 = 蓝色方, 1 = 红色方, 2 = 中立
export type DmgType = 'physical' | 'magic' | 'true';
export type Kind = 'champion' | 'minion' | 'turret' | 'inhib' | 'nexus' | 'monster' | 'pet' | 'ward';
export type Lane = 0 | 1 | 2; // top mid bot
export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';

export interface Vec { x: number; y: number }

export interface Buff {
  id: string;
  name?: string;
  icon?: string;
  dur: number;
  t: number;
  src?: any;
  debuff?: boolean;
  stacks?: number;
  ms?: number;      // % bonus move speed (0.3 = +30%)
  msFlat?: number;
  as?: number;      // % bonus attack speed
  ad?: number;
  ap?: number;
  apPct?: number;
  adPct?: number;
  armor?: number;
  mr?: number;
  dr?: number;      // damage reduction 0..1
  haste?: number;
  stun?: boolean;
  root?: boolean;
  silence?: boolean;
  slow?: number;    // 0..1
  charm?: boolean;
  knockup?: boolean;
  untargetable?: boolean;
  stasis?: boolean;
  slowImmune?: boolean;
  grievous?: boolean;
  dot?: number;     // damage per sec
  dotType?: DmgType;
  hot?: number;     // heal per sec
  range?: number;   // bonus attack range
  noAttack?: boolean;
  onHit?: (g: any, owner: any, target: any) => void; // next-attack empowerment
  consume?: boolean;
  onExpire?: (g: any, u: any) => void;
  data?: any;
  hidden?: boolean;
}

export interface Shield { amount: number; t: number; id: string; magicOnly?: boolean }

export interface CastTarget { x: number; y: number; unit?: any }

export interface AbilityDef {
  key: 'Q' | 'W' | 'E' | 'R';
  cd: number[];
  cost: number[];
  range: number;
  target: 'skillshot' | 'unit' | 'ground' | 'self' | 'ally';
  width?: number;
  radius?: number;
  ai?: 'harass' | 'engage' | 'combat' | 'escape' | 'heal' | 'execute' | 'none';
  aiFarm?: boolean;
  noCostText?: boolean;
  cast: (g: any, c: any, t: CastTarget, lvl: number) => void | boolean;
  recast?: (g: any, c: any, t: CastTarget) => boolean; // returns true if recast consumed
  desc?: string;
}

export interface ChampionDef {
  id: string;
  roles: Role[];
  ranged: boolean;
  adGrowth: number;
  projColor: string;
  color: string;
  abilities: AbilityDef[];
  passiveDesc?: string;
  onAttackHit?: (g: any, c: any, t: any) => void;
  onUpdate?: (g: any, c: any, dt: number) => void;
  onAbilityCast?: (g: any, c: any, key: string) => void;
  onDamageDealt?: (g: any, c: any, t: any, amount: number, isAbility: boolean) => void;
  attackMod?: (g: any, c: any, t: any) => { mult?: number; extra?: number; splash?: number };
  levelOrder: number[]; // indices of Q W E preference to max
  build: number[];
  summoners?: [string, string];
}

export interface FX {
  type: 'ring' | 'text' | 'spark' | 'beam' | 'circle' | 'cone' | 'line' | 'warn' | 'burst' | 'click' | 'levelup' | 'gold' | 'slash' | 'nova';
  x: number; y: number;
  x2?: number; y2?: number;
  r?: number;
  t: number; dur: number;
  color?: string;
  text?: string;
  size?: number;
  angle?: number;
  width?: number;
  vy?: number; vx?: number;
  follow?: any;
  team?: Team;
}
