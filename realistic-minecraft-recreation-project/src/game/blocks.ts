import { tileIndex as T } from './tiles';

export type Shape = 'cube' | 'cross' | 'torch' | 'liquid' | 'cactus';
export type SoundType = 'grass' | 'stone' | 'wood' | 'sand' | 'gravel' | 'glass' | 'cloth' | 'snow';
export type Tint = 'grass' | 'foliage' | 'birch' | 'spruce' | null;

export interface BlockDef {
  id: number;
  key: string;
  name: string;
  tex: number[]; // +x,-x,+y,-y,+z,-z
  shape: Shape;
  opaque: boolean; // full cube that hides neighbours + blocks light
  solid: boolean; // collision
  cutout: boolean; // alpha tested
  translucent: boolean; // blended pass
  light: number;
  attenuate: number;
  hardness: number; // seconds by hand, -1 = unbreakable
  sound: SoundType;
  tint: Tint;
  tintTopOnly: boolean;
  drop: number;
  selectable: boolean;
}

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLESTONE: 4, OAK_PLANKS: 5, OAK_LOG: 6, OAK_LEAVES: 7, SAND: 8, GRAVEL: 9,
  WATER: 10, GLASS: 11, BEDROCK: 12, COAL_ORE: 13, IRON_ORE: 14, GOLD_ORE: 15, DIAMOND_ORE: 16, REDSTONE_ORE: 17,
  SNOW_GRASS: 18, SNOW_BLOCK: 19, ICE: 20, CACTUS: 21, BRICKS: 22, BOOKSHELF: 23, CRAFTING_TABLE: 24, FURNACE: 25,
  TNT: 26, OBSIDIAN: 27, GLOWSTONE: 28, WHITE_WOOL: 29, RED_WOOL: 30, BLUE_WOOL: 31, YELLOW_WOOL: 32, GREEN_WOOL: 33,
  BLACK_WOOL: 34, MOSSY_COBBLE: 35, STONE_BRICKS: 36, SANDSTONE: 37, CLAY: 38, PUMPKIN: 39, MELON: 40, BIRCH_LOG: 41,
  BIRCH_LEAVES: 42, SPRUCE_LOG: 43, SPRUCE_LEAVES: 44, SPRUCE_PLANKS: 45, BIRCH_PLANKS: 46, TORCH: 47, POPPY: 48,
  DANDELION: 49, TALL_GRASS: 50, DEAD_BUSH: 51, LAVA: 52, GOLD_BLOCK: 53, IRON_BLOCK: 54, DIAMOND_BLOCK: 55,
  EMERALD_ORE: 56, JACK_O_LANTERN: 57, ORANGE_WOOL: 58, PURPLE_WOOL: 59, CYAN_WOOL: 60, SUGAR_CANE: 61,
  BROWN_MUSHROOM: 62, RED_MUSHROOM: 63, BIRCH_SAPLING: 64,
} as const;

export const BLOCKS: BlockDef[] = [];

function all(t: string) { const i = T(t); return [i, i, i, i, i, i]; }
function tsb(top: string, side: string, bottom: string) { const t = T(top), s = T(side), b = T(bottom); return [s, s, t, b, s, s]; }
function front(top: string, side: string, fr: string, bottom?: string) {
  const t = T(top), s = T(side), f = T(fr), b = T(bottom || top);
  return [s, s, t, b, f, s];
}

function def(id: number, key: string, name: string, tex: number[], o: Partial<BlockDef> = {}) {
  BLOCKS[id] = {
    id, key, name, tex,
    shape: 'cube', opaque: true, solid: true, cutout: false, translucent: false, light: 0, attenuate: 0,
    hardness: 1, sound: 'stone', tint: null, tintTopOnly: false, drop: id, selectable: true,
    ...o,
  };
}

const plant: Partial<BlockDef> = { shape: 'cross', opaque: false, solid: false, cutout: true, hardness: 0, sound: 'grass' };
const leaves: Partial<BlockDef> = { opaque: false, cutout: true, hardness: 0.35, sound: 'grass', attenuate: 1 };

