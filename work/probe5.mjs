// Loads the escape shot in the real browser and reports where it fails.
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..', 'game');

// A probe page that imports the same modules and draws the escape shot.
const PROBE = `<!doctype html><html><body style="background:#fff;color:#000;font:13px monospace;padding:12px;white-space:pre-wrap">
<div id="log"></div><canvas id="c" width="1280" height="768"></canvas>
<script type="module">
const lines=[]; const el=document.getElementById('log');
function say(t){ lines.push(t); el.textContent=lines.join('\\n'); }
window.addEventListener('error', e => say('WINERR: '+e.message));
try {
  const shots = await import('/src/shots.js');
  const rend = await import('/src/render.js');
  const g = shots.scriptEscape();
  say('escape built, phase='+g.state.phase);
  rend.draw(document.getElementById('c').getContext('2d'), g);
  say('draw ok');
} catch(e) { say('THREW: '+(e&&(e.stack||e.message))); }
</script></body></html>`;

const serveMock = resolve(here, 'probe5.html');
writeFileSync(serveMock, PROBE);
console.log('probe page written next to the server root?', serveMock);

const port = 8207;
const server = spawn(process.execPath, [join(here, '..', 'serve.ts'), '--port', String(port)], { cwd: join(here, '..'), stdio: 'ignore' });
await new Promise((ok) => setTimeout(ok, 2000));
console.log('server up on', port);
server.kill();
