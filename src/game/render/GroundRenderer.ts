// Sol infini généré de façon déterministe à partir d'un biome, découpé en blocs de 16x16 tuiles.
// Chaque bloc est composé une fois sur un canvas, envoyé au GPU et gardé en cache.
import type { BiomeDef, LightSource } from '../../data/biomes';
import type { Assets } from '../../engine/Assets';
import type { TextureRegion } from '../../engine/gl/Atlas';
import { rgb, type GLRenderer } from '../../engine/gl/GLRenderer';

const TILE = 16;
const CHUNK_TILES = 16;
const CHUNK = TILE * CHUNK_TILES;
const MAX_CACHED = 40;

/** Hachage entier -> [0, 1). */
function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bruit de valeur 2D lissé, pour dessiner des chemins organiques. */
function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export interface GroundLight {
  x: number;
  y: number;
  source: LightSource;
  phase: number;
}

interface Chunk {
  region: TextureRegion;
  lights: GroundLight[];
}

export class GroundRenderer {
  private cache = new Map<string, Chunk>();
  private readonly totalWeight: number;

  constructor(
    private readonly r: GLRenderer,
    private readonly assets: Assets,
    private readonly biome: BiomeDef,
    private readonly seed = 1337,
  ) {
    this.totalWeight = biome.tiles.reduce((s, t) => s + t.weight, 0);
  }

  render(view: { left: number; top: number; right: number; bottom: number }): void {
    const x0 = Math.floor(view.left / CHUNK);
    const x1 = Math.floor(view.right / CHUNK);
    const y0 = Math.floor(view.top / CHUNK);
    const y1 = Math.floor(view.bottom / CHUNK);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        this.r.texture(this.chunk(cx, cy).region, cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
      }
    }
  }

  /** Émet les lumières des décors visibles (lanternes, chandeliers, champignons...). */
  emitLights(view: { left: number; top: number; right: number; bottom: number }, time: number): void {
    const x0 = Math.floor(view.left / CHUNK);
    const x1 = Math.floor(view.right / CHUNK);
    const y0 = Math.floor(view.top / CHUNK);
    const y1 = Math.floor(view.bottom / CHUNK);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (const l of this.chunk(cx, cy).lights) {
          const s = l.source;
          const flicker = s.flicker ? 0.88 + Math.sin(time * 9 + l.phase) * 0.06 + Math.sin(time * 23 + l.phase * 2) * 0.04 : 1;
          this.r.light(l.x, l.y, s.radius * flicker, rgb(s.color), s.intensity * flicker);
        }
      }
    }
  }

  dispose(): void {
    for (const c of this.cache.values()) this.r.deleteTexture(c.region.tex);
    this.cache.clear();
  }

  private chunk(cx: number, cy: number): Chunk {
    const key = `${cx},${cy}`;
    let chunk = this.cache.get(key);
    if (chunk) {
      // Réinsertion : l'ordre de la Map sert d'ordre LRU.
      this.cache.delete(key);
      this.cache.set(key, chunk);
      return chunk;
    }
    chunk = this.build(cx, cy);
    this.cache.set(key, chunk);
    if (this.cache.size > MAX_CACHED) {
      const oldest = this.cache.keys().next().value!;
      this.r.deleteTexture(this.cache.get(oldest)!.region.tex);
      this.cache.delete(oldest);
    }
    return chunk;
  }

  private isPath(tx: number, ty: number): boolean {
    const n = valueNoise(tx * 0.09, ty * 0.09, this.seed) * 0.7 + valueNoise(tx * 0.3, ty * 0.3, this.seed + 1) * 0.3;
    return n > this.biome.pathThreshold;
  }

  private pickTile(h: number): string {
    let r = h * this.totalWeight;
    for (const t of this.biome.tiles) {
      r -= t.weight;
      if (r <= 0) return t.sprite;
    }
    return this.biome.tiles[0].sprite;
  }

  private build(cx: number, cy: number): Chunk {
    const biome = this.biome;
    const canvas = document.createElement('canvas');
    canvas.width = CHUNK;
    canvas.height = CHUNK;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const lights: GroundLight[] = [];
    const path = this.assets.get(biome.path);

    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = cx * CHUNK_TILES + tx;
        const wy = cy * CHUNK_TILES + ty;
        const tile = this.isPath(wx, wy) ? path : this.assets.get(this.pickTile(hash(wx, wy, this.seed)));
        ctx.drawImage(tile.image, tx * TILE, ty * TILE);
      }
    }
    // Décalcomanies (fleurs, fissures...).
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = cx * CHUNK_TILES + tx;
        const wy = cy * CHUNK_TILES + ty;
        if (hash(wx, wy, this.seed + 7) >= biome.decalDensity) continue;
        const name = biome.decals[Math.floor(hash(wx, wy, this.seed + 8) * biome.decals.length)];
        const decal = this.assets.get(name);
        const ox = Math.floor(hash(wx, wy, 9) * 6) - 3;
        const oy = Math.floor(hash(wx, wy, 10) * 6) - 3;
        ctx.drawImage(decal.image, tx * TILE + ox, ty * TILE + oy);
        const light = biome.lights[name];
        if (light) lights.push({ x: wx * TILE + ox + 8, y: wy * TILE + oy + 8 + (light.offsetY ?? 0), source: light, phase: hash(wx, wy, 3) * 10 });
      }
    }
    // Accessoires (tombes, arbres, chandeliers...).
    for (let ty = 2; ty < CHUNK_TILES - 1; ty++) {
      for (let tx = 1; tx < CHUNK_TILES - 2; tx++) {
        const wx = cx * CHUNK_TILES + tx;
        const wy = cy * CHUNK_TILES + ty;
        if (hash(wx, wy, this.seed + 13) >= biome.propDensity || this.isPath(wx, wy)) continue;
        const name = biome.props[Math.floor(hash(wx, wy, this.seed + 14) * biome.props.length)];
        const sprite = this.assets.get(name);
        const footX = tx * TILE + sprite.w / 2;
        const footY = ty * TILE + TILE - 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(footX, footY, sprite.w * 0.3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(sprite.image, 0, 0, sprite.w, sprite.h, tx * TILE, ty * TILE + TILE - sprite.h, sprite.w, sprite.h);
        const light = biome.lights[name];
        if (light) lights.push({ x: cx * CHUNK + footX, y: cy * CHUNK + footY + (light.offsetY ?? 0), source: light, phase: hash(wx, wy, 5) * 10 });
      }
    }
    const tex = this.r.createTexture(canvas, false);
    return { region: this.r.fullRegion(tex), lights };
  }
}
