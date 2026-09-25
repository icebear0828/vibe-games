import type { MapData, MapNode, NodeType } from './types';
import { pick, rand, weighted } from './util';

export const ROWS = 15;
export const COLS = 7;

export function generateMap(bossId: string): MapData {
  const rows: (MapNode | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const edges = new Set<string>(); // "r,c,c2"
  const ek = (r: number, c: number, c2: number) => `${r},${c},${c2}`;

  let firstStart = -1;
  for (let p = 0; p < 6; p++) {
    let c = rand(0, COLS - 1);
    if (p === 1) while (c === firstStart) c = rand(0, COLS - 1);
    if (p === 0) firstStart = c;
    for (let r = 0; r < ROWS; r++) {
      if (!rows[r][c]) rows[r][c] = { row: r, col: c, type: 'monster', next: [], jx: rand(-14, 14), jy: rand(-12, 12) };
      if (r === ROWS - 1) break;
      const opts = [c - 1, c, c + 1].filter((x) => x >= 0 && x < COLS);
      let nc = pick(opts);
      for (let tries = 0; tries < 10; tries++) {
        // prevent crossing edges
        const cross = (nc === c + 1 && edges.has(ek(r, c + 1, c))) || (nc === c - 1 && edges.has(ek(r, c - 1, c)));
        if (!cross) break;
        nc = pick(opts);
      }
      if ((nc === c + 1 && edges.has(ek(r, c + 1, c))) || (nc === c - 1 && edges.has(ek(r, c - 1, c)))) nc = c;
      edges.add(ek(r, c, nc));
      const node = rows[r][c]!;
      if (!node.next.includes(nc)) node.next.push(nc);
      c = nc;
    }
  }
  for (const row of rows) for (const n of row) if (n) n.next.sort((a, b) => a - b);

  // parents map
  const parents = (r: number, c: number) => (r === 0 ? [] : rows[r - 1].filter((n) => n && n.next.includes(c)) as MapNode[]);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const n = rows[r][c];
      if (!n) continue;
      if (r === 0) { n.type = 'monster'; continue; }
      if (r === 8) { n.type = 'treasure'; continue; }
      if (r === ROWS - 1) { n.type = 'rest'; continue; }
      let t: NodeType = 'monster';
      for (let tries = 0; tries < 20; tries++) {
        t = weighted<NodeType>([['shop', 5], ['rest', 12], ['event', 22], ['elite', r >= 5 ? 16 : 0], ['monster', 45]]);
        if (t === 'rest' && (r < 5 || r >= ROWS - 2)) continue;
        const ps = parents(r, c);
        if (['elite', 'rest', 'shop'].includes(t) && ps.some((p) => p.type === t)) continue;
        // siblings
        const sib = ps.flatMap((p) => p.next.filter((x) => x !== c).map((x) => rows[r][x]!)).filter((x) => x && x.col < c);
        if (['elite', 'rest', 'shop', 'event'].includes(t) && sib.some((s) => s.type === t)) continue;
        break;
      }
      n.type = t;
    }
  }
  return { rows, bossId };
}

export const NODE_INFO: Record<NodeType, { name: string; desc: string }> = {
  monster: { name: '敌人', desc: '普通战斗' },
  elite: { name: '精英', desc: '强大的敌人，击败可获得遗物' },
  rest: { name: '休息处', desc: '休息或锻造' },
  shop: { name: '商人', desc: '购买卡牌、遗物与药水' },
  event: { name: '未知', desc: '？？？' },
  treasure: { name: '宝箱', desc: '内含遗物' },
  boss: { name: 'Boss', desc: '本层的首领' },
};
