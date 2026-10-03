import type { WeaponStats } from '../../data/types';
import { TAU } from '../../engine/math';
import type { Projectile } from '../entities/Projectile';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Orbes : tournent autour du joueur pendant une durée limitée (ou en permanence après évolution). */
export class OrbsWeapon extends Weapon {
  private orbs: Projectile[] = [];
  private phase = 0;
  private radius = 36;
  private angularSpeed = 3;

  private get permanent(): boolean {
    return !!this.def.special?.permanent;
  }

  protected fire(world: World, s: WeaponStats): boolean {
    this.radius = 36 * s.area;
    this.angularSpeed = 3.2 * s.speed;
    const alive = this.orbs.filter((o) => !o.dead);
    if (this.permanent && alive.length === s.amount) {
      // Met simplement à jour les orbes existants (dégâts, taille).
      for (const o of alive) this.configure(o, s);
      return true;
    }
    for (const o of alive) o.dead = true;
    this.orbs = [];
    for (let i = 0; i < s.amount; i++) {
      this.orbs.push(
        this.spawn(world, (o) => {
          o.motion = 'attached';
          o.sprite = 'orb';
          o.frameRate = 8;
          o.hitKey = this.uid;
          o.hitInterval = 0.45;
          o.pierce = Number.POSITIVE_INFINITY;
          o.life = this.permanent ? Number.POSITIVE_INFINITY : s.duration;
          this.configure(o, s);
        }),
      );
    }
    this.tick(0, world);
    world.audio.play('heal', { pitch: 1.8, volume: 0.4 });
    return true;
  }

  private configure(o: Projectile, s: WeaponStats): void {
    o.damage = s.damage;
    o.knockback = s.knockback;
    o.scale = 0.8 + 0.2 * s.area;
    o.radius = 6 * (0.8 + 0.2 * s.area);
  }

  protected override nextCooldown(s: WeaponStats): number {
    // Le temps de recharge commence quand les orbes disparaissent.
    return this.permanent ? 1 : Math.max(s.cooldown, s.duration + 0.6);
  }

  protected override tick(dt: number, _world: World): void {
    this.phase += this.angularSpeed * dt;
    const alive = this.orbs.filter((o) => !o.dead);
    alive.forEach((o, i) => {
      const a = this.phase + (i / alive.length) * TAU;
      o.offsetX = Math.cos(a) * this.radius;
      o.offsetY = Math.sin(a) * this.radius;
      o.x = this.owner.entity.x + o.offsetX;
      o.y = this.owner.entity.y + o.offsetY;
    });
  }

  override dispose(): void {
    for (const o of this.orbs) o.dead = true;
    this.orbs = [];
  }
}
