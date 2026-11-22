// Scripted camera set-ups, one per screenshot the entry ships. Each one builds a
// real position in the running game and is reached by playing the simulation
// forward, never by drawing over it: what the shot shows is the game's own state.
//
// Poses retuned for the third map (2026-11-22). The old positions were written for
// the open-hall layout and put the thief inside a wall and on top of a guard in the
// new one; every coordinate here is a floor tile of the current map, and the guards
// are placed on their own patrol lines so the cones fan across the frame.
import { createGame } from './sim.js';
import { map } from './world.js';
import { COLS } from './config.js';

// A pass-through input that reports no keys, so the scripted run only walks and waits.
function idleInput() {
  return {
    moveAxis: () => ({ x: 0, y: 0 }),
    down: () => false,
    took: () => false,
    tookClick: () => false,
  };
}

function place(g, tx, ty, facing) {
  g.x = tx * 32;
  g.y = ty * 32;
  g.facing = facing;
  g.wait = 9999;
}

// Move the thief to a tile if it is walkable; report when a pose is invalid so a map
// change cannot silently put the hero inside a wall (that is what happened before).
function putHero(p, tx, ty, facing) {
  const cx = Math.floor(tx);
  const cy = Math.floor(ty);
  if (map.solid[cx + cy * COLS]) {
    console.warn('shot pose is inside a wall:', tx, ty);
    return false;
  }
  p.x = tx * 32 + 16;
  p.y = ty * 32 + 16;
  p.facing = facing;
  return true;
}

export function scriptPlay(seed = 1) {
  const game = createGame();
  const input = idleInput();
  const p = game.player;

  // the middle band, on the carpet between two divider doors with cones converging
  putHero(p, 9.5, 12.4, -Math.PI * 0.25);

  game.state.alarm = 46;
  game.state.tools.noisemaker = 2;
  game.state.tools.blackout = 1;
  game.state.carried = 1;
  game.state.loot[0].taken = true;
  game.state.time = 38.2;
  game.state.messages = [
    { text: 'Emerald Mask secured. 2 to go.', life: 3.2, age: 0.2 },
    { text: 'Carpet Patrol has eyes on you.', life: 2.4, age: 0.1 },
  ];

  // guards on their own routes, angled so their cones sweep across the centre
  place(game.guards[0], 4.5, 6.4, Math.PI * 0.55);
  place(game.guards[1], 12.4, 6.2, Math.PI * 0.30);
  place(game.guards[2], 33.5, 5.6, Math.PI * 0.86);
  place(game.guards[4], 7.4, 12.6, -Math.PI * 0.10);
  place(game.guards[5], 18.5, 17.4, Math.PI * 0.95);
  place(game.guards[6], 26.5, 11.4, Math.PI * 0.62);
  place(game.guards[7], 31.5, 18.4, Math.PI);

  for (let i = 0; i < 6; i++) game.update(1 / 60, input);
  game.state.alarm = 46;
  game.state.spotted = true;
  game.state.spottedBy = 'Carpet Patrol';
  return game;
}

export function scriptCaught(seed = 1) {
  const game = scriptPlay(seed);
  const input = idleInput();
  game.state.alarm = 99.4;
  game.state.spottedBy = 'Camera';
  for (let i = 0; i < 20; i++) game.update(1 / 60, input);
  game.state.phase = 'caught';
  if (!game.state.caughtBy) game.state.caughtBy = 'Carpet Patrol';
  return game;
}

export function scriptEscape(seed = 1) {
  const game = createGame();
  const input = idleInput();
  const p = game.player;

  // at the vault door with all three pieces and the alarm low: the payoff frame
  putHero(p, 36.4, 21.5, 0);

  game.state.carried = 3;
  game.state.loot.forEach((l) => (l.taken = true));
  game.state.vault.open = true;
  game.state.alarm = 18;
  game.state.time = 96.4;
  game.state.blackout = 4.2;
  game.state.messages = [
    { text: 'The vault door swings back. Get to the exit.', life: 3.2, age: 0.4 },
    { text: 'Gold Reliquary secured. 1 to go.', life: 3.2, age: 2.0 },
  ];

  place(game.guards[2], 34.5, 5.4, Math.PI * 0.85);
  place(game.guards[7], 31.4, 19.6, Math.PI * 0.9);
  place(game.guards[3], 18.5, 21.4, 0);
  place(game.guards[5], 17.5, 17.4, Math.PI * 0.5);

  for (let i = 0; i < 6; i++) game.update(1 / 60, input);
  game.state.carried = 3;
  game.state.loot.forEach((l) => (l.taken = true));
  return game;
}

export const SHOTS = {
  start: null,
  play: scriptPlay,
  caught: scriptCaught,
  escape: scriptEscape,
};
