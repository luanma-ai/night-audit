// How much of the map is ever watched? Samples every walkable tile across a full
// patrol cycle and reports the share of floor that no cone ever crosses. A heist
// room where most floor is never watched has no tension to tune.
import { createGame } from '../game/src/sim.js';
import { map } from '../game/src/world.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

const DT = 1 / 30;
const SECONDS = 40;
const steps = SECONDS / DT;

const game = createGame();
// Park the thief off-map so nobody sees it; we only want cone coverage.
game.player.x = -9999;
game.player.y = -9999;

const watched = new Set();
let walkableCount = 0;
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (!map.solid[x + y * COLS]) walkableCount++;
  }
}

for (let i = 0; i < steps; i++) {
  game.update(DT, {
    moveAxis: () => ({ x: 0, y: 0 }),
    down: () => false,
    took: () => false,
    tookClick: () => false,
  });
  for (const g of game.guards) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map.solid[x + y * COLS]) continue;
        const px = x * TILE + 16;
        const py = y * TILE + 16;
        const dx = px - g.x;
        const dy = py - g.y;
        const d = Math.hypot(dx, dy);
        if (d > g.sight) continue;
        let a = Math.atan2(dy, dx) - g.facing;
        while (a > Math.PI) a -= Math.PI * 2;
        while (a <= -Math.PI) a += Math.PI * 2;
        if (Math.abs(a) > g.half) continue;
        watched.add(x + ',' + y);
      }
    }
  }
}

console.log('walkable tiles      :', walkableCount);
console.log('watched at least once:', watched.size);
console.log('never watched share  :', (100 * (1 - watched.size / walkableCount)).toFixed(1) + '%');
