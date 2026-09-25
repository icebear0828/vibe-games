export const TILE_NAMES = [
  'grass_top', 'grass_side', 'dirt', 'stone', 'cobblestone', 'oak_planks', 'oak_log', 'oak_log_top', 'oak_leaves', 'sand',
  'gravel', 'water', 'glass', 'bedrock', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'redstone_ore', 'emerald_ore',
  'snow', 'grass_snow_side', 'ice', 'cactus_side', 'cactus_top', 'cactus_bottom', 'bricks', 'bookshelf', 'crafting_table_top',
  'crafting_table_side', 'crafting_table_front', 'furnace_front', 'furnace_side', 'furnace_top', 'tnt_side', 'tnt_top',
  'tnt_bottom', 'obsidian', 'glowstone', 'wool_white', 'wool_red', 'wool_blue', 'wool_yellow', 'wool_green', 'wool_black',
  'wool_orange', 'wool_purple', 'wool_cyan', 'mossy_cobblestone', 'stone_bricks', 'sandstone_side', 'sandstone_top',
  'sandstone_bottom', 'clay', 'pumpkin_side', 'pumpkin_top', 'pumpkin_face', 'jack_face', 'melon_side', 'melon_top',
  'birch_log', 'birch_log_top', 'birch_leaves', 'spruce_log', 'spruce_log_top', 'spruce_leaves', 'spruce_planks',
  'birch_planks', 'torch', 'poppy', 'dandelion', 'tall_grass', 'dead_bush', 'lava', 'gold_block', 'iron_block',
  'diamond_block', 'sugar_cane', 'brown_mushroom', 'red_mushroom', 'sapling',
  'destroy_0', 'destroy_1', 'destroy_2', 'destroy_3', 'destroy_4', 'destroy_5', 'destroy_6', 'destroy_7', 'destroy_8', 'destroy_9',
];

const map = new Map<string, number>();
TILE_NAMES.forEach((n, i) => map.set(n, i));

export function tileIndex(name: string): number {
  const i = map.get(name);
  if (i === undefined) throw new Error('Unknown tile ' + name);
  return i;
}

export const ATLAS_COLS = 16;
export const TILE_PX = 16;
export const ATLAS_PX = ATLAS_COLS * TILE_PX;

export function tileUV(i: number): [number, number, number, number] {
  const cx = i % ATLAS_COLS, cy = Math.floor(i / ATLAS_COLS);
  const e = 0.0005;
  const u0 = cx / ATLAS_COLS + e, u1 = (cx + 1) / ATLAS_COLS - e;
  // canvas row 0 is at the top => flipY texture: v = 1 - row
  const v1 = 1 - cy / ATLAS_COLS - e, v0 = 1 - (cy + 1) / ATLAS_COLS + e;
  return [u0, v0, u1, v1];
}
