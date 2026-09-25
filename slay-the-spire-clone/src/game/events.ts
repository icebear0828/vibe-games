import type { EventPage } from './types';
import type { Game } from './engine';
import { CARDS, CARD_LIST, canUpgradeDef, cardName, cardVals } from './cards';
import { RELICS } from './relics';
import { ELITE_ENCOUNTERS } from './enemies';
import { pick, rand, shuffle, chance } from './util';

export interface EventDef {
  id: string;
  name: string;
  art: string;
  cond?: (g: Game) => boolean;
  start: (g: Game) => EventPage;
}

const leave = (g: Game, label = '[离开]') => ({ label, pick: () => g.goMap() });
const done = (g: Game, text: string): EventPage => ({ text, options: [leave(g)] });

export const EVENTS: EventDef[] = [
  {
    id: 'big_fish', name: '大鱼', art: '🐟',
    start: (g) => {
      const r = g.run!;
      const heal = Math.floor(r.maxHp / 3);
      return {
        text: '当你走过一条长长的走廊时，你看见一根<y>香蕉</y>、一个<y>甜甜圈</y>和一个<y>盒子</y>漂浮在半空中。\n\n没有任何绳索支撑它们，它们就这么静静地悬浮着……',
        options: [
          { label: `[香蕉] <g>回复 ${heal} 点生命。</g>`, pick: () => { g.healRun(heal); g.setEventPage(done(g, '你吃掉了香蕉。营养丰富！你感觉好多了。')); } },
          { label: '[甜甜圈] <g>最大生命值 +5。</g>', pick: () => { g.gainMaxHp(5); g.setEventPage(done(g, '你吃掉了甜甜圈。真好吃！你感觉充满活力。')); } },
          { label: '[盒子] <g>获得一件遗物。</g><r>成为被诅咒的——悔恨。</r>', pick: () => {
            const id = g.randomRelic(); g.obtainRelic(id); g.addCurse('regret');
            g.setEventPage(done(g, `你抓住了盒子。里面有一件<y>${RELICS[id].name}</y>！\n但你隐约感觉到自己做出了一个会后悔的决定……`));
          } },
        ],
      };
    },
  },
  {
    id: 'golden_idol', name: '金色神像', art: '🗿',
    start: (g) => ({
      text: '你来到一间空旷的石室，中央的祭坛上放着一尊闪闪发光的<y>金色神像</y>。\n\n四周的墙壁上刻满了奇怪的符号，地面上有几块明显松动的石板……这看起来像是一个陷阱。',
      options: [
        { label: '[拿取] <g>获得金色神像。</g><r>触发陷阱。</r>', pick: () => {
          g.obtainRelic('golden_idol');
          const r = g.run!;
          const dmg = Math.floor(r.maxHp * 0.25);
          const mhp = Math.floor(r.maxHp * 0.08);
          g.setEventPage({
            text: '你刚把神像从祭坛上拿起，身后就传来一阵隆隆的轰鸣声！\n\n一块<r>巨大的圆石</r>正朝你滚来！',
            options: [
              { label: '[冲出去] <r>获得诅咒——受伤。</r>', pick: () => { g.addCurse('injury'); g.setEventPage(done(g, '你全速冲出了石室，但在逃跑途中扭伤了身体。')); } },
              { label: `[撞碎] <r>受到 ${dmg} 点伤害。</r>`, pick: () => { g.damageRun(dmg); if (g.run!.hp > 0) g.setEventPage(done(g, '你迎着巨石冲了上去，用身体把它撞得粉碎！好痛……')); } },
              { label: `[躲藏] <r>失去 ${mhp} 点最大生命值。</r>`, pick: () => { g.loseMaxHp(mhp); g.setEventPage(done(g, '你挤进墙上的一个缝隙里，巨石擦身而过，刮掉了你的一大块皮肉。')); } },
            ],
          });
        } },
        leave(g, '[离开] 什么也不会发生。'),
      ],
    }),
  },
  {
    id: 'cleric', name: '牧师', art: '🧙',
    start: (g) => {
      const r = g.run!;
      const heal = Math.floor(r.maxHp * 0.25);
      return {
        text: '一个奇怪的蓝色人形生物，戴着一顶夸张的高帽子，对你露出了友善的微笑。\n\n“你好啊，旅行者！需要我的服务吗？只需要一点点金币哦！”',
        options: [
          { label: `[治疗] <y>35 金币</y>：<g>回复 ${heal} 点生命。</g>`, disabled: r.gold < 35, pick: () => { r.gold -= 35; g.healRun(heal); g.setEventPage(done(g, '一道温暖的光芒笼罩了你。你的伤口愈合了。')); } },
          { label: '[净化] <y>50 金币</y>：<g>从你的牌组中移除一张牌。</g>', disabled: r.gold < 50, pick: async () => {
            const s = await g.selectCards('选择一张牌移除', [...r.deck], 1, 1, true);
            if (!s || !s[0]) return;
            r.gold -= 50; g.removeFromDeck(s[0]);
            g.setEventPage(done(g, `牧师念了一段咒语，<y>${cardName(s[0])}</y>从你的记忆中消失了。`));
          } },
          leave(g),
        ],
      };
    },
  },
  {
    id: 'living_wall', name: '活墙', art: '🧱',
    start: (g) => {
      const r = g.run!;
      const act = (title: string, filter: (c: any) => boolean, fn: (c: any) => string) => async () => {
        const s = await g.selectCards(title, r.deck.filter(filter), 1, 1, true, title.includes('升级') ? 'upgrade' : undefined);
        if (!s || !s[0]) return;
        g.setEventPage(done(g, fn(s[0])));
      };
      return {
        text: '一面布满了眼睛和嘴巴的墙挡住了你的去路。\n\n“<y>遗忘……改变……成长……</y>”无数张嘴异口同声地低语着，“选择吧……然后你才能通过。”',
        options: [
          { label: '[遗忘] <g>移除一张牌。</g>', pick: act('选择一张牌移除', () => true, (c) => { g.removeFromDeck(c); return '你忘掉了一些东西。墙壁缓缓打开了。'; }) },
          { label: '[改变] <g>变化一张牌。</g>', pick: act('选择一张牌变化', () => true, (c) => { const n = g.transformCard(c); return `你的${CARDS[c.id].name}变成了<y>${CARDS[n.id].name}</y>。墙壁缓缓打开了。`; }) },
          { label: '[成长] <g>升级一张牌。</g>', pick: act('选择一张牌升级', canUpgradeDef, (c) => { c.up++; return `你的<y>${cardName(c)}</y>变得更强了。墙壁缓缓打开了。`; }) },
        ],
      };
    },
  },
  {
    id: 'scrap_ooze', name: '废料软泥', art: '🦠',
    start: (g) => {
      let dmg = 3; let ch = 25;
      const page = (): EventPage => ({
        text: '你遇到了一团由废金属和黏液组成的软泥怪。它似乎已经死了很久了。\n\n在它半透明的身体深处，你看到了什么东西在闪闪发光……',
        options: [
          { label: `[伸手进去] <r>失去 ${dmg} 点生命。</r><g>${ch}% 的几率找到一件遗物。</g>`, pick: () => {
            g.damageRun(dmg);
            if (g.run!.hp <= 0) return;
            if (Math.random() * 100 < ch) { const id = g.randomRelic(); g.obtainRelic(id); g.setEventPage(done(g, `你在黏液深处摸到了一件<y>${RELICS[id].name}</y>！`)); return; }
            dmg++; ch += 10; g.setEventPage(page());
          } },
          leave(g),
        ],
      });
      return page();
    },
  },
  {
    id: 'shining_light', name: '闪耀之光', art: '✨',
    start: (g) => {
      const r = g.run!;
      const dmg = Math.floor(r.maxHp * 0.2);
      return {
        text: '你面前出现了一团耀眼的光芒，它散发着令人不安的强大能量。\n\n你感觉如果走进去，你会被彻底改变——或者被烧伤。',
        options: [
          { label: `[进入] <g>升级 2 张随机牌。</g><r>受到 ${dmg} 点伤害。</r>`, pick: () => {
            const cs = shuffle(r.deck.filter(canUpgradeDef)).slice(0, 2);
            cs.forEach((c) => c.up++);
            g.damageRun(dmg);
            if (r.hp > 0) g.setEventPage(done(g, `光芒灼烧着你的皮肤……\n\n${cs.map((c) => `<y>${cardName(c)}</y>`).join('、') || '没有牌'}得到了升级。`));
          } },
          leave(g),
        ],
      };
    },
  },
  {
    id: 'world_of_goop', name: '黏液世界', art: '🟢',
    start: (g) => {
      const lose = Math.min(g.run!.gold, rand(20, 50));
      return {
        text: '你掉进了一个满是黏液的水坑里！\n\n在黏液中，你看到了一堆闪闪发光的<y>金币</y>……但它们被粘稠的酸液包裹着。',
        options: [
          { label: '[收集金币] <g>获得 75 金币。</g><r>受到 11 点伤害。</r>', pick: () => { g.gainGold(75); g.damageRun(11); if (g.run!.hp > 0) g.setEventPage(done(g, '你忍着酸液的灼痛，捞出了一大把金币。')); } },
          { label: `[放弃] <r>失去 ${lose} 金币。</r>`, pick: () => { g.run!.gold -= lose; g.setEventPage(done(g, '你挣扎着爬出了水坑，但有些金币从你的口袋里掉进了黏液中。')); } },
        ],
      };
    },
  },
  {
    id: 'golden_wing', name: '金翼雕像', art: '🪽',
    start: (g) => {
      const r = g.run!;
      const canBreak = r.deck.some((c) => (cardVals(c, null).dmg || 0) >= 10);
      return {
        text: '一尊巨大的鸟形雕像矗立在你面前，它的翅膀由纯金打造，底座上刻着一行模糊的铭文。\n\n空气中弥漫着一种神圣而压抑的气息。',
        options: [
          { label: '[祈祷] <g>移除一张牌。</g><r>失去 7 点生命。</r>', pick: async () => {
            const s = await g.selectCards('选择一张牌移除', [...r.deck], 1, 1, true);
            if (!s || !s[0]) return;
            g.removeFromDeck(s[0]); g.damageRun(7);
            if (r.hp > 0) g.setEventPage(done(g, '你跪下祈祷。一阵剧痛之后，你感觉身心都变得轻盈了。'));
          } },
          { label: canBreak ? '[摧毁] <g>获得 50-80 金币。</g>' : '[锁定] 需要一张伤害不低于 10 点的攻击牌。', disabled: !canBreak, pick: () => {
            const n = rand(50, 80); g.gainGold(n); g.setEventPage(done(g, `你一击砸碎了雕像的翅膀，收集到了 <y>${n}</y> 金币。`));
          } },
          leave(g),
        ],
      };
    },
  },
  {
    id: 'serpent', name: '大蛇', art: '🐍',
    start: (g) => ({
      text: '一条巨大的蛇从阴影中探出头来，吐着信子。\n\n“嘶嘶嘶……旅行者……你想要……<y>财富</y>吗？我可以给你……只要你……答应我……一个小小的条件……”',
      options: [
        { label: '[同意] <g>获得 175 金币。</g><r>成为被诅咒的——疑虑。</r>', pick: () => { g.gainGold(175); g.addCurse('doubt'); g.setEventPage(done(g, '大蛇吐出了一堆金币，然后发出了刺耳的笑声。你心中开始涌起一丝不安……')); } },
        { label: '[拒绝]', pick: () => g.setEventPage(done(g, '“嘶嘶……真可惜……”大蛇缩回了阴影中。')) },
      ],
    }),
  },
  {
    id: 'dead_adventurer', name: '死去的冒险者', art: '💀',
    start: (g) => {
      let risk = 25;
      const loot = shuffle(['gold', 'nothing', 'relic']);
      const page = (msg = ''): EventPage => ({
        text: `${msg}你在地上发现了一具冒险者的尸体。他的盔甲被撕裂了，看起来像是被某种强大的生物杀死的。\n\n他的背包似乎还没有被翻过……但杀死他的东西可能还在附近。`,
        options: [
          { label: `[搜寻] <g>发现战利品。</g><r>${risk}% 的几率被怪物发现。</r>`, disabled: loot.length === 0, pick: () => {
            if (Math.random() * 100 < risk) {
              g.setEventPage({ text: '你听见身后传来一声低沉的咆哮……\n\n<r>杀死这名冒险者的怪物回来了！</r>', options: [{ label: '[战斗]', pick: () => g.startCombat(pick(ELITE_ENCOUNTERS).enemies(), 'elite', true) }] });
              return;
            }
            const l = loot.pop();
            let m = '';
            if (l === 'gold') { g.gainGold(30); m = '你找到了 <y>30</y> 金币。\n\n'; }
            else if (l === 'relic') { const id = g.randomRelic(); g.obtainRelic(id); m = `你找到了<y>${RELICS[id].name}</y>！\n\n`; }
            else m = '你什么都没有找到。\n\n';
            risk += 25;
            g.setEventPage(page(m));
          } },
          leave(g),
        ],
      });
      return page();
    },
  },
  {
    id: 'golden_shrine', name: '金色神龛', art: '⛩️',
    start: (g) => ({
      text: '你面前是一座金光闪闪的神龛，供奉着某位早已被遗忘的神明。\n\n神龛上堆满了信徒留下的供品……',
      options: [
        { label: '[祈祷] <g>获得 100 金币。</g>', pick: () => { g.gainGold(100); g.setEventPage(done(g, '一阵金色的光芒闪过，你的钱袋变得沉甸甸的。')); } },
        { label: '[亵渎] <g>获得 275 金币。</g><r>成为被诅咒的——悔恨。</r>', pick: () => { g.gainGold(275); g.addCurse('regret'); g.setEventPage(done(g, '你拆下了神龛上所有的黄金。你感觉到某种注视正落在你身上……')); } },
        leave(g),
      ],
    }),
  },
  {
    id: 'library', name: '图书馆', art: '📚',
    start: (g) => {
      const heal = Math.floor(g.run!.maxHp * 0.33);
      return {
        text: '你发现了一座废弃的图书馆。书架上摆满了古老的典籍，空气中弥漫着纸张和灰尘的气味。\n\n角落里有一张看起来很舒服的旧沙发。',
        options: [
          { label: '[阅读] <g>从 20 张牌中选择一张加入牌组。</g>', pick: async () => {
            const pool = shuffle(CARD_LIST.filter((d) => d.color === 'red' && d.rarity !== 'basic')).slice(0, 20).map((d) => g.makeCard(d.id));
            const s = await g.selectCards('选择一张牌加入你的牌组', pool, 1, 1, true);
            if (!s || !s[0]) return;
            g.addCardToDeck(s[0]);
            g.setEventPage(done(g, `你从一本古书中学会了<y>${cardName(s[0])}</y>。`));
          } },
          { label: `[睡觉] <g>回复 ${heal} 点生命。</g>`, pick: () => { g.healRun(heal); g.setEventPage(done(g, '你在沙发上沉沉睡去，醒来时感觉精神焕发。')); } },
        ],
      };
    },
  },
  {
    id: 'upgrade_shrine', name: '升级神龛', art: '🔼',
    start: (g) => ({
      text: '一座古老的神龛散发着柔和的光芒。你感觉到它可以强化你的某项技艺。',
      options: [
        { label: '[祈祷] <g>升级一张牌。</g>', disabled: !g.run!.deck.some(canUpgradeDef), pick: async () => {
          const s = await g.selectCards('选择一张牌升级', g.run!.deck.filter(canUpgradeDef), 1, 1, true, 'upgrade');
          if (!s || !s[0]) return;
          s[0].up++;
          g.setEventPage(done(g, `<y>${cardName(s[0])}</y>得到了升级。`));
        } },
        leave(g),
      ],
    }),
  },
  {
    id: 'purifier', name: '净化者', art: '🕊️',
    start: (g) => ({
      text: '一座洁白的神龛静静地立在那里。它的表面光滑如镜，映出你疲惫的面容。\n\n你感觉它可以洗去你的某段记忆。',
      options: [
        { label: '[祈祷] <g>移除一张牌。</g>', pick: async () => {
          const s = await g.selectCards('选择一张牌移除', [...g.run!.deck], 1, 1, true);
          if (!s || !s[0]) return;
          g.removeFromDeck(s[0]);
          g.setEventPage(done(g, `<y>${cardName(s[0])}</y>被净化了。`));
        } },
        leave(g),
      ],
    }),
  },
  {
    id: 'transmogrifier', name: '变形者', art: '🔮',
    start: (g) => ({
      text: '一座扭曲的神龛，周围的空间似乎在不断地变化着形状。\n\n你感觉它可以改变你的某项技艺。',
      options: [
        { label: '[祈祷] <g>变化一张牌。</g>', pick: async () => {
          const s = await g.selectCards('选择一张牌变化', [...g.run!.deck], 1, 1, true);
          if (!s || !s[0]) return;
          const n = g.transformCard(s[0]);
          g.setEventPage(done(g, `你的${CARDS[s[0].id].name}变成了<y>${cardName(n)}</y>。`));
        } },
        leave(g),
      ],
    }),
  },
  {
    id: 'bonfire', name: '篝火精灵', art: '🔥',
    start: (g) => ({
      text: '你遇到了一团篝火，火焰中有几个小小的精灵在跳舞。\n\n“献上一件东西吧！”它们齐声唱道，“我们会根据它的价值回报你！”',
      options: [
        { label: '[献祭] 献上一张牌，获得回报。', pick: async () => {
          const r = g.run!;
          const s = await g.selectCards('选择一张牌献祭', [...r.deck], 1, 1, true);
          if (!s || !s[0]) return;
          const c = s[0];
          g.removeFromDeck(c);
          const rar = CARDS[c.id].rarity;
          let msg = '';
          if (rar === 'curse') { g.healRun(5); msg = '精灵们发出了厌恶的尖叫，但还是把诅咒烧掉了。你回复了 5 点生命。'; }
          else if (rar === 'basic') msg = '“就这？”精灵们失望地摇了摇头。什么也没有发生。';
          else if (rar === 'common') { g.healRun(5); msg = '精灵们满意地跳起舞来。你回复了 <g>5</g> 点生命。'; }
          else if (rar === 'uncommon') { g.healRun(r.maxHp); msg = '精灵们欢呼雀跃！温暖的火焰笼罩了你，你的生命完全恢复了。'; }
          else { g.gainMaxHp(10); g.healRun(r.maxHp); msg = '精灵们惊叹不已！你的最大生命值 <g>+10</g>，并且生命完全恢复了。'; }
          g.setEventPage(done(g, msg));
        } },
        leave(g),
      ],
    }),
  },
  {
    id: 'wheel', name: '命运之轮', art: '🎡',
    start: (g) => ({
      text: '一个穿着华丽服饰的小丑站在一个巨大的转盘旁边。\n\n“来吧来吧！转一转命运之轮！每个人都有奖品——大概吧！”',
      options: [
        { label: '[转动]', pick: async () => {
          const r = g.run!;
          const res = pick(['gold', 'relic', 'heal', 'curse', 'remove', 'damage']);
          let msg = '';
          if (res === 'gold') { const n = 100 * r.act; g.gainGold(n); msg = `转盘停在了金币上！你获得了 <y>${n}</y> 金币。`; }
          else if (res === 'relic') { const id = g.randomRelic(); g.obtainRelic(id); msg = `转盘停在了宝箱上！你获得了<y>${RELICS[id].name}</y>。`; }
          else if (res === 'heal') { g.healRun(r.maxHp); msg = '转盘停在了心形上！你的生命完全恢复了。'; }
          else if (res === 'curse') { const c = g.addCurse('decay'); msg = `转盘停在了骷髅上……你获得了诅咒<r>${CARDS[c.id].name}</r>。`; }
          else if (res === 'remove') {
            const s = await g.selectCards('选择一张牌移除', [...r.deck], 1, 1, false);
            s?.forEach((c) => g.removeFromDeck(c));
            msg = '转盘停在了火焰上！你移除了一张牌。';
          } else { const n = Math.floor(r.maxHp * 0.1); g.damageRun(n); msg = `转盘停在了匕首上！小丑刺了你一刀，你受到了 <r>${n}</r> 点伤害。`; }
          if (r.hp > 0) g.setEventPage(done(g, msg));
        } },
        leave(g),
      ],
    }),
  },
  {
    id: 'mysterious_sphere', name: '神秘宝珠', art: '🔵', cond: (g) => g.run!.floor > 6 && chance(0.5),
    start: (g) => ({
      text: '一颗漂浮的蓝色宝珠在昏暗的房间中缓缓旋转，它散发出的光芒让你感到一阵眩晕。\n\n你感觉它在呼唤你……',
      options: [
        { label: '[触碰] <g>获得一件稀有遗物。</g><r>受到 15 点伤害。</r>', pick: () => {
          g.damageRun(15);
          if (g.run!.hp <= 0) return;
          const id = g.randomRelic('rare'); g.obtainRelic(id);
          g.setEventPage(done(g, `宝珠碎裂开来，一阵能量冲击将你击退。碎片中躺着一件<y>${RELICS[id].name}</y>。`));
        } },
        leave(g),
      ],
    }),
  },
];
