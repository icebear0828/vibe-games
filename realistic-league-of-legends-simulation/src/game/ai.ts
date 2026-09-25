import type { Game, Unit } from './engine';
import { FOUNTAIN, LANES, W } from './map';
import { ITEMS, buyCost } from './items';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

function goTo(g: Game, c: Unit, x: number, y: number) {
  c.target = null; c.pendingCast = null; c.attackMove = false;
  if (dist(c, { x, y }) < 60) { c.path = []; return; }
  if (!c.path.length || !c.pathGoal || dist(c.pathGoal, { x, y }) > 160) g.setPath(c, x, y);
}
function attack(g: Game, c: Unit, u: Unit) { if (c.target !== u) g.cmdAttack(c, u); }

function enemyTurretNear(g: Game, c: Unit, x: number, y: number, r = 900) {
  return g.structs.find(s => s.alive && s.kind === 'turret' && s.team !== c.team && dist(s, { x, y }) < r);
}
function progress(c: Unit, u: { x: number; y: number }) { const f = FOUNTAIN[c.team as 0 | 1]; return dist(f, u); }

function levelUp(g: Game, c: Unit) {
  let guard = 0;
  while (c.points > 0 && guard++ < 6) {
    if (g.cmdLevel(c, 3)) continue;
    let done = false;
    // first 3 levels: take each basic once
    for (const s of c.level <= 3 ? [0, 1, 2] : []) if (c.abil[s] === 0 && g.cmdLevel(c, s)) { done = true; break; }
    if (done) continue;
    for (const s of c.def!.levelOrder) if (g.cmdLevel(c, s)) { done = true; break; }
    if (!done) break;
  }
}

function flatComps(id: number): number[] {
  const it = ITEMS[id]; if (!it) return [];
  const out: number[] = [];
  for (const f of it.from) { out.push(f); out.push(...flatComps(f)); }
  return out;
}
function buyItems(g: Game, c: Unit) {
  if (g.time < 90 && !c.ai.boughtStart) {
    c.ai.boughtStart = true;
    g.buy(c, c.def!.build[0]);
    while (c.gold >= 50) if (g.buy(c, 2003) !== true) break;
    return;
  }
  for (let tries = 0; tries < 8; tries++) {
    const next = c.def!.build.find((id, i) => i >= 2 && !c.items.includes(id));
    if (!next) return;
    const [cost] = buyCost(next, c.items);
    if (c.items.every(x => x !== null)) {
      const si = c.items.findIndex(x => x === 2003 || x === 1054 || x === 1055 || x === 1056);
      if (si >= 0) { g.sell(c, si); continue; }
    }
    if (c.gold >= cost) { if (g.buy(c, next) === true) continue; else return; }
    const comps = flatComps(next).filter(id => !c.items.includes(id)).sort((a, b) => ITEMS[b].gold - ITEMS[a].gold);
    let bought = false;
    for (const comp of comps) { const [cc] = buyCost(comp, c.items); if (c.gold >= cc && g.buy(c, comp) === true) { bought = true; break; } }
    if (!bought) return;
  }
}

function predict(g: Game, c: Unit, t: Unit, speed = 1600) {
  const d = dist(c, t);
  const lead = Math.min(0.7, d / speed) * (0.6 + Math.random() * 0.5);
  if (t.path && t.path.length && !g.buffBlocksMove(t)) {
    const p = t.path[0]; const pd = dist(t, p) || 1;
    return { x: t.x + (p.x - t.x) / pd * t.st.ms * lead, y: t.y + (p.y - t.y) / pd * t.st.ms * lead };
  }
  if (t.dash) return { x: t.dash.x, y: t.dash.y };
  return { x: t.x, y: t.y };
}

