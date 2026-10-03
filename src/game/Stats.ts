import { BASE_STATS } from '../data/balance';
import type { StatKey, StatMod } from '../data/types';

const LIMITS: Partial<Record<StatKey, [number, number]>> = {
  cooldown: [0.25, 2],
  moveSpeed: [0.3, 3],
  dodge: [0, 0.6],
  critChance: [0, 1],
  maxHp: [1, 99999],
  area: [0.3, 5],
  might: [0.1, 20],
};

/**
 * Statistiques du joueur, calculées à partir de sources nommées
 * (personnage, améliorations permanentes, objets passifs, reliques...).
 */
export class Stats {
  private sources = new Map<string, StatMod[]>();
  private values: Record<StatKey, number> = { ...BASE_STATS };
  /** Incrémenté à chaque recalcul : permet aux armes de savoir quand rafraîchir leurs caches. */
  version = 0;

  set(source: string, mods: StatMod[]): void {
    this.sources.set(source, mods);
    this.recompute();
  }

  remove(source: string): void {
    if (this.sources.delete(source)) this.recompute();
  }

  get(stat: StatKey): number {
    return this.values[stat];
  }

  private recompute(): void {
    const add: Partial<Record<StatKey, number>> = {};
    const mul: Partial<Record<StatKey, number>> = {};
    for (const mods of this.sources.values()) {
      for (const m of mods) {
        if (m.add) add[m.stat] = (add[m.stat] ?? 0) + m.add;
        if (m.mul) mul[m.stat] = (mul[m.stat] ?? 1) * (1 + m.mul);
      }
    }
    for (const key of Object.keys(BASE_STATS) as StatKey[]) {
      let v = (BASE_STATS[key] + (add[key] ?? 0)) * (mul[key] ?? 1);
      const limit = LIMITS[key];
      if (limit) v = Math.min(limit[1], Math.max(limit[0], v));
      this.values[key] = v;
    }
    this.version++;
  }
}
