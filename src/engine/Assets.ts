import manifest from '../assets/sprites/manifest.json';
import type { TextureRegion } from './gl/Atlas';

// Vite remplace chaque PNG par son URL (ou par une data-URI dans le build autonome).
const SPRITE_URLS = import.meta.glob('../assets/sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

interface ManifestEntry {
  w: number;
  h: number;
  frames: number;
}

/**
 * Une planche de sprite (frames côte à côte). Une fois l'atlas GPU construit, `regions`
 * contient la position de chaque frame dans la texture. Miroir, flash et teinte sont
 * appliqués par le shader : aucune image supplémentaire n'est nécessaire.
 */
export class Sprite {
  regions: TextureRegion[] = [];

  constructor(
    readonly name: string,
    readonly image: HTMLImageElement,
    readonly w: number,
    readonly h: number,
    readonly frames: number,
    readonly url: string,
  ) {}
}

export class Assets {
  private sprites = new Map<string, Sprite>();

  async load(onProgress?: (ratio: number) => void): Promise<void> {
    const entries = Object.entries(manifest as Record<string, ManifestEntry>);
    let done = 0;
    await Promise.all(
      entries.map(async ([name, meta]) => {
        const url = SPRITE_URLS[`../assets/sprites/${name}.png`];
        if (!url) throw new Error(`Sprite introuvable : ${name}`);
        const image = new Image();
        // onload plutôt que decode() : decode() peut rester bloqué si la fenêtre est masquée.
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Impossible de charger le sprite ${name}`));
          image.src = url;
        });
        this.sprites.set(name, new Sprite(name, image, meta.w, meta.h, meta.frames, url));
        done++;
        onProgress?.(done / entries.length);
      }),
    );
  }

  get(name: string): Sprite {
    const sprite = this.sprites.get(name);
    if (!sprite) throw new Error(`Sprite inconnu : ${name}`);
    return sprite;
  }

  has(name: string): boolean {
    return this.sprites.has(name);
  }

  all(): Iterable<Sprite> {
    return this.sprites.values();
  }

  /** URL utilisable dans le DOM (icônes de l'interface). */
  url(name: string): string {
    return this.get(name).url;
  }
}
