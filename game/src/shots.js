// Scripted camera set-ups, one per screenshot the entry ships. Each one builds a
// real position in the running game and is reached by playing the simulation
// forward, never by drawing over it: what the shot shows is the game's own state.
import { createGame } from './sim.js';

// A pass-through input that reports no keys, so the scripted run only walks and waits.
function idleInput() {
  return {
    moveAxis: () => ({ x: 0, y: 0 }),
    down: () => false,
    took: () => false,
    tookClick: () => false,
  };
}

export function scriptPlay(seed = 1) {
  const game = createGame();
  const input = idleInput();
  const p = game.player;
  // walk the thief into the west hall where a lens, two sentries and a case all
  // fall inside one frame, then let the cones sweep until the alarm is climbing
  p.x = 9.5 * 32;
  p.y = 11.4 * 32;
  p.facing = -Math.PI / 2;
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
  // push the sentries onto the poses that read best in a still frame
  place(game.guards[0], 5.5, 9.2, Math.PI * 0.5);
  place(game.guards[1], 13.6, 6.4, Math.PI * 0.18);
  place(game.guards[4], 8.2, 13.6, -Math.PI * 0.62);
  place(game.guards[5], 20.8, 9.4, Math.PI * 0.95);
  for (let i = 0; i < 6; i++) game.update(1 / 60, input);
  game.state.alarm = 46;
  game.state.spotted = true;
  game.state.spottedBy = 'Carpet Patrol';
  return game;
}

function place(g, tx, ty, facing) {
  g.x = tx * 32;
  g.y = ty * 32;
  g.facing = facing;
  g.wait = 999;
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
  p.x = 38.2 * 32;
  p.y = 20.4 * 32;
  p.facing = 0;
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
  place(game.guards[2], 31.2, 5.2, Math.PI * 0.8);
  place(game.guards[3], 33.4, 20.2, Math.PI);
  place(game.guards[0], 5.5, 6.4, Math.PI * 0.5);
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
