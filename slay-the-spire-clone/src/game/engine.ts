import type { CardInst, Creature, Enemy, EventPage, MapNode, RelicInst, RewardItem, RunState, Screen, SelectReq, Vals, Rarity } from './types';
import { CARDS, CARD_LIST, CURSES, REWARD_POOL, baseCost, canUpgradeDef, cardVals, isEthereal, isExhaust, isInnate, cardName } from './cards';
import type { CardDef } from './cards';
import { RELICS, RELIC_LIST, ENERGY_RELICS } from './relics';
import type { RelicTier } from './relics';
import { POTIONS, POTION_LIST } from './potions';
import { POWERS, isDebuff } from './powers';
import { ENEMIES, WEAK_ENCOUNTERS, STRONG_ENCOUNTERS, ELITE_ENCOUNTERS, BOSSES } from './enemies';
import { generateMap } from './map';
import { EVENTS } from './events';
import { sfx } from './sfx';
import { chance, pick, rand, shuffle, sleep, weighted } from './util';

export interface Combat {
  player: Creature;
  enemies: Enemy[];
  hand: CardInst[];
  draw: CardInst[];
  discard: CardInst[];
  exhaust: CardInst[];
  energy: number;
  maxEnergy: number;
  turn: number;
  phase: 'player' | 'enemy' | 'busy' | 'won' | 'lost';
  kind: 'monster' | 'elite' | 'boss';
  timesHpLost: number;
  attacksThisTurn: number;
  skillsThisTurn: number;
  cardsThisTurn: number;
  playing: { card: CardInst; key: number } | null;
  penNibActive: boolean;
  puzzleUsed: boolean;
  redSkullOn: boolean;
  shake: number;
  banner: { text: string; key: number } | null;
  speech: { uid: number; text: string; key: number }[];
  eventCombat?: boolean;
}

export interface ShopItem { kind: 'card' | 'relic' | 'potion'; id: string; card?: CardInst; price: number; sold: boolean; sale?: boolean }
export interface ShopState { items: ShopItem[]; removeUsed: boolean }
export interface NeowOption { label: string; act: () => void | Promise<void> }

const SAVE_KEY = 'sts_save_v1';

export class Game {
  run: RunState | null = null;
  screen: Screen = 'title';
  c: Combat | null = null;
  rewards: RewardItem[] = [];
  rewardCardIdx: number | null = null;
  rewardsFromBoss = false;
  select: SelectReq | null = null;
  overlay: null | 'deck' | 'draw' | 'discard' | 'exhaust' | 'map' = null;
  eventPage: EventPage | null = null;
  eventId: string | null = null;
  shop: ShopState | null = null;
  bossRelics: string[] = [];
  neow: NeowOption[] = [];
  neowTalked = false;
  toasts: { id: number; text: string }[] = [];
  targetingPotion: number | null = null;
  restDone: string | null = null;
  chestOpened = false;
  chestSize: 'small' | 'medium' | 'large' = 'small';
  version = 0;
  private listeners = new Set<() => void>();
  private fxId = 1;

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getVersion = () => this.version;
  emit() { this.version++; this.listeners.forEach((f) => f()); }

  // ================= helpers =================
  def(c: CardInst): CardDef { return CARDS[c.id]; }
  get p(): Creature { return this.c!.player; }
  nextUid() { return this.run ? ++this.run.uid : Math.floor(Math.random() * 1e9); }
  makeCard(id: string, up = 0): CardInst { return { uid: this.nextUid(), id, up }; }
  copyCard(c: CardInst): CardInst { return { ...c, uid: this.nextUid() }; }
  has(id: string) { return !!this.run?.relics.some((r) => r.id === id); }
  relic(id: string) { return this.run?.relics.find((r) => r.id === id); }
  alive() { return this.c ? this.c.enemies.filter((e) => !e.dead) : []; }
  randomEnemy() { const a = this.alive(); return a.length ? pick(a) : null; }
  vals(c: CardInst): Vals { return cardVals(c, this); }
  canUpgrade(c: CardInst) { return canUpgradeDef(c); }
  over() { const ph = this.c?.phase as string | undefined; return !this.c || ph === 'won' || ph === 'lost'; }
  intentIsAttack(e: Enemy) { return !!e.move && e.move.intent.startsWith('attack'); }
  toast(text: string) {
    const id = this.fxId++;
    this.toasts.push({ id, text });
    setTimeout(() => { this.toasts = this.toasts.filter((t) => t.id !== id); this.emit(); }, 2200);
    this.emit();
  }
  say(cr: Creature, text: string) {
    if (!this.c) return;
    const key = this.fxId++;
    this.c.speech = this.c.speech.filter((s) => s.uid !== cr.uid);
    this.c.speech.push({ uid: cr.uid, text, key });
    setTimeout(() => { if (this.c) { this.c.speech = this.c.speech.filter((s) => s.key !== key); this.emit(); } }, 2000);
  }
  fx(cr: Creature, text: string, cls: string) {
    const id = this.fxId++;
    cr.fx.push({ id, text, cls, dx: rand(-30, 30) });
    setTimeout(() => { cr.fx = cr.fx.filter((f) => f.id !== id); this.emit(); }, 1300);
  }
  anim(cr: Creature, name: string) { cr.anim = name; cr.animKey++; }
  actMult() { const a = this.run?.act ?? 1; return { hp: [1, 1, 1.7, 2.4][a], dmg: [1, 1, 1.35, 1.7][a] }; }

  // ================= run lifecycle =================
  hasSave() { return !!localStorage.getItem(SAVE_KEY); }
  save() { if (this.run) localStorage.setItem(SAVE_KEY, JSON.stringify(this.run)); }
  clearSave() { localStorage.removeItem(SAVE_KEY); }
  load() {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return;
    try { this.run = JSON.parse(s); this.goMap(); } catch { this.clearSave(); }
  }

  newRun() {
    const deck: CardInst[] = [];
    let uid = 0;
    for (let i = 0; i < 5; i++) deck.push({ uid: ++uid, id: 'strike', up: 0 });
    for (let i = 0; i < 4; i++) deck.push({ uid: ++uid, id: 'defend', up: 0 });
    deck.push({ uid: ++uid, id: 'bash', up: 0 });
    const bossId = pick(Object.keys(BOSSES));
    this.run = {
      act: 1, floor: 0, hp: 80, maxHp: 80, gold: 99, deck,
      relics: [{ id: 'burning_blood', counter: 0 }], potions: [null, null, null],
      map: generateMap(bossId), pos: null, visited: [], cardRemoveCost: 75, potionChance: 40, rareOffset: -5,
      monstersFought: 0, seenEvents: [], seenBosses: [bossId], elitesKilled: 0, monstersKilled: 0, bossesKilled: 0,
      neowOneHp: 0, uid: 1000, seedName: Math.random().toString(36).slice(2, 10).toUpperCase(), startTime: Date.now(),
    };
    this.overlay = null;
    this.neowTalked = false;
    this.genNeow();
    this.screen = 'neow';
    this.emit();
  }

  goTitle() { this.screen = 'title'; this.c = null; this.overlay = null; this.emit(); }

  goMap() {
    this.screen = 'map';
    this.c = null;
    this.rewards = [];
    this.rewardCardIdx = null;
    this.eventPage = null;
    this.shop = null;
    this.restDone = null;
    this.targetingPotion = null;
    this.overlay = null;
    this.save();
    this.emit();
  }

