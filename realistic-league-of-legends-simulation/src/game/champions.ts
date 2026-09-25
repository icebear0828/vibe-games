import type { ChampionDef, AbilityDef } from './types';

const L = (a: number[], l: number) => a[Math.max(0, Math.min(a.length - 1, l - 1))];
const ang = (c: any, t: { x: number; y: number }) => Math.atan2(t.y - c.y, t.x - c.x);
const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
const clampTo = (c: any, t: { x: number; y: number }, r: number) => {
  const d = dist(c, t);
  if (d <= r) return { x: t.x, y: t.y };
  const a = ang(c, t);
  return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
};

// ---------------- 盖伦 ----------------
const Garen: ChampionDef = {
  id: 'Garen', roles: ['top'], ranged: false, adGrowth: 4.5, projColor: '#fff', color: '#d8c27a',
  levelOrder: [2, 0, 1], build: [1055, 2003, 3047, 3078, 3053, 3065, 3143, 3026],
  onUpdate(g, c, dt) {
    if (g.time - c.lastCombat > 8 && c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.015 * dt);
  },
  abilities: [
    { key: 'Q', cd: [8, 8, 8, 8, 8], cost: [0, 0, 0, 0, 0], range: 0, target: 'self', ai: 'engage',
      cast(g, c, _t, l) {
        g.cleanse(c, true);
        g.addBuff(c, { id: 'garenQms', name: '致命打击', dur: 0.65 + l * 0.35, ms: 0.35 });
        g.addBuff(c, { id: 'garenQ', name: '致命打击', dur: 4.5, consume: true, onHit: (g2: any, o: any, t: any) => {
          g2.dmg(o, t, L([30, 60, 90, 120, 150], l) + 0.5 * o.st.ad, 'physical', { ability: true });
          if (t.kind === 'champion') g2.cc(t, 'silence', 1.5, o);
          g2.fxPush({ type: 'slash', x: t.x, y: t.y, t: 0, dur: 0.35, color: '#ffe680', r: 110, angle: g2.rand() * 6 });
        } });
        g.resetAttack(c);
      } },
    { key: 'W', cd: [23, 21, 19, 17, 15], cost: [0, 0, 0, 0, 0], range: 0, target: 'self', ai: 'combat',
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'garenW', name: '勇气', dur: 1.5 + l * 0.5, dr: 0.3 });
        g.addShield(c, 70 + 25 * (l - 1) + 0.18 * c.st.bonusHp, 0.75, 'garenW');
        g.fxPush({ type: 'ring', x: c.x, y: c.y, r: 90, t: 0, dur: 0.6, color: '#ffe9a0', follow: c });
      } },
    { key: 'E', cd: [9, 8.25, 7.5, 6.75, 6], cost: [0, 0, 0, 0, 0], range: 0, target: 'self', radius: 325, ai: 'combat', aiFarm: true,
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'garenE', name: '审判', dur: 3, noAttack: true });
        g.zone({ x: c.x, y: c.y, r: 325, dur: 3, owner: c, follow: c, style: 'spin', color: '#ffd76a', tick: 0.375,
          onTick(g2: any, z: any) {
            for (const e of g2.enemiesNear(c.team, c.x, c.y, 325)) g2.dmg(c, e, L([6, 10, 14, 18, 22], l) + 0.33 * c.st.ad, 'physical', { ability: true, aoe: true });
          } });
      } },
    { key: 'R', cd: [120, 100, 80], cost: [0, 0, 0], range: 400, target: 'unit', ai: 'execute',
      cast(g, c, t, l) {
        const u = t.unit; if (!u || u.kind !== 'champion') return false;
        g.fxPush({ type: 'beam', x: u.x, y: u.y - 700, x2: u.x, y2: u.y, t: 0, dur: 0.6, color: '#ffe066', width: 60 });
        g.fxPush({ type: 'nova', x: u.x, y: u.y, r: 200, t: 0, dur: 0.5, color: '#fff2a8' });
        g.after(0.25, () => g.dmg(c, u, L([150, 300, 450], l) + L([0.25, 0.3, 0.35], l) * (u.maxHp - u.hp), 'true', { ability: true }));
      } },
  ],
};

