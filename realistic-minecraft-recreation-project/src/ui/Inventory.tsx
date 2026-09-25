import { useEffect, useMemo, useState } from 'react';
import type { Engine, Slot } from '../game/engine';
import { BLOCKS, B, CREATIVE_ORDER } from '../game/blocks';
import { ItemIcon, Count } from './mc';

type S = Slot | null;

function craft(grid: S[]): Slot | null {
  const ids = grid.map((s) => (s ? s.id : 0));
  const filled = ids.filter(Boolean);
  if (filled.length === 0) return null;
  // normalize (remove empty rows/cols)
  let rows = [[ids[0], ids[1]], [ids[2], ids[3]]];
  rows = rows.filter((r) => r.some(Boolean));
  let cols = [0, 1].filter((c) => rows.some((r) => r[c]));
  const pat = rows.map((r) => cols.map((c) => r[c]));
  const key = pat.map((r) => r.join(',')).join('|');
  const all = (id: number) => filled.length === 4 && filled.every((x) => x === id);
  if (filled.length === 1) {
    const id = filled[0];
    if (id === B.OAK_LOG) return { id: B.OAK_PLANKS, count: 4 };
    if (id === B.BIRCH_LOG) return { id: B.BIRCH_PLANKS, count: 4 };
    if (id === B.SPRUCE_LOG) return { id: B.SPRUCE_PLANKS, count: 4 };
    if (id === B.MELON) return null;
  }
  if (all(B.OAK_PLANKS) || all(B.BIRCH_PLANKS) || all(B.SPRUCE_PLANKS)) return { id: B.CRAFTING_TABLE, count: 1 };
  if (all(B.SAND)) return { id: B.SANDSTONE, count: 1 };
  if (all(B.STONE)) return { id: B.STONE_BRICKS, count: 4 };
  if (all(B.SNOW_BLOCK)) return { id: B.ICE, count: 1 };
  if (all(B.COBBLESTONE)) return { id: B.FURNACE, count: 1 };
  if (all(B.CLAY)) return { id: B.BRICKS, count: 1 };
  if (all(B.GRAVEL)) return { id: B.TNT, count: 1 };
  if (key === `${B.PUMPKIN}|${B.TORCH}`) return { id: B.JACK_O_LANTERN, count: 1 };
  if (key === `${B.COAL_ORE}|${B.OAK_PLANKS}` || key === `${B.COAL_ORE}|${B.BIRCH_PLANKS}` || key === `${B.COAL_ORE}|${B.SPRUCE_PLANKS}`) return { id: B.TORCH, count: 4 };
  if (key === `${B.COBBLESTONE},${B.TALL_GRASS}` || key === `${B.COBBLESTONE},${B.OAK_LEAVES}`) return { id: B.MOSSY_COBBLE, count: 1 };
  if (key === `${B.OAK_PLANKS}|${B.OAK_PLANKS}` && false) return null;
  return null;
}

