// Where does a sloppy run actually die? Prints the alarm curve of a failing run so
// a spike (unfair, one cone) can be told apart from a grind (fair, attrition).
import { createGame } from '../game/src/sim.js';
import { map } from '../game/src/world.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

const DT = 1 / 60;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const walkable = (cx, cy) => cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && !map.solid[cx + cy * COLS];
function findPath(sx, sy, tx, ty) {
  const key = (x, y) => x + ',' + y;
  const prev = new Map();
  const q = [[sx, sy]];
  const seen = new Set([key(sx, sy)]);
  while (q.length) {
    const [cx, cy] = q.shift();
    if (cx === tx && cy === ty) {
      const path = [];
      let cur = key(cx, cy);
      while (cur) {
        const [x, y] = cur.split(',').map(Number);
        path.push([x, y]);
        cur = prev.get(cur);
      }
      return path.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const k = key(nx, ny);
      if (seen.has(k) || !walkable(nx, ny)) continue;
      seen.add(k);
      prev.set(k, key(cx, cy));
      q.push([nx, ny]);
    }
  }
  return null;
}

function trace(seed) {
  const rand = rng(seed);
  const game = createGame();
  const held = new Set();
  const pressed = new Set();
  const input = {
    moveAxis() {
      let x = 0, y = 0;
      if (held.has('a')) x -= 1;
      if (held.has('d')) x += 1;
      if (held.has('w')) y -= 1;
      if (held.has('s')) y += 1;
      const m = Math.hypot(x, y) || 1;
      return { x: x / m, y: y / m };
    },
    down: (k) => held.has(k),
    took(k) { if (pressed.has(k)) { pressed.delete(k); return true; } return false; },
    tookClick: () => false,
  };
  const p = game.player;
  const goals = [
    ...game.state.loot.map((l) => ({ x: l.x, y: l.y, name: l.name })),
    { x: map.vaultDoor.x, y: map.vaultDoor.y, name: 'exit' },
  ];
  let goalIndex = 0;
  let frames = 0;
  let hesitate = 0;
  const curve = [];

  while (frames < 60 * 300 && game.state.phase === 'play' && goalIndex < goals.length) {
    frames++;
    const goal = goals[goalIndex];
    held.clear();
    pressed.clear();
    if (hesitate > 0) {
      hesitate -= DT;
      game.update(DT, input);
      curve.push(game.state.alarm);
      continue;
    }
    if (rand() < 0.004) { hesitate = 0.3 + rand() * 0.9; continue; }

    const cx = Math.floor(p.x / TILE);
    const cy = Math.floor(p.y / TILE);
    const path = findPath(cx, cy, Math.floor(goal.x / TILE), Math.floor(goal.y / TILE));
    let tx = goal.x, ty = goal.y;
    if (path && path.length > 1 && Math.hypot(p.x - goal.x, p.y - goal.y) > 20) {
      const step = path[Math.min(path.length - 1, 1 + Math.floor(rand() * 2))];
      tx = step[0] * TILE + 16;
      ty = step[1] * TILE + 16;
    }
    const dx = tx - p.x, dy = ty - p.y;
    if (Math.abs(dx) > 4) held.add(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 4) held.add(dy > 0 ? 's' : 'w');
    for (const l of game.state.loot) {
      if (!l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 18) pressed.add('e');
    }
    game.update(DT, input);
    curve.push(game.state.alarm);
    goalIndex = Math.max(goalIndex, game.state.carried);
    if (Math.hypot(p.x - goal.x, p.y - goal.y) < 16 && goal.name === 'exit') break;
  }
  return { phase: game.state.phase, curve, caughtBy: game.state.caughtBy };
}

for (const seed of [1000, 1001, 1002, 1003, 1004]) {
  const r = trace(seed);
  // biggest single jump between consecutive samples
  let maxJump = 0;
  let jumpAt = 0;
  for (let i = 1; i < r.curve.length; i++) {
    const j = r.curve[i] - r.curve[i - 1];
    if (j > maxJump) { maxJump = j; jumpAt = i / 60; }
  }
  console.log(
    `seed ${seed} phase=${r.phase} caughtBy=${r.caughtBy || '-'} | biggest jump ${maxJump.toFixed(1)} at ${jumpAt.toFixed(1)}s | end alarm ${r.curve.at(-1).toFixed(0)}`,
  );
}