function useAbilities(g: Game, c: Unit, t: Unit | null, mode: 'fight' | 'farm' | 'escape') {
  if (!g.canCast(c)) return;
  const d = t ? dist(c, t) : 1e9;
  // Amumu aura toggle
  if (c.champId === 'Amumu' && c.abil[1] > 0) {
    const near = g.enemiesNear(c.team, c.x, c.y, 380).length > 0;
    if (near !== !!c.data.aura && c.cds[1] <= 0 && (c.mana > c.maxMana * 0.2 || !near)) g.cmdCast(c, 1, { x: c.x, y: c.y });
  }
  for (let s = 0; s < 4; s++) {
    const def = c.def!.abilities[s]; const l = c.abil[s];
    if (!l || c.cds[s] > 0 || c.mana < def.cost[l - 1] || def.ai === 'none') continue;
    if (c.champId === 'Amumu' && s === 1) continue;
    if (Math.random() < 0.25) continue; // human-ish delay
    const ai = def.ai;
    if (mode === 'escape') {
      if (ai === 'escape' || (c.champId === 'Ahri' && s === 3)) { const f = FOUNTAIN[c.team as 0 | 1]; const a = Math.atan2(f.y - c.y, f.x - c.x); g.cmdCast(c, s, { x: c.x + Math.cos(a) * 500, y: c.y + Math.sin(a) * 500 }); return; }
      if (ai === 'heal' || (ai === 'combat' && (def.key === 'W' || def.key === 'E') && c.champId !== 'Garen' && def.target === 'self' && !def.radius)) { g.cmdCast(c, s, { x: c.x, y: c.y }); return; }
      if (t && (ai === 'engage' || ai === 'harass') && def.key !== 'R' && (def.target === 'skillshot' || def.target === 'unit') && d < def.range && ['Amumu', 'Lux', 'Ahri', 'Ashe', 'Jinx', 'Malphite'].includes(c.champId)) { const p = predict(g, c, t); g.cmdCast(c, s, { x: p.x, y: p.y, unit: t }); return; }
      continue;
    }
    if (mode === 'farm') {
      if (!def.aiFarm || c.mana < c.maxMana * 0.55 || def.key === 'R') continue;
      const range = def.range || def.radius || 300;
      const ms = g.enemiesNear(c.team, c.x, c.y, Math.max(range, 300)).filter(u => u.kind === 'minion' || u.kind === 'monster');
      if (!ms.length) continue;
      if (def.target === 'self') { const inR = g.enemiesNear(c.team, c.x, c.y, def.radius || 300).filter(u => u.kind === 'minion' || u.kind === 'monster'); if (inR.length >= (c.role === 'jungle' ? 1 : 3)) g.cmdCast(c, s, { x: c.x, y: c.y }); continue; }
      let best: Unit | null = null, bn = 0;
      for (const m of ms) { const n = ms.filter(o => dist(o, m) < 280).length; if (n > bn) { bn = n; best = m; } }
      if (best && (bn >= 3 || c.role === 'jungle' || def.target === 'unit')) g.cmdCast(c, s, { x: best.x, y: best.y, unit: best });
      continue;
    }
    if (!t) continue;
    const hpPct = t.hp / t.maxHp;
    if (def.key === 'R') {
      const enemiesAround = g.enemiesNear(c.team, t.x, t.y, 500, { champs: true }).length;
      if (ai === 'execute') { if (!(hpPct < 0.4 || (c.champId === 'Garen' && t.hp < [150, 300, 450][l - 1] + [0.25, 0.3, 0.35][l - 1] * (t.maxHp - t.hp)))) continue; }
      else if (!(hpPct < 0.65 || enemiesAround >= 2)) continue;
      if (def.range > 5000 && d > 2800 && hpPct > 0.3) continue;
    }
    if (ai === 'heal') { if (c.hp / c.maxHp < 0.35 && g.enemiesNear(c.team, c.x, c.y, 500, { champs: true }).length === 0) g.cmdCast(c, s, { x: c.x, y: c.y }); continue; }
    if (ai === 'escape') { if (d < 700 && c.hp / c.maxHp > 0.5 && hpPct < 0.35) g.cmdCast(c, s, { x: t.x, y: t.y }); continue; }
    if (def.target === 'self') {
      const r = def.radius || (c.st.range + 150);
      if (ai === 'combat' || ai === 'engage' || ai === 'harass') { if (d <= r + t.r) g.cmdCast(c, s, { x: c.x, y: c.y }); }
      continue;
    }
    const range = def.target === 'skillshot' ? Math.min(def.range, 5000) * 0.92 : def.range + c.r + t.r;
    if (d > range && !(def.key === 'R' && def.range > 5000 && d < 5000)) continue;
    const p = def.target === 'skillshot' || def.target === 'ground' ? predict(g, c, t, def.key === 'R' ? 1800 : 1600) : { x: t.x, y: t.y };
    g.cmdCast(c, s, { x: p.x, y: p.y, unit: t });
  }
}