// ---------------- 德莱厄斯 ----------------
function bleed(g: any, c: any, t: any) {
  if (t.kind === 'turret' || t.kind === 'inhib' || t.kind === 'nexus') return;
  const b = g.hasBuff(t, 'hemo');
  const stacks = Math.min(5, (b ? b.stacks : 0) + 1);
  g.addBuff(t, { id: 'hemo', name: '出血', dur: 5, debuff: true, stacks, dotType: 'physical', src: c,
    dot: stacks * (13 + c.level * 1.2 + 0.3 * c.st.bonusAd) / 5 });
  if (stacks === 5 && t.kind === 'champion') {
    g.addBuff(c, { id: 'noxmight', name: '诺克萨斯之力', dur: 5, ad: 30 + c.level * 5 });
  }
}
const Darius: ChampionDef = {
  id: 'Darius', roles: ['top'], ranged: false, adGrowth: 5, projColor: '#fff', color: '#b3322b',
  levelOrder: [0, 2, 1], build: [1054, 2003, 3047, 3071, 3053, 3065, 3143, 3026],
  onAttackHit: (g, c, t) => bleed(g, c, t),
  abilities: [
    { key: 'Q', cd: [9, 8, 7, 6, 5], cost: [30, 35, 40, 45, 50], range: 0, radius: 425, target: 'self', ai: 'harass', aiFarm: true,
      cast(g, c, _t, l) {
        g.fxPush({ type: 'warn', x: c.x, y: c.y, r: 425, t: 0, dur: 0.75, color: '#ff4030', follow: c });
        g.addBuff(c, { id: 'dariusQ', dur: 0.75, noAttack: true, hidden: true });
        g.after(0.75, () => {
          if (!c.alive) return;
          let heals = 0;
          g.fxPush({ type: 'slash', x: c.x, y: c.y, r: 425, t: 0, dur: 0.4, color: '#ff5040', angle: 0, size: 2 });
          for (const e of g.enemiesNear(c.team, c.x, c.y, 425)) {
            const outer = dist(c, e) > 205;
            const d = L([50, 80, 110, 140, 170], l) + L([1, 1.1, 1.2, 1.3, 1.4], l) * c.st.ad;
            g.dmg(c, e, outer ? d : d * 0.35, 'physical', { ability: true, aoe: true });
            if (outer) { bleed(g, c, e); if (e.kind === 'champion' && heals < 3) heals++; }
          }
          if (heals) g.heal(c, (c.maxHp - c.hp) * 0.13 * heals);
        });
      } },
    { key: 'W', cd: [7, 6.5, 6, 5.5, 5], cost: [30, 30, 30, 30, 30], range: 0, target: 'self', ai: 'combat',
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'dariusW', name: '致残打击', dur: 4, consume: true, onHit: (g2: any, o: any, t: any) => {
          g2.dmg(o, t, o.st.ad * (0.4 + 0.05 * (l - 1)), 'physical', { ability: true });
          g2.cc(t, 'slow', 1, o, 0.9);
        } });
        g.resetAttack(c);
      } },
    { key: 'E', cd: [24, 21, 18, 15, 12], cost: [45, 45, 45, 45, 45], range: 535, target: 'skillshot', ai: 'engage',
      cast(g, c, t) {
        const a = ang(c, t);
        g.fxPush({ type: 'cone', x: c.x, y: c.y, r: 535, angle: a, width: 0.45, t: 0, dur: 0.4, color: '#ff4b3a' });
        for (const e of g.cone(c, a, 535, 0.45)) {
          if (e.kind === 'monster' && (e.mtype === 'dragon' || e.mtype === 'baron')) continue;
          const px = c.x + Math.cos(a) * 140, py = c.y + Math.sin(a) * 140;
          g.dash(e, px, py, 1500, null, { forced: true });
          g.cc(e, 'slow', 1, c, 0.4);
        }
      } },
    { key: 'R', cd: [120, 100, 80], cost: [100, 100, 0], range: 460, target: 'unit', ai: 'execute',
      cast(g, c, t, l) {
        const u = t.unit; if (!u || u.kind !== 'champion') return false;
        g.dash(c, u.x, u.y, 1800, () => {
          const b = g.hasBuff(u, 'hemo');
          const d = (L([125, 250, 375], l) + 0.75 * c.st.bonusAd) * (1 + 0.2 * (b ? b.stacks : 0));
          g.fxPush({ type: 'beam', x: u.x, y: u.y - 500, x2: u.x, y2: u.y, t: 0, dur: 0.5, color: '#ff2020', width: 50 });
          const killed = g.dmg(c, u, d, 'true', { ability: true, returnKill: true });
          if (killed === 'kill') { c.cds[3] = 0; g.floatText(c, '重置!', '#ff4040'); }
        }, { stopDist: 150 });
      } },
  ],
};

// ---------------- 墨菲特 ----------------
const Malphite: ChampionDef = {
  id: 'Malphite', roles: ['top', 'support'], ranged: false, adGrowth: 4, projColor: '#fff', color: '#8a7b6b',
  levelOrder: [0, 2, 1], build: [1054, 2003, 3047, 3068, 3075, 3110, 3065, 3083],
  onUpdate(g, c) {
    if (g.time - c.lastDamaged > 10 && !c.shields.some((s: any) => s.id === 'granite')) g.addShield(c, c.maxHp * 0.1, 9999, 'granite');
  },
  abilities: [
    { key: 'Q', cd: [8, 8, 8, 8, 8], cost: [70, 75, 80, 85, 90], range: 625, target: 'unit', ai: 'harass',
      cast(g, c, t, l) {
        const u = t.unit; if (!u) return false;
        g.homing({ owner: c, target: u, speed: 1200, color: '#c6a27a', size: 18, style: 'rock', onHit: (g2: any, tg: any) => {
          g2.dmg(c, tg, L([70, 120, 170, 220, 270], l) + 0.6 * c.st.ap, 'magic', { ability: true });
          g2.cc(tg, 'slow', 4, c, L([0.2, 0.25, 0.3, 0.35, 0.4], l));
          g2.addBuff(c, { id: 'malphQ', name: '地震碎片', dur: 4, ms: L([0.2, 0.25, 0.3, 0.35, 0.4], l) });
        } });
      } },
    { key: 'W', cd: [12, 11.5, 11, 10.5, 10], cost: [30, 30, 30, 30, 30], range: 0, target: 'self', ai: 'combat',
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'malphW', name: '雷霆拍击', dur: 6, stacks: 3, armor: 10 + 5 * l, onHit: (g2: any, o: any, t: any) => {
          for (const e of g2.enemiesNear(o.team, t.x, t.y, 225)) g2.dmg(o, e, L([30, 45, 60, 75, 90], l) + 0.2 * o.st.ap + 0.15 * o.st.armor, 'physical', { ability: true, aoe: true });
          g2.fxPush({ type: 'nova', x: t.x, y: t.y, r: 225, t: 0, dur: 0.35, color: '#e0b070' });
          const b = g2.hasBuff(o, 'malphW'); if (b) { b.stacks--; if (b.stacks <= 0) g2.removeBuff(o, 'malphW'); }
        } });
        g.resetAttack(c);
      } },
    { key: 'E', cd: [7, 6.5, 6, 5.5, 5], cost: [50, 55, 60, 65, 70], range: 0, radius: 400, target: 'self', ai: 'harass', aiFarm: true,
      cast(g, c, _t, l) {
        g.fxPush({ type: 'nova', x: c.x, y: c.y, r: 400, t: 0, dur: 0.5, color: '#b08850' });
        for (const e of g.enemiesNear(c.team, c.x, c.y, 400)) {
          g.dmg(c, e, L([60, 95, 130, 165, 200], l) + 0.6 * c.st.ap + 0.4 * c.st.armor, 'magic', { ability: true, aoe: true });
          g.addBuff(e, { id: 'malphE', name: '攻速降低', dur: 3, as: -0.3, debuff: true });
        }
      } },
    { key: 'R', cd: [130, 105, 80], cost: [100, 100, 100], range: 1000, radius: 325, target: 'ground', ai: 'engage',
      cast(g, c, t, l) {
        const p = clampTo(c, t, 1000);
        g.dash(c, p.x, p.y, 1835, () => {
          g.fxPush({ type: 'nova', x: c.x, y: c.y, r: 325, t: 0, dur: 0.6, color: '#ff9a3a' });
          g.shake(12);
          for (const e of g.enemiesNear(c.team, c.x, c.y, 325)) {
            g.dmg(c, e, L([200, 300, 400], l) + 0.9 * c.st.ap, 'magic', { ability: true, aoe: true });
            g.cc(e, 'knockup', 1.5, c);
          }
        }, { unstoppable: true });
      } },
  ],
};