  // ================= map =================
  availableNodes(): { row: number; col: number }[] {
    const r = this.run!;
    if (!r.pos) return r.map.rows[0].filter(Boolean).map((n) => ({ row: 0, col: n!.col }));
    if (r.pos.row === 15) return [];
    if (r.pos.row === 14) return [{ row: 15, col: 3 }];
    const node = r.map.rows[r.pos.row][r.pos.col]!;
    return node.next.map((c) => ({ row: r.pos!.row + 1, col: c }));
  }

  async travel(row: number, col: number) {
    const r = this.run!;
    if (!this.availableNodes().some((n) => n.row === row && n.col === col)) return;
    sfx.map();
    r.pos = { row, col };
    r.visited.push({ row, col });
    r.floor++;
    if (row === 15) { this.startBoss(); return; }
    const node = r.map.rows[row][col] as MapNode;
    this.enterRoom(node.type);
  }

  enterRoom(type: string) {
    const r = this.run!;
    switch (type) {
      case 'monster': {
        const pool = r.monstersFought < 3 ? WEAK_ENCOUNTERS : STRONG_ENCOUNTERS;
        r.monstersFought++;
        this.startCombat(pick(pool).enemies(), 'monster');
        break;
      }
      case 'elite': this.startCombat(pick(ELITE_ENCOUNTERS).enemies(), 'elite'); break;
      case 'rest': {
        this.restDone = null;
        if (this.has('eternal_feather')) this.healRun(Math.floor(r.deck.length / 5) * 3);
        this.screen = 'rest'; this.emit(); break;
      }
      case 'shop': {
        if (this.has('meal_ticket')) this.healRun(15);
        this.genShop(); this.screen = 'shop'; this.emit(); break;
      }
      case 'treasure': {
        this.chestOpened = false;
        this.chestSize = weighted<'small' | 'medium' | 'large'>([['small', 50], ['medium', 33], ['large', 17]]);
        this.screen = 'treasure'; this.emit(); break;
      }
      case 'event': {
        const roll = Math.random();
        if (roll < 0.1) { this.enterRoom('monster'); return; }
        if (roll < 0.13) { this.enterRoom('shop'); return; }
        if (roll < 0.15) { this.enterRoom('treasure'); return; }
        let pool = EVENTS.filter((e) => !r.seenEvents.includes(e.id) && (!e.cond || e.cond(this)));
        if (!pool.length) pool = EVENTS.filter((e) => !e.cond || e.cond(this));
        const ev = pick(pool);
        r.seenEvents.push(ev.id);
        this.eventId = ev.id;
        this.eventPage = ev.start(this);
        this.screen = 'event';
        this.emit();
        break;
      }
    }
  }

  startBoss() {
    const r = this.run!;
    this.startCombat(BOSSES[r.map.bossId].enemies(), 'boss');
  }

  setEventPage(p: EventPage) { this.eventPage = p; this.emit(); }

  // ================= combat setup =================
  makeEnemy(id: string, idx: number): Enemy {
    const d = ENEMIES[id];
    const m = this.actMult();
    let hp = Math.round(rand(d.hp[0], d.hp[1]) * m.hp);
    const e: Enemy = {
      uid: this.nextUid(), id, name: d.name, hp, maxHp: hp, block: 0, powers: {}, fx: [], anim: '', animKey: 0, justApplied: {},
      dead: false, dying: false, move: null, history: [], data: { dm: m.dmg },
    };
    d.init?.(e, this, idx);
    if (this.run!.act > 1 && e.powers.curlup) e.powers.curlup = Math.round(e.powers.curlup * m.hp);
    if (this.run!.act > 1 && e.powers.modeshift) { e.powers.modeshift = Math.round(e.powers.modeshift * m.hp); e.data.threshold = e.powers.modeshift; }
    hp = e.hp;
    return e;
  }

  startCombat(ids: string[], kind: Combat['kind'], eventCombat = false) {
    const r = this.run!;
    const enemies = ids.map((id, i) => this.makeEnemy(id, i));
    if (kind === 'elite' && this.has('preserved_insect')) enemies.forEach((e) => { e.hp = e.maxHp = Math.floor(e.maxHp * 0.75); });
    const lament = this.relic('neows_lament');
    if (lament && lament.counter > 0) { enemies.forEach((e) => { e.hp = 1; }); lament.counter--; }
    if (this.has('philosophers_stone')) enemies.forEach((e) => { e.powers.strength = 1; });
    const player: Creature = { uid: 0, name: '铁甲战士', hp: r.hp, maxHp: r.maxHp, block: 0, powers: {}, fx: [], anim: '', animKey: 0, justApplied: {} };
    const deck = r.deck.map((c) => ({ ...c }));
    shuffle(deck);
    const innate = deck.filter((c) => isInnate(c));
    const rest = deck.filter((c) => !isInnate(c));
    const draw = [...rest, ...innate]; // top = end
    if (this.has('mark_of_pain')) { draw.unshift(this.makeCard('wound')); draw.unshift(this.makeCard('wound')); shuffle(draw); }
    const maxEnergy = 3 + ENERGY_RELICS.filter((id) => this.has(id)).length;
    this.c = {
      player, enemies, hand: [], draw, discard: [], exhaust: [], energy: 0, maxEnergy, turn: 0, phase: 'busy', kind,
      timesHpLost: 0, attacksThisTurn: 0, skillsThisTurn: 0, cardsThisTurn: 0, playing: null, penNibActive: false,
      puzzleUsed: false, redSkullOn: false, shake: 0, banner: null, speech: [], eventCombat,
    };
    this.targetingPotion = null;
    this.overlay = null;
    // relics at start
    if (this.has('anchor')) this.addBlock(player, 10);
    if (this.has('bag_of_marbles')) enemies.forEach((e) => this.apply(e, 'vulnerable', 1));
    if (this.has('blood_vial')) this.heal(2);
    if (this.has('bronze_scales')) this.apply(player, 'thorns', 3);
    if (this.has('oddly_smooth_stone')) this.apply(player, 'dexterity', 1);
    if (this.has('vajra')) this.apply(player, 'strength', 1);
    if (this.has('akabeko')) this.apply(player, 'vigor', 8);
    this.applyGirya();
    this.checkRedSkull();
    enemies.forEach((e) => this.decideMove(e));
    this.screen = 'combat';
    this.emit();
    setTimeout(() => this.startPlayerTurn(), 600);
  }

  // ================= enemy moves =================
  setMove(e: Enemy, id: string) {
    const d = ENEMIES[e.id];
    const md = d.moves[id];
    let dmg: number | undefined = undefined;
    if (md.dmg !== undefined) {
      const raw = typeof md.dmg === 'function' ? md.dmg(e, this) : md.dmg;
      dmg = e.id === 'hexaghost' && id === 'divider' ? raw : Math.round(raw * (e.data.dm || 1));
    }
    e.move = { id, name: md.name, intent: md.intent, dmg, hits: md.hits };
  }
  decideMove(e: Enemy) {
    if (e.data.splitPending) { this.setMove(e, 'split'); return; }
    this.setMove(e, ENEMIES[e.id].next(e, this));
  }