function summonerLogic(g: Game, c: Unit, t: Unit | null, retreating: boolean) {
  const hpPct = c.hp / c.maxHp;
  c.summ.forEach((s, i) => {
    if (s.cd > 0) return;
    if (s.id === 'SummonerHeal' && hpPct < 0.2 && g.time - c.lastDamaged < 1) g.cmdSummoner(c, i, { x: c.x, y: c.y });
    if (s.id === 'SummonerBarrier' && hpPct < 0.2 && g.time - c.lastDamaged < 1) g.cmdSummoner(c, i, { x: c.x, y: c.y });
    if (s.id === 'SummonerBoost' && g.isCC(c) && t) g.cmdSummoner(c, i, { x: c.x, y: c.y });
    if (s.id === 'SummonerHaste' && retreating && t && dist(t, c) < 600) g.cmdSummoner(c, i, { x: c.x, y: c.y });
    if (s.id === 'SummonerFlash' && retreating && hpPct < 0.13 && t && dist(t, c) < 450 && g.time - c.lastDamaged < 0.6) { const f = FOUNTAIN[c.team as 0 | 1]; const a = Math.atan2(f.y - c.y, f.x - c.x); g.cmdSummoner(c, i, { x: c.x + Math.cos(a) * 400, y: c.y + Math.sin(a) * 400 }); }
    if (!t || retreating) return;
    const th = t.hp / t.maxHp;
    if (s.id === 'SummonerDot' && th < 0.3 && dist(t, c) < 600) g.cmdSummoner(c, i, { x: t.x, y: t.y, unit: t });
    if (s.id === 'SummonerExhaust' && dist(t, c) < 600 && (th < 0.5 || hpPct < 0.4)) g.cmdSummoner(c, i, { x: t.x, y: t.y, unit: t });
    if (s.id === 'SummonerFlash' && th < 0.12 && dist(t, c) > c.st.range + 100 && dist(t, c) < c.st.range + 380 && hpPct > 0.4 && Math.random() < 0.3) g.cmdSummoner(c, i, { x: t.x, y: t.y });
  });
}

function smiteLogic(g: Game, c: Unit) {
  const si = c.summ.findIndex(s => s.id === 'SummonerSmite');
  if (si < 0 || c.summ[si].cd > 0) return;
  const dmg = 600 + (c.level >= 9 ? 300 : 0);
  for (const m of g.enemiesNear(c.team, c.x, c.y, 600)) {
    if (m.kind !== 'monster') continue;
    const big = m.mtype === 'dragon' || m.mtype === 'baron' || m.mtype === 'blue' || m.mtype === 'red' || (c.level < 4 && m.maxHp > 1000);
    if (big && m.hp <= dmg) { g.cmdSummoner(c, si, { x: m.x, y: m.y, unit: m }); return; }
  }
}

function strength(g: Game, team: number, x: number, y: number, r: number) {
  let s = 0;
  for (const c of g.champs) if (c.alive && c.team === team && dist(c, { x, y }) < r) s += (c.hp / c.maxHp * 0.7 + 0.3) * (1 + c.level * 0.12) * (1 + c.items.filter(Boolean).length * 0.08);
  return s;
}

