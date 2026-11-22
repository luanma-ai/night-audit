// Plays the game with the real input path and records what the feedback layer
// actually does: does trauma rise on a sighting and return to exactly zero, does a
// flash fire, do particles appear and clear, and does the alarm label change band.
// Method per the game-feel/game-ui-ux skills: verify the effects headlessly rather
// than trusting them by eye.
import { createGame } from '../game/src/sim.js';
import { createFeedback } from '../game/src/feedback.js';
import { attachFeedback } from '../game/src/hooks.js';

const DT = 1 / 60;

const game = createGame();
const feedback = createFeedback();
const tick = attachFeedback(game, feedback);

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

const seen = {
  maxTrauma: 0,
  maxParticles: 0,
  flashFired: false,
  bands: new Set(),
  events: [],
};
let prevBand = null;

// walk the thief straight at the nearest guard to force sightings.
// The corridor guards stand behind walls from the start tile, so the first fix just
// got stuck: put a guard right beside the thief instead and let the sim run.
const g0 = game.guards[0];
g0.x = game.player.x + 90;
g0.y = game.player.y;
g0.facing = Math.PI;
g0.path = [{ x: g0.x, y: g0.y }];
g0.wait = 9999;

let frames = 0;
let now = 0;
while (frames < 60 * 40) {
  frames++;
  held.clear();
  // stand still in the light: that is what charges the alarm and fires feedback
  game.update(DT, input);
  now += DT * 1000;
  tick(DT, now);

  seen.maxTrauma = Math.max(seen.maxTrauma, feedback.state.trauma);
  seen.maxParticles = Math.max(seen.maxParticles, feedback.state.particles.length);
  if (feedback.state.flash > 0.05) seen.flashFired = true;

  const t = game.state.alarm / 100;
  const band = t >= 0.75 ? 'CRITICAL' : t >= 0.4 ? 'HEIGHTENED' : t >= 0.15 ? 'NOTICED' : 'QUIET';
  if (band !== prevBand) {
    seen.bands.add(band);
    prevBand = band;
  }
  if (game.state.phase !== 'play') break;
}

// let it settle with nobody moving
for (let i = 0; i < 60 * 6; i++) {
  held.clear();
  game.update(DT, input);
  now += DT * 1000;
  tick(DT, now);
}

console.log('phase reached     :', game.state.phase);
console.log('peak alarm        :', Math.round(game.state.alarm));
console.log('max trauma        :', seen.maxTrauma.toFixed(3));
console.log('max particles     :', seen.maxParticles);
console.log('flash fired       :', seen.flashFired);
console.log('alarm bands seen  :', [...seen.bands].join(' -> '));
console.log('--- after settling 6s ---');
console.log('trauma back to    :', feedback.state.trauma.toFixed(3), feedback.state.trauma === 0 ? '(exactly rest OK)' : '(NOT rest -- bug)');
console.log('offsets at rest   :', feedback.state.offsetX.toFixed(3), feedback.state.offsetY.toFixed(3));
console.log('particles left    :', feedback.state.particles.length);
console.log('flash left        :', feedback.state.flash.toFixed(3));
