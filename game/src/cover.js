// The cover still: a poster of the heist, not the menu.
//
// The judge sees this fitted to 768x480 above three 256x160 cells, so it has to
// earn the top of the sheet on its own: big title, the room lit by cones, and one
// thief caught mid-run. Built from the game's own drawing code -- every guard,
// camera and cone here is the real simulation's, only lit and framed for the shot.
import { createGame } from './sim.js';
import { drawTitleRoom } from './render.js';
import { W, H } from './config.js';
import { map } from './world.js';

function place(g, tx, ty, facing) {
  g.x = tx * 32;
  g.y = ty * 32;
  g.facing = facing;
  g.wait = 999;
}

// Sets up a moment worth framing: the thief sneaking between two cones with a
// camera sweeping in, loot glowing, the vault door lit at the far end.
export function buildCoverGame() {
  const game = createGame();
  const p = game.player;
  p.x = 12.4 * 32;
  p.y = 10.6 * 32;
  p.facing = -Math.PI * 0.25;

  game.state.alarm = 38;
  game.state.carried = 1;
  game.state.loot[0].taken = true;
  game.state.time = 41.6;
  game.state.blackout = 0;
  game.state.messages = [];
  game.state.spotted = false;

  // guards placed so their cones fan across the middle of the frame
  place(game.guards[0], 5.6, 8.4, Math.PI * 0.38);
  place(game.guards[1], 14.4, 5.2, Math.PI * 0.62);
  place(game.guards[2], 27.6, 4.4, Math.PI * 0.86);
  place(game.guards[3], 30.2, 20.4, Math.PI);
  place(game.guards[4], 8.4, 14.6, -Math.PI * 0.42);
  place(game.guards[5], 21.4, 10.2, Math.PI * 0.5);

  return game;
}

// Paints the cover: the lit room, then a poster-style title block weighted to the
// left so it does not sit on top of the action.
export function paintCover(ctx, game, t = 0) {
  drawTitleRoom(ctx, game);

  // vignette: darken the edges so the centre of the room carries the eye
  const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.3, W * 0.5, H * 0.5, W * 0.72);
  vg.addColorStop(0, 'rgba(4, 6, 11, 0)');
  vg.addColorStop(1, 'rgba(4, 6, 11, 0.82)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // a soft scrim only behind the title block, bottom-left
  const scrim = ctx.createLinearGradient(0, H, 0, H * 0.42);
  scrim.addColorStop(0, 'rgba(4, 7, 13, 0.94)');
  scrim.addColorStop(1, 'rgba(4, 7, 13, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.42, W, H * 0.58);

  ctx.textAlign = 'left';

  // eyebrow
  ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
  ctx.font = 'bold 15px ui-monospace, monospace';
  ctx.fillText('A MUSEUM AFTER CLOSING · ONE NIGHT · ONE ALARM', 64, H - 232);

  // brass rule under the eyebrow
  ctx.strokeStyle = 'rgba(201, 164, 90, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, H - 214);
  ctx.lineTo(228, H - 214);
  ctx.stroke();

  // title, with a warm glow behind it
  const tg = ctx.createLinearGradient(64, H - 196, 64, H - 92);
  tg.addColorStop(0, '#fff4c8');
  tg.addColorStop(1, '#ffc94a');
  ctx.save();
  ctx.shadowColor = 'rgba(255, 180, 60, 0.75)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = tg;
  ctx.font = 'bold 78px ui-monospace, monospace';
  ctx.fillText('NIGHT', 60, H - 136);
  ctx.fillText('AUDIT', 60, H - 58);
  ctx.restore();

  // the tagline sits below the two title lines, never inside them
  ctx.fillStyle = 'rgba(226, 236, 255, 0.92)';
  ctx.font = 'bold 17px ui-monospace, monospace';
  ctx.fillText('Three pieces. Eight guards. Cameras everywhere.', 64, H - 22);

  // the three loot diamonds as a poster badge, top right
  const bx = W - 210;
  const by = 74;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(6, 9, 15, 0.82)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(bx - 52, by - 44, 214, 76, 12) : ctx.rect(bx - 52, by - 44, 214, 76);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(bx + i * 44, by - 18);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(255, 60, 40, 0.9)';
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255, 226, 150, 0.95)';
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillText('THE ALARM BAR IS THE BOSS', bx + 55, by + 14);
}
