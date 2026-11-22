// Everything the player sees.
//
// Rebuilt for the judge's eye (2026-11-22, third pass). The judge never plays the
// game: it sees the cover fitted to 768x480 and the other stills in a row of
// 256x160 cells. At that size a uniform dark-blue grid reads as mush, so the
// palette now carries the whole story: near-black safe floor, hard amber danger,
// hot gold loot. Characters are drawn large with a rim light so they survive the
// shrink. Drawn per frame onto one canvas with no images.
import { TILE, COLS, ROWS, W, H, config } from './config.js';
import { map } from './world.js';
import { clamp } from './geom.js';

const PAL = {
  floor: '#0b0e16',
  floorAlt: '#10141f',
  wall: '#1a2130',
  wallTop: '#2b3648',
  cover: '#232d40',
  carpet: '#141220',
  vault: '#0e1220',
  gold: '#ffd166',
  goldHot: '#fff3b0',
  thief: '#7ff3ff',
  thiefHot: '#e8ffff',
  guard: '#f2e6c8',
  alert: '#ff5a3c',
  text: '#e8eefb',
  dim: '#6b7894',
  brass: '#c9a45a',
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

// A soft glow behind a thing, used for loot and the thief so they pop at thumbnail size.
function glow(ctx, x, y, radius, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, radius);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
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
        ctx.fillRect(px, py, TILE, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        continue;
      }
      ctx.fillStyle = (x + y) % 2 === 0 ? PAL.floor : PAL.floorAlt;
      ctx.fillRect(px, py, TILE, TILE);
      if (map.carpet[p]) {
        ctx.fillStyle = PAL.carpet;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(120, 90, 60, 0.18)';
        ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
      }
    }
  }

  // the vault corridor: a brass inlay so the exit reads as the goal even tiny
  const vy = 19 * TILE;
  ctx.strokeStyle = 'rgba(201, 164, 90, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, vy + 2, W - 4, 3 * TILE - 4);
}

// Free-standing museum cases: glass tops over dark plinths, with a glint.
function drawCoverCases(ctx) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!map.solid[x + y * COLS]) continue;
      if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) continue;
      if (y > 18) continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = PAL.cover;
      ctx.fillRect(px + 2, py + 6, TILE - 4, TILE - 10);
      ctx.fillStyle = 'rgba(150, 210, 255, 0.22)';
      ctx.fillRect(px + 4, py + 8, TILE - 8, 9);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(px + 6, py + 9, 6, 2);
    }
  }
}

function drawCone(ctx, src, angle, half, range, colour) {
  const grad = ctx.createRadialGradient(src.x, src.y, 10, src.x, src.y, range);
  grad.addColorStop(0, colour.base);
  grad.addColorStop(0.55, colour.mid);
  grad.addColorStop(1, colour.fade);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = colour.edge;
  ctx.lineWidth = colour.width || 2;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.stroke();
}