export function Inventory({ engine, onClose }: { engine: Engine; onClose: () => void }) {
  const creative = engine.mode === 'creative';
  const [inv, setInv] = useState<S[]>(() => engine.inventory.map((s) => (s ? { ...s } : null)));
  const [cursor, setCursor] = useState<S>(null);
  const [craftGrid, setCraft] = useState<S[]>([null, null, null, null]);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ name: string; idx?: number; area?: string } | null>(null);
  const [search, setSearch] = useState('');
  const output = useMemo(() => craft(craftGrid), [craftGrid]);

  const commit = (n: S[]) => { setInv(n); engine.setInventory(n); };

  const close = () => {
    const n = inv.map((s) => (s ? { ...s } : null));
    const give = (s: S) => {
      if (!s) return;
      let c = s.count;
      for (let i = 0; i < 36 && c > 0; i++) { const t = n[i]; if (t && t.id === s.id && t.count < 64) { const a = Math.min(64 - t.count, c); t.count += a; c -= a; } }
      for (let i = 0; i < 36 && c > 0; i++) if (!n[i]) { n[i] = { id: s.id, count: Math.min(64, c) }; c -= Math.min(64, c); }
      if (c > 0 && !creative) engine.spawnItem(s.id, c, engine.pos.x, engine.pos.y + 1.4, engine.pos.z);
    };
    if (!creative) { give(cursor); craftGrid.forEach(give); }
    engine.setInventory(n);
    onClose();
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const typing = (document.activeElement as HTMLElement)?.tagName === 'INPUT';
      if (e.code === 'Escape' || (e.code === 'KeyE' && !typing)) { e.preventDefault(); close(); return; }
      if (!typing && e.code.startsWith('Digit') && hover && hover.idx !== undefined) {
        const k = parseInt(e.code.slice(5), 10) - 1;
        if (k < 0 || k > 8) return;
        if (hover.area === 'inv') {
          const n = [...inv]; const t = n[k]; n[k] = n[hover.idx]; n[hover.idx] = t; commit(n);
        } else if (hover.area === 'palette') {
          const n = [...inv]; n[k] = { id: hover.idx, count: 1 }; commit(n);
        }
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  });

  const clickSlot = (i: number, right: boolean, shift: boolean) => {
    const n = inv.map((s) => (s ? { ...s } : null));
    const s = n[i];
    if (shift && s) {
      const range = i < 9 ? [9, 36] : [0, 9];
      let c = s.count;
      for (let j = range[0]; j < range[1] && c > 0; j++) { const t = n[j]; if (t && t.id === s.id && t.count < 64) { const a = Math.min(64 - t.count, c); t.count += a; c -= a; } }
      for (let j = range[0]; j < range[1] && c > 0; j++) if (!n[j]) { n[j] = { id: s.id, count: c }; c = 0; }
      n[i] = c > 0 ? { id: s.id, count: c } : null;
      commit(n); return;
    }
    if (creative) {
      if (cursor) { n[i] = { ...cursor }; setCursor(s ? { ...s } : null); if (right) setCursor(null); }
      else if (s) { setCursor(s); n[i] = null; }
      commit(n); return;
    }
    if (!right) {
      if (!cursor) { if (s) { setCursor(s); n[i] = null; } }
      else if (!s) { n[i] = cursor; setCursor(null); }
      else if (s.id === cursor.id) { const a = Math.min(64 - s.count, cursor.count); s.count += a; const left = cursor.count - a; setCursor(left > 0 ? { id: cursor.id, count: left } : null); }
      else { n[i] = cursor; setCursor(s); }
    } else {
      if (!cursor) { if (s) { const h = Math.ceil(s.count / 2); setCursor({ id: s.id, count: h }); s.count -= h; if (s.count <= 0) n[i] = null; } }
      else if (!s || (s.id === cursor.id && s.count < 64)) {
        n[i] = { id: cursor.id, count: (s ? s.count : 0) + 1 };
        setCursor(cursor.count > 1 ? { id: cursor.id, count: cursor.count - 1 } : null);
      }
    }
    commit(n);
  };

  const clickCraft = (i: number, right: boolean) => {
    const g = craftGrid.map((s) => (s ? { ...s } : null));
    const s = g[i];
    if (!right) {
      if (!cursor) { if (s) { setCursor(s); g[i] = null; } }
      else if (!s) { g[i] = cursor; setCursor(null); }
      else if (s.id === cursor.id) { const a = Math.min(64 - s.count, cursor.count); s.count += a; setCursor(cursor.count - a > 0 ? { id: cursor.id, count: cursor.count - a } : null); }
      else { g[i] = cursor; setCursor(s); }
    } else {
      if (!cursor) { if (s) { const h = Math.ceil(s.count / 2); setCursor({ id: s.id, count: h }); s.count -= h; if (s.count <= 0) g[i] = null; } }
      else if (!s || s.id === cursor.id) { g[i] = { id: cursor.id, count: (s ? s.count : 0) + 1 }; setCursor(cursor.count > 1 ? { id: cursor.id, count: cursor.count - 1 } : null); }
    }
    setCraft(g);
  };

  const takeOutput = () => {
    if (!output) return;
    if (cursor && (cursor.id !== output.id || cursor.count + output.count > 64)) return;
    setCursor({ id: output.id, count: (cursor ? cursor.count : 0) + output.count });
    setCraft(craftGrid.map((s) => (s ? (s.count > 1 ? { id: s.id, count: s.count - 1 } : null) : null)));
  };

  const slotEl = (s: S, key: string, onClick: (right: boolean, shift: boolean) => void, hoverInfo: { idx?: number; area?: string } = {}) => (
    <div
      key={key}
      className="mc-slot"
      onMouseDown={(e) => { e.preventDefault(); onClick(e.button === 2, e.shiftKey); }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => setHover(s ? { name: BLOCKS[s.id].name, ...hoverInfo } : { name: '', ...hoverInfo })}
      onMouseLeave={() => setHover(null)}
    >
      {s && <ItemIcon id={s.id} size={32} />}
      {s && !creative && <Count n={s.count} />}
    </div>
  );

  const palette = CREATIVE_ORDER.filter((id) => !search || BLOCKS[id].name.includes(search) || BLOCKS[id].key.includes(search.toLowerCase()));

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}
      onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => { if (e.target === e.currentTarget && cursor) { if (!creative) engine.spawnItem(cursor.id, cursor.count, engine.pos.x, engine.pos.y + 1.4, engine.pos.z); setCursor(null); } }}
    >
      {creative ? (
        <div className="mc-panel p-[14px] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[17px]">搜索物品</span>
            <input autoFocus className="mc-input" style={{ height: 28, width: 200, fontSize: 15 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="" />
          </div>
          <div className="scroll-mc overflow-y-auto" style={{ height: 5 * 40 + 4, width: 9 * 40 + 14 }}>
            <div className="grid grid-cols-9" onMouseDown={() => { /* */ }}>
              {palette.map((id) => (
                <div key={id} className="mc-slot"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (cursor) { setCursor(null); return; }
                    if (e.shiftKey) {
                      const n = [...inv];
                      let k = n.findIndex((x, i) => i < 9 && !x); if (k < 0) k = engine.selected;
                      n[k] = { id, count: 1 }; commit(n); return;
                    }
                    setCursor({ id, count: 1 });
                  }}
                  onMouseEnter={() => setHover({ name: BLOCKS[id].name, idx: id, area: 'palette' })}
                  onMouseLeave={() => setHover(null)}
                ><ItemIcon id={id} size={32} /></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-end mt-1">
            <div className="grid grid-cols-9">{inv.slice(0, 9).map((s, i) => slotEl(s, 'h' + i, (r, sh) => clickSlot(i, r, sh), { idx: i, area: 'inv' }))}</div>
          </div>
          <div className="text-[13px] text-[#555]">点击选取 · Shift+点击放入快捷栏 · 悬停按 1-9 快速放置</div>
        </div>
      ) : (
        <div className="mc-panel p-[14px] flex flex-col gap-2" style={{ width: 9 * 40 + 28 }}>
          <div className="flex items-center gap-6 h-[150px]">
            <div className="w-[104px] h-[140px] bg-black relative overflow-hidden" style={{ boxShadow: 'inset 2px 2px 0 #373737, inset -2px -2px 0 #fff' }}>
              <PlayerFigure />
            </div>
            <div className="flex flex-col gap-1 ml-auto">
              <span className="text-[16px]">合成</span>
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-2">{craftGrid.map((s, i) => slotEl(s, 'c' + i, (r) => clickCraft(i, r)))}</div>
                <span className="text-[26px] text-[#8b8b8b]">➜</span>
                <div className="mc-slot" style={{ width: 52, height: 52 }} onMouseDown={(e) => { e.preventDefault(); takeOutput(); }}
                  onMouseEnter={() => output && setHover({ name: BLOCKS[output.id].name })} onMouseLeave={() => setHover(null)}>
                  {output && <ItemIcon id={output.id} size={32} />}
                  {output && <Count n={output.count} />}
                </div>
              </div>
            </div>
          </div>
          <span className="text-[16px]">物品栏</span>
          <div className="grid grid-cols-9">{inv.slice(9, 36).map((s, i) => slotEl(s, 'm' + i, (r, sh) => clickSlot(i + 9, r, sh), { idx: i + 9, area: 'inv' }))}</div>
          <div className="grid grid-cols-9 mt-2">{inv.slice(0, 9).map((s, i) => slotEl(s, 'h' + i, (r, sh) => clickSlot(i, r, sh), { idx: i, area: 'inv' }))}</div>
        </div>
      )}
      {cursor && (
        <div className="fixed pointer-events-none" style={{ left: mouse.x - 16, top: mouse.y - 16 }}>
          <div className="relative w-[32px] h-[32px]"><ItemIcon id={cursor.id} size={32} />{!creative && <Count n={cursor.count} />}</div>
        </div>
      )}
      {!cursor && hover && hover.name && (
        <div className="fixed pointer-events-none mc-tooltip" style={{ left: mouse.x + 14, top: mouse.y - 28 }}>{hover.name}</div>
      )}
    </div>
  );
}

function PlayerFigure() {
  // simple Steve silhouette
  const px = 5;
  const r = (x: number, y: number, w: number, h: number, c: string) => <div key={`${x}${y}${c}`} style={{ position: 'absolute', left: 22 + x * px, top: 8 + y * px, width: w * px, height: h * px, background: c }} />;
  return (
    <>
      {r(4, 0, 8, 8, '#6b4a2f')}
      {r(4, 2, 8, 6, '#c69c7c')}
      {r(4, 1, 8, 1, '#6b4a2f')}
      {r(5, 4, 2, 1, '#fff')}{r(6, 4, 1, 1, '#4b3a9a')}
      {r(9, 4, 2, 1, '#fff')}{r(9, 4, 1, 1, '#4b3a9a')}
      {r(6, 6, 4, 1, '#7a4a33')}
      {r(4, 8, 8, 12, '#00a8a8')}
      {r(0, 8, 4, 12, '#00a8a8')}{r(0, 12, 4, 8, '#c69c7c')}
      {r(12, 8, 4, 12, '#00a8a8')}{r(12, 12, 4, 8, '#c69c7c')}
      {r(4, 20, 4, 5, '#3d3aa0')}{r(8, 20, 4, 5, '#3d3aa0')}
    </>
  );
}
