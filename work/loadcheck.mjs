// Catches the class of bug that black-screened the page: an identifier used in a
// module that nothing imports or declares. Loads every source module in Node with
// a stubbed document/canvas, and fails loudly on any ReferenceError.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));

// Minimal browser shims: modules touch document, a canvas and the animation loop.
const ctx = new Proxy({}, {
  get(_t, k) {
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return () => ({ width: 8 });
    if (k === 'getImageData') return () => ({ data: [0, 0, 0, 255] });
    return () => {};
  },
  set() { return true; },
});

globalThis.document = {
  getElementById: () => null,
  createElement: () => ({ id: '', width: 0, height: 0, getContext: () => ctx, addEventListener() {}, style: {} }),
  body: { appendChild() {} },
  addEventListener() {},
};
globalThis.window = { addEventListener() {} };
globalThis.location = { search: '' };
globalThis.performance = { now: () => 0 };
globalThis.requestAnimationFrame = () => 0;

let bad = 0;
for (const f of files) {
  try {
    await import(pathToFileURL(join(dir, f)).href);
    console.log('ok    ' + f);
  } catch (e) {
    bad++;
    console.log('FAIL  ' + f + '  ' + (e && (e.stack || e.message)).split('\n').slice(0, 3).join(' | '));
  }
}
console.log(bad === 0 ? 'all modules load' : bad + ' module(s) failed to load');
process.exit(bad === 0 ? 0 : 1);
