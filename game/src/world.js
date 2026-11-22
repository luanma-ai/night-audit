// The room: walls, cover, patrol routes, camera mounts, loot and the vault door.
// One museum night-set. Every guard walks a hand-placed loop so its cone keeps
// sweeping across the routes the player needs, and no two loops fully overlap.
import { COLS, ROWS } from './config.js';

// # solid wall, . floor, = exhibit case (blocks sight and movement), ~ floor with
// heavier carpet (slows the player), V vault floor, ^ loot pedestal, C camera mount,
// D vault door, S player start.
const MAP = [
  '########################################',
  '#S.........#...........#...............#',
  '#..........#...........#...............#',
  '#....====..#..=====....#....======.....#',
  '#..........#...........#...............#',
  '#..........................CC..........#',
  '#..........#...........#...............#',
  '#....====..#..=====....#....======.....#',
  '#..........#...........#...............#',
  '######.#####...........#####.###########',
  '######.#####...........#####.###########',
  '#..........#...........#...............#',
  '#..........#...........#...............#',
  '#..~~~~~~..#..~~~~~~...#....~~~~~~.....#',
  '#..~~~~~~..#..~~~~~~...#....~~~~~~.....#',
  '#..........#...........#...............#',
  '#..........#...........#...............#',
  '##########.#...........#####CC#########',
  '##########.#...........###############.#',
  '#.....................................D#',
  '#.CC.................CC................#',
  '#......................................#',
  '#VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV#',
  '########################################',
];

export const map = {
  rows: ROWS,
  cols: COLS,
  solid: [],
  carpet: [],
  start: { x: 0, y: 0 },
  vaultDoor: { x: 0, y: 0 },
  cams: [],
  loot: [],
};

for (let y = 0; y < ROWS; y++) {
  const line = MAP[y].padEnd(COLS, '#');
  for (let x = 0; x < COLS; x++) {
    const ch = line[x];
    const p = x + y * COLS;
    map.solid[p] = ch === '#' || ch === '=';
    map.carpet[p] = ch === '~' || ch === 'V';
    if (ch === 'S') map.start = { x: x * 32 + 16, y: y * 32 + 16 };
    if (ch === 'D') map.vaultDoor = { x: x * 32 + 16, y: y * 32 + 16 };
    if (ch === 'C') map.cams.push({ x: x * 32 + 16, y: y * 32 + 16 });
    if (ch === '^') map.loot.push({ x: x * 32 + 16, y: y * 32 + 16 });
  }
}

// Loot sits on the pedestals of the two side halls and inside the vault;
// placed here rather than in the map so the map stays readable.
map.loot = [
  { x: 13 * 32 + 16, y: 3 * 32 + 16, name: 'Emerald Mask' },
  { x: 32 * 32 + 16, y: 12 * 32 + 16, name: 'Gold Reliquary' },
  { x: 31 * 32 + 16, y: 21 * 32 + 16, name: 'The Blue Star' },
];

// Patrol loops. Each entry is a list of tile waypoints the guard walks in order,
// forever. Facing is smoothed, so a cone swings round before it moves on.
export const patrols = [
  { name: 'Hall Walker', speed: 46, sight: 250, path: [[5, 6], [5, 12], [5, 6], [5, 2]] },
  { name: 'Gallery Sentry', speed: 40, sight: 265, path: [[14, 2], [14, 8], [17, 8], [17, 2]] },
  { name: 'East Keeper', speed: 44, sight: 250, path: [[27, 5], [36, 5], [36, 2], [27, 2]] },
  { name: 'Vault Watch', speed: 38, sight: 280, path: [[3, 21], [20, 21], [36, 21], [36, 19], [3, 19]] },
  { name: 'Carpet Patrol', speed: 42, sight: 245, path: [[4, 13], [10, 13], [10, 16], [4, 16]] },
];

// Two guard dogs are replaced by two extra sentries on a short central loop:
// the long corridor between the halls is where most thefts get spotted.
patrols.push({ name: 'Corridor Sweep', speed: 50, sight: 240, path: [[21, 6], [21, 11], [21, 6], [21, 15]] });

export const cameraSpecs = map.cams.map((c, i) => ({
  x: c.x,
  y: c.y,
  baseAngle: [Math.PI / 2, -Math.PI / 2, 0, Math.PI, Math.PI / 2][i % 5],
  sweep: 0.72,
  speed: 0.36 + (i % 3) * 0.07,
  range: 320,
  phase: i * 1.7,
}));
