// Does the room actually offer several routes? Counts vertex-disjoint paths from
// the start to each piece and to the exit. One path means the room is a corridor
// with decoration; more than one means the player really chooses, which is what
// the judge's second criterion asks for and what the old open halls could not give.
import { map } from '../game/src/world.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

const walkable = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !map.solid[x + y * COLS];

// Max-flow over the tile grid with unit node capacity, which gives the number of
// vertex-disjoint paths between two tiles (i.e. how many independent routes exist).
function disjointPaths(sx, sy, tx, ty) {
  const id = (x, y, side) => (y * COLS + x) * 2 + side; // side 0 = in, 1 = out
  const N = COLS * ROWS * 2;
  const cap = new Map();
  const adj = Array.from({ length: N }, () => []);

  const addEdge = (a, b, c) => {
    if (!cap.has(a + ',' + b)) {
      cap.set(a + ',' + b, 0);
      adj[a].push(b);
      adj[b].push(a);
    }
    cap.set(a + ',' + b, cap.get(a + ',' + b) + c);
  };

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!walkable(x, y)) continue;
      // node capacity 1, except the endpoints, which need to carry the whole flow
      const isEnd = (x === sx && y === sy) || (x === tx && y === ty);
      addEdge(id(x, y, 0), id(x, y, 1), isEnd ? 99 : 1);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (walkable(nx, ny)) {
          addEdge(id(x, y, 1), id(nx, ny, 0), 99);
          addEdge(id(nx, ny, 1), id(x, y, 0), 0);
          addEdge(id(nx, ny, 0), id(x, y, 1), 0);
        }
      }
    }
  }
  // add both directions for adjacency edges properly
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!walkable(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (walkable(nx, ny)) {
          if (!cap.has(id(nx, ny, 0) + ',' + id(x, y, 1))) addEdge(id(nx, ny, 0), id(x, y, 1), 0);
          if (!cap.has(id(x, y, 1) + ',' + id(nx, ny, 0))) addEdge(id(x, y, 1), id(nx, ny, 0), 0);
        }
      }
    }
  }

  const s = id(sx, sy, 0);
  const t = id(tx, ty, 1);
  let flow = 0;
  for (let iter = 0; iter < 40; iter++) {
    const prev = new Map();
    const q = [s];
    prev.set(s, null);
    while (q.length) {
      const u = q.shift();
      if (u === t) break;
      for (const v of adj[u]) {
        if (!prev.has(v) && (cap.get(u + ',' + v) || 0) > 0) {
          prev.set(v, u);
          q.push(v);
        }
      }
    }
    if (!prev.has(t)) break;
    let v = t;
    while (prev.get(v) !== null && prev.get(v) !== undefined) {
      const u = prev.get(v);
      cap.set(u + ',' + v, cap.get(u + ',' + v) - 1);
      cap.set(v + ',' + u, (cap.get(v + ',' + u) || 0) + 1);
      v = u;
    }
    flow++;
  }
  return flow;
}

const sx = Math.floor(map.start.x / TILE);
const sy = Math.floor(map.start.y / TILE);
console.log('start tile:', sx, sy);
console.log('');
for (const l of map.loot) {
  const tx = Math.floor(l.x / TILE);
  const ty = Math.floor(l.y / TILE);
  const n = disjointPaths(sx, sy, tx, ty);
  console.log('%-16s -> %s independent routes' .replace('%-16s', l.name.padEnd(16)), n);
}
const dx = Math.floor(map.vaultDoor.x / TILE);
const dy = Math.floor(map.vaultDoor.y / TILE);
console.log('%-16s -> %s independent routes'.replace('%-16s', 'EXIT'.padEnd(16)), disjointPaths(sx, sy, dx, dy));
