// Active les synergies quand un héros possède les deux armes requises.
import { SYNERGIES, type SynergyDef } from '../../data/synergies';
import type { WeaponKind, WeaponStats } from '../../data/types';
import type { Hero } from '../Hero';
import type { World } from '../World';

export class SynergySystem {
  readonly active = new Set<string>();
  /** Incrémenté à chaque changement : les armes recalculent alors leurs statistiques. */
  version = 0;
  private flags = new Set<string>();

  constructor(
    private readonly world: World,
    private readonly hero: Hero,
  ) {}

  /** Synergies que compléterait l'ajout de l'arme `weaponId`. */
  wouldComplete(weaponId: string): SynergyDef[] {
    const inv = this.hero.inventory;
    return SYNERGIES.filter((s) => {
      if (this.active.has(s.id) || !s.weapons.includes(weaponId)) return false;
      const other = s.weapons[0] === weaponId ? s.weapons[1] : s.weapons[0];
      return inv.ownsWeaponLine(other);
    });
  }

  refresh(): void {
    const inv = this.hero.inventory;
    let changed = false;
    for (const s of SYNERGIES) {
      if (this.active.has(s.id)) continue;
      if (!s.weapons.every((w) => inv.ownsWeaponLine(w))) continue;
      this.active.add(s.id);
      changed = true;
      if (s.stats) this.hero.stats.set(`synergy:${s.id}`, s.stats);
      for (const f of s.flags ?? []) this.flags.add(f);
      this.world.events.emit('synergy:activated', { hero: this.hero, synergy: s });
    }
    if (changed) this.version++;
  }

  has(flag: string): boolean {
    return this.flags.has(flag);
  }

  /** Bonus cumulés des synergies actives pour un type d'arme. */
  weaponDelta(kind: WeaponKind): Partial<WeaponStats> {
    const out: Partial<WeaponStats> = {};
    for (const s of SYNERGIES) {
      if (!this.active.has(s.id)) continue;
      const delta = s.weaponDeltas?.[kind];
      if (!delta) continue;
      for (const k of Object.keys(delta) as (keyof WeaponStats)[]) out[k] = (out[k] ?? 0) + (delta[k] ?? 0);
    }
    return out;
  }

  list(): SynergyDef[] {
    return SYNERGIES.filter((s) => this.active.has(s.id));
  }
}
