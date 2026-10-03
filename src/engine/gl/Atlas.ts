// Regroupe de nombreuses petites images dans une seule texture GPU (atlas),
// pour dessiner des milliers de sprites en un minimum d'appels de rendu.

export interface GLTexture {
  handle: WebGLTexture;
  width: number;
  height: number;
}

/** Zone d'une texture (coordonnées UV) et sa taille en pixels. */
export interface TextureRegion {
  tex: GLTexture;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  w: number;
  h: number;
}

interface Entry {
  key: string;
  source: CanvasImageSource;
  sx: number;
  sy: number;
  w: number;
  h: number;
}

export class AtlasBuilder {
  private entries: Entry[] = [];

  constructor(private readonly padding = 2) {}

  add(key: string, source: CanvasImageSource, sx: number, sy: number, w: number, h: number): void {
    this.entries.push({ key, source, sx, sy, w, h });
  }

  /** Emballe les images en étagères ; double la taille de l'atlas tant que tout ne tient pas. */
  build(createTexture: (canvas: HTMLCanvasElement) => GLTexture): Map<string, TextureRegion> {
    const sorted = [...this.entries].sort((a, b) => b.h - a.h || b.w - a.w);
    const pad = this.padding;
    for (let size = 256; size <= 8192; size *= 2) {
      const placements = new Map<string, { x: number; y: number }>();
      let x = pad;
      let y = pad;
      let shelf = 0;
      let fits = true;
      for (const e of sorted) {
        if (e.w + 2 * pad > size) {
          fits = false;
          break;
        }
        if (x + e.w + pad > size) {
          x = pad;
          y += shelf + pad;
          shelf = 0;
        }
        if (y + e.h + pad > size) {
          fits = false;
          break;
        }
        placements.set(e.key, { x, y });
        x += e.w + pad;
        shelf = Math.max(shelf, e.h);
      }
      if (!fits) continue;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      for (const e of sorted) {
        const p = placements.get(e.key)!;
        ctx.drawImage(e.source, e.sx, e.sy, e.w, e.h, p.x, p.y, e.w, e.h);
      }
      const tex = createTexture(canvas);
      const regions = new Map<string, TextureRegion>();
      for (const e of sorted) {
        const p = placements.get(e.key)!;
        regions.set(e.key, { tex, u0: p.x / size, v0: p.y / size, u1: (p.x + e.w) / size, v1: (p.y + e.h) / size, w: e.w, h: e.h });
      }
      return regions;
    }
    throw new Error('Atlas trop grand');
  }
}

/** Petites textures procédurales utilisées pour les formes (ombres, anneaux, lueurs...). */
export function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  return c;
}
