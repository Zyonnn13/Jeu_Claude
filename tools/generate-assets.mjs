// Génère les sprites PNG du jeu à partir des descriptions ASCII de tools/sprites/.
// Usage : npm run assets            -> écrit src/assets/sprites/*.png + manifest.json
//         npm run assets -- --preview <fichier.png>  -> planche d'aperçu agrandie en plus
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './png.mjs';
import { PALETTE, hexToRgba } from './sprites/lib.mjs';
import characters from './sprites/characters.mjs';
import enemies from './sprites/enemies.mjs';
import bosses from './sprites/bosses.mjs';
import projectiles from './sprites/projectiles.mjs';
import pickups from './sprites/pickups.mjs';
import icons from './sprites/icons.mjs';
import environment from './sprites/environment.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'sprites');
const ALL = [...characters, ...enemies, ...bosses, ...projectiles, ...pickups, ...icons, ...environment];

function toRgba(color) {
  if (color == null) return [0, 0, 0, 0];
  if (Array.isArray(color)) return color;
  return hexToRgba(color);
}

/** Rend une frame (ASCII ou fonction) dans le buffer RGBA à l'offset donné. */
function renderFrame(def, frame, frameIndex, buffer, sheetWidth) {
  const palette = { ...PALETTE, ...def.palette };
  const ox = frameIndex * def.w;
  for (let y = 0; y < def.h; y++) {
    let line = null;
    if (Array.isArray(frame)) {
      line = (frame[y] ?? '').padEnd(def.w, '.');
      if (line.length > def.w) {
        throw new Error(`${def.name} frame ${frameIndex} ligne ${y} trop longue (${line.length} > ${def.w})`);
      }
    }
    for (let x = 0; x < def.w; x++) {
      let color = null;
      if (line) {
        const ch = line[x];
        if (ch !== '.' && ch !== ' ') {
          color = palette[ch];
          if (!color) throw new Error(`${def.name} : couleur inconnue '${ch}' (frame ${frameIndex}, ${x},${y})`);
        }
      } else {
        color = frame(x, y);
      }
      const [r, g, b, a] = toRgba(color);
      const i = (y * sheetWidth + ox + x) * 4;
      buffer[i] = r;
      buffer[i + 1] = g;
      buffer[i + 2] = b;
      buffer[i + 3] = a;
    }
  }
  if (Array.isArray(frame) && frame.length > def.h) {
    throw new Error(`${def.name} frame ${frameIndex} : trop de lignes (${frame.length} > ${def.h})`);
  }
}

function renderSheet(def) {
  const width = def.w * def.frames.length;
  const buffer = new Uint8Array(width * def.h * 4);
  def.frames.forEach((frame, i) => renderFrame(def, frame, i, buffer, width));
  return { width, height: def.h, buffer };
}

/** Planche d'aperçu : tous les sprites agrandis sur fond sombre, pour vérifier le rendu. */
function writePreview(file, sheets, scale = 4) {
  const pad = 4;
  const maxRow = 1100;
  let x = pad;
  let y = pad;
  let rowH = 0;
  const placements = [];
  for (const s of sheets) {
    const w = s.width * scale;
    const h = s.height * scale;
    if (x + w + pad > maxRow) {
      x = pad;
      y += rowH + pad;
      rowH = 0;
    }
    placements.push({ s, x, y });
    x += w + pad;
    rowH = Math.max(rowH, h);
  }
  const W = maxRow;
  const H = y + rowH + pad;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const cx = (i % W) >> 3;
    const cy = Math.floor(i / W) >> 3;
    const v = (cx + cy) % 2 ? 46 : 38;
    out.set([v, v + 6, v + 4, 255], i * 4);
  }
  for (const { s, x: px, y: py } of placements) {
    for (let sy = 0; sy < s.height; sy++) {
      for (let sx = 0; sx < s.width; sx++) {
        const si = (sy * s.width + sx) * 4;
        if (s.buffer[si + 3] === 0) continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const di = ((py + sy * scale + dy) * W + px + sx * scale + dx) * 4;
            out.set(s.buffer.subarray(si, si + 4), di);
          }
        }
      }
    }
  }
  fs.writeFileSync(file, encodePNG(W, H, out));
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  const sheets = [];
  const names = new Set();
  for (const def of ALL) {
    if (names.has(def.name)) throw new Error(`Sprite en double : ${def.name}`);
    names.add(def.name);
    const sheet = renderSheet(def);
    sheets.push(sheet);
    fs.writeFileSync(path.join(OUT_DIR, `${def.name}.png`), encodePNG(sheet.width, sheet.height, sheet.buffer));
    manifest[def.name] = { w: def.w, h: def.h, frames: def.frames.length };
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${ALL.length} sprites générés dans ${path.relative(ROOT, OUT_DIR)}`);

  const previewIdx = process.argv.indexOf('--preview');
  if (previewIdx !== -1 && process.argv[previewIdx + 1]) {
    writePreview(process.argv[previewIdx + 1], sheets);
    console.log(`Aperçu : ${process.argv[previewIdx + 1]}`);
  }
}

main();
