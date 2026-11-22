export const TILE = 32;
export const COLS = 40;
export const ROWS = 24;
export const W = COLS * TILE;
export const H = ROWS * TILE;

// Tuning notes (2026-11-22, second pass): the first build let a bot walk the
// shortest path and finish in 21 s with the alarm never passing 20, because the
// alarm rose only while a cone touched the player and decayed the instant it
// stopped. Sneaking was strictly worse for the same reason. The numbers below
// make being seen cost a fixed chunk per sighting and make the alarm linger,
// so a route through light is a real mistake and timing the cones is the game.
export const config = {
  W, H, TILE, COLS, ROWS,

  playerSpeed: 132,
  sprintSpeed: 196,
  sneakSpeed: 88,          // was 62: hiding should not cost half the night

  // Cameras are the ambient threat, not the main one: they outnumber the guards and
  // reach further, so they charge less per sighting. (Measured: with 19 they were
  // 4 of 5 deaths, which made the guards pointless dressing.)
  sightCost: 30,           // one clean sighting from a guard
  cameraSightCost: 15,     // a camera is cheaper to blunder into
  refireSeconds: 1.5,      // a cone that keeps you in view keeps charging
  alarmDecay: 11,          // per second, once nothing is looking at you
  decayDelay: 1.0,         // seconds of grace after the last cone lets go

  guardSightRange: 250,
  guardSightHalfAngle: 0.42,
  cameraSightRange: 320,
  cameraSweepHalf: 0.72,
  cameraSweepSpeed: 0.42,
  noiseRadius: 130,
  lootGoal: 3,

  // Cone distance is a real danger ramp now, not a flat tax.
  sightCloseRange: 90,     // inside this, a guard charges the full sight cost

  // Guards react. Seeing you twice inside the interest window starts a chase;
  // a chase lasts a few seconds after losing sight, then the guard walks back.
  chaseSeconds: 5,
  loseInterestSeconds: 3.5,
};
