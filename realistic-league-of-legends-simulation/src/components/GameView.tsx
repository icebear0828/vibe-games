import { useEffect, useRef, useState } from 'react';
import { Game, type GameConfig, type Unit } from '../game/engine';
import { draw, drawMinimap, type Cam } from '../game/render';
import { W, FOUNTAIN } from '../game/map';
import { playSound, speak, audioSettings } from '../game/audio';
import { BottomHUD, TopBar, AllyPanel, Announcer, KillFeed, ChatLog, Scoreboard, Shop, EndScreen } from './HUD';

const CURSOR = (col: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><path d='M2 2 L26 12 L15 15 L12 27 Z' fill='${col}' stroke='%23000' stroke-width='1.5'/><path d='M5 5 L20 12 L13 13.5 L11.5 21 Z' fill='rgba(255,255,255,0.35)'/></svg>`).replace(/%2523/g, '%23')}") 2 2, auto`;
const CUR_NORMAL = CURSOR('#d8b45a');
const CUR_ENEMY = CURSOR('#e03a3a');
const CUR_ALLY = CURSOR('#4aa0ff');

export function GameView({ cfg, onExit }: { cfg: GameConfig; onExit: () => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const mmRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [, setTick] = useState(0);
  const [shop, setShop] = useState(false);
  const [tab, setTab] = useState(false);
  const [menu, setMenu] = useState(false);
  const [msgs, setMsgs] = useState<{ t: number; text: string; color: string }[]>([]);
  const [fps, setFps] = useState(60);
  const [cursor, setCursor] = useState(CUR_NORMAL);
  const st = useRef({
    cam: { x: 0, y: 0, zoom: 1, w: 1, h: 1 } as Cam, locked: true, space: false, mouse: { x: 0, y: 0 }, screen: { x: 0, y: 0 },
    hover: null as Unit | null, held: null as number | null, hoverSlot: null as number | null, amove: false, showRange: false,
    clicks: [] as { x: number; y: number; t: number; red: boolean }[], zoomBase: 1450, mmDrag: false, rDown: false, rT: 0,
  });

  if (!gameRef.current) {
    const g = new Game(cfg);
    g.onSound = (n, x, y) => { const p = g.player; if (x === undefined || Math.hypot(x - st.current.cam.x, (y || 0) - st.current.cam.y) < 1600 || Math.hypot(x - p.x, (y || 0) - p.y) < 1400) playSound(n); };
    g.onVoice = (t) => speak(t);
    gameRef.current = g;
    st.current.cam.x = g.player.x; st.current.cam.y = g.player.y;
  }
  const g = gameRef.current;
  const msg = (text: string, color = '#ff6a6a') => { setMsgs(m => [...m.slice(-5), { t: g.time, text, color }]); playSound('error'); };
  const uiOpen = useRef(false);
  uiOpen.current = shop || menu;

  useEffect(() => {
    const cv = cvRef.current!, mm = mmRef.current!;
    const ctx = cv.getContext('2d')!, mctx = mm.getContext('2d')!;
    let raf = 0, last = performance.now(), frames = 0, fpsT = 0, hudT = 0;
    const S = st.current;
    const resize = () => { const dpr = Math.min(1.5, window.devicePixelRatio || 1); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; S.cam.w = cv.width; S.cam.h = cv.height; };
    resize(); window.addEventListener('resize', resize);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      frames++; fpsT += dt; if (fpsT > 1) { setFps(frames); frames = 0; fpsT = 0; }
      if (!menu) g.update(dt);
      const P = g.player;
      // camera
      S.cam.zoom = S.cam.h / S.zoomBase;
      if (S.locked || S.space) { const tx = P.x, ty = P.y; S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 12); S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 12); }
      else if (!uiOpen.current) {
        const m = S.screen, e = 12, sp = 2200 * dt;
        if (m.x < e) S.cam.x -= sp; if (m.x > cv.clientWidth - e) S.cam.x += sp;
        if (m.y < e) S.cam.y -= sp; if (m.y > cv.clientHeight - e) S.cam.y += sp;
      }
      {
        const hw = S.cam.w / S.cam.zoom / 2, hh = S.cam.h / S.cam.zoom / 2;
        S.cam.x = Math.max(hw - 250, Math.min(W - hw + 250, S.cam.x));
        S.cam.y = Math.max(hh - 250, Math.min(W - hh + 450, S.cam.y));
      }
      // world mouse
      const dpr = cv.width / cv.clientWidth;
      S.mouse.x = (S.screen.x * dpr - S.cam.w / 2) / S.cam.zoom + S.cam.x;
      S.mouse.y = (S.screen.y * dpr - S.cam.h / 2) / S.cam.zoom + S.cam.y;
      // hover
      let hov: Unit | null = null, hd = 1e9;
      for (const u of g.units) {
        if (!u.alive || u === P || u.kind === 'ward') continue;
        if (u.team !== g.playerTeam && !u.vis[g.playerTeam]) continue;
        const r = u.kind === 'champion' ? 70 : u.kind === 'turret' ? 110 : u.isStructure ? u.r : u.r + 25;
        const cy = u.kind === 'turret' ? u.y - 80 : u.y;
        const d = Math.hypot(u.x - S.mouse.x, cy - S.mouse.y);
        if (d < r && d - (u.kind === 'champion' ? 40 : 0) < hd) { hd = d - (u.kind === 'champion' ? 40 : 0); hov = u; }
      }
      S.hover = hov;
      const slot = S.held ?? S.hoverSlot;
      let ind = null;
      if (slot !== null && P.abil[slot] > 0) { const a = P.def!.abilities[slot]; ind = { slot, kind: a.target === 'unit' ? 'unit' : a.target, range: a.range, width: a.width, radius: a.radius }; }
      draw(ctx, g, S.cam, { hover: hov, indicator: ind, mouse: S.mouse, clicks: S.clicks, showRange: S.showRange || (!!ind && ind.kind === 'unit') });
      drawMinimap(mctx, g, mm.width, S.cam);
      hudT += dt;
      if (hudT > 0.08) { hudT = 0; setTick(t => t + 1); const cur = S.amove ? CUR_ENEMY : hov && hov.team !== g.playerTeam ? CUR_ENEMY : hov && hov.team === g.playerTeam ? CUR_ALLY : CUR_NORMAL; setCursor(c => c === cur ? c : cur); }
      S.clicks = S.clicks.filter(c => now - c.t < 400);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [menu]);

  // input
  useEffect(() => {
    const S = st.current;
    const P = g.player;
    const castTarget = () => ({ x: S.mouse.x, y: S.mouse.y, unit: S.hover && S.hover.team !== P.team ? S.hover : g.nearestEnemyTarget(P, S.mouse.x, S.mouse.y, 120, true) || undefined });
    const cast = (slot: number) => { const r = g.cmdCast(P, slot, castTarget()); if (r !== true) msg(r); };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'tab') { e.preventDefault(); setTab(true); return; }
      if (k === 'escape') { if (shop) setShop(false); else setMenu(m => !m); return; }
      if (menu || g.winner !== null) return;
      const qwer = 'qwer'.indexOf(k);
      if (qwer >= 0 && !e.repeat) {
        if (e.ctrlKey) { e.preventDefault(); g.cmdLevel(P, qwer); return; }
        const a = P.def!.abilities[qwer];
        if (a.target === 'self' || (a.recast && (P.data.luxE?.alive || (P.data.ahriR && P.data.ahriR.charges > 0 && g.time < P.data.ahriR.until)))) { cast(qwer); return; }
        S.held = qwer; return;
      }
      if (e.repeat) return;
      if (k === 'd') { const r = g.cmdSummoner(P, 0, castTarget()); if (r !== true) msg(r); }
      else if (k === 'f') { const r = g.cmdSummoner(P, 1, castTarget()); if (r !== true) msg(r); }
      else if (k === 'b') g.cmdRecall(P);
      else if (k === 'p') setShop(s => !s);
      else if (k === 'y') S.locked = !S.locked;
      else if (k === ' ') { e.preventDefault(); S.space = true; }
      else if (k === 's') g.cmdStop(P);
      else if (k === 'a') S.amove = true;
      else if (k === 'c') S.showRange = true;
      else if (k === '4') { const r = g.cmdWard(P, S.mouse.x, S.mouse.y); if (r !== true) msg(r); }
      else if ('123567'.includes(k) && k.length === 1) { const slot = '123567'.indexOf(k); const r = g.cmdItem(P, slot, { x: S.mouse.x, y: S.mouse.y }); if (r !== true) msg(r); }
      else if (k === 'v') { audioSettings.voice = !audioSettings.voice; msg(audioSettings.voice ? '播报语音：开' : '播报语音：关', '#e8d9a8'); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'tab') setTab(false);
      if (k === ' ') S.space = false;
      if (k === 'c') S.showRange = false;
      const qwer = 'qwer'.indexOf(k);
      if (qwer >= 0 && S.held === qwer) { S.held = null; if (!menu && g.winner === null) cast(qwer); }
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [shop, menu]);

  const onMouseDown = (e: React.MouseEvent) => {
    const S = st.current, P = g.player;
    if (g.winner !== null) return;
    if (e.button === 2) {
      S.held = null;
      S.rDown = true; S.rT = performance.now();
      issueRight(true);
    } else if (e.button === 0) {
      if (S.held !== null) { S.held = null; return; }
      if (S.amove) { S.amove = false; g.cmdAttackMove(P, S.mouse.x, S.mouse.y); S.clicks.push({ x: S.mouse.x, y: S.mouse.y, t: performance.now(), red: true }); }
    }
  };
  const issueRight = (click: boolean) => {
    const S = st.current, P = g.player;
    const h = S.hover;
    if (h && h.team !== P.team && g.targetable(h)) { g.cmdAttack(P, h); if (click) S.clicks.push({ x: h.x, y: h.y, t: performance.now(), red: true }); }
    else { g.cmdMove(P, S.mouse.x, S.mouse.y); if (click) { S.clicks.push({ x: S.mouse.x, y: S.mouse.y, t: performance.now(), red: false }); } }
    S.amove = false;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    st.current.screen = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (st.current.rDown && performance.now() - st.current.rT > 150) { st.current.rT = performance.now(); if (!st.current.hover) issueRight(false); }
  };
  const onWheel = (e: React.WheelEvent) => { const S = st.current; S.zoomBase = Math.max(1000, Math.min(2300, S.zoomBase + e.deltaY * 0.8)); };
  const mmEvent = (e: React.MouseEvent, move: boolean) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * W;
    const S = st.current;
    if (e.button === 2 || (e.buttons & 2)) { if (!move) { g.cmdMove(g.player, x, y); S.clicks.push({ x, y, t: performance.now(), red: false }); } return; }
    if (e.buttons & 1 || e.button === 0) { S.locked = false; S.cam.x = x; S.cam.y = y; }
  };
  const P = g.player;
  const dead = !P.alive;
  return (
    <div className="relative w-full h-full overflow-hidden bg-black" onContextMenu={e => e.preventDefault()}>
      <canvas ref={cvRef} className="absolute inset-0 w-full h-full" style={{ cursor, filter: dead ? 'grayscale(0.9) brightness(0.8)' : undefined }}
        onMouseDown={onMouseDown} onMouseUp={e => { if (e.button === 2) st.current.rDown = false; }} onMouseMove={onMouseMove} onWheel={onWheel} onMouseLeave={() => { st.current.rDown = false; }} />
      <TopBar g={g} fps={fps} />
      <AllyPanel g={g} />
      <KillFeed g={g} />
      <Announcer g={g} />
      <ChatLog g={g} local={msgs} />
      <div className="absolute top-2 left-2 text-[11px] text-[#a09b8c] bg-black/50 px-2 py-1 pointer-events-none select-none">
        视角：{st.current.locked ? '锁定 (Y)' : '自由 (Y)'} · Esc 菜单 · Tab 战绩 · P 商店 · V 语音
      </div>
      {dead && g.winner === null && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 text-center pointer-events-none select-none">
          <div className="text-[#a09b8c] text-sm">你已阵亡</div>
          <div className="text-4xl font-bold text-[#f0e6d2]">复活倒计时 {Math.ceil(P.respawn)}</div>
          <div className="text-xs text-[#a09b8c] mt-1">可以在阵亡时打开商店 (P) 购买装备</div>
        </div>
      )}
      {P.recall && (
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 w-72 pointer-events-none select-none">
          <div className="text-center text-sm text-[#bfe0ff] mb-1">回城中… {P.recall.t.toFixed(1)}</div>
          <div className="h-2 bg-black/70 border border-[#3a6aa0]"><div className="h-full bg-gradient-to-r from-[#3a8aff] to-[#9ad0ff]" style={{ width: `${(1 - P.recall.t / P.recall.max) * 100}%` }} /></div>
        </div>
      )}
      <BottomHUD g={g} onHoverSlot={s => (st.current.hoverSlot = s)} onShop={() => setShop(s => !s)} />
      {/* minimap */}
      <div className="absolute bottom-0 right-0 p-1.5 bg-[#010a13] border-l-2 border-t-2 border-[#785a28] select-none">
        <canvas ref={mmRef} width={260} height={260} className="block w-[260px] h-[260px] cursor-pointer"
          onMouseDown={e => mmEvent(e, false)} onMouseMove={e => { if (e.buttons) mmEvent(e, true); }} onContextMenu={e => e.preventDefault()} />
      </div>
      {tab && <Scoreboard g={g} />}
      {shop && <Shop g={g} onClose={() => setShop(false)} onMsg={m => msg(m)} />}
      {menu && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center select-none">
          <div className="w-[520px] bg-[#010a13] border-2 border-[#785a28] p-6 text-[#f0e6d2]">
            <div className="text-xl font-bold text-[#c8aa6e] mb-4">游戏菜单（已暂停）</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-[#a09b8c] mb-5">
              {[['右键', '移动 / 攻击'], ['A + 左键', '攻击移动'], ['Q W E R', '技能（按住显示指示器，松开施放）'], ['Ctrl + QWER', '升级技能'], ['D / F', '召唤师技能'], ['1 2 3 5 6 7', '使用装备'], ['4', '放置守卫'], ['B', '回城'], ['P', '商店'], ['Tab', '战绩面板'], ['Y', '锁定/解锁视角'], ['空格', '视角居中'], ['S', '停止'], ['C', '显示攻击范围'], ['滚轮', '缩放视角'], ['小地图', '左键移动视角 · 右键移动']].map(([a, b]) => <div key={a} className="flex gap-2"><span className="text-[#f0e6d2] w-24 shrink-0">{a}</span><span>{b}</span></div>)}
            </div>
            <div className="flex items-center gap-3 text-sm mb-5">
              <span>音效</span><input type="range" min={0} max={1} step={0.05} defaultValue={audioSettings.sfx} onChange={e => (audioSettings.sfx = +e.target.value)} />
              <label className="flex items-center gap-1 ml-4"><input type="checkbox" defaultChecked={audioSettings.voice} onChange={e => (audioSettings.voice = e.target.checked)} />播报语音</label>
              <span className="ml-4">速度</span>{[1, 1.5, 2].map(s => <button key={s} onClick={() => (g.speed = s)} className={`px-2 border ${g.speed === s ? 'border-[#c8aa6e]' : 'border-[#3c3c41]'}`}>{s}x</button>)}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMenu(false)} className="lol-btn-primary px-8 py-2">继续游戏</button>
              <button onClick={() => { g.player.alive && g.cmdMove(g.player, FOUNTAIN[g.playerTeam].x, FOUNTAIN[g.playerTeam].y); onExit(); }} className="lol-btn-secondary px-8 py-2">投降并退出</button>
            </div>
          </div>
        </div>
      )}
      {g.winner !== null && <EndScreen g={g} onExit={onExit} />}
    </div>
  );
}
