import type { WeaponStats } from '../../data/types';
import { damageEnemy, healPlayer } from '../systems/Combat';
import type { World } from '../World';
import { Weapon, type AuraVisual } from './Weapon';

/** Aura : impulsions de dégâts autour du joueur. */
export class GarlicWeapon extends Weapon {
  private radius = 30;
  private pulse = 0;

  protected override get usesAmount(): boolean {
    return false;
  }

  protected fire(world: World, s: WeaponStats): boolean {
    const p = this.owner.entity;
    this.radius = 30 * s.area;
    const candidates = world.queryEnemies(p.x, p.y, this.radius);
    let hit = false;
    for (const e of candidates) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const r = this.radius + e.radius * 0.5;
      if (dx * dx + dy * dy > r * r) continue;
      damageEnemy(world, e, s.damage, { knockback: s.knockback, hero: this.owner });
      hit = true;
    }
    const heal = this.def.special?.heal ?? 0;
    if (hit && heal > 0) healPlayer(world, this.owner, heal, false);
    if (hit) this.pulse = 1;
    return true;
  }

  protected override tick(dt: number, world: World): void {
    this.pulse = Math.max(0, this.pulse - dt * 4);
    this.radius = 30 * this.stats().area;
    void world;
  }

  override aura(): AuraVisual {
    return { radius: this.radius, color: this.def.evolved ? '#ffd84a' : '#c8f0ff', pulse: this.pulse };
  }

}
