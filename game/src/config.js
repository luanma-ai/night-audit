export const TILE = 32;
export const COLS = 40;
export const ROWS = 24;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export const config = {
  W, H, TILE, COLS, ROWS,
  playerSpeed: 138,
  sprintSpeed: 208,
  sneakSpeed: 62,
  alarmRise: 34,
  alarmDecay: 7,
  guardSightRange: 250,
  guardSightHalfAngle: 0.42,
  cameraSightRange: 320,
  cameraSweepHalf: 0.72,
  cameraSweepSpeed: 0.42,
  noiseRadius: 130,
  lootGoal: 3,
};
