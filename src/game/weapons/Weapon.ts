import type { WeaponDef, WeaponStats } from '../../data/types';
import { newUid, Projectile } from '../entities/Projectile';
import type { Hero } from '../Hero';
import type { World } from '../World';

/** Description visuelle d'une aura autour du joueur (dessinée par le rendu, pas par l'arme). */
export interface AuraVisual {
  radius: number;
  color: string;
  pulse: number;
}

/**
 * Classe de base des armes. Chaque arme gère son temps de recharge et crée des projectiles.
 * Les statistiques effectives combinent la définition de l'arme, son niveau et les stats du joueur.
 */
export abstract class Weapon {
  readonly uid = newUid();
  level = 1;
  protected timer = 0.4;
  private queue: { delay: number; fn: () => void }[] = [];
  private cache: { key: string; stats: WeaponStats } | null = null;

  constructor(
    readonly def: WeaponDef,
    /** Héros qui porte l'arme. */
    readonly owner: Hero,
  ) {}

  get maxLevel(): number {
    return this.def.levels.length + 1;
  }

  get isMaxLevel(): boolean {
    return this.level >= this.maxLevel;
  }

  /** Statistiques de l'arme seule (base + améliorations de niveau). */
  baseStats(level = this.level): WeaponStats {
    const s = { ...this.def.base };
    for (let i = 0; i < level - 1 && i < this.def.levels.length; i++) {
      const delta = this.def.levels[i].delta;
      for (const k of Object.keys(delta) as (keyof WeaponStats)[]) s[k] += delta[k] ?? 0;
    }
    return s;
  }

  /** Statistiques effectives, modifiées par celles du joueur. */
  stats(_world?: World): WeaponStats {
    const owner = this.owner;
    const key = `${this.level}|${owner.stats.version}|${owner.synergies.version}`;
    if (this.cache?.key === key) return this.cache.stats;
    const b = this.baseStats();
    // Bonus des synergies actives pour ce type d'arme.
    const syn = owner.synergies.weaponDelta(this.def.kind);
    for (const k of Object.keys(syn) as (keyof WeaponStats)[]) b[k] += syn[k] ?? 0;
    const st = owner.stats;
    const stats: WeaponStats = {
      damage: b.damage * st.get('might'),
      cooldown: Math.max(0.08, b.cooldown * st.get('cooldown')),
      amount: Math.max(0, Math.round(b.amount + (this.usesAmount ? st.get('amount') : 0))),
      area: b.area * st.get('area'),
      speed: b.speed * st.get('projectileSpeed'),
      duration: b.duration * st.get('duration'),
      pierce: b.pierce,
      knockback: b.knockback,
    };
    this.cache = { key, stats };
    return stats;
  }

  /** Les armes à zone (aura) ne profitent pas des projectiles supplémentaires. */
  protected get usesAmount(): boolean {
    return true;
  }

  update(dt: number, world: World): void {
    for (const item of this.queue) {
      item.delay -= dt;
      if (item.delay <= 0) item.fn();
    }
    if (this.queue.length) this.queue = this.queue.filter((i) => i.delay > 0);

    this.timer -= dt;
    if (this.timer <= 0) {
      const s = this.stats(world);
      const fired = this.fire(world, s);
      this.timer = fired ? this.nextCooldown(s) : 0.25;
    }
    this.tick(dt, world);
  }

  protected nextCooldown(s: WeaponStats): number {
    return s.cooldown;
  }

  /** Exécute `fn` après `delay` secondes (salves de projectiles). */
  protected schedule(delay: number, fn: () => void): void {
    if (delay <= 0) fn();
    else this.queue.push({ delay, fn });
  }

  protected spawn(world: World, init: (p: Projectile) => void): Projectile {
    const p = new Projectile();
    p.owner = this.owner;
    p.x = this.owner.x;
    p.y = this.owner.y;
    init(p);
    world.projectiles.push(p);
    return p;
  }

  /** Déclenche l'attaque. Renvoie false s'il n'y avait aucune cible (nouvel essai rapide). */
  protected abstract fire(world: World, s: WeaponStats): boolean;

  protected tick(_dt: number, _world: World): void {}

  /** Aura à afficher autour du joueur, le cas échéant. */
  aura(): AuraVisual | null {
    return null;
  }

  /** Appelé quand l'arme est retirée (évolution). */
  dispose(): void {}
}