def(0, 'air', '空气', all('stone'), { opaque: false, solid: false, selectable: false, hardness: 0 });
def(B.GRASS, 'grass_block', '草方块', tsb('grass_top', 'grass_side', 'dirt'), { hardness: 0.9, sound: 'grass', tint: 'grass', tintTopOnly: true, drop: B.DIRT });
def(B.DIRT, 'dirt', '泥土', all('dirt'), { hardness: 0.75, sound: 'gravel' });
def(B.STONE, 'stone', '石头', all('stone'), { hardness: 2.2, drop: B.COBBLESTONE });
def(B.COBBLESTONE, 'cobblestone', '圆石', all('cobblestone'), { hardness: 2.6 });
def(B.OAK_PLANKS, 'oak_planks', '橡木木板', all('oak_planks'), { hardness: 2.2, sound: 'wood' });
def(B.OAK_LOG, 'oak_log', '橡木原木', tsb('oak_log_top', 'oak_log', 'oak_log_top'), { hardness: 2.4, sound: 'wood' });
def(B.OAK_LEAVES, 'oak_leaves', '橡树树叶', all('oak_leaves'), { ...leaves, tint: 'foliage' });
def(B.SAND, 'sand', '沙子', all('sand'), { hardness: 0.75, sound: 'sand' });
def(B.GRAVEL, 'gravel', '沙砾', all('gravel'), { hardness: 0.9, sound: 'gravel' });
def(B.WATER, 'water', '水', all('water'), { shape: 'liquid', opaque: false, solid: false, translucent: true, attenuate: 2, hardness: -1, selectable: false, sound: 'sand' });
def(B.GLASS, 'glass', '玻璃', all('glass'), { opaque: false, cutout: true, hardness: 0.45, sound: 'glass', drop: 0 });
def(B.BEDROCK, 'bedrock', '基岩', all('bedrock'), { hardness: -1 });
def(B.COAL_ORE, 'coal_ore', '煤矿石', all('coal_ore'), { hardness: 3 });
def(B.IRON_ORE, 'iron_ore', '铁矿石', all('iron_ore'), { hardness: 3.4 });
def(B.GOLD_ORE, 'gold_ore', '金矿石', all('gold_ore'), { hardness: 3.4 });
def(B.DIAMOND_ORE, 'diamond_ore', '钻石矿石', all('diamond_ore'), { hardness: 4 });
def(B.REDSTONE_ORE, 'redstone_ore', '红石矿石', all('redstone_ore'), { hardness: 3.4 });
def(B.SNOW_GRASS, 'snowy_grass', '雪地草方块', tsb('snow', 'grass_snow_side', 'dirt'), { hardness: 0.9, sound: 'snow', drop: B.DIRT });
def(B.SNOW_BLOCK, 'snow_block', '雪块', all('snow'), { hardness: 0.5, sound: 'snow' });
def(B.ICE, 'ice', '冰', all('ice'), { opaque: false, translucent: true, hardness: 0.6, sound: 'glass', attenuate: 1, drop: 0 });
def(B.CACTUS, 'cactus', '仙人掌', tsb('cactus_top', 'cactus_side', 'cactus_bottom'), { shape: 'cactus', opaque: false, cutout: true, hardness: 0.5, sound: 'cloth' });
def(B.BRICKS, 'bricks', '红砖块', all('bricks'), { hardness: 3 });
def(B.BOOKSHELF, 'bookshelf', '书架', tsb('oak_planks', 'bookshelf', 'oak_planks'), { hardness: 1.5, sound: 'wood' });
def(B.CRAFTING_TABLE, 'crafting_table', '工作台', front('crafting_table_top', 'crafting_table_side', 'crafting_table_front', 'oak_planks'), { hardness: 2.5, sound: 'wood' });
def(B.FURNACE, 'furnace', '熔炉', front('furnace_top', 'furnace_side', 'furnace_front'), { hardness: 3.5 });
def(B.TNT, 'tnt', 'TNT', tsb('tnt_top', 'tnt_side', 'tnt_bottom'), { hardness: 0, sound: 'grass' });
def(B.OBSIDIAN, 'obsidian', '黑曜石', all('obsidian'), { hardness: 12 });
def(B.GLOWSTONE, 'glowstone', '荧石', all('glowstone'), { hardness: 0.45, sound: 'glass', light: 15 });
def(B.WHITE_WOOL, 'white_wool', '白色羊毛', all('wool_white'), { hardness: 1.2, sound: 'cloth' });
def(B.RED_WOOL, 'red_wool', '红色羊毛', all('wool_red'), { hardness: 1.2, sound: 'cloth' });
def(B.BLUE_WOOL, 'blue_wool', '蓝色羊毛', all('wool_blue'), { hardness: 1.2, sound: 'cloth' });
def(B.YELLOW_WOOL, 'yellow_wool', '黄色羊毛', all('wool_yellow'), { hardness: 1.2, sound: 'cloth' });
def(B.GREEN_WOOL, 'green_wool', '绿色羊毛', all('wool_green'), { hardness: 1.2, sound: 'cloth' });
def(B.BLACK_WOOL, 'black_wool', '黑色羊毛', all('wool_black'), { hardness: 1.2, sound: 'cloth' });
def(B.MOSSY_COBBLE, 'mossy_cobblestone', '苔石', all('mossy_cobblestone'), { hardness: 2.6 });
def(B.STONE_BRICKS, 'stone_bricks', '石砖', all('stone_bricks'), { hardness: 2.2 });
def(B.SANDSTONE, 'sandstone', '砂岩', tsb('sandstone_top', 'sandstone_side', 'sandstone_bottom'), { hardness: 1.2 });
def(B.CLAY, 'clay', '黏土块', all('clay'), { hardness: 0.9, sound: 'gravel' });
def(B.PUMPKIN, 'pumpkin', '南瓜', front('pumpkin_top', 'pumpkin_side', 'pumpkin_face', 'pumpkin_top'), { hardness: 1.5, sound: 'wood' });
def(B.MELON, 'melon', '西瓜', tsb('melon_top', 'melon_side', 'melon_top'), { hardness: 1.5, sound: 'wood' });
def(B.BIRCH_LOG, 'birch_log', '白桦原木', tsb('birch_log_top', 'birch_log', 'birch_log_top'), { hardness: 2.4, sound: 'wood' });
def(B.BIRCH_LEAVES, 'birch_leaves', '白桦树叶', all('birch_leaves'), { ...leaves, tint: 'birch' });
def(B.SPRUCE_LOG, 'spruce_log', '云杉原木', tsb('spruce_log_top', 'spruce_log', 'spruce_log_top'), { hardness: 2.4, sound: 'wood' });
def(B.SPRUCE_LEAVES, 'spruce_leaves', '云杉树叶', all('spruce_leaves'), { ...leaves, tint: 'spruce' });
def(B.SPRUCE_PLANKS, 'spruce_planks', '云杉木板', all('spruce_planks'), { hardness: 2.2, sound: 'wood' });
def(B.BIRCH_PLANKS, 'birch_planks', '白桦木板', all('birch_planks'), { hardness: 2.2, sound: 'wood' });
def(B.TORCH, 'torch', '火把', all('torch'), { shape: 'torch', opaque: false, solid: false, cutout: true, hardness: 0, light: 14, sound: 'wood' });
def(B.POPPY, 'poppy', '虞美人', all('poppy'), plant);
def(B.DANDELION, 'dandelion', '蒲公英', all('dandelion'), plant);
def(B.TALL_GRASS, 'short_grass', '草', all('tall_grass'), { ...plant, tint: 'grass', drop: 0 });
def(B.DEAD_BUSH, 'dead_bush', '枯萎的灌木', all('dead_bush'), { ...plant, drop: 0 });
def(B.LAVA, 'lava', '熔岩', all('lava'), { shape: 'liquid', opaque: false, solid: false, light: 15, hardness: -1, selectable: false, sound: 'sand' });
def(B.GOLD_BLOCK, 'gold_block', '金块', all('gold_block'), { hardness: 3 });
def(B.IRON_BLOCK, 'iron_block', '铁块', all('iron_block'), { hardness: 4 });
def(B.DIAMOND_BLOCK, 'diamond_block', '钻石块', all('diamond_block'), { hardness: 4 });
def(B.EMERALD_ORE, 'emerald_ore', '绿宝石矿石', all('emerald_ore'), { hardness: 3.4 });
def(B.JACK_O_LANTERN, 'jack_o_lantern', '南瓜灯', front('pumpkin_top', 'pumpkin_side', 'jack_face', 'pumpkin_top'), { hardness: 1.5, sound: 'wood', light: 15 });
def(B.ORANGE_WOOL, 'orange_wool', '橙色羊毛', all('wool_orange'), { hardness: 1.2, sound: 'cloth' });
def(B.PURPLE_WOOL, 'purple_wool', '紫色羊毛', all('wool_purple'), { hardness: 1.2, sound: 'cloth' });
def(B.CYAN_WOOL, 'cyan_wool', '青色羊毛', all('wool_cyan'), { hardness: 1.2, sound: 'cloth' });
def(B.SUGAR_CANE, 'sugar_cane', '甘蔗', all('sugar_cane'), plant);
def(B.BROWN_MUSHROOM, 'brown_mushroom', '棕色蘑菇', all('brown_mushroom'), { ...plant, light: 1 });
def(B.RED_MUSHROOM, 'red_mushroom', '红色蘑菇', all('red_mushroom'), plant);
def(B.BIRCH_SAPLING, 'oak_sapling', '橡树树苗', all('sapling'), plant);

