// Plays the game headlessly: a dumb bot drives the real simulation with the real
// input interface, so the rules are exercised exactly as a player would. Reports
// where it gets caught, whether the loot can all be reached, and whether the run
// can be finished at all.
import { createGame } from '../game/src/sim.js';
import { map } from '../game/src/world.js';

const DT = 1 / 60;

// An input the bot can steer: it reports keys as if held.
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
    took(k) {
      if (pressed.has(k)) {
        pressed.delete(k);
        return true;
      }
      return false;
    },
    tookClick: () => false,
    hold(k) { held.add(k); },
    release(k) { held.delete(k); },
    tap(k) { pressed.add(k); },
    releaseAll() { held.clear(); },
  };
}

function walkToward(input, player, tx, ty, sprint = false) {
  const dx = tx - player.x;
  const dy = ty - player.y;
  input.releaseAll();
  if (sprint) input.hold('Shift');
  if (Math.abs(dx) > 4) input.hold(dx > 0 ? 'd' : 'a');
  if (Math.abs(dy) > 4) input.hold(dy > 0 ? 's' : 'w');
  return Math.hypot(dx, dy);
}

// Straight-line stepping toward a point; reports arrival.
function drive(input, game, tx, ty, opts = {}) {
  const p = game.player;
  const d = walkToward(input, p, tx, ty, opts.sprint);
  return d < 14;
}

function nearestLoot(game) {
  let best = null;
  let bd = 1e9;
  for (const l of game.state.loot) {
    if (l.taken) continue;
    const d = Math.hypot(l.x - game.player.x, l.y - game.player.y);
    if (d < bd) {
      bd = d;
      best = l;
    }
  }
  return best;
}

// Route the bot through a waypoint list (tile coords) to reach a target without
// cutting through walls, which is what a real player has to do too.
function pathTo(target) {
  return target;
}

function runOne(verbose) {
  const game = createGame();
  const input = botInput();
  const log = [];
  let steps = 0;
  let arrived = 0;

  // Simple waypoint script: the halls are joined by the corridors down the middle.
  const route = [
    [9, 11], [9, 3],                 // west hall to the emerald mask
    [21, 9], [21, 3], [32, 3],      // across the top corridor to the east hall
    [32, 12],                        // gold reliquary
    [21, 17], [21, 21], [31, 21],    // down to the vault corridor, blue star
    [38, 20],                        // the exit door
  ];

  let target = 0;
  while (steps < 60 * 240) {
    steps++;
    const p = game.player;
    const phase = game.state.phase;
    if (phase !== 'play') {
      log.push(`t=${game.state.time.toFixed(1)} phase=${phase} at step ${steps} alarm=${game.state.alarm.toFixed(0)}`);
      break;
    }

    // take anything underfoot
    const loot = nearestLoot(game);
    if (loot && Math.hypot(loot.x - p.x, loot.y - p.y) < 18) input.tap('e');

    // head for the gold when close, otherwise follow the route
    let wx;
    let wy;
    if (loot) { wx = loot.x; wy = loot.y; } else { wx = route[Math.min(target, route.length - 1)][0] * 32 + 16; wy = route[Math.min(target, route.length - 1)][1] * 32 + 16; }

    const d = walkToward(input, p, wx, wy, game.state.alarm > 70);
    if (d < 20 && !loot) target++;
    if (!loot && target >= route.length) target = route.length - 1;

    game.update(DT, input);
    arrived = game.state.carried;
  }

  return {
    phase: game.state.phase,
    time: game.state.time,
    carried: game.state.carried,
    alarm: game.state.alarm,
    caughtBy: game.state.caughtBy,
    log,
  };
}

const results = [];
for (let i = 0; i < 3; i++) results.push(runOne(i === 0));
for (const r of results) {
  console.log(JSON.stringify({
    phase: r.phase, time: +r.time.toFixed(1), carried: r.carried,
    alarm: +r.alarm.toFixed(0), caughtBy: r.caughtBy || null,
  }));
}
console.log(results[0].log.join('\n'));
