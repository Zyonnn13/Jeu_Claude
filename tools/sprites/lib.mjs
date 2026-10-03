// Outils communs pour décrire les sprites en pixel art ASCII.
// Chaque caractère d'une ligne correspond à une couleur de la palette.
// '.' et ' ' sont transparents. Les lignes plus courtes que la largeur sont complétées à droite.

export const PALETTE = {
  k: '#1b1424', // contour
  K: '#3b2d4a', // ombre violette
  w: '#f5f1e8', // blanc cassé
  h: '#ffffff', // reflet
  g: '#b7b9c7', // gris clair
  G: '#757892', // gris moyen
  d: '#4a4c63', // gris foncé
  r: '#e0413c', // rouge
  R: '#902a35', // rouge foncé
  o: '#f28c28', // orange
  O: '#b5541f', // orange foncé
  y: '#ffd84a', // jaune
  Y: '#c99a2e', // or foncé
  s: '#f5c9a0', // peau
  S: '#d18f6e', // peau ombrée
  b: '#9a6338', // brun
  B: '#5e3b26', // brun foncé
  l: '#8fd94f', // vert clair
  L: '#4aa043', // vert
  e: '#2a6337', // vert foncé
  c: '#6fe3f0', // cyan
  C: '#3f8fd8', // bleu
  n: '#2b4a8f', // bleu nuit
  p: '#b06de0', // violet
  P: '#6a3a9e', // violet foncé
  m: '#f070b0', // rose
  M: '#a83a7a', // magenta foncé
  v: '#ece0c2', // os
  V: '#b9a986', // os ombré
  z: '#a8d68f', // peau de zombie
  Z: '#5f9a5a', // peau de zombie ombrée
  u: '#d7ecff', // fantôme
  U: '#8fb0d8', // fantôme ombré
  t: '#2e4a3a', // herbe sombre
  T: '#22382c', // herbe très sombre
  q: '#3d6146', // herbe claire
  Q: '#4f7a52', // herbe très claire
  a: '#6b6f80', // pierre
  A: '#4b4e5c', // pierre sombre
};

export function hexToRgba(hex, alpha = 255) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, alpha];
}

/**
 * Déclare un sprite.
 * @param {string} name nom du fichier (sans extension)
 * @param {number} w largeur d'une frame
 * @param {number} h hauteur d'une frame
 * @param {(string[] | Function)[]} frames lignes ASCII ou fonction (x, y) => '#rrggbb' | [r,g,b,a] | null
 * @param {Record<string,string>} [palette] surcharges de couleurs
 */
export function sprite(name, w, h, frames, palette = {}) {
  return { name, w, h, frames, palette };
}

/** Décale une frame ASCII de (dx, dy) pixels. */
export function shift(rows, dx, dy, w = 16, h = 16) {
  const padded = Array.from({ length: h }, (_, y) => (rows[y] ?? '').padEnd(w, '.'));
  const out = [];
  for (let y = 0; y < h; y++) {
    let line = '';
    for (let x = 0; x < w; x++) {
      const sx = x - dx;
      const sy = y - dy;
      line += sx >= 0 && sx < w && sy >= 0 && sy < h ? padded[sy][sx] : '.';
    }
    out.push(line);
  }
  return out;
}

/** Remplace des caractères de palette dans une frame ASCII. */
export function recolor(rows, map) {
  return rows.map((line) => [...line].map((ch) => map[ch] ?? ch).join(''));
}

/** Remplace certaines lignes d'une frame (index -> nouvelle ligne). */
export function patch(rows, replacements) {
  const out = [...rows];
  for (const [i, line] of Object.entries(replacements)) out[Number(i)] = line;
  return out;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de deux couleurs hex. */
export function mix(hexA, hexB, t) {
  const a = hexToRgba(hexA);
  const b = hexToRgba(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
}

/**
 * Cycle de marche en 4 images : [contact A, passage, contact B, passage].
 * `base` : frame de 16 lignes (contact A) ; `legsB` : lignes 13-15 du contact B ;
 * `pass` : lignes 12-15 de la frame de passage (le corps est alors relevé d'un pixel).
 */
export function walk4(base, legsB, pass) {
  const A = base.map((l) => l.padEnd(16, '.'));
  const B = [...A.slice(0, 13), ...legsB];
  const P = [...A.slice(1, 13), ...pass];
  return [A, P, B, P];
}

/** Animation « respiration / flottement » : [A, A relevée, B, B relevée]. */
export function bob4(A, B, w = 16, h = 16) {
  return [A, shift(A, 0, -1, w, h), B, shift(B, 0, -1, w, h)];
}

/** Aligne une frame en bas d'un canevas de hauteur `h` (pour les décors hauts). */
export function bottomAlign(rows, h) {
  return [...Array(Math.max(0, h - rows.length)).fill(''), ...rows];
}

/**
 * Petite « toile » de pixels pour dessiner des sprites avec des formes (ellipses, lignes, polygones),
 * puis ajouter automatiquement un contour. Les couleurs sont des caractères de la palette.
 */
export function raster(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const api = {
    set(x, y, c) {
      x = Math.round(x);
      y = Math.round(y);
      if (inside(x, y)) g[y][x] = c;
      return api;
    },
    get(x, y) {
      return inside(x, y) ? g[y][x] : '.';
    },
    rect(x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) api.set(x, y, c);
      return api;
    },
    ellipse(cx, cy, rx, ry, c, filter = () => true) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (d <= 1 && filter(x, y, d)) api.set(x, y, c);
        }
      }
      return api;
    },
    line(x0, y0, x1, y1, c, thick = 1) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        for (let dy = 0; dy < thick; dy++) for (let dx = 0; dx < thick; dx++) api.set(x + dx - (thick - 1) / 2, y + dy - (thick - 1) / 2, c);
      }
      return api;
    },
    poly(points, c) {
      const ys = points.map((p) => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const xs = [];
        for (let i = 0; i < points.length; i++) {
          const [ax, ay] = points[i];
          const [bx, by] = points[(i + 1) % points.length];
          if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) api.set(x, y, c);
      }
      return api;
    },
    /** Ajoute un contour (4-voisinage) autour de tous les pixels non transparents. */
    outline(c = 'k') {
      const add = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (g[y][x] !== '.') continue;
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && g[y + dy][x + dx] !== '.' && g[y + dy][x + dx] !== c)) add.push([x, y]);
        }
      }
      for (const [x, y] of add) g[y][x] = c;
      return api;
    },
    rows() {
      return g.map((r) => r.join(''));
    },
  };
  return api;
}
