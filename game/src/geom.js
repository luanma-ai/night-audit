// Small maths the rest of the game shares: angles, sight, ray-casting against the
// tile grid, and circle-vs-tile movement that slides along walls instead of sticking.
import { TILE, COLS, ROWS } from './config.js';

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Shortest signed angle from a to b, in (-PI, PI].
export function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function solidAt(map, px, py) {
  const cx = Math.floor(px / TILE);
  const cy = Math.floor(py / TILE);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  return !!map.solid[cx + cy * COLS];
}

// Walk a ray across the tile grid; true while nothing solid lies between the two points.
export function lineOfSight(map, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const steps = Math.ceil(Math.hypot(dx, dy) / (TILE * 0.4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(map, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}

// Move a circle by (dx, dy), sliding on each axis so a glancing hit keeps its other half.
export function moveCircle(map, ent, dx, dy, radius) {
  const tryAxis = (mx, my) => {
    const nx = ent.x + mx;
    const ny = ent.y + my;
    const r = radius;
    const probes = [
      [nx - r, ny - r], [nx + r, ny - r], [nx - r, ny + r], [nx + r, ny + r],
      [nx, ny - r], [nx, ny + r], [nx - r, ny], [nx + r, ny],
    ];
    for (const [px, py] of probes) if (solidAt(map, px, py)) return false;
    return true;
  };
  if (tryAxis(dx, 0)) ent.x += dx;
  if (tryAxis(0, dy)) ent.y += dy;
}

export function inCone(map, src, angle, halfAngle, range, target) {
  const d = dist(src.x, src.y, target.x, target.y);
  if (d > range || d < 1) return d < 1;
  const a = Math.atan2(target.y - src.y, target.x - src.x);
  if (Math.abs(angleDelta(angle, a)) > halfAngle) return false;
  return lineOfSight(map, src.x, src.y, target.x, target.y);
}