  // ================= turn flow =================
  startPlayerTurn() {
    const c = this.c;
    if (!c || c.phase === 'won' || c.phase === 'lost') return;
    const p = c.player;
    c.turn++;
    if (!p.powers.barricade) p.block = this.has('calipers') ? Math.max(0, p.block - 15) : 0;
    delete p.powers.flamebarrier;
    const base = c.maxEnergy;
    c.energy = this.has('ice_cream') ? c.energy + base : base;
    if (c.turn === 1 && this.has('lantern')) c.energy += 1;
    const hf = this.relic('happy_flower');
    if (hf) { hf.counter = (hf.counter + 1) % 3; if (hf.counter === 0) { c.energy += 1; sfx.energy(); } }
    if (p.powers.berserk) c.energy += p.powers.berserk;
    c.attacksThisTurn = 0; c.skillsThisTurn = 0; c.cardsThisTurn = 0;
    if (p.powers.demonform) this.apply(p, 'strength', p.powers.demonform);
    if (p.powers.nextblock) { this.addBlock(p, p.powers.nextblock); delete p.powers.nextblock; }
    if (c.turn === 2 && this.has('horn_cleat')) this.addBlock(p, 14);
    if (c.turn === 3 && this.has('captains_wheel')) this.addBlock(p, 18);
    if (this.has('mercury_hourglass')) this.alive().forEach((e) => this.damageEnemy(e, 3, false));
    if (!this.c || this.c.phase === 'won') return;
    let n = 5;
    if (c.turn === 1) n = Math.max(5, c.draw.filter((x) => isInnate(x)).length);
    this.draw(n);
    if (p.powers.brutality) { this.loseHp(p.powers.brutality); this.draw(p.powers.brutality); }
    c.phase = 'player';
    c.banner = { text: c.turn === 1 ? '战斗开始' : '玩家回合', key: this.fxId++ };
    sfx.turn();
    this.emit();
  }

  draw(n: number) {
    const c = this.c;
    if (!c) return;
    for (let i = 0; i < n; i++) {
      if (c.player.powers.nodraw) break;
      if (c.hand.length >= 10) { break; }
      if (!c.draw.length) {
        if (!c.discard.length) break;
        c.draw = shuffle(c.discard);
        c.discard = [];
      }
      const card = c.draw.pop()!;
      c.hand.push(card);
      sfx.draw();
      const t = this.def(card).type;
      if (t === 'status' && c.player.powers.evolve) this.draw(c.player.powers.evolve);
      if ((t === 'status' || t === 'curse') && c.player.powers.firebreathing) {
        const amt = c.player.powers.firebreathing;
        this.alive().forEach((e) => this.damageEnemy(e, amt, false));
      }
    }
    this.emit();
  }

  costOf(card: CardInst): number {
    const d = this.def(card);
    if (d.cost === -2 || d.cost === -1) return d.cost;
    let cost = baseCost(card);
    if (card.costCombat != null) cost = card.costCombat;
    if (card.costTurn != null) cost = card.costTurn;
    if (this.c) {
      if (d.type === 'skill' && this.c.player.powers.corruption) cost = 0;
      if (d.id === 'blood_for_blood') cost = Math.max(0, cost - this.c.timesHpLost);
    }
    return cost;
  }

  canPlay(card: CardInst): string | null {
    const c = this.c;
    if (!c || c.phase !== 'player') return '现在不能出牌。';
    const d = this.def(card);
    if (d.cost === -2) return d.type === 'curse' ? '我不能打出诅咒牌。' : '我不能打出这张牌。';
    const cost = this.costOf(card);
    if (cost > c.energy) return '我没有足够的能量。';
    if (this.has('velvet_choker') && c.cardsThisTurn >= 6) return '我这回合不能再出牌了。';
    if (d.canPlay) return d.canPlay(this, card);
    return null;
  }

  async playCard(uid: number, targetUid?: number): Promise<boolean> {
    const c = this.c;
    if (!c || c.phase !== 'player') return false;
    const card = c.hand.find((x) => x.uid === uid);
    if (!card) return false;
    const err = this.canPlay(card);
    if (err) { this.say(c.player, err); sfx.error(); this.emit(); return false; }
    const d = this.def(card);
    let t: Enemy | null = null;
    if (d.target === 'enemy') {
      t = c.enemies.find((e) => e.uid === targetUid && !e.dead) ?? null;
      if (!t) { const a = this.alive(); if (a.length === 1) t = a[0]; else return false; }
    }
    const cost = this.costOf(card);
    const x = cost === -1 ? c.energy : 0;
    c.energy -= cost === -1 ? c.energy : cost;
    c.hand = c.hand.filter((h) => h.uid !== uid);
    await this.playInternal(card, t, x, false);
    return true;
  }

  async playInternal(card: CardInst, t: Enemy | null, x: number, forceExhaust: boolean) {
    const c = this.c!;
    const d = this.def(card);
    c.phase = 'busy';
    c.playing = { card, key: this.fxId++ };
    const key = c.playing.key;
    setTimeout(() => { if (this.c && this.c.playing?.key === key) { this.c.playing = null; this.emit(); } }, 550);
    sfx.card();
    c.cardsThisTurn++;
    const isAttack = d.type === 'attack';
    if (isAttack) {
      c.attacksThisTurn++;
      const nib = this.relic('pen_nib');
      if (nib) { nib.counter++; if (nib.counter >= 10) { nib.counter = 0; c.penNibActive = true; } }
      this.anim(c.player, 'attack');
    } else if (d.type === 'skill') c.skillsThisTurn++;
    else if (d.type === 'power') this.anim(c.player, 'power');
    this.emit();

    await this.resolveCard(card, t, x);
    if (isAttack && c.player.powers.doubletap > 0 && !this.over()) {
      c.player.powers.doubletap--;
      if (!c.player.powers.doubletap) delete c.player.powers.doubletap;
      await sleep(200);
      const t2 = t && !t.dead ? t : d.target === 'enemy' ? this.randomEnemy() : null;
      await this.resolveCard(card, t2, x);
    }
    if (isAttack) { delete c.player.powers.vigor; c.penNibActive = false; }
    if (this.over()) { this.emit(); return; }
    // post triggers
    if (isAttack && c.player.powers.rage) this.addBlock(c.player, c.player.powers.rage);
    if (d.type === 'skill') this.alive().forEach((e) => { if (e.powers.enrage) this.apply(e, 'strength', e.powers.enrage); });
    if (isAttack) this.alive().forEach((e) => { if (e.powers.sharphide) this.damagePlayer(e.powers.sharphide, null, false); });
    if (isAttack && c.attacksThisTurn % 3 === 0) {
      if (this.has('kunai')) this.apply(c.player, 'dexterity', 1);
      if (this.has('shuriken')) this.apply(c.player, 'strength', 1);
      if (this.has('ornamental_fan')) this.addBlock(c.player, 4);
    }
    if (d.type === 'skill' && c.skillsThisTurn % 3 === 0 && this.has('letter_opener')) this.alive().forEach((e) => this.damageEnemy(e, 5, false));
    // destination
    if (d.type === 'power') { /* removed from play */ }
    else if (forceExhaust || isExhaust(card) || (d.type === 'skill' && c.player.powers.corruption)) { c.exhaust.push(card); this.onExhaust(card); }
    else c.discard.push(card);
    this.checkEnd();
    if (this.c && this.c.phase === 'busy') this.c.phase = 'player';
    this.emit();
  }

  async resolveCard(card: CardInst, t: Enemy | null, x: number) {
    const d = this.def(card);
    const v = this.vals(card);
    if (d.play) await d.play(this, card, t, v, x);
    this.emit();
  }

  async playTopOfDraw() {
    const c = this.c!;
    if (!c.draw.length) { c.draw = shuffle(c.discard); c.discard = []; }
    const card = c.draw.pop();
    if (!card) return;
    const d = this.def(card);
    if (d.cost === -2 || (d.canPlay && d.canPlay(this, card))) { c.exhaust.push(card); this.onExhaust(card); return; }
    const t = d.target === 'enemy' ? this.randomEnemy() : null;
    const prev = c.phase;
    await this.resolveCard(card, t, c.energy);
    c.exhaust.push(card);
    this.onExhaust(card);
    c.phase = prev;
  }

