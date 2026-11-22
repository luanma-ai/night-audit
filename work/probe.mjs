// Diagnose what actually loaded in the page: module errors, globals, canvas content.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..', 'game');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
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

// A page that reports what happened, so a screenshot of it can be read.
const PROBE = `<!doctype html><html><body style="background:#fff;color:#000;font:14px monospace;padding:20px">
<div id="log"></div>
<script>
const w = window.__probe = [];
function say(t){ w.push(t); document.getElementById('log').textContent = w.join('\\n'); }
window.addEventListener('error', e => say('ERROR: ' + e.message + ' @ ' + e.filename + ':' + e.lineno));
window.addEventListener('unhandledrejection', e => say('REJECT: ' + (e.reason && e.reason.message)));
say('probe start');
fetch('/src/main.js').then(r => say('fetch main.js -> ' + r.status)).catch(e => say('fetch failed ' + e.message));
import('/src/main.js').then(() => say('module imported ok')).catch(e => say('IMPORT FAILED: ' + e.message));
</script></body></html>`;

await new Promise((ok) => server.listen(8132, '127.0.0.1', ok));
console.log('probe on 8132');
setTimeout(() => server.close(), 60000);