export function botThink(g: Game, c: Unit, dt: number) {
  c.ai.t = (c.ai.t || 0) - dt;
  if (c.ai.t > 0) return;
  c.ai.t = 0.12 + Math.random() * 0.1;
  if (!c.alive) return;
  levelUp(g, c);
  if (g.inShop(c)) buyItems(g, c);
  const team = c.team as 0 | 1;
  const f = FOUNTAIN[team];
  const hpPct = c.hp / c.maxHp;
  const enemies = g.champs.filter(e => e.alive && e.team !== team && e.vis[team] && g.targetable(e) && dist(e, c) < 1400);
  const closest = enemies.sort((a, b) => dist(a, c) - dist(b, c))[0] || null;
  if (c.data.channel) return;
  if (g.hasBuff(c, 'yiW')) { if (hpPct > 0.9 || (closest && dist(closest, c) < 350 && hpPct > 0.5)) g.removeBuff(c, 'yiW'); else return; }

  // potion
  if (hpPct < 0.55 && !g.hasBuff(c, 'potion')) { const pi = c.items.findIndex(x => x === 2003); if (pi >= 0) g.cmdItem(c, pi, c); }
  // zhonya
  if (hpPct < 0.15 && closest && dist(closest, c) < 700) { const zi = c.items.findIndex(x => x === 3157); if (zi >= 0 && c.itemCd[zi] <= 0) g.cmdItem(c, zi, c); }

  if (c.recall) { if (closest && dist(closest, c) < 900) { c.recall = null; } else return; }
  const inFountain = dist(c, f) < 900;
  if (inFountain && (hpPct < 0.9 || c.mana < c.maxMana * 0.7) && g.time > 20) { c.path = []; c.target = null; return; }
  if (hpPct > 0.75) c.ai.retreat = false;

  // ---------- retreat ----------
  const dangerous = closest && dist(closest, c) < 900;
  if (hpPct < 0.25 || c.ai.retreat) {
    c.ai.retreat = true;
    summonerLogic(g, c, closest, true);
    if (dangerous) useAbilities(g, c, closest, 'escape');
    if (!dangerous && g.time - c.lastDamaged > 2.5) { if (!inFountain) g.cmdRecall(c); return; }
    goTo(g, c, f.x, f.y);
    return;
  }

  // ---------- fight ----------
  let target: Unit | null = null;
  if (enemies.length) {
    const scored = enemies.filter(e => dist(e, c) < Math.max(1000, c.st.range + 450)).map(e => ({ e, s: e.hp * (1 + e.st.armor / 100) + dist(e, c) * 1.5 }));
    scored.sort((a, b) => a.s - b.s);
    target = scored[0]?.e || null;
  }
  if (target) {
    const my = strength(g, team, c.x, c.y, 1100), their = strength(g, 1 - team, target.x, target.y, 1100);
    const burst = c.st.ad * 3 * (100 / (100 + target.st.armor)) + c.st.ap * 1.6 + c.level * 45 + (c.abil[3] ? 250 : 0);
    const killable = target.hp < burst;
    const tTurret = enemyTurretNear(g, c, target.x, target.y, 850);
    const meTurret = enemyTurretNear(g, c, c.x, c.y, 850);
    const diveOk = !tTurret || (target.hp / target.maxHp < 0.2 && hpPct > 0.55) || (tTurret.target && tTurret.target !== c && tTurret.target.kind === 'minion' && killable);
    const aggressive = (my >= their * (c.role === 'support' ? 0.75 : 0.9) || killable) && diveOk && hpPct > 0.3;
    if (meTurret && meTurret.target === c && !(killable && target.hp / target.maxHp < 0.15)) { goTo(g, c, f.x, f.y); return; }
    if (aggressive) {
      summonerLogic(g, c, target, false);
      useAbilities(g, c, target, 'fight');
      if (!c.pendingCast) attack(g, c, target);
      c.ai.fightUntil = g.time + 2;
      return;
    }
    if (dist(target, c) < target.st.range + 250 + (target.ranged ? 0 : 200)) {
      useAbilities(g, c, target, 'escape');
      const a = Math.atan2(f.y - c.y, f.x - c.x);
      goTo(g, c, c.x + Math.cos(a) * 500, c.y + Math.sin(a) * 500);
      return;
    }
  }
  // help nearby ally in fight
  const allyFight = g.champs.find(a => a !== c && a.alive && a.team === team && dist(a, c) < 1500 && g.time - a.lastCombat < 1.5 && g.champs.some(e => e.alive && e.team !== team && e.vis[team] && dist(e, a) < 700));
  if (allyFight && hpPct > 0.45 && !enemyTurretNear(g, c, allyFight.x, allyFight.y, 800)) {
    const e = g.champs.filter(e => e.alive && e.team !== team && e.vis[team] && dist(e, allyFight) < 800).sort((a, b) => a.hp - b.hp)[0];
    if (e) { goTo(g, c, e.x, e.y); if (dist(e, c) < 900) attack(g, c, e); return; }
  }

  // ---------- recall for items ----------
  const nextItem = c.def!.build.find((id, i) => i >= 2 && !c.items.includes(id));
  const needGold = nextItem ? Math.min(buyCost(nextItem, c.items)[0], 1300) : 99999;
  if (!inFountain && !enemies.length && g.time - c.lastDamaged > 4 && ((c.gold >= needGold && (hpPct < 0.75 || c.gold > 2000)) || hpPct < 0.4 || (c.mana < c.maxMana * 0.15 && c.maxMana > 0))) {
    g.cmdRecall(c); return;
  }

  // ---------- objectives / macro ----------
  const tmin = g.time / 60;
  if (c.role === 'jungle' && tmin < 14) { jungle(g, c); return; }
  let lane = c.lane;
  if (tmin >= 14) {
    if (!g.teamLane) g.teamLane = [1, 1];
    if (!g.teamLaneT || g.time - g.teamLaneT > 60) {
      g.teamLaneT = g.time;
      for (const tm of [0, 1] as const) {
        const scores = [0, 1, 2].map(l => g.structs.filter(s => s.alive && s.team !== tm && s.laneIdx === l && s.kind === 'turret').length + (l === 1 ? -0.5 : 0) + Math.random() * 0.8);
        g.teamLane[tm] = scores.indexOf(Math.min(...scores));
      }
    }
    lane = c.role === 'top' && tmin < 22 ? 0 : g.teamLane[team];
    // baron / dragon
    const baron = g.camps.find(cp => cp.def.id === 'baron');
    const dragon = g.camps.find(cp => cp.def.id === 'dragon');
    const aliveMine = g.champs.filter(x => x.team === team && x.alive).length, aliveTheirs = g.champs.filter(x => x.team !== team && x.alive).length;
    if (baron?.alive && aliveMine >= 4 && aliveTheirs <= aliveMine - 2 && c.role !== 'top') { objective(g, c, baron); return; }
    if (dragon?.alive && aliveMine >= aliveTheirs && ['jungle', 'adc', 'support'].includes(c.role) && hpPct > 0.6) { objective(g, c, dragon); return; }
  } else if (c.role === 'support' || c.role === 'adc') {
    const dragon = g.camps.find(cp => cp.def.id === 'dragon');
    const jg = g.champs.find(x => x.team === team && x.role === 'jungle');
    if (dragon?.alive && jg && jg.ai.mode === 'dragon' && hpPct > 0.6) { objective(g, c, dragon); return; }
  }
  if (c.role === 'jungle' && tmin >= 14 && g.camps.some(cp => cp.alive && cp.def.side === team && dist(cp.def, c) < 2500) && Math.random() < 0.5) { jungle(g, c); return; }
  laning(g, c, lane, c.role === 'support' ? g.champs.find(x => x.team === team && x.role === 'adc' && x.alive) : undefined);
}

