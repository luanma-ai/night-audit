// Run draw() directly and report exactly where it throws, if it does.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..', 'game');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };

const PROBE = `<!doctype html><html><body style="background:#fff;color:#000;font:13px monospace;padding:16px;white-space:pre-wrap">
<div id="log"></div><canvas id="c" width="1280" height="768"></canvas>
<script type="module">
const lines=[]; const el=document.getElementById('log');
function say(t){ lines.push(t); el.textContent=lines.join('\\n'); }
window.addEventListener('error', e => say('WINDOW ERR: '+e.message+' @ '+e.filename+':'+e.lineno));
try {
  const cfg = await import('/src/config.js');
  const sim = await import('/src/sim.js');
  const rend = await import('/src/render.js');
  const shots = await import('/src/shots.js');
  say('modules ok');
  const g = shots.scriptPlay();
  say('scriptPlay ok, phase='+g.state.phase+' guards='+g.guards.length+' cams='+g.cameras.length);
  const ctx = document.getElementById('c').getContext('2d');
  rend.draw(ctx, g);
  say('draw ok');
} catch (e) {
  say('THREW: '+ (e && (e.stack || e.message)));
}
</script></body></html>`;

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PROBE);
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = resolve(join(root, p));
  if (file !== root && !file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    const s = statSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'content-length': s.size });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});

await new Promise((ok) => server.listen(8155, '127.0.0.1', ok));
console.log('probe3 on 8155');
setTimeout(() => server.close(), 90000);