export const NUM_BLOCKS = BLOCKS.length;

// quick lookup tables
export const OPAQUE = new Uint8Array(256);
export const SOLID = new Uint8Array(256);
export const EMIT = new Uint8Array(256);
export const ATTEN = new Uint8Array(256);
for (const b of BLOCKS) {
  if (!b) continue;
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  SOLID[b.id] = b.solid ? 1 : 0;
  EMIT[b.id] = b.light;
  ATTEN[b.id] = b.attenuate;
}

export const CREATIVE_ORDER: number[] = [
  B.GRASS, B.DIRT, B.STONE, B.COBBLESTONE, B.MOSSY_COBBLE, B.STONE_BRICKS, B.BRICKS, B.BEDROCK, B.OBSIDIAN,
  B.OAK_LOG, B.BIRCH_LOG, B.SPRUCE_LOG, B.OAK_PLANKS, B.BIRCH_PLANKS, B.SPRUCE_PLANKS, B.OAK_LEAVES, B.BIRCH_LEAVES, B.SPRUCE_LEAVES,
  B.SAND, B.SANDSTONE, B.GRAVEL, B.CLAY, B.SNOW_GRASS, B.SNOW_BLOCK, B.ICE, B.GLASS, B.GLOWSTONE,
  B.COAL_ORE, B.IRON_ORE, B.GOLD_ORE, B.REDSTONE_ORE, B.DIAMOND_ORE, B.EMERALD_ORE, B.IRON_BLOCK, B.GOLD_BLOCK, B.DIAMOND_BLOCK,
  B.WHITE_WOOL, B.ORANGE_WOOL, B.YELLOW_WOOL, B.GREEN_WOOL, B.CYAN_WOOL, B.BLUE_WOOL, B.PURPLE_WOOL, B.RED_WOOL, B.BLACK_WOOL,
  B.CRAFTING_TABLE, B.FURNACE, B.BOOKSHELF, B.TNT, B.PUMPKIN, B.JACK_O_LANTERN, B.MELON, B.CACTUS, B.TORCH,
  B.POPPY, B.DANDELION, B.TALL_GRASS, B.DEAD_BUSH, B.SUGAR_CANE, B.BROWN_MUSHROOM, B.RED_MUSHROOM, B.BIRCH_SAPLING,
];

export function isPlant(id: number) {
  const s = BLOCKS[id]?.shape;
  return s === 'cross' || s === 'torch';
}
