// Probe exactly what the shot pages do: import main.js the way index.html does and
// report any thrown error as text that survives in a screenshot.
import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..', 'game');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };

const PROBE = `<!doctype html><html><body style="background:#fff;color:#000;font:13px monospace;padding:16px;white-space:pre-wrap">
<div id="log">running…</div>
<script type="module">
const lines = [];
const el = document.getElementById('log');
function say(t){ lines.push(t); el.textContent = lines.join('\\n'); }
window.addEventListener('error', e => say('ERR: ' + (e.message||'') + ' @ ' + (e.filename||'') + ':' + (e.lineno||'')));
window.addEventListener('unhandledrejection', e => say('REJ: ' + ((e.reason && (e.reason.stack||e.reason.message))||'')));
say('start');
try {
  const m = await import('/src/main.js');
  say('main imported, keys: ' + Object.keys(m).join(','));
  const g = window.__nightAudit;
  say('__nightAudit: ' + (g ? 'present' : 'MISSING'));
  if (g) { const game = g.game(); say('game: ' + (game ? 'present phase=' + game.state.phase : 'missing')); }
} catch (e) {
  say('IMPORT THREW: ' + (e && (e.stack || e.message)));
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

await new Promise((ok) => server.listen(8143, '127.0.0.1', ok));
console.log('probe2 on 8143');
setTimeout(() => server.close(), 90000);