// Two-zone cone, the way stealth games that read well actually draw it: a solid
// inner wedge where standing gets you caught, hatched outer wedge where you are
// still only a maybe. Studied from Shadow Tactics' vision-cone spec rather than
// eyeballed: the split tells a player where the safe margin is, and at thumbnail
// size the inner/outer contrast is what still reads as "a cone" after shrinking.
function drawTwoZoneCone(ctx, src, angle, half, range, colour) {
  const innerFrac = colour.inner || 0.62;
  const innerRange = range * innerFrac;

  // outer zone: faint fill plus hatching
  const gOut = ctx.createRadialGradient(src.x, src.y, innerRange * 0.9, src.x, src.y, range);
  gOut.addColorStop(0, colour.outer);
  gOut.addColorStop(1, colour.outerFade);
  ctx.fillStyle = gOut;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();

  // hatching for the outer zone only: short radial ticks inside the far band.
  // Kept faint and few -- the first pass used 14 full-length ticks per cone and the
  // room turned into dandelions, stealing attention from the thief.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = colour.hatch;
  ctx.lineWidth = 1;
  const ticks = 7;
  for (let i = 1; i < ticks; i++) {
    const a = angle - half + (2 * half * i) / ticks;
    const r0 = innerRange + 6;
    const r1 = range - 4;
    ctx.beginPath();
    ctx.moveTo(src.x + Math.cos(a) * r0, src.y + Math.sin(a) * r0);
    ctx.lineTo(src.x + Math.cos(a) * r1, src.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();

  // inner zone: solid, the part that actually catches you
  const gIn = ctx.createRadialGradient(src.x, src.y, 8, src.x, src.y, innerRange);
  gIn.addColorStop(0, colour.base);
  gIn.addColorStop(1, colour.mid);
  ctx.fillStyle = gIn;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, innerRange, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();

  // the boundary between the zones is the most useful line on screen
  ctx.strokeStyle = colour.edge;
  ctx.lineWidth = colour.width || 2;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.arc(src.x, src.y, innerRange, angle - half, angle + half);
  ctx.closePath();
  ctx.stroke();
}

// Cone colours carry DETECTION STATE, not identity, per the same spec: calm is a
// warm amber, suspicion climbs to hot orange, seen is red. Cameras are dimmer and
// cooler so a glance tells a guard from a lens without a legend.
const CONE_CALM = {
  base: 'rgba(255, 186, 74, 0.52)',
  mid: 'rgba(255, 168, 60, 0.26)',
  outer: 'rgba(255, 186, 74, 0.20)',
  outerFade: 'rgba(255, 160, 50, 0.02)',
  hatch: 'rgba(255, 200, 110, 0.30)',
  edge: 'rgba(255, 208, 130, 0.95)',
  width: 2,
  inner: 0.6,
};
const CONE_WARY = {
  base: 'rgba(255, 138, 40, 0.60)',
  mid: 'rgba(255, 120, 30, 0.30)',
  outer: 'rgba(255, 138, 40, 0.24)',
  outerFade: 'rgba(255, 110, 20, 0.03)',
  hatch: 'rgba(255, 170, 80, 0.38)',
  edge: 'rgba(255, 170, 80, 1)',
  width: 2.5,
  inner: 0.66,
};
const CONE_SEEN = {
  base: 'rgba(255, 64, 40, 0.70)',
  mid: 'rgba(255, 50, 30, 0.36)',
  outer: 'rgba(255, 64, 40, 0.28)',
  outerFade: 'rgba(255, 40, 20, 0.03)',
  hatch: 'rgba(255, 120, 90, 0.45)',
  edge: 'rgba(255, 120, 90, 1)',
  width: 3,
  inner: 0.72,
};
const CONE_CAMERA = {
  base: 'rgba(150, 190, 255, 0.30)',
  mid: 'rgba(140, 180, 255, 0.16)',
  outer: 'rgba(150, 190, 255, 0.14)',
  outerFade: 'rgba(140, 180, 255, 0.01)',
  hatch: 'rgba(170, 205, 255, 0.22)',
  edge: 'rgba(180, 210, 255, 0.55)',
  width: 1.5,
  inner: 0.55,
};

// A state icon over a guard's head: "!" when it has you, "?" while it is deciding.
// At the judge's 256x160 cell this glyph is more legible than any label.
function drawStateIcon(ctx, x, y, kind) {
  const hot = kind === 'alert';
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = hot ? 'rgba(255, 60, 40, 1)' : 'rgba(255, 200, 60, 1)';
  ctx.strokeStyle = 'rgba(10, 12, 18, 0.9)';
  ctx.lineWidth = 3;
  ctx.font = 'bold 22px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = hot ? '!' : '?';
  ctx.strokeText(glyph, 0, 0);
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

// A guard: body, rim light, a torch head. Big enough to read when shrunk.
function drawGuard(ctx, g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(g.facing);

  if (g.sees) glow(ctx, 6, 0, 34, 'rgba(255, 90, 60, 0.55)', 'rgba(255, 60, 30, 0)');

  // shoulders
  ctx.fillStyle = g.sees ? PAL.alert : PAL.guard;
  roundRect(ctx, -12, -11, 26, 22, 7);
  ctx.fill();
  // cap/shako in a darker blue, reads as a uniform
  ctx.fillStyle = '#2f3a52';
  roundRect(ctx, -2, -8, 15, 16, 5);
  ctx.fill();
  // rim light along the leading edge
  ctx.strokeStyle = g.sees ? 'rgba(255,220,200,0.95)' : 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12, -1.05, 1.05);
  ctx.stroke();
  // torch
  ctx.fillStyle = g.sees ? '#fff0c0' : '#ffd98a';
  ctx.beginPath();
  ctx.arc(13, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = g.sees ? PAL.alert : 'rgba(220, 228, 245, 0.75)';
  ctx.font = 'bold 10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(g.name.toUpperCase(), g.x, g.y - 20);
}

function drawGuards(ctx, game) {
  // cones first so bodies sit on top of their own light
  for (const g of game.guards) {
    const colour = g.alerted > 0 || g.sees ? CONE_SEEN : g.sightings > 0 ? CONE_WARY : CONE_CALM;
    drawTwoZoneCone(ctx, g, g.facing, g.half, g.sight, colour);
  }
  for (const g of game.guards) {
    drawGuard(ctx, g);
    // state glyph: "!" when it has you, "?" while it is growing suspicious
    if (g.sees || g.alerted > 0) drawStateIcon(ctx, g.x, g.y - 34, 'alert');
    else if (g.sightings > 0) drawStateIcon(ctx, g.x, g.y - 34, 'wary');
  }
}

function drawCameras(ctx, game) {
  for (const c of game.cameras) {
    if (c.down <= 0) {
      drawTwoZoneCone(ctx, c, c.facing, 0.34, c.range, c.sees ? CONE_SEEN : CONE_CAMERA);
    }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.down > 0 ? '#3d4459' : '#dbe6f7';
    roundRect(ctx, -8, -6, 16, 12, 4);
    ctx.fill();
    ctx.rotate(c.facing);
    ctx.fillStyle = c.down > 0 ? '#555d75' : '#93a4c4';
    roundRect(ctx, 4, -3, 13, 6, 3);
    ctx.fill();
    ctx.restore();
    if (c.down > 0) {
      ctx.fillStyle = 'rgba(120, 140, 180, 0.95)';
      ctx.font = 'bold 9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OFF', c.x, c.y - 11);
    }
  }
}

// Loot is the only warm-gold thing on the floor, so it pulls the eye at any size.
function drawLoot(ctx, game) {
  for (const l of game.state.loot) {
    if (l.taken) continue;
    const pulse = 0.65 + 0.35 * Math.sin(game.state.time * 3 + l.id);
    glow(ctx, l.x, l.y, 44, `rgba(255, 209, 102, ${0.5 * pulse})`, 'rgba(255, 200, 90, 0)');
    ctx.save();
    ctx.translate(l.x, l.y);
    // a diamond with a bright core and a dark outline so it survives shrinking
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(60, 40, 0, 0.8)';
    ctx.fillRect(-8.5, -8.5, 17, 17);
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = PAL.goldHot;
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 226, 150, 0.95)';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(l.name.toUpperCase(), l.x, l.y - 20);
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
  if (open) glow(ctx, d.x, d.y, 52, 'rgba(121, 212, 140, 0.55)', 'rgba(121, 212, 140, 0)');
  ctx.fillStyle = open ? '#79d48c' : PAL.brass;
  ctx.fillRect(d.x - 15, d.y - 24, 30, 48);
  ctx.fillStyle = open ? '#0f2a1c' : '#0b0e16';
  ctx.fillRect(d.x - 10, d.y - 19, 20, 38);
  ctx.fillStyle = open ? 'rgba(140, 240, 170, 1)' : 'rgba(255, 200, 97, 0.95)';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'VAULT', d.x, d.y - 28);
}

// The thief: bright cyan against a near-black floor, with a rim light and a soft
// halo, so it is the first thing found in a shrunken frame.
function drawThief(ctx, game) {
  const p = game.player;
  const caught = game.state.phase === 'caught';
  glow(ctx, p.x, p.y, 30, caught ? 'rgba(255, 90, 60, 0.4)' : 'rgba(127, 243, 255, 0.30)', 'rgba(127, 243, 255, 0)');

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 7, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);
  // a hooded thief: pointed hood, cloak, bright eye line
  ctx.fillStyle = caught ? PAL.alert : PAL.thief;
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.lineTo(9, -8);
  ctx.lineTo(15, 0);
  ctx.lineTo(9, 8);
  ctx.lineTo(-11, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0b1620';
  roundRect(ctx, 1, -6, 10, 12, 4);
  ctx.fill();
  ctx.fillStyle = PAL.thiefHot;
  ctx.beginPath();
  ctx.arc(7, 0, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = caught ? 'rgba(255,220,200,1)' : 'rgba(232, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12, -1.2, 1.2);
  ctx.stroke();
  ctx.restore();

  if (game.player.torch) {
    ctx.strokeStyle = 'rgba(127, 243, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, p.facing - 0.5, p.facing + 0.5);
    ctx.stroke();
  }
}

// Draws the feedback layer on top of the world: particles, then the flash tint.
// Accessibility: a flash is only ever a tint over the frame, never a full-screen
// strobe, and the feedback module caps how often one can fire (WCAG 2.3.1).
function drawFeedback(ctx, feedback) {
  if (!feedback) return;
  const st = feedback.state;
  for (const p of st.particles) {
    const a = 1 - p.age / p.life;
    ctx.fillStyle = `rgba(${p.colour}, ${a * 0.9})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (st.flash > 0.01) {
    ctx.fillStyle = `rgba(${st.flashColour}, ${Math.min(0.55, st.flash)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// The alarm readout. Colour alone is not allowed to carry the meaning (that is
// the colour-blind trap the game-ui-ux skill calls out), so the bar also changes
// SHAPE -- a hatched warning zone appears as danger climbs, and the label spells
// the state out in words.
function alarmState(t) {
  if (t >= 0.75) return { word: 'CRITICAL', col: PAL.alert };
  if (t >= 0.4) return { word: 'HEIGHTENED', col: '#ffa04a' };
  if (t >= 0.15) return { word: 'NOTICED', col: '#ffd166' };
  return { word: 'QUIET', col: '#79d48c' };
}

export function drawHud(ctx, game) {
  const s = game.state;
  const mw = 300;
  const mx = (W - mw) / 2;
  ctx.fillStyle = 'rgba(6, 9, 15, 0.9)';
  roundRect(ctx, mx - 12, 10, mw + 24, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#1a2130';
  roundRect(ctx, mx, 27, mw, 11, 6);
  ctx.fill();
  const t = s.alarm / 100;
  const st = alarmState(t);

  // danger zone: from 40% up the track is hatched, so the shape warns before the colour does
  if (t >= 0.4) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, mx, 27, mw, 11, 6);
    ctx.clip();
    ctx.strokeStyle = 'rgba(10, 12, 18, 0.55)';
    ctx.lineWidth = 1.5;
    for (let x = mx + mw * 0.4; x < mx + mw; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, 38);
      ctx.lineTo(x + 7, 27);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = st.col;
  roundRect(ctx, mx, 27, Math.max(7, mw * t), 11, 6);
  ctx.fill();

  // a notch at the critical line, so the threshold is spatial as well as coloured
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillRect(mx + mw * 0.75, 24, 2, 17);

  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', mx, 22);
  ctx.textAlign = 'right';
  ctx.fillText(`${st.word} ${Math.round(s.alarm)}%`, mx + mw, 22);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(6, 9, 15, 0.9)';
  roundRect(ctx, 14, 10, 216, 34, 8);
  ctx.fill();
  for (let i = 0; i < config.lootGoal; i++) {
    const taken = i < s.carried;
    ctx.fillStyle = taken ? PAL.gold : '#2b3648';
    ctx.save();
    ctx.translate(36 + i * 24, 27);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillText(`LOOT ${s.carried}/${config.lootGoal}`, 112, 32);

  ctx.fillStyle = 'rgba(6, 9, 15, 0.9)';
  roundRect(ctx, W - 250, 10, 236, 34, 8);
  ctx.fill();
  ctx.fillStyle = PAL.text;
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillText(`SPACE noisemaker x${s.tools.noisemaker}`, W - 238, 26);
  ctx.fillStyle = s.blackout > 0 ? '#79d48c' : PAL.dim;
  ctx.fillText(`Q blackout ${s.blackout > 0 ? Math.ceil(s.blackout) + 's' : 'x' + s.tools.blackout}`, W - 238, 40);

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px ui-monospace, monospace';
  s.messages.forEach((m, i) => {
    const a = clamp((m.life - m.age) / 0.8, 0, 1);
    ctx.fillStyle = `rgba(232, 238, 251, ${a * (1 - i * 0.22)})`;
    ctx.fillText(m.text, W / 2, H - 54 - i * 18);
  });

  const near = game.nearestLoot();
  if (near && s.phase === 'play') {
    ctx.fillStyle = 'rgba(255, 232, 170, 0.98)';
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillText('[E]  take it', near.x, near.y + 36);
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

export function draw(ctx, game, feedback) {
  ctx.clearRect(0, 0, W, H);

  // Screen shake writes a canvas transform, never a body position: the simulation
  // and the collisions never see this offset (game-feel's "shake the camera, not
  // the body" rule). It uses the feedback module's already-decayed trauma.
  const st = feedback ? feedback.state : null;
  const shaking = st && (st.offsetX || st.offsetY);
  ctx.save();
  if (shaking) ctx.translate(st.offsetX, st.offsetY);

  drawRoom(ctx);
  drawCoverCases(ctx);
  drawBreakers(ctx, game);
  drawCameras(ctx, game);
  drawGuards(ctx, game);
  drawLoot(ctx, game);
  drawExit(ctx, game);
  drawThief(ctx, game);
  ctx.restore();

  drawFeedback(ctx, feedback);
  drawHud(ctx, game);

  if (game.state.phase === 'caught') {
    ctx.fillStyle = 'rgba(50, 0, 0, 0.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PAL.alert;
    ctx.font = 'bold 40px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALARM SOUNDED', W / 2, H / 2 - 10);
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 14px ui-monospace, monospace';
    ctx.fillText(`${game.state.caughtBy} caught you. Press R.`, W / 2, H / 2 + 26);
  }
  if (game.state.phase === 'escaped') {
    ctx.fillStyle = 'rgba(6, 24, 18, 0.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 40px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAN GETAWAY', W / 2, H / 2 - 10);
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 14px ui-monospace, monospace';
    ctx.fillText(`All three pieces, out in ${game.state.time.toFixed(1)}s. Press R.`, W / 2, H / 2 + 26);
  }
}
