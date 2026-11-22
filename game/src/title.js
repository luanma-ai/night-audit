// The title card and the pause card, drawn with the same primitives as the room so
// the whole game is one canvas and one style.
import { W, H, config } from './config.js';

const TITLE = 'NIGHT AUDIT';
const SUB = 'The Lockwood Museum, one night, three pieces';

export function drawTitle(ctx, t) {
  ctx.fillStyle = 'rgba(8, 11, 18, 0.86)';
  ctx.fillRect(0, 0, W, H);

  // a slow amber sweep behind the title, the same colour as a guard's cone
  const cx = W * 0.5 + Math.sin(t * 0.35) * 120;
  const grad = ctx.createRadialGradient(cx, H * 0.42, 20, cx, H * 0.42, 460);
  grad.addColorStop(0, 'rgba(255, 196, 110, 0.20)');
  grad.addColorStop(1, 'rgba(255, 196, 110, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd479';
  ctx.font = 'bold 52px ui-monospace, monospace';
  ctx.fillText(TITLE, W / 2, H * 0.36);
  ctx.fillStyle = '#8fa0c0';
  ctx.font = 'bold 14px ui-monospace, monospace';
  ctx.fillText(SUB, W / 2, H * 0.36 + 26);

  const keys = [
    ['WASD', 'move'],
    ['SHIFT', 'sprint (loud)'],
    ['CTRL', 'sneak (low profile)'],
    ['E', 'take loot'],
    ['SPACE', 'throw noisemaker'],
    ['Q', 'blackout'],
    ['F', 'torch'],
  ];
  ctx.font = 'bold 12px ui-monospace, monospace';
  keys.forEach(([k, d], i) => {
    const y = H * 0.52 + i * 20;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8eefb';
    ctx.fillText(k, W / 2 - 12, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7d8aa6';
    ctx.fillText(d, W / 2 + 12, y);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255, 212, 121, ${0.55 + 0.45 * Math.sin(t * 3)})`;
  ctx.font = 'bold 15px ui-monospace, monospace';
  ctx.fillText('PRESS SPACE TO BEGIN', W / 2, H - 44);
  ctx.fillStyle = '#5d6a85';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(`${config.lootGoal} pieces, one alarm meter, no second chance`, W / 2, H - 22);
}
