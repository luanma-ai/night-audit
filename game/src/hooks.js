// Wires the feedback layer into the simulation's discrete events.
//
// The game-feel skill's first workflow step is "find the event hooks": juice must
// attach to events, never be polled every frame. The simulation already has a
// `say()` for each of these moments, so hooks hang off the same places; the sim
// stays unaware of rendering and this module only reads its state.
import { makeFlashGuard } from './feedback.js';

export function attachFeedback(game, feedback) {
  const flashOk = makeFlashGuard();
  const last = { alarmBand: 0, carried: 0, phase: game.state.phase, spotted: false };

  return function tick(dt, nowMs) {
    const s = game.state;

    // 1. a pickup: medium, at the loot's own position, gold
    if (s.carried > last.carried) {
      const got = s.loot.find((l) => l.taken && Math.hypot(l.x - game.player.x, l.y - game.player.y) < 60);
      feedback.fire('medium', { x: got ? got.x : game.player.x, y: got ? got.y : game.player.y, colour: '255,209,102' });
      last.carried = s.carried;
    }

    // 2. being seen for the first time in a while: small shake, no flash
    if (s.spotted && !last.spotted) {
      feedback.fire('small', { x: game.player.x, y: game.player.y, colour: '255,120,80' });
    }
    last.spotted = s.spotted;

    // 3. the alarm crossing a danger band: medium, so the meter reads without a number
    const band = s.alarm >= 75 ? 3 : s.alarm >= 40 ? 2 : s.alarm >= 15 ? 1 : 0;
    if (band > last.alarmBand) {
      feedback.fire('medium', { x: game.player.x, y: game.player.y, colour: band >= 3 ? '255,70,50' : '255,160,60' });
    }
    last.alarmBand = band;

    // 4. the two endings: large, and the only events allowed a bright flash
    if (s.phase !== last.phase) {
      if (s.phase === 'caught' && flashOk(nowMs)) {
        feedback.fire('large', { x: game.player.x, y: game.player.y, colour: '255,60,40' });
      }
      if (s.phase === 'escaped' && flashOk(nowMs)) {
        feedback.fire('large', { x: game.player.x, y: game.player.y, colour: '255,220,130' });
      }
      last.phase = s.phase;
    }

    feedback.update(dt);
  };
}