// ---------------- 易 ----------------
const MasterYi: ChampionDef = {
  id: 'MasterYi', roles: ['jungle'], ranged: false, adGrowth: 2.2, projColor: '#fff', color: '#e6d34a',
  levelOrder: [0, 2, 1], build: [1055, 2003, 3006, 3153, 3124, 3031, 3072, 3026],
  onAttackHit(g, c, t) {
    c.data.yiP = (c.data.yiP || 0) + 1;
    if (c.data.yiP >= 4) { c.data.yiP = 0; g.after(0.12, () => { if (t.alive) g.dmg(c, t, c.st.ad * 0.5, 'physical', { attack: true }); g.fxPush({ type: 'slash', x: t.x, y: t.y, r: 90, t: 0, dur: 0.25, color: '#fff27a', angle: 1 }); }); }
    const e = g.hasBuff(c, 'yiE');
    if (e) g.dmg(c, t, L([30, 35, 40, 45, 50], e.data) + 0.3 * c.st.bonusAd, 'true', {});
  },
  abilities: [
    { key: 'Q', cd: [20, 19, 18, 17, 16], cost: [50, 55, 60, 65, 70], range: 600, target: 'unit', ai: 'engage', aiFarm: true,
      cast(g, c, t, l) {
        const u = t.unit; if (!u) return false;
        g.addBuff(c, { id: 'yiQ', name: '阿尔法突袭', dur: 0.95, untargetable: true, root: true, noAttack: true, hidden: true });
        c.invisible = true;
        const targets = [u, ...g.enemiesNear(c.team, u.x, u.y, 600).filter((e: any) => e !== u)].slice(0, 4);
        targets.forEach((e: any, i: number) => g.after(0.2 * i + 0.05, () => {
          if (!e.alive) return;
          g.blink(c, e.x + 60, e.y + 40, true);
          g.fxPush({ type: 'slash', x: e.x, y: e.y, r: 130, t: 0, dur: 0.3, color: '#b6ff6a', angle: i });
          g.dmg(c, e, L([30, 60, 90, 120, 150], l) + 0.5 * c.st.ad + (e.kind === 'minion' ? 50 : 0), 'physical', { ability: true });
        }));
        g.after(0.9, () => { c.invisible = false; if (u.alive) { g.blink(c, u.x - 90, u.y, true); c.target = u; } });
      } },
    { key: 'W', cd: [28, 28, 28, 28, 28], cost: [50, 50, 50, 50, 50], range: 0, target: 'self', ai: 'heal',
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'yiW', name: '冥想', dur: 4, root: true, noAttack: true, dr: 0.45, hot: L([30, 50, 70, 90, 110], l) + 0.3 * c.st.ap + (c.maxHp - c.hp) * 0.01, data: { channel: true } });
        c.target = null; c.path = [];
        g.fxPush({ type: 'ring', x: c.x, y: c.y, r: 100, t: 0, dur: 4, color: '#9dff7a', follow: c });
      } },
    { key: 'E', cd: [14, 13, 12, 11, 10], cost: [0, 0, 0, 0, 0], range: 0, target: 'self', ai: 'combat',
      cast(g, c, _t, l) { g.addBuff(c, { id: 'yiE', name: '无极剑道', dur: 5, data: l }); } },
    { key: 'R', cd: [85, 85, 85], cost: [100, 100, 100], range: 0, target: 'self', ai: 'engage',
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'yiR', name: '高原血统', dur: 7, ms: L([0.25, 0.35, 0.45], l), as: L([0.3, 0.45, 0.6], l), slowImmune: true });
        g.cleanse(c, true);
      } },
  ],
};

// ---------------- 阿木木 ----------------
const Amumu: ChampionDef = {
  id: 'Amumu', roles: ['jungle', 'support'], ranged: false, adGrowth: 3.8, projColor: '#fff', color: '#5aa37a',
  levelOrder: [2, 0, 1], build: [1054, 2003, 3047, 3068, 3075, 3110, 3065, 3083],
  onUpdate(g, c, dt) {
    if (c.data.aura) {
      c.mana -= 8 * dt;
      if (c.mana <= 0) { c.mana = 0; c.data.aura = false; }
      c.data.auraT = (c.data.auraT || 0) + dt;
      if (c.data.auraT >= 0.5) {
        c.data.auraT = 0;
        const l = c.abil[1];
        for (const e of g.enemiesNear(c.team, c.x, c.y, 330)) g.dmg(c, e, (6 + 2 * l + (0.0075 + 0.00125 * l) * e.maxHp + 0.005 * c.st.ap) * (e.kind === 'monster' ? 1.5 : 1), 'magic', { ability: true, aoe: true, noProc: true });
      }
    }
  },
  abilities: [
    { key: 'Q', cd: [12, 11.5, 11, 10.5, 10], cost: [70, 70, 70, 70, 70], range: 1100, width: 80, target: 'skillshot', ai: 'engage',
      cast(g, c, t, l) {
        g.skillshot({ owner: c, angle: ang(c, t), speed: 2000, range: 1100, width: 80, color: '#e8dcb0', style: 'hook', onHit(g2: any, u: any) {
          g2.dmg(c, u, L([70, 95, 120, 145, 170], l) + 0.85 * c.st.ap, 'magic', { ability: true });
          g2.cc(u, 'stun', 1, c);
          g2.dash(c, u.x, u.y, 1600, null, { stopDist: 90 });
        } });
      } },
    { key: 'W', cd: [1, 1, 1, 1, 1], cost: [8, 8, 8, 8, 8], range: 0, radius: 330, target: 'self', ai: 'combat',
      cast(g, c) { c.data.aura = !c.data.aura; } },
    { key: 'E', cd: [9, 8, 7, 6, 5], cost: [35, 35, 35, 35, 35], range: 0, radius: 350, target: 'self', ai: 'harass', aiFarm: true,
      cast(g, c, _t, l) {
        g.fxPush({ type: 'nova', x: c.x, y: c.y, r: 350, t: 0, dur: 0.45, color: '#9be07a' });
        for (const e of g.enemiesNear(c.team, c.x, c.y, 350)) g.dmg(c, e, L([65, 95, 125, 155, 185], l) + 0.5 * c.st.ap + 0.03 * c.st.bonusHp, 'magic', { ability: true, aoe: true });
      } },
    { key: 'R', cd: [150, 125, 100], cost: [100, 150, 200], range: 0, radius: 550, target: 'self', ai: 'engage',
      cast(g, c, _t, l) {
        g.fxPush({ type: 'nova', x: c.x, y: c.y, r: 550, t: 0, dur: 0.8, color: '#6ee08a' });
        g.shake(8);
        for (const e of g.enemiesNear(c.team, c.x, c.y, 550)) {
          g.fxPush({ type: 'line', x: c.x, y: c.y, x2: e.x, y2: e.y, t: 0, dur: 0.8, color: '#e8dcb0', width: 6 });
          g.dmg(c, e, L([200, 300, 400], l) + 0.8 * c.st.ap, 'magic', { ability: true, aoe: true });
          g.cc(e, 'stun', 1.5, c);
        }
      } },
  ],
};

