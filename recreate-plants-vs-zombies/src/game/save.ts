import { LEVELS, type PlantType, PLANT_ORDER } from './data';

const KEY = 'pvz-web-progress';

export function getProgress(): number {
  const v = Number(localStorage.getItem(KEY) ?? '0');
  return isNaN(v) ? 0 : Math.min(v, LEVELS.length);
}

export function completeLevel(index: number) {
  const p = getProgress();
  if (index + 1 > p) localStorage.setItem(KEY, String(index + 1));
}

export function unlockedPlants(): PlantType[] {
  const p = getProgress();
  if (p >= LEVELS.length) return PLANT_ORDER;
  return LEVELS[Math.min(p, LEVELS.length - 1)].plants;
}

export function resetProgress() {
  localStorage.setItem(KEY, '0');
}
