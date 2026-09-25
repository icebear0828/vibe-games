import { DD_VERSION, DD_CHAMPIONS, DD_SUMMONERS } from './dd';

const CDN = 'https://ddragon.leagueoflegends.com/cdn';
export const champIcon = (id: string) => `${CDN}/${DD_VERSION}/img/champion/${id}.png`;
export const spellIcon = (id: string, slot: number) => `${CDN}/${DD_VERSION}/img/spell/${DD_CHAMPIONS[id].spells[slot].image}`;
export const passiveIcon = (id: string) => `${CDN}/${DD_VERSION}/img/passive/${DD_CHAMPIONS[id].passive.image}`;
export const summIcon = (s: string) => `${CDN}/${DD_VERSION}/img/spell/${DD_SUMMONERS[s]?.image || s + '.png'}`;
export const splashArt = (id: string) => `${CDN}/img/champion/splash/${id}_0.jpg`;
export const loadingArt = (id: string) => `${CDN}/img/champion/loading/${id}_0.jpg`;
export const centeredArt = (id: string) => `${CDN}/img/champion/centered/${id}_0.jpg`;

const cache = new Map<string, HTMLImageElement>();
export function img(url: string): HTMLImageElement {
  let i = cache.get(url);
  if (!i) {
    i = new Image();
    i.crossOrigin = 'anonymous';
    i.src = url;
    cache.set(url, i);
  }
  return i;
}
export const ready = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
export function preloadChamps(ids: string[]) { for (const id of ids) { img(champIcon(id)); for (let s = 0; s < 4; s++) img(spellIcon(id, s)); } }