  // ================= damage / block =================
  calcPlayerAttack(base: number, t: Enemy | null, strMult = 1, penNib?: boolean) {
    const p = this.c!.player;
    let d = base + (p.powers.strength || 0) * strMult + (p.powers.vigor || 0);
    if (penNib ?? this.c!.penNibActive) d *= 2;
    if (p.powers.weak) d *= 0.75;
    if (t && t.powers.vulnerable) d *= this.has('paper_phrog') ? 1.75 : 1.5;
    return Math.max(0, Math.floor(d));
  }
  calcEnemyAttack(e: Enemy, base: number) {
    const p = this.c!.player;
    let d = base + (e.powers.strength || 0);
    if (e.powers.weak) d *= 0.75;
    if (p.powers.vulnerable) d *= 1.5;
    return Math.max(0, Math.floor(d));
  }
  calcBlock(base: number) {
    const p = this.c!.player;
    let b = base + (p.powers.dexterity || 0);
    if (p.powers.frail) b *= 0.75;
    return Math.max(0, Math.floor(b));
  }

  attack(t: Enemy, base: number, strMult = 1): number {
    if (!t || t.dead || !this.c) return 0;
    const dmg = this.calcPlayerAttack(base, t, strMult);
    sfx.slash();
    return this.damageEnemy(t, dmg, true);
  }
  attackAll(base: number): number {
    let total = 0;
    for (const e of this.alive()) total += this.attack(e, base);
    return total;
  }

  gainBlock(base: number) { this.addBlock(this.p, this.calcBlock(base)); }
  addBlock(cr: Creature, n: number) {
    if (n <= 0 || !this.c) return;
    cr.block += n;
    this.fx(cr, `+${n}`, 'fx-block');
    sfx.block();
    if (cr.uid === 0 && cr.powers.juggernaut) { const e = this.randomEnemy(); if (e) this.damageEnemy(e, cr.powers.juggernaut, false); }
  }

  damageEnemy(e: Enemy, dmg: number, isAttack: boolean): number {
    if (e.dead || !this.c) return 0;
    const blocked = Math.min(e.block, dmg);
    e.block -= blocked;
    let loss = dmg - blocked;
    const before = e.hp;
    if (loss > 0) {
      e.hp -= loss;
      this.fx(e, `${loss}`, loss >= 20 ? 'fx-dmg big' : 'fx-dmg');
      this.anim(e, 'hit');
      sfx.hit(loss >= 15);
      if (loss >= 25) this.c.shake++;
    } else if (blocked > 0) {
      this.fx(e, '格挡', 'fx-blocked');
      sfx.blocked();
    } else {
      this.fx(e, '0', 'fx-dmg');
    }
    loss = Math.min(loss, before);
    if (isAttack && loss > 0 && e.powers.curlup && e.hp > 0) {
      const b = e.powers.curlup; delete e.powers.curlup; this.addBlock(e, b); this.say(e, '蜷缩！');
    }
    if (loss > 0 && e.powers.asleep && e.hp > 0) this.wakeLagavulin(e, true);
    if (loss > 0 && e.powers.modeshift && e.data.mode === 'off' && e.hp > 0) {
      e.powers.modeshift -= loss;
      if (e.powers.modeshift <= 0) {
        delete e.powers.modeshift;
        e.data.mode = 'def'; e.data.def = 1;
        this.addBlock(e, 20);
        this.setMove(e, 'def_mode');
        this.say(e, '切换为防御形态');
      }
    }
    if (e.hp <= 0) this.killEnemy(e);
    else if (e.powers.split && e.hp <= e.maxHp / 2 && !e.data.splitPending) {
      e.data.splitPending = true;
      this.setMove(e, 'split');
    }
    this.emit();
    return loss;
  }

  killEnemy(e: Enemy) {
    e.hp = 0; e.dead = true; e.dying = true; e.block = 0; e.powers = {};
    sfx.death();
    setTimeout(() => { e.dying = false; this.emit(); }, 900);
    if (this.has('gremlin_horn') && this.alive().length > 0) { this.gainEnergy(1); this.draw(1); }
    this.checkEnd();
  }

  wakeLagavulin(e: Enemy, byDamage: boolean) {
    delete e.powers.asleep;
    delete e.powers.metallicize;
    this.say(e, '！！！');
    if (byDamage) this.setMove(e, 'stun');
    e.data.woke = true;
  }

  damagePlayer(dmg: number, source: Enemy | null, isAttack: boolean) {
    const c = this.c;
    if (!c || c.phase === 'lost' || c.phase === 'won') return;
    const p = c.player;
    const blocked = Math.min(p.block, dmg);
    p.block -= blocked;
    let loss = dmg - blocked;
    if (isAttack && loss > 0 && loss <= 5 && this.has('torii')) loss = 1;
    if (loss > 0 && this.has('tungsten_rod')) loss -= 1;
    if (loss > 0) {
      this.fx(p, `${loss}`, 'fx-dmg');
      this.anim(p, 'hit');
      sfx.hit(loss >= 15);
      if (loss >= 15) c.shake++;
      this.loseHpInternal(loss, false);
    } else if (blocked > 0) { this.fx(p, '格挡', 'fx-blocked'); sfx.blocked(); }
    if (isAttack && source && !source.dead) {
      if (p.powers.thorns) this.damageEnemy(source, p.powers.thorns, false);
      if (p.powers.flamebarrier && !source.dead) this.damageEnemy(source, p.powers.flamebarrier, false);
    }
  }

  loseHp(n: number) {
    if (!this.c) return;
    if (this.has('tungsten_rod')) n -= 1;
    if (n <= 0) return;
    this.fx(this.p, `${n}`, 'fx-dmg');
    this.anim(this.p, 'hit');
    sfx.hit(false);
    this.loseHpInternal(n, true);
  }

  loseHpInternal(n: number, fromCard: boolean) {
    const c = this.c!;
    const p = c.player;
    p.hp -= n;
    c.timesHpLost++;
    if (fromCard && p.powers.rupture) this.apply(p, 'strength', p.powers.rupture);
    if (!c.puzzleUsed && this.has('centennial_puzzle')) { c.puzzleUsed = true; this.draw(3); }
    if (this.has('self_forming_clay')) this.apply(p, 'nextblock', 3);
    if (p.hp <= 0) {
      const slot = this.run!.potions.indexOf('fairy');
      if (slot >= 0) {
        this.run!.potions[slot] = null;
        p.hp = Math.max(1, Math.floor(p.maxHp * 0.3));
        this.fx(p, '瓶中精灵！', 'fx-heal');
        sfx.heal();
      } else {
        p.hp = 0;
        this.run!.hp = 0;
        this.lose();
        return;
      }
    }
    this.run!.hp = p.hp;
    this.checkRedSkull();
  }

  checkRedSkull() {
    const c = this.c;
    if (!c || !this.has('red_skull')) return;
    const low = c.player.hp <= c.player.maxHp / 2;
    if (low && !c.redSkullOn) { c.redSkullOn = true; this.apply(c.player, 'strength', 3); }
    else if (!low && c.redSkullOn) { c.redSkullOn = false; this.apply(c.player, 'strength', -3); }
  }

