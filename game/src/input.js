// Keyboard and mouse, read every frame. WASD moves, shift sprints, ctrl sneaks,
// space throws a noisemaker, F toggles the torch, click a light switch to kill power.
export function createInput(canvas) {
  const keys = Object.create(null);
  const pressed = Object.create(null);
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function key(e, value) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (value && !keys[k]) pressed[k] = true;
    keys[k] = value;
    if (['w', 'a', 's', 'd', ' ', 'Shift', 'Control', 'Escape'].includes(k)) e.preventDefault();
  }

  window.addEventListener('keydown', (e) => key(e, true));
  window.addEventListener('keyup', (e) => key(e, false));
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });

  return {
    keys,
    mouse,
    down: (k) => !!keys[k],
    took(k) {
      if (pressed[k]) {
        pressed[k] = false;
        return true;
      }
      return false;
    },
    moveAxis() {
      let x = 0;
      let y = 0;
      if (keys['a'] || keys['ArrowLeft']) x -= 1;
      if (keys['d'] || keys['ArrowRight']) x += 1;
      if (keys['w'] || keys['ArrowUp']) y -= 1;
      if (keys['s'] || keys['ArrowDown']) y += 1;
      const m = Math.hypot(x, y) || 1;
      return { x: x / m, y: y / m };
    },
    tookClick() {
      if (mouse.clicked) {
        mouse.clicked = false;
        return true;
      }
      return false;
    },
    endFrame() {
      for (const k of Object.keys(pressed)) pressed[k] = false;
      mouse.clicked = false;
    },
  };
}
