// Is every piece of loot reachable at all? Throws a flood fill over walkable floor
// from the player's start, then checks each loot point and the exit.
import { createGame } from '../game/src/sim.js';
import { map } from '../game/src/world.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

const walkable = (x, y) => {
  const cx = Math.floor(x / TILE);
  const cy = Math.floor(y / TILE);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
  return !map.solid[cx + cy * COLS];
};

// flood fill on tile grid
const seen = new Set();
const startCx = Math.floor(map.start.x / TILE);
const startCy = Math.floor(map.start.y / TILE);
const q = [[startCx, startCy]];
seen.add(startCx + ',' + startCy);
while (q.length) {
  const [cx, cy] = q.shift();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = cx + dx;
    const ny = cy + dy;
    const k = nx + ',' + ny;
    if (seen.has(k) || !walkable(nx * TILE + 16, ny * TILE + 16)) continue;
    seen.add(k);
    q.push([nx, ny]);
  }
}

const game = createGame();
console.log('start tile:', startCx, startCy, 'walkable:', walkable(map.start.x, map.start.y));
console.log('reachable tiles:', seen.size);
console.log('');
console.log('== loot ==');
for (const l of game.state.loot) {
  const cx = Math.floor(l.x / TILE);
  const cy = Math.floor(l.y / TILE);
  const solid = map.solid[cx + cy * COLS];
  console.log(`${l.name.padEnd(16)} tile=(${cx},${cy}) solid=${solid} reachable=${seen.has(cx + ',' + cy)}`);
}
console.log('');
const d = map.vaultDoor;
const dcx = Math.floor(d.x / TILE);
const dcy = Math.floor(d.y / TILE);
console.log(`exit tile=(${dcx},${dcy}) solid=${map.solid[dcx + dcy * COLS]} reachable=${seen.has(dcx + ',' + dcy)}`);
console.log('');
console.log('== guards start ==');
for (const g of game.guards) {
  const cx = Math.floor(g.x / TILE);
  const cy = Math.floor(g.y / TILE);
  console.log(`${g.name.padEnd(16)} tile=(${cx},${cy}) solid=${map.solid[cx + cy * COLS]}`);
}