// ---------------- 拉克丝 ----------------
const luxMark = (g: any, c: any, u: any) => g.addBuff(u, { id: 'luxMark', name: '光芒四射', dur: 6, debuff: true, src: c });
const Lux: ChampionDef = {
  id: 'Lux', roles: ['mid', 'support'], ranged: true, adGrowth: 3.3, projColor: '#fff8b0', color: '#f5e27a',
  levelOrder: [2, 0, 1], build: [1056, 2003, 3020, 3100, 3089, 3135, 3157, 3165],
  onAttackHit(g, c, t) {
    if (g.hasBuff(t, 'luxMark')) { g.removeBuff(t, 'luxMark'); g.dmg(c, t, 20 + 10 * c.level + 0.2 * c.st.ap, 'magic', {}); g.fxPush({ type: 'burst', x: t.x, y: t.y, r: 60, t: 0, dur: 0.3, color: '#fff27a' }); }
  },
  abilities: [
    { key: 'Q', cd: [11, 10.5, 10, 9.5, 9], cost: [50, 50, 50, 50, 50], range: 1240, width: 70, target: 'skillshot', ai: 'harass',
      cast(g, c, t, l) {
        g.skillshot({ owner: c, angle: ang(c, t), speed: 1200, range: 1240, width: 70, color: '#fff6a0', style: 'orb', maxHits: 2, onHit(g2: any, u: any) {
          g2.dmg(c, u, L([80, 120, 160, 200, 240], l) + 0.6 * c.st.ap, 'magic', { ability: true });
          g2.cc(u, 'root', 2, c); luxMark(g2, c, u);
        } });
      } },
    { key: 'W', cd: [14, 13, 12, 11, 10], cost: [60, 60, 60, 60, 60], range: 1175, target: 'skillshot', ai: 'combat',
      cast(g, c, t, l) {
        const a = ang(c, t), amt = L([40, 55, 70, 85, 100], l) + 0.35 * c.st.ap;
        g.skillshot({ owner: c, angle: a, speed: 1400, range: 1175, width: 110, color: '#b6e8ff', style: 'wave', ally: true, returns: true, onHit(g2: any, u: any) { g2.addShield(u, amt, 2.5, 'luxW'); } });
        g.addShield(c, amt, 2.5, 'luxW');
      } },
    { key: 'E', cd: [10, 9.5, 9, 8.5, 8], cost: [70, 80, 90, 100, 110], range: 1100, radius: 310, target: 'ground', ai: 'harass', aiFarm: true,
      recast(g, c) {
        const z = c.data.luxE;
        if (z && z.alive) { z.detonate(); return true; }
        return false;
      },
      cast(g, c, t, l) {
        const p = clampTo(c, t, 1100);
        g.homing({ owner: c, targetPos: p, speed: 1300, color: '#fff38a', size: 16, style: 'orb', onHit: () => {
          const z = g.zone({ x: p.x, y: p.y, r: 310, dur: 5, owner: c, color: '#fff38a', style: 'light', tick: 0.25,
            onTick(g2: any, zz: any) {
              const es = g2.enemiesNear(c.team, zz.x, zz.y, 310);
              for (const e of es) g2.cc(e, 'slow', 0.3, c, L([0.25, 0.3, 0.35, 0.4, 0.45], l));
              if (!c.isPlayer && zz.age > 0.5 && es.some((e: any) => e.kind === 'champion')) zz.detonate();
              if (!c.isPlayer && zz.age > 1.2 && es.length >= 3) zz.detonate();
            },
            onEnd(g2: any, zz: any) {
              g2.fxPush({ type: 'nova', x: zz.x, y: zz.y, r: 310, t: 0, dur: 0.45, color: '#fff9c0' });
              for (const e of g2.enemiesNear(c.team, zz.x, zz.y, 310)) { g2.dmg(c, e, L([65, 115, 165, 215, 265], l) + 0.8 * c.st.ap, 'magic', { ability: true, aoe: true }); luxMark(g2, c, e); }
            } });
          c.data.luxE = z;
        } });
      } },
    { key: 'R', cd: [80, 60, 40], cost: [100, 100, 100], range: 3400, width: 200, target: 'skillshot', ai: 'execute',
      cast(g, c, t, l) {
        g.laser({ owner: c, angle: ang(c, t), length: 3400, width: 200, delay: 1, color: '#fff6a0', onHit(g2: any, u: any) {
          g2.dmg(c, u, L([300, 400, 500], l) + 1.2 * c.st.ap, 'magic', { ability: true, aoe: true });
          if (g2.hasBuff(u, 'luxMark')) { g2.removeBuff(u, 'luxMark'); g2.dmg(c, u, 20 + 10 * c.level + 0.2 * c.st.ap, 'magic', {}); }
          luxMark(g2, c, u);
        } });
      } },
  ],
};

