// Armes et objets passifs possédés par un héros.
import { BALANCE } from '../../data/balance';
import { getPassive } from '../../data/passives';
import { getWeapon } from '../../data/weapons';
import type { Hero } from '../Hero';
import { createWeapon } from '../weapons';
import type { Weapon } from '../weapons/Weapon';
import type { World } from '../World';

export class Inventory {
  weapons: Weapon[] = [];
  readonly passives = new Map<string, number>();

  constructor(
    private readonly world: World,
    private readonly hero: Hero,
  ) {}

  getWeapon(id: string): Weapon | undefined {
    return this.weapons.find((w) => w.def.id === id);
  }

  /** Vrai si l'arme ou son évolution est déjà possédée. */
  ownsWeaponLine(id: string): boolean {
    const def = getWeapon(id);
    return this.weapons.some((w) => w.def.id === id || (def.evolution && w.def.id === def.evolution.into));
  }

  get weaponSlotsFull(): boolean {
    return this.weapons.length >= BALANCE.maxWeapons;
  }

  get passiveSlotsFull(): boolean {
    return this.passives.size >= BALANCE.maxPassives;
  }

  addWeapon(id: string): void {
    if (this.weaponSlotsFull || this.getWeapon(id)) return;
    this.weapons.push(createWeapon(id, this.hero));
    this.hero.synergies.refresh();
  }

  levelUpWeapon(id: string): void {
    const w = this.getWeapon(id);
    if (w && !w.isMaxLevel) w.level++;
  }

  passiveLevel(id: string): number {
    return this.passives.get(id) ?? 0;
  }

  addOrLevelPassive(id: string): void {
    const def = getPassive(id);
    const level = Math.min(def.maxLevel, this.passiveLevel(id) + 1);
    if (!this.passives.has(id) && this.passiveSlotsFull) return;
    this.passives.set(id, level);
    this.hero.stats.set(
      `passive:${id}`,
      def.perLevel.map((m) => ({ stat: m.stat, add: (m.add ?? 0) * level, mul: m.mul ? m.mul * level : undefined })),
    );
  }

  canEvolve(w: Weapon): boolean {
    const evo = w.def.evolution;
    return !!evo && w.isMaxLevel && this.passives.has(evo.passive);
  }

  evolutionsAvailable(): Weapon[] {
    return this.weapons.filter((w) => this.canEvolve(w));
  }

  evolve(weaponId: string): void {
    const idx = this.weapons.findIndex((w) => w.def.id === weaponId);
    if (idx === -1) return;
    const old = this.weapons[idx];
    if (!old.def.evolution) return;
    old.dispose();
    const into = old.def.evolution.into;
    this.weapons[idx] = createWeapon(into, this.hero);
    this.world.run.evolutions++;
    this.world.events.emit('weapon:evolved', { hero: this.hero, from: weaponId, into });
    this.hero.synergies.refresh();
  }
}
