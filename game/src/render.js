// Everything the player sees. The palette does the work: cool slate for safe floor,
// amber pools for danger, warm gold for loot, so a glance reads the room before a
// word is read. Drawn per frame onto one canvas with no images.
import { TILE, COLS, ROWS, W, H, config } from './config.js';
import { map } from './world.js';
import { clamp } from './geom.js';

const PAL = {
  floor: '#1b2130',
  floorAlt: '#202839',
  wall: '#2f3a52',
  wallTop: '#43526f',
  cover: '#3a4560',
  carpet: '#241f33',
  vault: '#24283a',
  safe: 'rgba(120, 200, 255, 0.05)',
  danger: 'rgba(255, 168, 72, 0.16)',
  dangerEdge: 'rgba(255, 186, 96, 0.5)',
  gold: '#ffc861',
  thief: '#8ff0ff',
  text: '#dfe7f5',
  dim: '#7d8aa6',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRoom(ctx) {
  ctx.fillStyle = PAL.floor;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = x + y * COLS;
      const px = x * TILE;
      const py = y * TILE;
      if (map.solid[p]) {
        ctx.fillStyle = PAL.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = PAL.wallTop;
        ctx.fillRect(px, py, TILE, 5);
        ctx.strokeStyle = 'rgba(10,14,22,0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        continue;
      }
      ctx.fillStyle = (x + y) % 2 === 0 ? PAL.floor : PAL.floorAlt;
      ctx.fillRect(px, py, TILE, TILE);
      if (map.carpet[p]) {
        ctx.fillStyle = PAL.vault;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(96, 116, 170, 0.16)';
        ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
      }
    }
  }
  // the vault corridor gets a thick brass inlay so the exit reads as the goal
  const vy = 19 * TILE;
  ctx.strokeStyle = 'rgba(255, 200, 97, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, vy + 2, W - 4, 3 * TILE - 4);
}

function drawCoverCases(ctx) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!map.solid[x + y * COLS]) continue;
      if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) continue;
      // the free-standing museum cases: glass tops over dark plinths
      const px = x * TILE;
      const py = y * TILE;
      if (y > 18) continue;
      ctx.fillStyle = PAL.cover;
      ctx.fillRect(px + 2, py + 6, TILE - 4, TILE - 10);
      ctx.fillStyle = 'rgba(150, 210, 255, 0.18)';
      ctx.fillRect(px + 4, py + 8, TILE - 8, 8);
    }
  }
}

function drawCone(ctx, src, angle, half, range, colour) {
  const grad = ctx.createRadialGradient(src.x, src.y, 12, src.x, src.y, range);
  grad.addColorStop(0, colour.base);
  grad.addColorStop(1, colour.fade);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colour.edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.stroke();
}

const CONE_CALM = { base: 'rgba(255, 205, 130, 0.30)', fade: 'rgba(255, 190, 110, 0.0)', edge: 'rgba(255, 200, 120, 0.55)' };
const CONE_SEEN = { base: 'rgba(255, 120, 90, 0.42)', fade: 'rgba(255, 90, 60, 0.0)', edge: 'rgba(255, 120, 90, 0.85)' };

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    drawCone(ctx, g, g.facing, g.half, g.sight, g.sees ? CONE_SEEN : CONE_CALM);
  }
  for (const g of game.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(g.facing);
    ctx.fillStyle = g.sees ? '#ff8a6a' : '#e8e2cf';
    roundRect(ctx, -9, -8, 20, 16, 5);
    ctx.fill();
    ctx.fillStyle = '#3a4358';
    ctx.fillRect(4, -6, 7, 12);
    ctx.fillStyle = g.sees ? '#ff5a3c' : '#9fb6d8';
    ctx.beginPath();
    ctx.arc(9, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PAL.dim;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y - 16);
  }
}

function drawCameras(ctx, game) {
  for (const c of game.cameras) {
    if (c.down <= 0) {
      drawCone(ctx, c, c.facing, 0.34, c.range, c.sees ? CONE_SEEN : { base: 'rgba(255, 226, 150, 0.20)', fade: 'rgba(255, 210, 120, 0.0)', edge: 'rgba(255, 220, 140, 0.40)' });
    }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = c.down > 0 ? '#3d4459' : '#c9d6ea';
    roundRect(ctx, -8, -6, 16, 12, 4);
    ctx.fill();
    ctx.rotate(c.facing);
    ctx.fillStyle = c.down > 0 ? '#555d75' : '#7f8fb0';
    roundRect(ctx, 4, -3, 12, 6, 3);
    ctx.fill();
    ctx.restore();
    if (c.down > 0) {
      ctx.fillStyle = 'rgba(120, 140, 180, 0.9)';
      ctx.font = 'bold 9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OFF', c.x, c.y - 10);
    }
  }
}

function drawLoot(ctx, game) {
  for (const l of game.state.loot) {
    if (l.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(game.state.time * 3 + l.id);
    const grad = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 34);
    grad.addColorStop(0, `rgba(255, 210, 110, ${0.42 * pulse})`);
    grad.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    ctx.fillStyle = PAL.thief;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 140, 0.92)';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(l.name, l.x, l.y - 18);
  }
}