// ---------------- 安妮 ----------------
function annieStun(g: any, c: any, u: any) {
  if (c.data.stunNow) g.cc(u, 'stun', 1.25, c);
}
function annieCast(c: any) {
  if (c.data.stunNow) { c.data.stunNow = false; c.data.pyro = 0; return; }
  c.data.pyro = (c.data.pyro || 0) + 1;
  if (c.data.pyro >= 4) c.data.stunNow = true;
}
const Annie: ChampionDef = {
  id: 'Annie', roles: ['mid', 'support'], ranged: true, adGrowth: 2.625, projColor: '#ff9a40', color: '#e0503a',
  levelOrder: [0, 1, 2], build: [1056, 2003, 3020, 3152, 3089, 3157, 3135, 3165],
  abilities: [
    { key: 'Q', cd: [4, 4, 4, 4, 4], cost: [60, 65, 70, 75, 80], range: 625, target: 'unit', ai: 'harass', aiFarm: true,
      cast(g, c, t, l) {
        const u = t.unit; if (!u) return false;
        const stun = c.data.stunNow;
        g.homing({ owner: c, target: u, speed: 1400, color: '#ff7b2a', size: 16, style: 'fire', onHit: (g2: any, tg: any) => {
          if (stun) g2.cc(tg, 'stun', 1.25, c);
          const r = g2.dmg(c, tg, L([80, 115, 150, 185, 220], l) + 0.75 * c.st.ap, 'magic', { ability: true, returnKill: true });
          if (r === 'kill') { c.mana = Math.min(c.maxMana, c.mana + L([60, 65, 70, 75, 80], l)); c.cds[0] *= 0.5; }
        } });
        annieCast(c);
      } },
    { key: 'W', cd: [8, 8, 8, 8, 8], cost: [70, 80, 90, 100, 110], range: 600, target: 'skillshot', ai: 'harass', aiFarm: true,
      cast(g, c, t, l) {
        const a = ang(c, t);
        g.fxPush({ type: 'cone', x: c.x, y: c.y, r: 600, angle: a, width: 0.44, t: 0, dur: 0.5, color: '#ff6a20' });
        for (const e of g.cone(c, a, 600, 0.44)) { annieStun(g, c, e); g.dmg(c, e, L([70, 115, 160, 205, 250], l) + 0.85 * c.st.ap, 'magic', { ability: true, aoe: true }); }
        annieCast(c);
      } },
    { key: 'E', cd: [14, 13, 12, 11, 10], cost: [40, 40, 40, 40, 40], range: 0, target: 'self', ai: 'combat',
      cast(g, c, _t, l) {
        g.addShield(c, L([60, 95, 130, 165, 200], l) + 0.4 * c.st.ap, 3, 'annieE');
        g.addBuff(c, { id: 'annieE', name: '熔岩护盾', dur: 1.5, ms: 0.2 });
        g.fxPush({ type: 'ring', x: c.x, y: c.y, r: 80, t: 0, dur: 3, color: '#ff8a30', follow: c });
        if (!c.data.stunNow) annieCast(c);
      } },
    { key: 'R', cd: [120, 100, 80], cost: [100, 100, 100], range: 600, radius: 290, target: 'ground', ai: 'engage',
      cast(g, c, t, l) {
        const p = clampTo(c, t, 600);
        g.fxPush({ type: 'nova', x: p.x, y: p.y, r: 290, t: 0, dur: 0.6, color: '#ff5a1a' });
        g.shake(8);
        for (const e of g.enemiesNear(c.team, p.x, p.y, 290)) { annieStun(g, c, e); g.dmg(c, e, L([150, 275, 400], l) + 0.75 * c.st.ap, 'magic', { ability: true, aoe: true }); }
        annieCast(c);
        g.spawnPet(c, p.x, p.y, { name: '提伯斯', hp: 1300 + 450 * (l - 1) + c.st.ap * 0.5, ad: 50 + 25 * l + 0.15 * c.st.ap, dur: 45, aura: 20 + 10 * l + 0.12 * c.st.ap, r: 55, color: '#5a3a2a' });
      } },
  ],
};

// ---------------- 阿狸 ----------------
function ahriBolts(g: any, c: any, n: number, dmg: number, color: string) {
  const es = g.enemiesNear(c.team, c.x, c.y, 725).sort((a: any, b: any) => (b.kind === 'champion' ? 1 : 0) - (a.kind === 'champion' ? 1 : 0) || dist(c, a) - dist(c, b));
  for (let i = 0; i < n && es.length; i++) {
    const u = es[i % es.length];
    g.homing({ owner: c, target: u, speed: 1400, color, size: 11, style: 'fox', startAngle: i * 2.1, onHit: (g2: any, tg: any) => g2.dmg(c, tg, dmg, 'magic', { ability: true }) });
  }
}
const Ahri: ChampionDef = {
  id: 'Ahri', roles: ['mid'], ranged: true, adGrowth: 3, projColor: '#c080ff', color: '#e070c0',
  levelOrder: [0, 1, 2], build: [1056, 2003, 3020, 3100, 3089, 3157, 3135, 3165],
  abilities: [
    { key: 'Q', cd: [7, 7, 7, 7, 7], cost: [55, 65, 75, 85, 95], range: 970, width: 100, target: 'skillshot', ai: 'harass', aiFarm: true,
      cast(g, c, t, l) {
        const d = L([40, 65, 90, 115, 140], l) + 0.45 * c.st.ap;
        g.skillshot({ owner: c, angle: ang(c, t), speed: 1550, range: 970, width: 100, color: '#9a7bff', style: 'orb', maxHits: 99, returns: true, onHit(g2: any, u: any, p: any) {
          g2.dmg(c, u, d, p.returning ? 'true' : 'magic', { ability: true, aoe: true });
        } });
      } },
    { key: 'W', cd: [9, 8, 7, 6, 5], cost: [40, 40, 40, 40, 40], range: 725, target: 'self', ai: 'harass',
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'ahriW', name: '妖异狐火', dur: 1.5, ms: 0.4 });
        ahriBolts(g, c, 3, L([50, 75, 100, 125, 150], l) + 0.3 * c.st.ap, '#6fb7ff');
      } },
    { key: 'E', cd: [12, 12, 12, 12, 12], cost: [60, 60, 60, 60, 60], range: 1000, width: 60, target: 'skillshot', ai: 'harass',
      cast(g, c, t, l) {
        g.skillshot({ owner: c, angle: ang(c, t), speed: 1550, range: 1000, width: 60, color: '#ff7ad2', style: 'heart', onHit(g2: any, u: any) {
          g2.dmg(c, u, L([80, 110, 140, 170, 200], l) + 0.85 * c.st.ap, 'magic', { ability: true });
          g2.cc(u, 'charm', L([1.4, 1.6, 1.8, 2, 2.2], l), c);
        } });
      } },
    { key: 'R', cd: [130, 105, 80], cost: [100, 100, 100], range: 450, target: 'ground', ai: 'engage',
      recast(g, c, t) {
        const s = c.data.ahriR;
        if (s && s.charges > 0 && g.time < s.until) {
          s.charges--;
          const p = clampTo(c, t, 450);
          g.dash(c, p.x, p.y, 2200, () => ahriBolts(g, c, 3, s.dmg, '#ff9ae0'));
          return true;
        }
        return false;
      },
      cast(g, c, t, l) {
        const dmg = L([60, 90, 120], l) + 0.35 * c.st.ap;
        c.data.ahriR = { charges: 2, until: g.time + 10, dmg };
        const p = clampTo(c, t, 450);
        g.dash(c, p.x, p.y, 2200, () => ahriBolts(g, c, 3, dmg, '#ff9ae0'));
      } },
  ],
};

