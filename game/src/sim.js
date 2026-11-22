// The night's rules: what the guards and cameras see, how fast the alarm climbs,
// what the tools cost, and when the job is caught or done.
//
// The tension is a single meter. Standing in a cone raises it fast; standing in
// the dark lowers it slowly. At 100 the room locks and the night is over. Tools
// trade the meter for time: a noisemaker drags a cone away, a blackout blindfold
// every camera at once, and the vault door only opens once three pieces are gone.
import { config, COLS } from './config.js';
import { angleDelta, clamp, dist, inCone, moveCircle } from './geom.js';
import { map, patrols, cameraSpecs } from './world.js';

export function createGame() {
  const player = {
    x: map.start.x,
    y: map.start.y,
    radius: 9,
    facing: 0,
    speed: 0,
    sneak: false,
    sprint: false,
    torch: true,
    noise: 0,
  };

  const guards = patrols.map((p, i) => ({
    name: p.name,
    x: p.path[0][0] * 32 + 16,
    y: p.path[0][1] * 32 + 16,
    speed: p.speed,
    sight: p.sight,
    half: config.guardSightHalfAngle,
    path: p.path.map(([tx, ty]) => ({ x: tx * 32 + 16, y: ty * 32 + 16 })),
    leg: 0,
    wait: 0,
    facing: 0,
    alert: 0,
    sees: false,
    cooldown: 0,
    charging: false,
    alerted: 0,
    sightings: 0,
    alertTimer: 0,
    index: i,
  }));

  const cameras = cameraSpecs.map((c, i) => ({
    x: c.x,
    y: c.y,
    base: c.baseAngle,
    sweep: c.sweep,
    speed: c.speed,
    range: c.range,
    facing: c.baseAngle,
    sees: false,
    down: 0,
    cooldown: 0,
    charging: false,
    index: i,
  }));

  const state = {
    phase: 'play', // play | caught | escaped
    time: 0,
    alarm: 0,
    spotted: false,
    spottedBy: '',
    loot: map.loot.map((l, i) => ({ ...l, taken: false, id: i })),
    carried: 0,
    tools: { noisemaker: 3, blackout: 1, keycard: 0 },
    blackout: 0,
    noisemakers: [],
    breakers: [{ x: 6 * 32 + 16, y: 19 * 32 + 16, on: true }, { x: 35 * 32 + 16, y: 19 * 32 + 16, on: true }],
    vault: { open: false, unlocked: map.vaultDoor },
    messages: [],
    escapeAt: 0,
    quietFor: 0,
  };

  function say(text, life = 3.2) {
    state.messages.unshift({ text, life, age: 0 });
    if (state.messages.length > 4) state.messages.length = 4;
  }

  say('Three pieces. Alarms up, the night is over.');

  function nearestLoot() {
    let best = null;
    let bd = 1e9;
    for (const l of state.loot) {
      if (l.taken) continue;
      const d = dist(player.x, player.y, l.x, l.y);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best && bd < 22 ? best : null;
  }

  function updatePlayer(dt, input) {
    const axis = input.moveAxis();
    const sprint = input.down('Shift');
    const sneak = input.down('Control') || input.down('c');
    let base = config.playerSpeed;
    if (sprint) base = config.sprintSpeed;
    if (sneak) base = config.sneakSpeed;
    const tileX = Math.floor(player.x / 32);
    const tileY = Math.floor(player.y / 32);
    const onCarpet = map.carpet[tileX + tileY * COLS];
    if (onCarpet) base *= 0.86;

    player.sneak = sneak && !sprint;
    player.sprint = sprint;
    player.speed = base;
    moveCircle(map, player, axis.x * base * dt, axis.y * base * dt, player.radius);
    if (axis.x || axis.y) player.facing = Math.atan2(axis.y, axis.x);

    // running is loud: a sprint makes a noise puff that guards within earshot investigate
    player.noise = sprint ? clamp(player.noise + dt * 2.4, 0, 1) : clamp(player.noise - dt * 1.2, 0, 1);
    if (player.noise > 0.9) {
      for (const g of guards) {
        if (dist(g.x, g.y, player.x, player.y) < config.noiseRadius) g.alert = Math.max(g.alert, 0.55);
      }
    }

    if (input.took('f')) {
      player.torch = !player.torch;
      say(player.torch ? 'Torch on: you see more, they see you.' : 'Torch off: you are a shadow now.');
    }

    if (input.took(' ') && state.tools.noisemaker > 0) {
      state.tools.noisemaker--;
      const mx = player.x + Math.cos(player.facing) * 26;
      const my = player.y + Math.sin(player.facing) * 26;
      state.noisemakers.push({ x: mx, y: my, life: 6, age: 0 });
      say('Noisemaker away. Listen.');
    }

    if (input.took('q') && state.tools.blackout > 0) {
      state.tools.blackout--;
      state.blackout = 7;
      say('Blackout: every camera blind for seven seconds.');
    }

    // loot pick-up
    const l = nearestLoot();
    if (l && (input.took('e') || input.took('Enter'))) {
      l.taken = true;
      state.carried++;
      state.alarm = Math.max(0, state.alarm - 12);
      say(`${l.name} secured. ${config.lootGoal - state.carried} to go.`);
      if (state.carried >= config.lootGoal) {
        state.vault.open = true;
        say('The vault door swings back. Get to the exit.');
      }
    }

    // breakers: click a switch while near it to kill the lights on that side
    if (input.tookClick()) {
      for (const b of state.breakers) {
        if (!b.on) continue;
        if (dist(player.x, player.y, b.x, b.y) < 46) {
          b.on = false;
          state.blackout = Math.max(state.blackout, 5.5);
          say('Breaker thrown. Lights out on this side.');
        }
      }
    }

    // exit: the door on the far right of the vault corridor
    if (state.carried >= config.lootGoal && dist(player.x, player.y, map.vaultDoor.x, map.vaultDoor.y) < 34) {
      state.phase = 'escaped';
      state.escapeAt = state.time;
      return;
    }
  }

  function updateGuards(dt) {
    for (const g of guards) {
      g.sees = false;

      // A guard who has seen you breaks off the patrol and closes in. It gives up
      // after a few seconds out of sight and walks back, so one slip costs alarm,
      // distance and a few seconds -- never an instant, unfair loss.
      if (g.alerted > 0) {
        g.alerted -= dt;
        const ax = player.x - g.x;
        const ay = player.y - g.y;
        const ad = Math.hypot(ax, ay) || 1;
        const chaseAngle = Math.atan2(ay, ax);
        g.facing += angleDelta(g.facing, chaseAngle) * Math.min(1, dt * 8);
        const lunge = g.speed * 2.1 * dt;
        if (ad > 26) moveCircle(map, g, Math.cos(chaseAngle) * lunge, Math.sin(chaseAngle) * lunge, 10);
        if (ad < 22 && state.alarm < 100) {
          // caught in the open: the guard holds you and the alarm climbs, but
          // slowly enough that turning and running still saves the night
          state.alarm += 22 * dt;
          if (!state.spotted) {
            state.spotted = true;
            state.spottedBy = g.name;
            say(`${g.name} has you. Break away!`, 1.6);
          }
        }
        const stillSees = inCone(map, g, g.facing, g.half * 1.35, g.sight, player);
        g.sees = stillSees;
        continue;
      }

      const target = g.path[g.leg];
      const d = dist(g.x, g.y, target.x, target.y);
      if (g.wait > 0) {
        g.wait -= dt;
        // sweep the head while standing still so the cone still covers the room
        g.facing += Math.sin(state.time * 1.3 + g.index) * dt * 1.5;
      } else if (d < 3) {
        g.leg = (g.leg + 1) % g.path.length;
        g.wait = 0.5 + (g.index % 3) * 0.35;
      } else {
        const a = Math.atan2(target.y - g.y, target.x - g.x);
        g.facing += angleDelta(g.facing, a) * Math.min(1, dt * 5);
        const step = g.speed * dt;
        moveCircle(map, g, Math.cos(a) * step, Math.sin(a) * step, 10);
      }

      const sees = inCone(map, g, g.facing, g.half, g.sight, player);
      g.sees = sees;
      if (sees) {
        chargeSighting(g, 'guard', dt);
        // seeing you twice within the cooldown means you stayed in the light
        g.sightings++;
        if (g.sightings >= 2) {
          g.alerted = config.chaseSeconds;
          g.sightings = 0;
          say(`${g.name} is coming. Run.`, 1.8);
        } else {
          g.alertTimer = config.loseInterestSeconds;
        }
        if (!state.spotted) {
          state.spotted = true;
          state.spottedBy = g.name;
          say(`${g.name} has eyes on you.`, 2.4);
        }
      } else {
        g.cooldown = Math.max(0, g.cooldown - dt);
        if (g.sightings > 0) {
          g.alertTimer -= dt;
          if (g.alertTimer <= 0) g.sightings = 0;
        }
      }
    }
  }

  function updateCameras(dt) {
    for (const c of cameras) {
      c.down = state.blackout > 0 ? state.blackout : Math.max(0, c.down - dt);
      const target = c.base + Math.sin(state.time * c.speed + c.index) * c.sweep;
      c.facing += angleDelta(c.facing, target) * Math.min(1, dt * 3);
      c.sees = false;
      if (c.down > 0) continue;
      const sees = inCone(map, c, c.facing, 0.34, c.range, player);
      c.sees = sees;
      if (sees) {
        chargeSighting(c, 'camera', dt);
        if (!state.spotted) {
          state.spotted = true;
          state.spottedBy = 'Camera';
          say('A camera found you. Kill the lights.');
        }
      } else {
        c.cooldown = Math.max(0, c.cooldown - dt);
      }
    }
  }

  // Being seen costs a chunk of alarm once, then keeps charging at a slower rate
  // while the viewer holds you. A guard who loses you must wait before charging
  // again, so breaking line of sight is the move that saves a run.
  function chargeSighting(watcher, kind, dt) {
    const isCamera = kind === 'camera';
    const base = isCamera ? config.cameraSightCost : config.sightCost;
    const range = isCamera ? config.cameraSightRange : config.guardSightRange;
    const d = dist(watcher.x, watcher.y, player.x, player.y);
    // close sightings hurt more; a cone that only just catches you costs less
    const closeness = 1 - 0.55 * clamp((d - config.sightCloseRange) / (range - config.sightCloseRange), 0, 1);
    const hide = player.sneak ? 0.55 : 1;
    const cost = base * closeness * hide;

    if (watcher.cooldown <= 0) {
      state.alarm += cost;
      watcher.cooldown = config.refireSeconds;
      watcher.charging = false;
    } else {
      // still held: keep it climbing, but far slower than the first hit
      state.alarm += cost * 0.45 * dt;
      watcher.charging = true;
    }
  }

  // A noisemaker pulls any guard that hears it toward the sound for a moment.
  function updateNoisemakers(dt) {
    for (const n of state.noisemakers) {
      n.age += dt;
      for (const g of guards) {
        const d = dist(g.x, g.y, n.x, n.y);
        if (d < 120) {
          const a = Math.atan2(n.y - g.y, n.x - g.x);
          g.facing += angleDelta(g.facing, a) * Math.min(1, dt * 4);
        }
      }
    }
    state.noisemakers = state.noisemakers.filter((n) => n.age < n.life);
  }

  function update(dt, input) {
    state.time += dt;
    for (const m of state.messages) m.age += dt;
    state.messages = state.messages.filter((m) => m.age < m.life);

    if (state.phase !== 'play') return;

    state.blackout = Math.max(0, state.blackout - dt);
    updatePlayer(dt, input);
    if (state.phase !== 'play') return;
    updateGuards(dt);
    updateCameras(dt);
    updateNoisemakers(dt);

    const lit = guards.some((g) => g.sees) || cameras.some((c) => c.sees);
    if (!lit) {
      // The alarm lingers: a short grace after the last cone lets go, then it bleeds.
      state.quietFor += dt;
      if (state.quietFor > config.decayDelay) state.alarm -= config.alarmDecay * dt;
      state.spotted = false;
      state.spottedBy = '';
    } else {
      state.quietFor = 0;
    }
    state.alarm = clamp(state.alarm, 0, 100);

    if (state.alarm >= 100) {
      state.phase = 'caught';
      // Name whoever is looking at the thief as the alarm tops out; if nobody is,
      // the loudest thing that raised it is the last one that did.
      const seenBy = guards.filter((g) => g.sees).map((g) => g.name);
      if (cameras.some((c) => c.sees)) seenBy.push('Camera');
      state.caughtBy = seenBy.length ? seenBy[0] : state.spottedBy || 'A guard';
    }
  }

  return { player, guards, cameras, state, update, say, nearestLoot };
}
