import type { GameMode, SaveData, Settings } from './engine';
import { DEFAULT_SETTINGS } from './engine';

export interface WorldMeta { id: string; name: string; seed: number; mode: GameMode; created: number; lastPlayed: number; }

const LIST = 'mcreact_worlds';
const SET = 'mcreact_settings';

export function listWorlds(): WorldMeta[] {
  try { return (JSON.parse(localStorage.getItem(LIST) || '[]') as WorldMeta[]).sort((a, b) => b.lastPlayed - a.lastPlayed); } catch { return []; }
}
function writeList(l: WorldMeta[]) { try { localStorage.setItem(LIST, JSON.stringify(l)); } catch { /* quota */ } }

export function upsertWorld(meta: WorldMeta) {
  const l = listWorlds().filter((w) => w.id !== meta.id);
  l.push(meta);
  writeList(l);
}

export function saveWorldData(id: string, data: SaveData): boolean {
  try { localStorage.setItem('mcreact_world_' + id, JSON.stringify(data)); return true; } catch { return false; }
}
export function loadWorldData(id: string): SaveData | null {
  try { const s = localStorage.getItem('mcreact_world_' + id); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function deleteWorld(id: string) {
  writeList(listWorlds().filter((w) => w.id !== id));
  try { localStorage.removeItem('mcreact_world_' + id); } catch { /* */ }
}

export function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SET) || '{}') }; } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(s: Settings) { try { localStorage.setItem(SET, JSON.stringify(s)); } catch { /* */ } }
