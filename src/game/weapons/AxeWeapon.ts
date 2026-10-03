import type { WeaponStats } from '../../data/types';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Hache : lancée vers le haut, elle retombe en arc à travers les ennemis. */
export class AxeWeapon extends Weapon {
  protected fire(world: World, s: WeaponStats): boolean {
    const facing = this.owner.entity.facing;
    for (let i = 0; i < s.amount; i++) {
      this.schedule(i * 0.1, () => {
        const spread = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 22;
        this.spawn(world, (a) => {
          a.motion = 'gravity';
          a.vx = facing * 35 + spread + world.rng.range(-15, 15);
          a.vy = -230 * Math.sqrt(s.speed);
          a.gravity = 420;
          a.spin = facing * 11;
          a.sprite = 'axe';
          a.scale = s.area;
          a.radius = 7 * s.area;
          a.life = s.duration;
          a.pierce = s.pierce;
          a.damage = s.damage;
          a.knockback = s.knockback;
        });
        world.audio.play('throw', { pitch: 0.7 });
      });
    }
    return true;
  }
}