  heal(n: number) {
    const r = this.run!;
    if (this.c && this.screen === 'combat') {
      const p = this.c.player;
      const amt = Math.min(n, p.maxHp - p.hp);
      p.hp += amt;
      r.hp = p.hp;
      if (amt > 0) { this.fx(p, `+${amt}`, 'fx-heal'); sfx.heal(); }
      this.checkRedSkull();
    } else this.healRun(n);
    this.emit();
  }
  healRun(n: number) { const r = this.run!; const before = r.hp; r.hp = Math.min(r.maxHp, r.hp + n); if (r.hp > before) sfx.heal(); this.emit(); }
  damageRun(n: number) { const r = this.run!; r.hp -= n; sfx.hit(n > 10); if (r.hp <= 0) { r.hp = 0; this.lose(); } this.emit(); }
  gainMaxHp(n: number) {
    const r = this.run!;
    r.maxHp += n; r.hp += n;
    if (this.c) { this.c.player.maxHp += n; this.c.player.hp += n; this.fx(this.c.player, `最大生命 +${n}`, 'fx-heal'); }
    sfx.heal();
    this.emit();
  }
  loseMaxHp(n: number) { const r = this.run!; r.maxHp = Math.max(1, r.maxHp - n); r.hp = Math.min(r.hp, r.maxHp); this.emit(); }
  gainGold(n: number) {
    if (this.has('ectoplasm')) { this.toast('灵体外质阻止了你获得金币。'); return; }
    this.run!.gold += n; sfx.gold(); this.emit();
  }

  apply(target: Creature, id: string, amt: number) {
    if (!amt || !this.c) return;
    const debuff = isDebuff(id, amt);
    if (debuff && target.powers.artifact > 0) {
      target.powers.artifact--;
      if (!target.powers.artifact) delete target.powers.artifact;
      this.fx(target, '抵消', 'fx-buff');
      this.emit();
      return;
    }
    const nv = (target.powers[id] || 0) + amt;
    if (nv === 0 && (id === 'strength' || id === 'dexterity')) delete target.powers[id];
    else target.powers[id] = nv;
    if (['nodraw', 'barricade', 'corruption'].includes(id)) target.powers[id] = 1;
    if (target.uid === 0 && debuff && this.c.phase === 'enemy') target.justApplied[id] = true;
    const pd = POWERS[id];
    if (pd && !['nextblock'].includes(id)) {
      this.fx(target, pd.name, debuff ? 'fx-debuff' : 'fx-buff');
      if (debuff) sfx.debuff(); else sfx.buff();
    }
    this.emit();
  }

  gainEnergy(n: number) { if (!this.c) return; this.c.energy += n; sfx.energy(); this.emit(); }

  addToHand(card: CardInst) {
    const c = this.c!;
    if (c.hand.length >= 10) c.discard.push(card); else c.hand.push(card);
    this.emit();
  }
  addToDraw(card: CardInst) { const c = this.c!; c.draw.splice(rand(0, c.draw.length), 0, card); this.emit(); }
  addToDiscard(card: CardInst) { this.c!.discard.push(card); this.emit(); }

  exhaustCard(card: CardInst) {
    const c = this.c!;
    c.hand = c.hand.filter((x) => x.uid !== card.uid);
    c.draw = c.draw.filter((x) => x.uid !== card.uid);
    c.discard = c.discard.filter((x) => x.uid !== card.uid);
    c.exhaust.push(card);
    this.onExhaust(card);
    this.emit();
  }
  onExhaust(card: CardInst) {
    const c = this.c!;
    const p = c.player;
    sfx.exhaust();
    if (p.powers.feelnopain) this.addBlock(p, p.powers.feelnopain);
    if (card.id === 'sentinel') this.gainEnergy(card.up ? 3 : 2);
    if (p.powers.darkembrace) this.draw(p.powers.darkembrace);
    if (this.has('dead_branch')) {
      const pool = CARD_LIST.filter((d) => d.color === 'red' && d.rarity !== 'basic');
      this.addToHand(this.makeCard(pick(pool).id));
    }
  }

  upgrade(card: CardInst) { if (canUpgradeDef(card)) card.up++; this.emit(); }
  upgradeAllBurns() {
    const c = this.c!;
    [...c.hand, ...c.draw, ...c.discard].forEach((x) => { if (x.id === 'burn') x.up = 1; });
  }

  selectCards(title: string, cards: CardInst[], min: number, max: number, canCancel = false, preview?: 'upgrade'): Promise<CardInst[] | null> {
    return new Promise((resolve) => {
      this.select = {
        title, cards, min, max, canCancel, preview,
        resolve: (r) => { this.select = null; this.emit(); resolve(r); },
      };
      this.emit();
    });
  }

  split(e: Enemy, ids: string[]) {
    const c = this.c!;
    const idx = c.enemies.indexOf(e);
    const hp = e.hp;
    const spawned = ids.map((id, i) => {
      const n = this.makeEnemy(id, i);
      n.hp = n.maxHp = hp;
      n.data.dm = e.data.dm;
      this.decideMove(n);
      return n;
    });
    e.dead = true; e.dying = false;
    c.enemies.splice(idx, 1, ...spawned);
    sfx.hit(true);
    this.emit();
  }

  async endTurn() {
    const c = this.c;
    if (!c || c.phase !== 'player') return;
    c.phase = 'enemy';
    this.targetingPotion = null;
    sfx.endTurn();
    const p = c.player;
    // end-of-turn hand effects
    for (const card of [...c.hand]) {
      if (card.id === 'burn') this.damagePlayer(card.up ? 4 : 2, null, false);
      if (card.id === 'decay') this.damagePlayer(2, null, false);
      if (card.id === 'regret') { const n = c.hand.length; this.fx(p, `${n}`, 'fx-dmg'); this.loseHpInternal(n, false); }
      if (card.id === 'doubt') this.apply(p, 'weak', 1);
      if (card.id === 'shame') this.apply(p, 'frail', 1);
      if (this.over()) return;
    }
    if (this.has('orichalcum') && p.block === 0) this.addBlock(p, 6);
    if (p.powers.metallicize) this.addBlock(p, p.powers.metallicize);
    if (p.powers.plated) this.addBlock(p, p.powers.plated);
    if (p.powers.combust) {
      this.loseHp(1);
      if (this.over()) return;
      const amt = p.powers.combust;
      this.alive().forEach((e) => this.damageEnemy(e, amt, false));
    }
    delete p.powers.rage;
    delete p.powers.nodraw;
    if (p.powers.flex) { this.apply(p, 'strength', -p.powers.flex); delete p.powers.flex; }
    if (this.over()) { this.emit(); return; }
    // ethereal & discard
    for (const card of [...c.hand]) if (isEthereal(card)) this.exhaustCard(card);
    if (this.has('runic_pyramid')) { /* keep hand */ }
    else { c.discard.push(...c.hand); c.hand = []; }
    [...c.hand, ...c.draw, ...c.discard].forEach((x) => { x.costTurn = null; });
    this.emit();
    await sleep(450);
    if (!this.c || this.c.phase !== 'enemy') return;
    c.banner = { text: '敌人回合', key: this.fxId++ };
    this.emit();
    await sleep(500);
    for (const e of [...c.enemies]) {
      if (e.dead || c.phase !== 'enemy') continue;
      e.block = 0;
      this.emit();
      await this.executeMove(e);
      if (c.phase !== 'enemy') return;
      if (!e.dead && c.enemies.includes(e)) {
        if (e.powers.ritual) { if (e.data.ritualSkip) e.data.ritualSkip = false; else this.apply(e, 'strength', e.powers.ritual); }
        if (e.powers.metallicize) this.addBlock(e, e.powers.metallicize);
        if (e.powers.plated) this.addBlock(e, e.powers.plated);
        this.decideMove(e);
      }
      this.emit();
      await sleep(380);
    }
    if (c.phase !== 'enemy') return;
    // end of round
    for (const cr of [p, ...this.alive()]) {
      for (const id of ['vulnerable', 'weak', 'frail']) {
        if (!cr.powers[id]) continue;
        if (cr.justApplied[id]) { cr.justApplied[id] = false; continue; }
        cr.powers[id]--;
        if (cr.powers[id] <= 0) delete cr.powers[id];
      }
    }
    this.startPlayerTurn();
  }