// ---------------- 艾希 ----------------
const Ashe: ChampionDef = {
  id: 'Ashe', roles: ['adc'], ranged: true, adGrowth: 2.95, projColor: '#bfe9ff', color: '#7ac0ff',
  levelOrder: [1, 0, 2], build: [1055, 2003, 3006, 3153, 3031, 3046, 3036, 3072],
  onAttackHit(g, c, t) {
    if (t.kind !== 'turret' && t.kind !== 'inhib' && t.kind !== 'nexus') g.cc(t, 'slow', 2, c, 0.2);
    if (!g.hasBuff(c, 'asheQ')) c.data.focus = Math.min(4, (c.data.focus || 0) + 1);
  },
  attackMod(g, c) { const b = g.hasBuff(c, 'asheQ'); return b ? { mult: 1 + 0.05 * b.data } : {}; },
  abilities: [
    { key: 'Q', cd: [1, 1, 1, 1, 1], cost: [50, 50, 50, 50, 50], range: 0, target: 'self', ai: 'combat',
      cast(g, c, _t, l) {
        if ((c.data.focus || 0) < 4) return false;
        c.data.focus = 0;
        g.addBuff(c, { id: 'asheQ', name: '射手的专注', dur: 4, as: L([0.25, 0.325, 0.4, 0.475, 0.55], l), data: l });
      } },
    { key: 'W', cd: [18, 14.5, 11, 7.5, 4], cost: [70, 70, 70, 70, 70], range: 1200, target: 'skillshot', ai: 'harass', aiFarm: true,
      cast(g, c, t, l) {
        const a = ang(c, t), shared = new Set();
        for (let i = -4; i <= 4; i++) {
          g.skillshot({ owner: c, angle: a + i * 0.0873, speed: 2000, range: 1200, width: 20, color: '#cdefff', style: 'arrow', sharedHit: shared, onHit(g2: any, u: any) {
            g2.dmg(c, u, L([20, 35, 50, 65, 80], l) + 1.0 * c.st.ad, 'physical', { ability: true });
            g2.cc(u, 'slow', 2, c, 0.25);
          } });
        }
      } },
    { key: 'E', cd: [30, 30, 30, 30, 30], cost: [0, 0, 0, 0, 0], range: 5000, target: 'ground', ai: 'none',
      cast(g, c, t) {
        g.homing({ owner: c, targetPos: { x: t.x, y: t.y }, speed: 1400, color: '#a8dcff', size: 14, style: 'hawk', onHit: () => g.addVision(c.team, t.x, t.y, 1000, 5) });
      } },
    { key: 'R', cd: [100, 80, 60], cost: [100, 100, 100], range: 25000, width: 130, target: 'skillshot', ai: 'engage',
      cast(g, c, t, l) {
        const sx = c.x, sy = c.y;
        g.skillshot({ owner: c, angle: ang(c, t), speed: 1600, range: 25000, width: 130, color: '#8fdcff', style: 'crystal', champsOnly: true, onHit(g2: any, u: any) {
          const d = Math.hypot(u.x - sx, u.y - sy);
          g2.dmg(c, u, L([200, 400, 600], l) + 1.0 * c.st.ap, 'magic', { ability: true });
          g2.cc(u, 'stun', Math.min(3.5, 1 + d / 1300 * 1.0), c);
          g2.fxPush({ type: 'nova', x: u.x, y: u.y, r: 200, t: 0, dur: 0.6, color: '#bdf0ff' });
          for (const e of g2.enemiesNear(c.team, u.x, u.y, 200)) if (e !== u) { g2.dmg(c, e, (L([200, 400, 600], l) + c.st.ap) * 0.5, 'magic', { ability: true, aoe: true }); g2.cc(e, 'slow', 3, c, 0.5); }
        } });
      } },
  ],
};

