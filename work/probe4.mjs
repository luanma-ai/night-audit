// Compares one capture two ways: with the page served from an ephemeral port while
// this process is alive (as the shooter does) and again after the server closes.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..', 'game');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  console.log('REQ', req.method, url.pathname + url.search);
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

function shoot(url, out) {
  return new Promise((ok) => {
    execFile(
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
       '--user-data-dir=C:\\nap\\probe-' + Date.now(), '--window-size=1280,768',
       '--virtual-time-budget=6000', '--screenshot=' + out, url],
      { timeout: 120000 },
      (err, so, se) => {
        console.log('edge exit', err ? 'ERR ' + err.message.slice(0, 200) : 'ok', 'stderr:', String(se).slice(0, 300));
        ok();
      },
    );
  });
}

await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
console.log('port', port);
await shoot(`http://127.0.0.1:${port}/?shot=play&noanim`, 'C:\\nap\\cmp_active.png');
try { console.log('active size', statSync('C:\\nap\\cmp_active.png').size); } catch { console.log('active MISSING'); }
server.close();