  async executeMove(e: Enemy) {
    const m = e.move;
    if (!m) return;
    const md = ENEMIES[e.id].moves[m.id];
    e.history.push(m.id);
    if (m.intent.startsWith('attack') && m.dmg !== undefined) {
      this.anim(e, 'eattack');
      this.emit();
      await sleep(180);
      const hits = m.hits || 1;
      for (let i = 0; i < hits; i++) {
        if (e.dead || this.c!.phase !== 'enemy') break;
        this.damagePlayer(this.calcEnemyAttack(e, m.dmg), e, true);
        this.emit();
        if (hits > 1) await sleep(160);
      }
    } else {
      this.anim(e, m.intent === 'sleep' || m.intent === 'stun' ? '' : 'ebuff');
    }
    if (this.c!.phase !== 'enemy' || e.dead) return;
    await md.act?.(e, this);
    this.emit();
  }

  checkEnd() {
    const c = this.c;
    if (!c || c.phase === 'won' || c.phase === 'lost') return;
    if (this.alive().length === 0) this.winCombat();
  }

  async winCombat() {
    const c = this.c!;
    const r = this.run!;
    c.phase = 'won';
    c.hand.forEach((h) => c.discard.push(h));
    c.hand = [];
    this.select = null;
    r.hp = c.player.hp;
    if (this.has('burning_blood')) this.heal(6);
    if (this.has('black_blood')) this.heal(12);
    if (this.has('meat_on_the_bone') && r.hp <= r.maxHp / 2) this.heal(12);
    if (c.kind === 'elite') r.elitesKilled++;
    else if (c.kind === 'boss') r.bossesKilled++;
    else r.monstersKilled++;
    sfx.victory();
    this.emit();
    await sleep(1100);
    this.genRewards(c.kind);
    this.rewardsFromBoss = c.kind === 'boss';
    this.screen = 'reward';
    this.emit();
  }

  async lose() {
    const c = this.c;
    if (c) c.phase = 'lost';
    sfx.death();
    this.emit();
    this.clearSave();
    await sleep(c ? 1500 : 600);
    this.screen = 'gameover';
    this.overlay = null;
    this.select = null;
    this.emit();
  }

  score() {
    const r = this.run!;
    return r.floor * 5 + r.monstersKilled * 2 + r.elitesKilled * 10 + r.bossesKilled * 50 + Math.floor(r.gold / 10) + (r.act - 1) * 100;
  }

  // ================= potions =================
  obtainPotion(id: string): boolean {
    const r = this.run!;
    if (this.has('sozu')) { this.toast('添水阻止了你获得药水。'); return false; }
    const slot = r.potions.indexOf(null);
    if (slot < 0) { this.toast('药水栏已满。'); return false; }
    r.potions[slot] = id;
    sfx.potion();
    this.emit();
    return true;
  }
  randomPotion() {
    const rar = weighted<'common' | 'uncommon' | 'rare'>([['common', 65], ['uncommon', 25], ['rare', 10]]);
    return pick(POTION_LIST.filter((p) => p.rarity === rar)).id;
  }
  discardPotion(slot: number) { this.run!.potions[slot] = null; this.targetingPotion = null; this.emit(); }
  async usePotion(slot: number, targetUid?: number) {
    const r = this.run!;
    const id = r.potions[slot];
    if (!id) return;
    const pd = POTIONS[id];
    const inCombat = this.screen === 'combat' && this.c && (this.c.phase === 'player');
    if (pd.combatOnly && !inCombat) { this.toast('只能在战斗中使用。'); return; }
    if (id === 'fairy') { this.toast('瓶中精灵会在你将要死亡时自动使用。'); return; }
    let t: Enemy | null = null;
    if (pd.target) {
      t = this.c!.enemies.find((e) => e.uid === targetUid && !e.dead) ?? null;
      if (!t) { const a = this.alive(); if (a.length === 1) t = a[0]; else { this.targetingPotion = slot; this.emit(); return; } }
    }
    r.potions[slot] = null;
    this.targetingPotion = null;
    sfx.potion();
    const p = this.c?.player;
    switch (id) {
      case 'fire': this.damageEnemy(t!, 20, false); break;
      case 'explosive': this.alive().forEach((e) => this.damageEnemy(e, 10, false)); break;
      case 'block': this.addBlock(p!, 12); break;
      case 'strength': this.apply(p!, 'strength', 2); break;
      case 'dexterity': this.apply(p!, 'dexterity', 2); break;
      case 'energy': this.gainEnergy(2); break;
      case 'swift': this.draw(3); break;
      case 'weak': this.apply(t!, 'weak', 3); break;
      case 'fear': this.apply(t!, 'vulnerable', 3); break;
      case 'blood': this.heal(Math.floor(r.maxHp * 0.2)); break;
      case 'ancient': this.apply(p!, 'artifact', 1); break;
      case 'steroid': this.apply(p!, 'strength', 5); this.apply(p!, 'flex', 5); break;
    }
    if (this.has('toy_ornithopter')) this.heal(5);
    this.checkEnd();
    this.emit();
  }

  // ================= relics =================
  randomRelic(tier?: RelicTier): string {
    const r = this.run!;
    const owned = new Set(r.relics.map((x) => x.id));
    const t = tier ?? weighted<RelicTier>([['common', 50], ['uncommon', 33], ['rare', 17]]);
    let pool = RELIC_LIST.filter((x) => x.tier === t && !owned.has(x.id));
    if (!pool.length) pool = RELIC_LIST.filter((x) => ['common', 'uncommon', 'rare'].includes(x.tier) && !owned.has(x.id));
    if (!pool.length) return 'strawberry';
    return pick(pool).id;
  }
  obtainRelic(id: string) {
    const r = this.run!;
    if (id === 'black_blood') r.relics = r.relics.filter((x) => x.id !== 'burning_blood');
    r.relics.push({ id, counter: id === 'neows_lament' ? 3 : 0 });
    sfx.relic();
    switch (id) {
      case 'strawberry': this.gainMaxHp(7); break;
      case 'pear': this.gainMaxHp(10); break;
      case 'mango': this.gainMaxHp(14); break;
      case 'potion_belt': r.potions.push(null, null); break;
      case 'war_paint': case 'whetstone': {
        const type = id === 'war_paint' ? 'skill' : 'attack';
        shuffle(r.deck.filter((c) => CARDS[c.id].type === type && canUpgradeDef(c))).slice(0, 2).forEach((c) => c.up++);
        break;
      }
    }
    this.toast(`获得遗物：${RELICS[id].name}`);
    this.emit();
  }

