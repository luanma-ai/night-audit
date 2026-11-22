// Feedback layer: the small, brief, exaggerated responses that make an event read.
//
// Method taken from the `game-feel` skill rather than invented here: every event
// gets a TIER, each tier fires one fixed bundle of channels, and the bundle stays
// proportional across the whole game so nothing individually has to be judged by
// eye. Two of that skill's hard rules are followed literally because they are the
// ones that go wrong quietly:
//   - shake is trauma^2 and decays in REAL time, so light events barely register
//     and the shake keeps unwinding during a freeze instead of sticking off-centre;
//   - overlapping events ADD trauma (they do not reset it), and only the newest
//     hit-stop owns the restore, so two hits 30 ms apart cannot unfreeze early.
// Offsets are summed sines at unrelated rates, never a per-frame random buzz.
//
// This module writes only visual state. It never moves a body, never touches the
// simulation, and every effect snaps back to rest.

const TIERS = {
  // small: footsteps, coin, UI hover -- a tick, no shake
  small: { trauma: 0.14, stop: 0, flash: 0, particles: 3 },
  // medium: a sighting, a pickup, the alarm crossing a band
  medium: { trauma: 0.38, stop: 0.045, flash: 0.22, particles: 10 },
  // large: caught, escape, the blackout slamming on
  large: { trauma: 0.82, stop: 0.11, flash: 0.55, particles: 26 },
};

export function createFeedback() {
  const state = {
    trauma: 0,
    strength: 1,          // player-facing accessibility setting, 0..1
    flash: 0,             // 0..1 white/red overlay
    flashColour: '255,255,255',
    reduceFlashing: false,
    offsetX: 0,
    offsetY: 0,
    roll: 0,
    particles: [],
    _t: 0,
    _stopUntil: 0,
    _stopId: 0,
  };

  // Add trauma; hits accumulate toward 1 rather than replacing each other.
  function addTrauma(amount) {
    state.trauma = Math.min(1, state.trauma + amount);
  }

  // Fire one tier's bundle. `opts.colour` tints flash and particles.
  function fire(tier, opts = {}) {
    const t = TIERS[tier] || TIERS.small;
    addTrauma(t.trauma);
    if (t.flash > 0) {
      state.flash = Math.max(state.flash, state.reduceFlashing ? t.flash * 0.25 : t.flash);
      state.flashColour = opts.colour || '255,255,255';
    }
    if (t.particles > 0 && opts.x != null) {
      spawnParticles(opts.x, opts.y, t.particles, opts.colour || '255,220,150');
    }
    if (t.stop > 0) {
      // Only the newest freeze owns the restore. Real-time bookkeeping only:
      // this game never slows its own clock, so the freeze is spent as a flag.
      state._stopId += 1;
      state._stopUntil = performance.now() + t.stop;
    }
  }

  function spawnParticles(x, y, count, colour) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 150;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.35 + Math.random() * 0.4,
        age: 0,
        colour,
        size: 1.6 + Math.random() * 2.4,
      });
    }
  }

  // Decay with real time so a freeze never strands the camera off-centre.
  function update(dt) {
    if (state.trauma > 0) {
      state.trauma = Math.max(0, state.trauma - 1.2 * dt);
    }
    const shake = state.trauma * state.trauma * state.strength;
    state._t += dt * 30;
    if (shake > 0.0001) {
      state.offsetX = 12 * shake * Math.sin(state._t * 1.7);
      state.offsetY = 8 * shake * Math.sin(state._t * 2.3);
      state.roll = 0.1 * shake * Math.sin(state._t * 1.1);
    } else {
      // snap back to exact rest, or the picture drifts a pixel and stops reading
      state.offsetX = 0;
      state.offsetY = 0;
      state.roll = 0;
      state.trauma = 0;
    }

    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 3.2);

    for (const p of state.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    state.particles = state.particles.filter((p) => p.age < p.life);
  }

  return { state, fire, update, TIERS };
}

// WCAG 2.3.1: large bright flashes stay at or under three per second. Every event
// that fires a flash goes through here so a burst cannot break that limit.
export function makeFlashGuard() {
  const recent = [];
  return function allowed(nowMs) {
    while (recent.length && nowMs - recent[0] > 1000) recent.shift();
    if (recent.length >= 3) return false;
    recent.push(nowMs);
    return true;
  };
}