function objective(g: Game, c: Unit, cp: any) {
  const mons: Unit[] = cp.units.filter((u: Unit) => u.alive);
  if (!mons.length) return;
  smiteLogic(g, c);
  const m = mons[0];
  if (dist(c, m) > 800) { goTo(g, c, m.x, m.y); return; }
  useAbilities(g, c, m, 'farm');
  useAbilities(g, c, m, 'fight');
  attack(g, c, m);
}

function jungle(g: Game, c: Unit) {
  const team = c.team as 0 | 1;
  smiteLogic(g, c);
  c.ai.mode = 'clear';
  // gank
  if (g.time > 180 && c.level >= 3 && c.hp / c.maxHp > 0.6) {
    if (c.ai.gank && (g.time > c.ai.gankUntil || !c.ai.gank.alive || !c.ai.gank.vis[team] || enemyTurretNear(g, c, c.ai.gank.x, c.ai.gank.y, 800))) c.ai.gank = null;
    if (!c.ai.gank && (!c.ai.nextGank || g.time > c.ai.nextGank)) {
      c.ai.nextGank = g.time + 25 + Math.random() * 20;
      const cands = g.champs.filter(e => e.alive && e.team !== team && e.vis[team] && e.role !== 'jungle' && progress(c, e) < W * 0.72 && !enemyTurretNear(g, c, e.x, e.y, 900) && dist(e, c) < 6500);
      cands.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp + (dist(a, c) - dist(b, c)) / 4000);
      if (cands[0] && cands[0].hp / cands[0].maxHp < 0.85) { c.ai.gank = cands[0]; c.ai.gankUntil = g.time + 18; }
    }
    if (c.ai.gank) {
      c.ai.mode = 'gank';
      const e = c.ai.gank as Unit;
      if (dist(e, c) < 750) { useAbilities(g, c, e, 'fight'); summonerLogic(g, c, e, false); attack(g, c, e); }
      else goTo(g, c, e.x, e.y);
      return;
    }
  }
  // dragon at level 6+
  const dragon = g.camps.find(cp => cp.def.id === 'dragon');
  if (dragon?.alive && c.level >= 6 && c.hp / c.maxHp > 0.7) { c.ai.mode = 'dragon'; objective(g, c, dragon); return; }
  // clear camps
  const mine = g.camps.filter(cp => cp.alive && cp.def.side === team);
  if (c.ai.camp && (!c.ai.camp.alive)) c.ai.camp = null;
  if (!c.ai.camp && mine.length) { mine.sort((a, b) => dist(a.def, c) - dist(b.def, c)); c.ai.camp = mine[0]; }
  const cp = c.ai.camp;
  if (!cp) {
    // wait for spawns near next camp or go gank top/bot
    const next = g.camps.filter(x => x.def.side === team).sort((a, b) => a.spawnAt - b.spawnAt)[0];
    if (next && next.spawnAt - g.time < 25) { goTo(g, c, next.def.x, next.def.y); return; }
    laning(g, c, Math.random() < 0.5 ? 0 : 2);
    return;
  }
  const mons: Unit[] = cp.units.filter((u: Unit) => u.alive);
  if (!mons.length) { c.ai.camp = null; return; }
  const m = mons.sort((a, b) => b.maxHp - a.maxHp)[0];
  if (dist(c, m) > 600) { goTo(g, c, m.x, m.y); return; }
  useAbilities(g, c, m, 'farm');
  if (c.def!.abilities.some((a, i) => a.ai === 'combat' && c.abil[i] && a.key !== 'R')) useAbilities(g, c, m, 'fight');
  attack(g, c, m);
}