  // ================= deck =================
  addCardToDeck(card: CardInst) { this.run!.deck.push(card); this.emit(); }
  removeFromDeck(card: CardInst) {
    const r = this.run!;
    r.deck = r.deck.filter((c) => c.uid !== card.uid);
    if (card.id === 'parasite') this.loseMaxHp(3);
    this.emit();
  }
  randomCardOf(rarity: Rarity, type?: string): CardInst {
    let pool = REWARD_POOL(rarity);
    if (type) pool = pool.filter((c) => c.type === type);
    return this.makeCard(pick(pool).id);
  }
  transformCard(card: CardInst) {
    this.removeFromDeck(card);
    const pool = CARD_LIST.filter((d) => d.color === 'red' && d.rarity !== 'basic' && d.id !== card.id);
    const n = this.makeCard(pick(pool).id);
    this.addCardToDeck(n);
    return n;
  }
  addCurse(id?: string) { const c = this.makeCard(id ?? pick(CURSES)); this.addCardToDeck(c); return c; }

  rollRarity(kind: 'monster' | 'elite' | 'boss' | 'shop'): Rarity {
    const r = this.run!;
    if (kind === 'boss') return 'rare';
    const rareBase = kind === 'elite' ? 10 : kind === 'shop' ? 9 : 3;
    const uncBase = kind === 'elite' ? 40 : 37;
    const roll = Math.random() * 100;
    const rare = rareBase + (kind === 'shop' ? 0 : r.rareOffset);
    if (roll < rare) { if (kind !== 'shop') r.rareOffset = -5; return 'rare'; }
    if (roll < rare + uncBase) return 'uncommon';
    if (kind !== 'shop') r.rareOffset = Math.min(40, r.rareOffset + 1);
    return 'common';
  }
  genCardChoices(kind: 'monster' | 'elite' | 'boss', n = 3): CardInst[] {
    const r = this.run!;
    if (this.has('busted_crown')) n = Math.max(1, n - 2);
    const out: CardInst[] = [];
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      const rar = this.rollRarity(kind);
      const c = this.randomCardOf(rar);
      if (out.some((o) => o.id === c.id)) continue;
      if (rar !== 'rare' && r.act >= 2 && chance(r.act === 2 ? 0.25 : 0.5)) c.up = 1;
      out.push(c);
    }
    return out;
  }
  genRewards(kind: 'monster' | 'elite' | 'boss') {
    const r = this.run!;
    const items: RewardItem[] = [];
    let gold = kind === 'boss' ? rand(95, 105) : kind === 'elite' ? rand(25, 35) : rand(10, 20);
    if (this.has('golden_idol')) gold = Math.floor(gold * 1.25);
    if (!this.has('ectoplasm')) items.push({ kind: 'gold', amount: gold });
    if (kind !== 'boss') {
      if (Math.random() * 100 < r.potionChance) { r.potionChance -= 10; if (!this.has('sozu')) items.push({ kind: 'potion', id: this.randomPotion() }); }
      else r.potionChance += 10;
    }
    if (kind === 'elite') items.push({ kind: 'relic', id: this.randomRelic() });
    items.push({ kind: 'card', cards: this.genCardChoices(kind) });
    this.rewards = items;
    this.rewardCardIdx = null;
  }
  takeReward(i: number) {
    const it = this.rewards[i];
    if (!it || it.taken) return;
    if (it.kind === 'gold') { this.gainGold(it.amount); it.taken = true; }
    else if (it.kind === 'potion') { if (this.obtainPotion(it.id)) it.taken = true; }
    else if (it.kind === 'relic') { this.obtainRelic(it.id); it.taken = true; }
    else if (it.kind === 'card') { this.rewardCardIdx = i; sfx.click(); }
    this.emit();
  }
  pickRewardCard(card: CardInst | null) {
    const i = this.rewardCardIdx;
    if (i === null) return;
    const it = this.rewards[i];
    if (card && it.kind === 'card') { this.addCardToDeck(card); it.taken = true; sfx.card(); }
    this.rewardCardIdx = null;
    this.emit();
  }
  proceedFromRewards() {
    if (this.rewardsFromBoss) {
      this.rewardsFromBoss = false;
      const owned = new Set(this.run!.relics.map((x) => x.id));
      const pool = shuffle(RELIC_LIST.filter((x) => x.tier === 'boss' && !owned.has(x.id)));
      this.bossRelics = pool.slice(0, 3).map((x) => x.id);
      this.screen = 'bossRelic';
      this.c = null;
      this.emit();
      return;
    }
    this.goMap();
  }
  pickBossRelic(id: string | null) {
    if (id) this.obtainRelic(id);
    this.nextAct();
  }
  nextAct() {
    const r = this.run!;
    if (r.act >= 3) { this.screen = 'victory'; this.clearSave(); sfx.victory(); this.emit(); return; }
    r.act++;
    const bosses = Object.keys(BOSSES).filter((b) => !r.seenBosses.includes(b));
    const bossId = bosses.length ? pick(bosses) : pick(Object.keys(BOSSES));
    r.seenBosses.push(bossId);
    r.map = generateMap(bossId);
    r.pos = null;
    r.visited = [];
    r.monstersFought = 0;
    r.hp = r.maxHp;
    this.toast(`第 ${r.act} 层 · ${['', '底层', '城市', '深处'][r.act]}`);
    this.goMap();
  }

  // ================= treasure =================
  openChest() {
    if (this.chestOpened) return;
    this.chestOpened = true;
    const t = this.chestSize;
    const tier = weighted<RelicTier>(t === 'small' ? [['common', 75], ['uncommon', 25]] : t === 'medium' ? [['common', 35], ['uncommon', 50], ['rare', 15]] : [['uncommon', 75], ['rare', 25]]);
    const items: RewardItem[] = [];
    const goldChance = t === 'small' ? 0.5 : t === 'medium' ? 0.35 : 0.5;
    if (chance(goldChance)) items.push({ kind: 'gold', amount: t === 'small' ? rand(23, 27) : t === 'medium' ? rand(45, 55) : rand(68, 82) });
    items.push({ kind: 'relic', id: this.randomRelic(tier) });
    if (this.has('cursed_key')) { const cu = this.addCurse(); this.toast(`诅咒钥匙：获得 ${CARDS[cu.id].name}`); }
    this.rewards = items;
    this.rewardsFromBoss = false;
    sfx.relic();
    this.emit();
    setTimeout(() => { this.screen = 'reward'; this.emit(); }, 700);
  }

  // ================= rest =================
  async rest() {
    const r = this.run!;
    let amt = Math.floor(r.maxHp * 0.3);
    if (this.has('regal_pillow')) amt += 15;
    this.healRun(amt);
    this.restDone = `你休息了一会儿，回复了 ${amt} 点生命。`;
    this.emit();
  }
  async smith() {
    const r = this.run!;
    const cards = r.deck.filter((c) => canUpgradeDef(c));
    const sel = await this.selectCards('选择一张牌升级', cards, 1, 1, true, 'upgrade');
    if (!sel || !sel[0]) return;
    sel[0].up++;
    sfx.buff();
    this.restDone = `${cardName(sel[0])} 已升级。`;
    this.emit();
  }
  lift() {
    const g = this.relic('girya')!;
    g.counter++;
    this.restDone = '你举起了壶铃，感觉更强壮了。（战斗开始时获得力量）';
    sfx.buff();
    this.emit();
  }

  // ================= shop =================
  genShop() {
    const items: ShopItem[] = [];
    const types = ['attack', 'attack', 'skill', 'skill', 'power'];
    const used = new Set<string>();
    for (const t of types) {
      let card: CardInst;
      let guard = 0;
      do {
        let rar = this.rollRarity('shop');
        if (t === 'power' && rar === 'common') rar = 'uncommon';
        card = this.randomCardOf(rar, t);
      } while (used.has(card.id) && guard++ < 30);
      used.add(card.id);
      const rr = CARDS[card.id].rarity;
      const base = rr === 'rare' ? 150 : rr === 'uncommon' ? 75 : 50;
      items.push({ kind: 'card', id: card.id, card, price: Math.round(base * (0.9 + Math.random() * 0.2)), sold: false });
    }
    const saleIdx = rand(0, 4);
    items[saleIdx].price = Math.floor(items[saleIdx].price / 2);
    items[saleIdx].sale = true;
    const relicIds = new Set<string>();
    for (let i = 0; i < 3; i++) {
      let id = this.randomRelic();
      let guard = 0;
      while (relicIds.has(id) && guard++ < 20) id = this.randomRelic();
      relicIds.add(id);
      const tier = RELICS[id].tier;
      const base = tier === 'rare' ? 300 : tier === 'uncommon' ? 250 : 150;
      items.push({ kind: 'relic', id, price: Math.round(base * (0.95 + Math.random() * 0.1)), sold: false });
    }
    for (let i = 0; i < 3; i++) {
      const id = this.randomPotion();
      const rar = POTIONS[id].rarity;
      const base = rar === 'rare' ? 100 : rar === 'uncommon' ? 75 : 50;
      items.push({ kind: 'potion', id, price: Math.round(base * (0.95 + Math.random() * 0.1)), sold: false });
    }
    this.shop = { items, removeUsed: false };
  }
  buy(i: number) {
    const s = this.shop!;
    const r = this.run!;
    const it = s.items[i];
    if (it.sold) return;
    if (r.gold < it.price) { this.toast('你没有足够的金币。'); sfx.error(); return; }
    if (it.kind === 'potion') { if (!this.obtainPotion(it.id)) return; }
    else if (it.kind === 'relic') this.obtainRelic(it.id);
    else if (it.card) { this.addCardToDeck(it.card); sfx.card(); }
    r.gold -= it.price;
    it.sold = true;
    sfx.gold();
    this.emit();
  }
  async buyRemove() {
    const s = this.shop!;
    const r = this.run!;
    if (s.removeUsed) return;
    if (r.gold < r.cardRemoveCost) { this.toast('你没有足够的金币。'); sfx.error(); return; }
    const sel = await this.selectCards('选择一张牌移除', [...r.deck], 1, 1, true);
    if (!sel || !sel[0]) return;
    r.gold -= r.cardRemoveCost;
    r.cardRemoveCost += 25;
    this.removeFromDeck(sel[0]);
    s.removeUsed = true;
    sfx.gold();
    this.emit();
  }

  // ================= Neow =================
  genNeow() {
    const g = this;
    const cat1: NeowOption[] = [
      { label: '<g>移除一张牌</g>', act: async () => { const s = await g.selectCards('选择一张牌移除', [...g.run!.deck], 1, 1); s?.forEach((c) => g.removeFromDeck(c)); } },
      { label: '<g>变化一张牌</g>', act: async () => { const s = await g.selectCards('选择一张牌变化', [...g.run!.deck], 1, 1); s?.forEach((c) => g.transformCard(c)); } },
      { label: '<g>升级一张牌</g>', act: async () => { const s = await g.selectCards('选择一张牌升级', g.run!.deck.filter(canUpgradeDef), 1, 1, false, 'upgrade'); s?.forEach((c) => c.up++); } },
      { label: '<g>选择一张卡牌加入你的牌组</g>', act: async () => { const s = await g.selectCards('选择一张牌加入牌组', g.genCardChoices('monster'), 1, 1); s?.forEach((c) => g.addCardToDeck(c)); } },
      { label: '<g>接下来三场战斗中敌人只有 1 点生命</g>', act: () => g.obtainRelic('neows_lament') },
    ];
    const cat2: NeowOption[] = [
      { label: '<g>最大生命值 +8</g>', act: () => g.gainMaxHp(8) },
      { label: '<g>获得 100 金币</g>', act: () => g.gainGold(100) },
      { label: '<g>获得一件随机普通遗物</g>', act: () => g.obtainRelic(g.randomRelic('common')) },
      { label: '<g>获得 3 瓶随机药水</g>', act: () => { for (let i = 0; i < 3; i++) g.obtainPotion(g.randomPotion()); } },
      { label: '<g>选择一张稀有卡牌加入牌组</g>', act: async () => { const s = await g.selectCards('选择一张稀有牌', g.genCardChoices('boss'), 1, 1); s?.forEach((c) => g.addCardToDeck(c)); } },
    ];
    const drawbacks: [string, () => void][] = [
      ['<r>失去 10% 最大生命值</r>', () => g.loseMaxHp(8)],
      ['<r>失去所有金币</r>', () => { g.run!.gold = 0; }],
      ['<r>获得一张诅咒</r>', () => { g.addCurse(); }],
      ['<r>受到 18 点伤害</r>', () => { g.run!.hp -= 18; }],
    ];
    const rewards: [string, () => void | Promise<void>][] = [
      ['<g>移除两张牌</g>', async () => { const s = await g.selectCards('选择两张牌移除', [...g.run!.deck], 2, 2); s?.forEach((c) => g.removeFromDeck(c)); }],
      ['<g>获得 250 金币</g>', () => g.gainGold(250)],
      ['<g>获得一件随机稀有遗物</g>', () => g.obtainRelic(g.randomRelic('rare'))],
      ['<g>变化两张牌</g>', async () => { const s = await g.selectCards('选择两张牌变化', [...g.run!.deck], 2, 2); s?.forEach((c) => g.transformCard(c)); }],
      ['<g>最大生命值 +16</g>', () => g.gainMaxHp(16)],
    ];
    const dIdx = rand(0, drawbacks.length - 1);
    let rw = pick(rewards);
    if (dIdx === 1 && rw[0].includes('250')) rw = rewards[0];
    const [dl, da] = drawbacks[dIdx];
    this.neow = [
      pick(cat1),
      pick(cat2),
      { label: `${dl}，${rw[0]}`, act: async () => { da(); await rw[1](); } },
      { label: '<r>失去你的起始遗物</r>，<g>获得一件随机Boss遗物</g>', act: () => {
        g.run!.relics = g.run!.relics.filter((x) => x.id !== 'burning_blood');
        const owned = new Set(g.run!.relics.map((x) => x.id));
        const pool = RELIC_LIST.filter((x) => x.tier === 'boss' && !owned.has(x.id) && x.id !== 'black_blood');
        g.obtainRelic(pick(pool).id);
      } },
    ];
  }
  async pickNeow(i: number) {
    const o = this.neow[i];
    this.neow = [];
    this.emit();
    await o.act();
    this.goMap();
  }

  // girya bonus at combat start (applied lazily)
  applyGirya() {
    const g = this.relic('girya');
    if (g && g.counter > 0 && this.c) this.apply(this.c.player, 'strength', g.counter);
  }

  // pile helper for UI
  relicCounter(r: RelicInst) {
    const d = RELICS[r.id];
    if (!d.counter) return null;
    if (r.id === 'pen_nib') return r.counter;
    if (r.id === 'happy_flower') return r.counter;
    if (r.id === 'neows_lament') return r.counter;
    if (r.id === 'girya') return r.counter;
    if (['kunai', 'shuriken', 'ornamental_fan'].includes(r.id) && this.c) return this.c.attacksThisTurn % 3;
    if (r.id === 'letter_opener' && this.c) return this.c.skillsThisTurn % 3;
    if (r.id === 'velvet_choker' && this.c) return this.c.cardsThisTurn;
    return null;
  }
}

export const game = new Game();
(window as any).__game = game;
