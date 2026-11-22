// Plays the game for real: BFS pathfinding on the tile grid, then walks the path at
// player speed, taking loot as it passes and reaching the exit. Reports what a
// competent player would feel: how long a full run takes and how the alarm behaves.
import { createGame } from '../game/src/sim.js';
import { map } from '../game/src/world.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

const DT = 1 / 60;

function botInput() {
  const held = new Set();
  const pressed = new Set();
  return {
    moveAxis() {
      let x = 0;
      let y = 0;
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
    hold(k) { held.add(k); },
    release(k) { held.delete(k); },
    tap(k) { pressed.add(k); },
    releaseAll() { held.clear(); },
  };
}

const walkable = (cx, cy) => {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
  return !map.solid[cx + cy * COLS];
};

// BFS over tiles; a guard standing on a tile only slows us, so ignore it here and
// let the alarm rule decide whether the route is survivable.
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

function playOnce(useSneak, label) {
  const game = createGame();
  const input = botInput();
  const p = game.player;
  const goals = [
    ...game.state.loot.map((l) => ({ x: l.x, y: l.y, name: l.name })),
    { x: map.vaultDoor.x, y: map.vaultDoor.y, name: 'exit' },
  ];

  let peak = 0;
  let frames = 0;
  const timeline = [];
  let goalIndex = 0;

  while (frames < 60 * 300 && game.state.phase === 'play') {
    frames++;
    if (goalIndex >= goals.length) break;
    const goal = goals[goalIndex];
    const cx = Math.floor(p.x / TILE);
    const cy = Math.floor(p.y / TILE);
    const path = findPath(cx, cy, Math.floor(goal.x / TILE), Math.floor(goal.y / TILE));
    let tx = goal.x;
    let ty = goal.y;
    if (path && path.length > 1 && Math.hypot(p.x - goal.x, p.y - goal.y) > 20) {
      tx = path[1][0] * TILE + 16;
      ty = path[1][1] * TILE + 16;
    }

    input.releaseAll();
    if (useSneak) input.hold('Control');
    const dx = tx - p.x;
    const dy = ty - p.y;
    if (Math.abs(dx) > 3) input.hold(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 3) input.hold(dy > 0 ? 's' : 'w');

    for (const l of game.state.loot) {
      if (!l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 18) input.tap('e');
    }

    game.update(DT, input);
    peak = Math.max(peak, game.state.alarm);
    if (game.state.alarm >= 99.9) timeline.push(`caught at ${game.state.time.toFixed(1)}s`);
    if (game.state.carried > goalIndex - 0) goalIndex = Math.max(goalIndex, game.state.carried);
    if (Math.hypot(p.x - goal.x, p.y - goal.y) < 16 && goal.name === 'exit') break;
  }

  return {
    label,
    phase: game.state.phase,
    seconds: +game.state.time.toFixed(1),
    carried: game.state.carried,
    peakAlarm: +peak.toFixed(0),
    finalAlarm: +game.state.alarm.toFixed(0),
    caughtBy: game.state.caughtBy || null,
    stuck: goalIndex,
  };
}

console.log('== walking (no sneak) ==');
for (let i = 0; i < 3; i++) console.log(JSON.stringify(playOnce(false, 'walk')));
console.log('== sneaking (Ctrl held) ==');
for (let i = 0; i < 3; i++) console.log(JSON.stringify(playOnce(true, 'sneak')));