function laning(g: Game, c: Unit, lane: number, follow?: Unit) {
  const team = c.team as 0 | 1;
  const path = team === 0 ? LANES[lane] : [...LANES[lane]].reverse();
  const f = FOUNTAIN[team];
  // minions
  const allies = g.units.filter(u => u.alive && u.kind === 'minion' && u.team === team && u.laneIdx === lane);
  const foes = g.units.filter(u => u.alive && u.kind === 'minion' && u.team !== team && u.laneIdx === lane && u.vis[team]);
  let front: Unit | null = null;
  for (const m of allies) if (!front || progress(c, m) > progress(c, front)) front = m;
  let spot: { x: number; y: number };
  if (front) {
    const back = c.ranged ? 380 : 200;
    const a = Math.atan2(f.y - front.y, f.x - front.x);
    spot = { x: front.x + Math.cos(a) * back, y: front.y + Math.sin(a) * back };
  } else {
    const myT = g.structs.filter(s => s.alive && s.kind === 'turret' && s.team === team && s.laneIdx === lane).sort((a, b) => progress(c, b) - progress(c, a))[0];
    spot = myT ? { x: myT.x + (path[path.length - 1].x - myT.x) * 0.04, y: myT.y + (path[path.length - 1].y - myT.y) * 0.04 } : path[2];
  }
  if (follow && dist(follow, c) < 3000 && follow.alive && dist(follow, f) > 2500) spot = { x: follow.x + (f.x - follow.x) * 0.05 + 80, y: follow.y + (f.y - follow.y) * 0.05 };
  // enemy turret safety
  const et = enemyTurretNear(g, c, spot.x, spot.y, 900);
  if (et) {
    const tanks = allies.filter(m => dist(m, et) < 800).length;
    if (tanks < 2 || et.target === c) {
      const a = Math.atan2(f.y - et.y, f.x - et.x);
      spot = { x: et.x + Math.cos(a) * 950, y: et.y + Math.sin(a) * 950 };
    }
  }
  // siege structures
  const struct = g.structs.find(s => s.alive && s.team !== team && !g.isInvuln(s) && dist(s, c) < 1000);
  if (struct && (struct.kind !== 'turret' || (allies.filter(m => dist(m, struct) < 750).length >= 2 && struct.target && struct.target !== c && struct.target.kind !== 'champion'))) {
    const nearFoes = foes.filter(m => dist(m, c) < 700).length;
    if (nearFoes === 0 || struct.kind !== 'turret') { attack(g, c, struct); return; }
  }
  // last hitting / pushing
  const inRange = foes.filter(m => dist(m, c) < c.st.range + 350 && !(enemyTurretNear(g, c, m.x, m.y, 820) && (!et || et.target === c || allies.filter(a => dist(a, et) < 800).length < 2)));
  if (inRange.length) {
    const hitDmg = (m: Unit) => c.st.ad * 100 / (100 + m.st.armor);
    const lh = inRange.filter(m => m.hp <= hitDmg(m) * (c.ranged ? 1.15 : 1.05) + 5).sort((a, b) => a.hp - b.hp)[0];
    if (lh && c.role !== 'support') { attack(g, c, lh); return; }
    const enemyChampNear = g.champs.some(e => e.alive && e.team !== team && e.vis[team] && dist(e, c) < 1300);
    if (!enemyChampNear || g.time > 14 * 60) {
      useAbilities(g, c, null, 'farm');
      if (c.role !== 'support' || g.time > 14 * 60) { const low = inRange.sort((a, b) => a.hp - b.hp)[0]; attack(g, c, low); return; }
    } else {
      // wait for last hits: hold near a low minion
      const soon = inRange.filter(m => m.hp < hitDmg(m) * 2.5).sort((a, b) => a.hp - b.hp)[0];
      if (soon && c.role !== 'support') { c.target = null; if (dist(soon, c) > c.st.range + 60) goTo(g, c, soon.x, soon.y); else c.path = []; return; }
    }
  }
  if (c.target && c.target.kind === 'minion' && c.target.alive) return;
  goTo(g, c, spot.x + ((c.id % 3) - 1) * 60, spot.y + ((c.id % 2) - 0.5) * 80);
}
