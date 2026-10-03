export type RGB = readonly [number, number, number];

const colorCache = new Map<string, RGB>();

/** '#rrggbb' -> composantes 0..1 (avec cache). */
export function rgb(color: string): RGB {
  let c = colorCache.get(color);
  if (!c) {
    const v = parseInt(color.slice(1, 7), 16);
    c = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    colorCache.set(color, c);
  }
  return c;
}