// ---------------- 伊泽瑞尔 ----------------
function ezStack(g: any, c: any) {
  const b = g.hasBuff(c, 'ezP');
  const s = Math.min(5, (b ? b.stacks : 0) + 1);
  g.addBuff(c, { id: 'ezP', name: '咒能高涨', dur: 6, stacks: s, as: 0.1 * s });
}
function ezDetonate(g: any, c: any, u: any) {
  const b = g.hasBuff(u, 'ezW');
  if (b && b.src === c) {
    g.removeBuff(u, 'ezW');
    g.dmg(c, u, L([80, 135, 190, 245, 300], b.data) + 0.6 * c.st.bonusAd + 0.7 * c.st.ap, 'magic', { ability: true });
    c.mana = Math.min(c.maxMana, c.mana + 60);
    g.fxPush({ type: 'burst', x: u.x, y: u.y, r: 90, t: 0, dur: 0.35, color: '#ffcf5a' });
  }
}
const Ezreal: ChampionDef = {
  id: 'Ezreal', roles: ['adc'], ranged: true, adGrowth: 2.5, projColor: '#ffe27a', color: '#e8c060',
  levelOrder: [0, 2, 1], build: [1055, 2003, 3006, 3078, 3031, 3036, 3072, 3026],
  onAttackHit: (g, c, t) => ezDetonate(g, c, t),
  abilities: [
    { key: 'Q', cd: [5.5, 5.25, 5, 4.75, 4.5], cost: [28, 31, 34, 37, 40], range: 1150, width: 60, target: 'skillshot', ai: 'harass', aiFarm: true,
      cast(g, c, t, l) {
        g.skillshot({ owner: c, angle: ang(c, t), speed: 2000, range: 1150, width: 60, color: '#ffe066', style: 'bolt', onHit(g2: any, u: any) {
          g2.dmg(c, u, L([20, 45, 70, 95, 120], l) + 1.3 * c.st.ad + 0.15 * c.st.ap, 'physical', { ability: true, onHit: true });
          ezDetonate(g2, c, u);
          for (let i = 0; i < 4; i++) c.cds[i] = Math.max(0, c.cds[i] - 1.5);
          ezStack(g2, c);
        } });
      } },
    { key: 'W', cd: [12, 12, 12, 12, 12], cost: [50, 50, 50, 50, 50], range: 1150, width: 80, target: 'skillshot', ai: 'harass',
      cast(g, c, t, l) {
        g.skillshot({ owner: c, angle: ang(c, t), speed: 1700, range: 1150, width: 80, color: '#ffb640', style: 'orb', champsOnly: true, hitStructures: true, onHit(g2: any, u: any) {
          g2.addBuff(u, { id: 'ezW', name: '精华跃动', dur: 4, debuff: true, src: c, data: l });
          ezStack(g2, c);
        } });
      } },
    { key: 'E', cd: [26, 23, 20, 17, 14], cost: [90, 90, 90, 90, 90], range: 475, target: 'ground', ai: 'escape',
      cast(g, c, t, l) {
        const p = clampTo(c, t, 475);
        g.fxPush({ type: 'burst', x: c.x, y: c.y, r: 70, t: 0, dur: 0.4, color: '#ffe27a' });
        g.blink(c, p.x, p.y);
        g.fxPush({ type: 'burst', x: c.x, y: c.y, r: 70, t: 0, dur: 0.4, color: '#ffe27a' });
        const es = g.enemiesNear(c.team, c.x, c.y, 750).sort((a: any, b: any) => (g.hasBuff(b, 'ezW') ? 1 : 0) - (g.hasBuff(a, 'ezW') ? 1 : 0) || (b.kind === 'champion' ? 1 : 0) - (a.kind === 'champion' ? 1 : 0) || dist(c, a) - dist(c, b));
        if (es[0]) g.homing({ owner: c, target: es[0], speed: 2000, color: '#ffe27a', size: 12, style: 'bolt', onHit: (g2: any, u: any) => { g2.dmg(c, u, L([80, 130, 180, 230, 280], l) + 0.5 * c.st.bonusAd + 0.75 * c.st.ap, 'magic', { ability: true }); ezDetonate(g2, c, u); ezStack(g2, c); } });
      } },
    { key: 'R', cd: [120, 105, 90], cost: [100, 100, 100], range: 25000, width: 320, target: 'skillshot', ai: 'execute',
      cast(g, c, t, l) {
        const a = ang(c, t);
        g.addBuff(c, { id: 'ezR', dur: 1, root: true, noAttack: true, hidden: true });
        g.fxPush({ type: 'ring', x: c.x, y: c.y, r: 110, t: 0, dur: 1, color: '#ffd84a', follow: c });
        g.after(1, () => {
          if (!c.alive) return;
          g.skillshot({ owner: c, angle: a, speed: 2000, range: 25000, width: 320, color: '#ffd84a', style: 'barrage', maxHits: 999, onHit(g2: any, u: any) {
            const d = L([350, 500, 650], l) + 1.0 * c.st.bonusAd + 0.9 * c.st.ap;
            g2.dmg(c, u, u.kind === 'champion' ? d : d * 0.5, 'magic', { ability: true, aoe: true });
            ezDetonate(g2, c, u);
          } });
        });
      } },
  ],
};

// ---------------- 金克丝 ----------------
const Jinx: ChampionDef = {
  id: 'Jinx', roles: ['adc'], ranged: true, adGrowth: 3.4, projColor: '#ff7ad8', color: '#5a8fff',
  levelOrder: [0, 1, 2], build: [1055, 2003, 3006, 3031, 3094, 3046, 3036, 3072],
  attackMod(g, c) {
    if (c.data.rocket) return { mult: 1.1, splash: 250 };
    return {};
  },
  onAttackHit(g, c) {
    if (c.data.rocket) {
      c.mana -= 20;
      if (c.mana < 20) { c.data.rocket = false; }
    } else if (c.abil[0] > 0) {
      const b = g.hasBuff(c, 'jinxMini'); const s = Math.min(3, (b ? b.stacks : 0) + 1);
      g.addBuff(c, { id: 'jinxMini', name: '砰砰加速', dur: 2.5, stacks: s, as: s * L([0.1, 0.183, 0.267, 0.35, 0.433], c.abil[0]) });
    }
  },
  onUpdate(g, c) {
    c.data.rangeBonus = c.data.rocket ? L([80, 110, 140, 170, 200], c.abil[0]) : 0;
  },
  abilities: [
    { key: 'Q', cd: [0.9, 0.9, 0.9, 0.9, 0.9], cost: [0, 0, 0, 0, 0], range: 0, target: 'self', ai: 'none', noCostText: true,
      cast(g, c) { c.data.rocket = !c.data.rocket; g.floatText(c, c.data.rocket ? '鱼骨头!' : '砰砰枪!', '#ff8ad8'); } },
    { key: 'W', cd: [8, 7, 6, 5, 4], cost: [50, 60, 70, 80, 90], range: 1450, width: 60, target: 'skillshot', ai: 'harass',
      cast(g, c, t, l) {
        const a = ang(c, t);
        g.addBuff(c, { id: 'jinxW', dur: 0.5, root: true, noAttack: true, hidden: true });
        g.fxPush({ type: 'line', x: c.x, y: c.y, x2: c.x + Math.cos(a) * 1450, y2: c.y + Math.sin(a) * 1450, t: 0, dur: 0.5, color: 'rgba(120,200,255,0.25)', width: 60 });
        g.after(0.5, () => {
          if (!c.alive) return;
          g.skillshot({ owner: c, angle: a, speed: 3300, range: 1450, width: 60, color: '#7ad0ff', style: 'zap', onHit(g2: any, u: any) {
            g2.dmg(c, u, L([10, 60, 110, 160, 210], l) + 1.6 * c.st.ad, 'physical', { ability: true });
            g2.cc(u, 'slow', 2, c, L([0.3, 0.4, 0.5, 0.6, 0.7], l));
            g2.addVision(c.team, u.x, u.y, 300, 2);
          } });
        });
      } },
    { key: 'E', cd: [24, 20.5, 17, 13.5, 10], cost: [90, 90, 90, 90, 90], range: 925, target: 'ground', ai: 'engage',
      cast(g, c, t, l) {
        const p = clampTo(c, t, 925), a = ang(c, p) + Math.PI / 2;
        for (let i = -1; i <= 1; i++) {
          const x = p.x + Math.cos(a) * i * 180, y = p.y + Math.sin(a) * i * 180;
          const z = g.zone({ x, y, r: 90, dur: 5, owner: c, color: '#ff5ab0', style: 'chomper', tick: 0.1, armT: 0.5,
            onTick(g2: any, zz: any) {
              if (zz.age < 0.5) return;
              const e = g2.enemiesNear(c.team, zz.x, zz.y, 100, { champs: true })[0];
              if (e) {
                g2.cc(e, 'root', 1.5, c);
                g2.dmg(c, e, L([70, 120, 170, 220, 270], l) + 1 * c.st.ap, 'magic', { ability: true });
                g2.fxPush({ type: 'burst', x: zz.x, y: zz.y, r: 110, t: 0, dur: 0.4, color: '#ff5ab0' });
                zz.kill();
              }
            } });
          void z;
        }
      } },
    { key: 'R', cd: [90, 75, 60], cost: [100, 100, 100], range: 25000, width: 140, target: 'skillshot', ai: 'execute',
      cast(g, c, t, l) {
        const sx = c.x, sy = c.y;
        g.skillshot({ owner: c, angle: ang(c, t), speed: 1700, accel: 1.4, range: 25000, width: 140, color: '#ff4a8a', style: 'rocket', champsOnly: true, onHit(g2: any, u: any) {
          const d = Math.hypot(u.x - sx, u.y - sy);
          const f = Math.min(1, 0.1 + 0.9 * d / 1500);
          const dmg = (L([250, 400, 550], l) + 1.5 * c.st.bonusAd) * f + L([0.25, 0.3, 0.35], l) * (u.maxHp - u.hp);
          g2.dmg(c, u, dmg, 'physical', { ability: true });
          g2.fxPush({ type: 'nova', x: u.x, y: u.y, r: 225, t: 0, dur: 0.6, color: '#ff6a3a' });
          g2.shake(10);
          for (const e of g2.enemiesNear(c.team, u.x, u.y, 225)) if (e !== u) g2.dmg(c, e, dmg * 0.8, 'physical', { ability: true, aoe: true });
        } });
      } },
  ],
};

