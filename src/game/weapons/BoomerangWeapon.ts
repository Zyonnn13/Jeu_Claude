import type { WeaponStats } from '../../data/types';
import { normalize } from '../../engine/math';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Boomerang : part vers l'ennemi le plus proche puis revient vers le joueur. */
export class BoomerangWeapon extends Weapon {
  protected fire(world: World, s: WeaponStats): boolean {
    const p = this.owner.entity;
    const target = world.nearestEnemy(p.x, p.y, 220);
    const base = target ? normalize(target.x - p.x, target.y - p.y) : { x: p.aimX, y: p.aimY };
    const baseAngle = Math.atan2(base.y, base.x);
    for (let i = 0; i < s.amount; i++) {
      const angle = baseAngle + (i - (s.amount - 1) / 2) * 0.45;
      this.schedule(i * 0.1, () => {
        this.spawn(world, (b) => {
          b.motion = 'boomerang';
          b.offsetX = Math.cos(angle);
          b.offsetY = Math.sin(angle);
          b.speed = 210 * s.speed;
          b.outTime = 0.6;
          b.spin = 16;
          b.sprite = 'boomerang';
          b.scale = s.area;
          b.radius = 6 * s.area;
          b.life = 4;
          b.pierce = Number.POSITIVE_INFINITY;
          b.damage = s.damage;
          b.knockback = s.knockback;
        });
        world.audio.play('throw', { pitch: 1.3 });
      });
    }
    return true;
  }
}
