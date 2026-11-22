// How forgiving is the room? Runs the pathfinding bot, then reruns it with random
// detours and random hesitation -- what a person does when they are not a robot --
// and reports the escape rate. A heist that survives an expert's perfect line is
// fine; one that survives sloppy play too has no risk in it at all.
import { playRun } from './measure.mjs';
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

function sloppyRun(seed) {
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
  let peak = 0;

  while (frames < 60 * 300 && game.state.phase === 'play' && goalIndex < goals.length) {
    frames++;
    const goal = goals[goalIndex];
    held.clear();
    if (pressed.size) pressed.clear();

    if (hesitate > 0) {
      hesitate -= DT;
      game.update(DT, input);
      peak = Math.max(peak, game.state.alarm);
      continue;
    }
    // a person stops now and then to look at the room
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
    peak = Math.max(peak, game.state.alarm);
    goalIndex = Math.max(goalIndex, game.state.carried);
    if (Math.hypot(p.x - goal.x, p.y - goal.y) < 16 && goal.name === 'exit') break;
  }

  return {
    phase: game.state.phase,
    escaped: game.state.phase === 'escaped',
    seconds: +game.state.time.toFixed(1),
    peak: +peak.toFixed(0),
    caughtBy: game.state.caughtBy || null,
  };
}

const expert = [];
for (let i = 0; i < 20; i++) expert.push(playRun('walk'));
const sloppy = [];
for (let i = 0; i < 20; i++) sloppy.push(sloppyRun(1000 + i));

const rate = (runs) => (100 * runs.filter((r) => r.escaped).length) / runs.length;
const avgPeak = (runs) => runs.reduce((a, r) => a + r.peak, 0) / runs.length;
const avgSec = (runs) => runs.reduce((a, r) => a + r.seconds, 0) / runs.length;

console.log('expert :', rate(expert).toFixed(0) + '% escape', 'avg peak alarm', avgPeak(expert).toFixed(0), 'avg time', avgSec(expert).toFixed(1) + 's');
console.log('sloppy :', rate(sloppy).toFixed(0) + '% escape', 'avg peak alarm', avgPeak(sloppy).toFixed(0), 'avg time', avgSec(sloppy).toFixed(1) + 's');
const caught = sloppy.filter((r) => !r.escaped);
if (caught.length) console.log('caught by:', [...new Set(caught.map((r) => r.caughtBy))].join(', '));