// ---------------- 蕾欧娜 ----------------
const sun = (g: any, c: any, u: any) => g.addBuff(u, { id: 'sunlight', name: '日光', dur: 1.5, debuff: true, src: c });
const Leona: ChampionDef = {
  id: 'Leona', roles: ['support'], ranged: false, adGrowth: 3, projColor: '#fff', color: '#f0c050',
  levelOrder: [1, 2, 0], build: [1054, 2003, 3047, 3068, 3075, 3110, 3065, 3143],
  abilities: [
    { key: 'Q', cd: [6, 5.5, 5, 4.5, 4], cost: [45, 50, 55, 60, 65], range: 0, target: 'self', ai: 'engage',
      cast(g, c, _t, l) {
        g.addBuff(c, { id: 'leonaQ', name: '破晓之盾', dur: 6, consume: true, onHit: (g2: any, o: any, t: any) => {
          g2.dmg(o, t, L([10, 35, 60, 85, 110], l) + 0.3 * o.st.ap, 'magic', { ability: true });
          g2.cc(t, 'stun', 1, o); sun(g2, o, t);
          g2.fxPush({ type: 'burst', x: t.x, y: t.y, r: 80, t: 0, dur: 0.35, color: '#ffe27a' });
        } });
        g.resetAttack(c);
      } },
    { key: 'W', cd: [14, 13, 12, 11, 10], cost: [60, 60, 60, 60, 60], range: 0, radius: 450, target: 'self', ai: 'combat',
      cast(g, c, _t, l) {
        const bonus = L([20, 25, 30, 35, 40], l) + 0.2 * c.st.bonusArmor;
        g.addBuff(c, { id: 'leonaW', name: '日蚀', dur: 3, armor: bonus, mr: bonus, dr: 0.1 });
        g.fxPush({ type: 'ring', x: c.x, y: c.y, r: 120, t: 0, dur: 3, color: '#ffd24a', follow: c });
        g.after(3, () => {
          if (!c.alive) return;
          g.fxPush({ type: 'nova', x: c.x, y: c.y, r: 450, t: 0, dur: 0.45, color: '#ffe27a' });
          for (const e of g.enemiesNear(c.team, c.x, c.y, 450)) { g.dmg(c, e, L([45, 80, 115, 150, 185], l) + 0.4 * c.st.ap, 'magic', { ability: true, aoe: true }); sun(g, c, e); }
        });
      } },
    { key: 'E', cd: [12, 10.5, 9, 7.5, 6], cost: [60, 60, 60, 60, 60], range: 900, width: 70, target: 'skillshot', ai: 'engage',
      cast(g, c, t, l) {
        g.skillshot({ owner: c, angle: ang(c, t), speed: 2000, range: 900, width: 70, color: '#ffd24a', style: 'blade', maxHits: 99, stopOnChamp: true, onHit(g2: any, u: any) {
          g2.dmg(c, u, L([50, 90, 130, 170, 210], l) + 0.4 * c.st.ap, 'magic', { ability: true });
          sun(g2, c, u);
          if (u.kind === 'champion') { g2.cc(u, 'root', 0.5, c); g2.dash(c, u.x, u.y, 1800, null, { stopDist: 90 }); }
        } });
      } },
    { key: 'R', cd: [90, 75, 60], cost: [100, 100, 100], range: 1200, radius: 325, target: 'ground', ai: 'engage',
      cast(g, c, t, l) {
        const p = clampTo(c, t, 1200);
        g.delayedAoe({ owner: c, x: p.x, y: p.y, r: 325, delay: 0.625, color: '#ffcf40', onDetonate(g2: any) {
          g2.fxPush({ type: 'beam', x: p.x, y: p.y - 900, x2: p.x, y2: p.y, t: 0, dur: 0.5, color: '#fff0a0', width: 90 });
          g2.fxPush({ type: 'nova', x: p.x, y: p.y, r: 325, t: 0, dur: 0.6, color: '#ffd24a' });
          g2.shake(8);
          for (const e of g2.enemiesNear(c.team, p.x, p.y, 325)) {
            g2.dmg(c, e, L([150, 250, 350], l) + 0.8 * c.st.ap, 'magic', { ability: true, aoe: true });
            if (dist(e, p) < 175) g2.cc(e, 'stun', 1.75, c); else g2.cc(e, 'slow', 1.75, c, 0.8);
            sun(g2, c, e);
          }
        } });
      } },
  ],
};

export const CHAMPIONS: Record<string, ChampionDef> = { Garen, Darius, Malphite, MasterYi, Amumu, Lux, Annie, Ahri, Ashe, Ezreal, Jinx, Leona };
export const CHAMP_ORDER = ['Garen', 'Darius', 'Malphite', 'MasterYi', 'Amumu', 'Lux', 'Annie', 'Ahri', 'Ashe', 'Ezreal', 'Jinx', 'Leona'];
export type { AbilityDef };
