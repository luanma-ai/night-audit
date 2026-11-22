// Builds the contact sheet the judge actually sees, at the exact sizes the rules
// give it: the cover fitted inside 768x480, the other screenshots in a row beneath,
// each in a smaller cell. Written with no image library -- the sheet is assembled
// by asking headless Edge to compose it, which is also how the real thing looks.
import { writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '..');
const shots = readdirSync(join(repo, 'screenshots')).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)).sort();

const COVER_W = 768;
const COVER_H = 480;
const CELL_W = 256;
const CELL_H = 160;

const cells = shots.map((name, i) => {
  if (i === 0) {
    return `<div class="cover"><img src="../screenshots/${name}"><span>COVER ${
      COVER_W
    }x${COVER_H}</span></div>`;
  }
  return `<div class="cell"><img src="../screenshots/${name}"><span>CELL ${
    CELL_W
  }x${CELL_H}</span></div>`;
});

const html = `<!doctype html><html><body style="margin:0;background:#111;padding:8px">
<div style="display:flex;flex-direction:column;gap:8px;width:768px">
${cells.join('\n')}
</div>
<style>
.cover{position:relative;width:${COVER_W}px;height:${COVER_H}px;overflow:hidden}
.cover img{width:100%;height:100%;object-fit:contain}
.cell{position:relative;width:${CELL_W}px;height:${CELL_H}px;overflow:hidden;display:inline-block;margin-right:4px}
.cell img{width:100%;height:100%;object-fit:contain}
span{position:absolute;left:2px;top:2px;color:#0f0;font:10px monospace;background:#000a}
</style></body></html>`;

writeFileSync(join(here, 'sheet.html'), html);
console.log('wrote sheet.html with', shots.length, 'screenshots');
shots.forEach((s, i) => console.log(' ', i === 0 ? 'COVER' : 'CELL ', s));
