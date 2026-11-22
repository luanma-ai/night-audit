// Does running away actually work? Puts the thief in front of a guard, lets the
// guard start a chase, then tries to break contact the way a player would: run,
// sprint, or sneak. Reports whether the alarm can be brought back down afterwards.
import { createGame } from '../game/src/sim.js';
import { map } from '../game/src/world.js';
import { COLS, ROWS, TILE } from '../game/src/config.js';

const DT = 1 / 60;

function makeInput() {
  const held = new Set();
  const pressed = new Set();
  return {
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
    hold(k) { held.add(k); },
    clear() { held.clear(); pressed.clear(); },
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

// Fleeing: pick the walkable tile farthest from the nearest alerted guard that we
// can actually path to, and keep running at it.
function fleeTarget(game, p) {
  let best = null;
  let bestScore = -1;
  const guards = game.guards;
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (!walkable(x, y)) continue;
      const px = x * TILE + 16;
      const py = y * TILE + 16;
      let nearest = 1e9;
      for (const g of guards) {
        nearest = Math.min(nearest, Math.hypot(g.x - px, g.y - py));
      }
      // prefer far from guards but not across the whole map
      const score = nearest - 0.25 * Math.hypot(px - p.x, py - p.y);
      if (score > bestScore) {
        bestScore = score;
        best = { x: px, y: py };
      }
    }
  }
  return best;
}

function scenario({ mode, seconds = 12 }) {
  const game = createGame();
  const input = makeInput();
  const p = game.player;

  // Stage it: a guard is already on top of the thief and has just started chasing.
  const g = game.guards[5]; // Corridor Sweep lives in the open middle corridor
  g.x = p.x + 120;
  g.y = p.y;
  g.facing = Math.PI;
  g.alerted = 5;
  g.sightings = 0;
  game.state.alarm = 30;

  let peak = 30;
  let frames = 0;
  let lostAt = null;
  let caughtAt = null;
  const trail = [];

  while (frames < 60 * seconds && game.state.phase === 'play') {
    frames++;
    input.clear();
    if (mode === 'sprint') input.hold('Shift');
    if (mode === 'sneak') input.hold('Control');

    const target = fleeTarget(game, p);
    const cx = Math.floor(p.x / TILE);
    const cy = Math.floor(p.y / TILE);
    const path = findPath(cx, cy, Math.floor(target.x / TILE), Math.floor(target.y / TILE));
    let tx = target.x, ty = target.y;
    if (path && path.length > 1) {
      tx = path[1][0] * TILE + 16;
      ty = path[1][1] * TILE + 16;
    }
    const dx = tx - p.x, dy = ty - p.y;
    if (Math.abs(dx) > 3) input.hold(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 3) input.hold(dy > 0 ? 's' : 'w');

    game.update(DT, input);
    const alarm = game.state.alarm;
    peak = Math.max(peak, alarm);
    trail.push(alarm);
    const chasing = game.guards.some((gg) => gg.alerted > 0);
    if (chasing === false && lostAt === null && frames > 30) lostAt = game.state.time.toFixed(1);
    if (game.state.phase === 'caught') caughtAt = game.state.time.toFixed(1);
  }

  // after the chase: how long to bleed back to a safe alarm with nobody watching
  const startAlarm = game.state.alarm;
  let coolFrames = 0;
  if (game.state.phase === 'play') {
    input.clear();
    while (coolFrames < 60 * 20 && game.state.alarm > 1) {
      coolFrames++;
      game.update(DT, input);
    }
  }

  return {
    mode,
    phase: game.state.phase,
    peak: +peak.toFixed(0),
    alarmWhenChaseEnded: +startAlarm.toFixed(0),
    chaseEndedAt: lostAt,
    caughtAt,
    coolSeconds: +(coolFrames / 60).toFixed(1),
    distToNearestGuard: +Math.min(...game.guards.map((gg) => Math.hypot(gg.x - p.x, gg.y - p.y))).toFixed(0),
  };
}

for (const mode of ['walk', 'sprint', 'sneak']) {
  for (let i = 0; i < 3; i++) console.log(JSON.stringify(scenario({ mode })));
}
