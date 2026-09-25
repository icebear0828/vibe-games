export const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
export const chance = (p: number) => Math.random() < p;
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = <T,>(arr: T[]): T[] => {
  const a = arr;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, (window as any).__fast ? 1 : ms));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const weighted = <T,>(items: [T, number][]): T => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [it, w] of items) {
    r -= w;
    if (r <= 0) return it;
  }
  return items[items.length - 1][0];
};
