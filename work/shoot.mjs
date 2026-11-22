// Screenshot tool: serves game/ and drives headless Edge to grab the entry's stills.
// Run from the repo root: node work/shoot.mjs
//
// Edge on this machine ignores the new headless mode's screenshot flag, so the
// stills use the classic --headless flag, and the game is served by the
// repository's own serve.ts rather than an in-process server.
import { statSync, copyFileSync, mkdirSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..', 'game');
const shotDir = resolve(here, '..', 'screenshots');
mkdirSync(shotDir, { recursive: true });

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const STAGE = 'C:\\nap\\shots';
mkdirSync(STAGE, { recursive: true });

const SHOTS = [
  ['1-title.png', '?shot=start&noanim'],
  ['2-play.png', '?shot=play&noanim'],
  ['3-caught.png', '?shot=caught&noanim'],
  ['4-escape.png', '?shot=escape&noanim'],
];

function run(args) {
  return new Promise((ok, bad) => {
    execFile(EDGE, args, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) bad(new Error(String(stderr || err.message).slice(0, 1500)));
      else ok(stdout);
    });
  });
}

const port = 8199;
const server = spawn(process.execPath, [join(here, '..', 'serve.ts'), '--port', String(port)], {
  cwd: join(here, '..'),
  stdio: 'ignore',
});
console.log('serving', root, 'on', port);
await new Promise((ok) => setTimeout(ok, 2500));

for (const [name, query] of SHOTS) {
  const staged = join(STAGE, name);
  const out = join(shotDir, name);
  const args = [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + join(STAGE, 'prof-' + randomUUID()),
    '--window-size=1280,768',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=6000',
    '--screenshot=' + staged,
    `http://127.0.0.1:${port}/${query}`,
  ];
  try {
    await run(args);
    const sz = statSync(staged).size;
    copyFileSync(staged, out);
    console.log(name, 'ok', sz, 'bytes');
  } catch (e) {
    console.log(name, 'FAILED', e.message);
  }
}

server.kill();
console.log('done');
