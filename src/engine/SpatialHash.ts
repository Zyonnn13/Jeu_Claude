interface Positioned {
  x: number;
  y: number;
}

/**
 * Grille de hachage spatial reconstruite à chaque frame.
 * Permet de trouver rapidement les ennemis proches d'un point (collisions, séparation).
 */
export class SpatialHash<T extends Positioned> {
  private cells = new Map<number, T[]>();
  private pool: T[][] = [];

  constructor(private readonly cellSize = 32) {}

  private key(cx: number, cy: number): number {
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  clear(): void {
    for (const arr of this.cells.values()) {
      arr.length = 0;
      this.pool.push(arr);
    }
    this.cells.clear();
  }

  insert(item: T): void {
    const k = this.key(Math.floor(item.x / this.cellSize), Math.floor(item.y / this.cellSize));
    let arr = this.cells.get(k);
    if (!arr) {
      arr = this.pool.pop() ?? [];
      this.cells.set(k, arr);
    }
    arr.push(item);
  }

  /** Ajoute dans `out` les éléments des cellules qui recouvrent le cercle (filtrage exact à faire par l'appelant). */
  query(x: number, y: number, radius: number, out: T[]): T[] {
    out.length = 0;
    const cs = this.cellSize;
    const x0 = Math.floor((x - radius) / cs);
    const x1 = Math.floor((x + radius) / cs);
    const y0 = Math.floor((y - radius) / cs);
    const y1 = Math.floor((y + radius) / cs);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }
}
