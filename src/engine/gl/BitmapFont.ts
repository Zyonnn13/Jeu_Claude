// Police bitmap : chaque caractère est pré-rendu (avec contour) dans l'atlas lisse,
// puis le texte est dessiné comme une suite de sprites (aucun rendu de texte coûteux pendant le jeu).
import type { AtlasBuilder, TextureRegion } from './Atlas';
import { makeCanvas } from './Atlas';

const CHARSET =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_abcdefghijklmnopqrstuvwxyz{|}~' +
  'àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒÆ’…×«»°';

export interface Glyph {
  region: TextureRegion;
  advance: number;
}

export class BitmapFont {
  /** Taille de rendu des glyphes, en pixels. */
  readonly px = 40;
  readonly outline = 7;
  readonly cellH: number;
  private glyphs = new Map<string, Glyph>();
  private pending: { ch: string; advance: number }[] = [];

  constructor(private readonly family: string) {
    this.cellH = Math.ceil(this.px * 1.45);
  }

  /** Ajoute les glyphes à l'atlas (avant sa construction). */
  addTo(builder: AtlasBuilder): void {
    const measure = makeCanvas(4, 4, () => undefined).getContext('2d')!;
    measure.font = `700 ${this.px}px ${this.family}`;
    for (const ch of CHARSET) {
      const advance = Math.ceil(measure.measureText(ch).width);
      const w = advance + this.outline * 2 + 2;
      const canvas = makeCanvas(w, this.cellH, (ctx) => {
        ctx.font = `700 ${this.px}px ${this.family}`;
        ctx.textBaseline = 'alphabetic';
        ctx.lineJoin = 'round';
        ctx.lineWidth = this.outline;
        ctx.strokeStyle = '#1b1424';
        const baseline = Math.round(this.px * 1.05);
        ctx.strokeText(ch, this.outline + 1, baseline);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ch, this.outline + 1, baseline);
      });
      builder.add(`glyph:${ch}`, canvas, 0, 0, canvas.width, canvas.height);
      this.pending.push({ ch, advance });
    }
  }

  /** Récupère les zones de l'atlas une fois celui-ci construit. */
  resolve(regions: Map<string, TextureRegion>): void {
    for (const { ch, advance } of this.pending) {
      const region = regions.get(`glyph:${ch}`);
      if (region) this.glyphs.set(ch, { region, advance });
    }
    this.pending = [];
  }

  glyph(ch: string): Glyph | undefined {
    return this.glyphs.get(ch) ?? this.glyphs.get('?');
  }

  /** Largeur du texte (en pixels de la police). */
  measure(text: string): number {
    let w = 0;
    for (const ch of text) w += this.glyph(ch)?.advance ?? 0;
    return w;
  }
}
