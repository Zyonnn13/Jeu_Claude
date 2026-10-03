// Génère l'icône de l'application : electron/icon.ico (16 à 256 px) et src/assets/favicon.png.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './png.mjs';
import { PALETTE, hexToRgba, raster } from './sprites/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function design() {
  const r = raster(32, 32);
  r.rect(0, 0, 31, 31, 'K');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (y > 16 + Math.sin(x / 3) * 1.5) r.set(x, y, 'P');
  // Lune en croissant
  r.ellipse(21, 10, 7.5, 7.5, 'y', (x, y) => ((x - 24.5) / 6.5) ** 2 + ((y - 7.5) / 6.5) ** 2 > 1);
  r.ellipse(21, 10, 7.5, 7.5, 'Y', (x, y) => r.get(x, y) === 'y' && x < 17);
  for (const [x, y] of [[5, 4], [10, 9], [3, 13], [12, 3], [28, 20]]) r.set(x, y, 'w');
  // Chauve-souris
  const bat = [
    'kk............kk',
    'kkk..k....k..kkk',
    'kkkk.kk..kk.kkkk',
    'kkkkkkkkkkkkkkkk',
    '.kkkkkkkkkkkkkk.',
    '..kkkkrkkrkkkk..',
    '....kkkkkkkk....',
    '.....kwkkwk.....',
    '......k..k......',
  ];
  bat.forEach((line, y) => [...line].forEach((c, x) => c !== '.' && r.set(x + 8, y + 15, c)));
  // Coins arrondis
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [31, 0], [30, 0], [31, 1], [0, 31], [1, 31], [0, 30], [31, 31], [30, 31], [31, 30]]) r.set(x, y, '.');
  return r.rows();
}

function rasterize(rows, size) {
  const src = rows.length;
  const buf = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ch = rows[Math.floor((y * src) / size)][Math.floor((x * src) / size)];
      const [r, g, b, a] = ch === '.' ? [0, 0, 0, 0] : hexToRgba(PALETTE[ch]);
      buf.set([r, g, b, a], (y * size + x) * 4);
    }
  }
  return encodePNG(size, size, buf);
}

const rows = design();
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = sizes.map((s) => rasterize(rows, s));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
const entries = [];
let offset = 6 + 16 * sizes.length;
sizes.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s === 256 ? 0 : s, 0);
  e.writeUInt8(s === 256 ? 0 : s, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  entries.push(e);
});
fs.mkdirSync(path.join(ROOT, 'electron'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'electron', 'icon.ico'), Buffer.concat([header, ...entries, ...pngs]));
fs.writeFileSync(path.join(ROOT, 'electron', 'icon.png'), pngs[sizes.indexOf(256)]);
fs.writeFileSync(path.join(ROOT, 'src', 'assets', 'favicon.png'), pngs[sizes.indexOf(32)]);
console.log('Icône générée : electron/icon.ico, electron/icon.png, src/assets/favicon.png');
