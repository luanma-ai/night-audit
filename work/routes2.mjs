// A simpler and more honest route test than max-flow: block one corridor at a time
// and see whether a path to each objective still exists. If cutting any single
// door still leaves a way through, the room genuinely offers alternatives -- which
// is what "several routes per room" has to mean for a player.
import { map } from '../game/src/world.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

const OPEN = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !map.solid[x + y * COLS];

const sx = Math.floor(map.start.x / TILE);
const sy = Math.floor(map.start.y / TILE);

function reachable(blocked) {
  const seen = new Set([sx + ',' + sy]);
  const q = [[sx, sy]];
  while (q.length) {
    const [cx, cy] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const k = nx + ',' + ny;
      if (seen.has(k) || !OPEN(nx, ny) || blocked.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

const base = reachable(new Set());
const targets = map.loot.map((l) => ({
  name: l.name,
  k: Math.floor(l.x / TILE) + ',' + Math.floor(l.y / TILE),
}));
targets.push({ name: 'EXIT', k: Math.floor(map.vaultDoor.x / TILE) + ',' + Math.floor(map.vaultDoor.y / TILE) });

console.log('baseline: all reachable =', targets.every((t) => base.has(t.k)));
console.log('');

// Every floor tile that is a cut-point: block it and see if something stops being reachable
const floor = [];
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (OPEN(x, y)) floor.push(x + ',' + y);
  }
}

let chokepoints = 0;
const critical = {};
for (const t of targets) critical[t.name] = 0;

for (const tile of floor) {
  if (tile === sx + ',' + sy) continue;
  const seen = reachable(new Set([tile]));
  for (const t of targets) {
    if (t.k === tile) continue;
    if (!seen.has(t.k)) critical[t.name]++;
  }
  chokepoints++;
}

console.log('floor tiles tested as single blockers:', chokepoints);
console.log('');
for (const t of targets) {
  const n = critical[t.name];
  const verdict = n === 0 ? 'MANY ROUTES (no single tile cuts it off)' : n + ' critical tiles';
  console.log('%-16s %s'.replace('%-16s', t.name.padEnd(16)), verdict);
}
