// The loop. Builds the game, reads the keyboard and mouse, and draws one frame at
// a time. A `?shot=` query hands back a scripted still for the entry's screenshots.
import { W, H } from './config.js';
import { createInput } from './input.js';
import { createGame } from './sim.js';
import { draw } from './render.js';
import { drawTitle } from './title.js';
import { SHOTS } from './shots.js';

function makeCanvas() {
  const found = typeof document !== 'undefined' && document.getElementById('game');
  if (found) return found;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.id = 'game';
  document.body.appendChild(c);
  return c;
}

const canvas = makeCanvas();
if (canvas) {
  canvas.width = W;
  canvas.height = H;
}
const ctx = canvas ? canvas.getContext('2d') : null;

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const shotName = params.get('shot');
const scripted = shotName && shotName in SHOTS;
// `?noanim` pins the first frame: the screenshot tool uses it so the still is
// exactly the pose it asked for, with no clock running underneath it.
const frozen = params.has('noanim');

let game = createGame();
// A scripted still starts straight in play; a normal launch opens on the title card.
let mode = scripted ? 'play' : 'title';
let elapsed = 0;

function reset() {
  game = createGame();
  mode = 'play';
}

function startWith(shot) {
  const build = SHOTS[shot];
  if (!build) {
    reset();
    return;
  }
  game = build();
  mode = shot === 'start' ? 'title' : 'play';
}

if (scripted) startWith(shotName);

const input = createInput(canvas || { addEventListener() {} });
let last = 0;

function frame(now) {
  // First frame gets one nominal step so nothing in the sim divides by a zero dt,
  // and so a still taken on frame one already shows the room.
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  elapsed += dt;
  if (!ctx) return;

  if (scripted) {
    // a scripted still: hold the pose and let the cones drift slowly
    if (mode === 'title') drawTitle(ctx, elapsed);
    else {
      game.update(dt * 0.25, input);
      draw(ctx, game);
    }
    requestAnimationFrame(frame);
    return;
  }

  if (mode === 'title') {
    drawTitle(ctx, elapsed);
    if (input.took(' ') || input.took('Enter')) reset();
    input.endFrame();
    requestAnimationFrame(frame);
    return;
  }

  if (input.took('r')) {
    reset();
    input.endFrame();
    requestAnimationFrame(frame);
    return;
  }

  game.update(dt, input);
  draw(ctx, game);
  input.endFrame();
  requestAnimationFrame(frame);
}

// Draw one frame synchronously at load, then hand over to the animation loop.
// A headless browser may screenshot before any requestAnimationFrame callback runs,
// so the first picture must not wait for one.
if (ctx) {
  if (mode === 'title') drawTitle(ctx, 0);
  else draw(ctx, game);
}
if (frozen) {
  if (typeof window !== 'undefined') window.__nightAudit = { game: () => game, reset, startWith, frozen: true };
} else if (typeof requestAnimationFrame === 'function') {
  requestAnimationFrame(frame);
  if (typeof window !== 'undefined') window.__nightAudit = { game: () => game, reset, startWith, drawOnce: () => { if (ctx) draw(ctx, game); } };
}