function drawBreakers(ctx, game) {
  for (const b of game.state.breakers) {
    ctx.fillStyle = b.on ? '#ffd27a' : '#4a5168';
    roundRect(ctx, b.x - 8, b.y - 10, 16, 20, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(b.x - 2, b.y - 7, 4, 8);
  }
}

function drawExit(ctx, game) {
  const d = map.vaultDoor;
  const open = game.state.vault.open;
  ctx.fillStyle = open ? '#79d48c' : '#c9a45a';
  ctx.fillRect(d.x - 14, d.y - 22, 28, 44);
  ctx.fillStyle = open ? '#0f2a1c' : '#1b2130';
  ctx.fillRect(d.x - 10, d.y - 18, 20, 36);
  ctx.fillStyle = open ? 'rgba(121, 212, 140, 0.95)' : 'rgba(255, 200, 97, 0.85)';
  ctx.font = 'bold 10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT OPEN' : 'VAULT', d.x, d.y - 26);
}

function drawThief(ctx, game) {
  const p = game.player;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 6, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);
  ctx.fillStyle = game.state.phase === 'caught' ? '#ff7a5a' : PAL.thief;
  roundRect(ctx, -8, -7, 17, 14, 6);
  ctx.fill();
  ctx.fillStyle = '#16202f';
  roundRect(ctx, 2, -5.5, 8, 11, 3);
  ctx.fill();
  ctx.fillStyle = '#d8f7ff';
  ctx.beginPath();
  ctx.arc(6, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (game.player.torch) {
    ctx.strokeStyle = 'rgba(143, 240, 255, 0.30)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26, p.facing - 0.5, p.facing + 0.5);
    ctx.stroke();
  }
}

function drawHud(ctx, game) {
  const s = game.state;
  // alarm meter, top centre
  const mw = 300;
  const mx = (W - mw) / 2;
  ctx.fillStyle = 'rgba(12, 16, 26, 0.82)';
  roundRect(ctx, mx - 10, 12, mw + 20, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#2a3145';
  roundRect(ctx, mx, 26, mw, 10, 5);
  ctx.fill();
  const t = s.alarm / 100;
  const col = t > 0.75 ? '#ff5a3c' : t > 0.4 ? '#ffa04a' : '#79d48c';
  ctx.fillStyle = col;
  roundRect(ctx, mx, 26, Math.max(6, mw * t), 10, 5);
  ctx.fill();
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', mx, 22);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(s.alarm)}%`, mx + mw, 22);

  // loot tracker, top left
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(12, 16, 26, 0.82)';
  roundRect(ctx, 14, 12, 210, 30, 6);
  ctx.fill();
  for (let i = 0; i < config.lootGoal; i++) {
    const taken = i < s.carried;
    ctx.fillStyle = taken ? PAL.gold : '#39415a';
    ctx.save();
    ctx.translate(34 + i * 22, 27);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillText(`LOOT ${s.carried}/${config.lootGoal}`, 106, 31);

  // tools, top right
  ctx.fillStyle = 'rgba(12, 16, 26, 0.82)';
  roundRect(ctx, W - 236, 12, 222, 30, 6);
  ctx.fill();
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillText(`SPACE noisemaker x${s.tools.noisemaker}`, W - 226, 31);
  ctx.fillStyle = s.blackout > 0 ? '#79d48c' : PAL.dim;
  ctx.fillText(`Q blackout ${s.blackout > 0 ? Math.ceil(s.blackout) + 's' : 'x' + s.tools.blackout}`, W - 226, 44);

  // messages, bottom
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px ui-monospace, monospace';
  s.messages.forEach((m, i) => {
    const a = clamp((m.life - m.age) / 0.8, 0, 1);
    ctx.fillStyle = `rgba(223, 231, 245, ${a * (1 - i * 0.22)})`;
    ctx.fillText(m.text, W / 2, H - 54 - i * 18);
  });

  // prompt near a piece of loot
  const near = game.nearestLoot();
  if (near && s.phase === 'play') {
    ctx.fillStyle = 'rgba(255, 232, 170, 0.95)';
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.fillText('[E]  take it', near.x, near.y + 34);
  }
}

// The room behind the title card: the same night, without the HUD.
export function drawTitleRoom(ctx, game) {
  drawRoom(ctx);
  drawCoverCases(ctx);
  drawBreakers(ctx, game);
  drawCameras(ctx, game);
  drawGuards(ctx, game);
  drawLoot(ctx, game);
  drawExit(ctx, game);
  drawThief(ctx, game);
}

export function draw(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawRoom(ctx);
  drawCoverCases(ctx);
  drawBreakers(ctx, game);
  drawCameras(ctx, game);
  drawGuards(ctx, game);
  drawLoot(ctx, game);
  drawExit(ctx, game);
  drawThief(ctx, game);
  drawHud(ctx, game);
  if (game.state.phase === 'caught') {
    ctx.fillStyle = 'rgba(40, 0, 0, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff8a6a';
    ctx.font = 'bold 34px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALARM SOUNDED', W / 2, H / 2 - 10);
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillText(`${game.state.caughtBy} caught you. Press R.`, W / 2, H / 2 + 22);
  }
  if (game.state.phase === 'escaped') {
    ctx.fillStyle = 'rgba(8, 20, 18, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 34px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAN GETAWAY', W / 2, H / 2 - 10);
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillText(`All three pieces, out in ${game.state.time.toFixed(1)}s. Press R.`, W / 2, H / 2 + 22);
  }
}
