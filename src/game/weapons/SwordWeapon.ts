import type { WeaponStats } from '../../data/types';
import { healPlayer } from '../systems/Combat';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Lame : arcs de frappe alternant devant et derrière le joueur. */
export class SwordWeapon extends Weapon {
  protected fire(world: World, s: WeaponStats): boolean {
    for (let i = 0; i < s.amount; i++) this.schedule(i * 0.12, () => this.slash(world, s, i));
    return true;
  }

  private slash(world: World, s: WeaponStats, index: number): void {
    const side = (index % 2 === 0 ? 1 : -1) * this.owner.entity.facing;
    const row = Math.floor(index / 2);
    const offsetY = row === 0 ? -3 : row % 2 === 1 ? -15 : 9;
    const width = 32 * s.area;
    const height = 16 * s.area;
    const lifesteal = this.def.special?.lifesteal ?? 0;
    let healed = 0;
    this.spawn(world, (p) => {
      p.motion = 'attached';
      p.sprite = 'slash';
      p.offsetX = side * (width / 2 + 2);
      p.offsetY = offsetY;
      p.x += p.offsetX;
      p.y += p.offsetY;
      p.flip = side < 0;
      p.scale = s.area;
      p.halfW = width / 2;
      p.halfH = height / 2;
      p.life = s.duration;
      p.fadeOut = true;
      p.damage = s.damage;
      p.knockback = s.knockback;
      p.pierce = Number.POSITIVE_INFINITY;
      if (lifesteal > 0) {
        p.onHit = (_p, enemy) => {
          if (!enemy.isProp && healed < 5) {
            healed++;
            healPlayer(world, this.owner, lifesteal, false);
          }
        };
      }
    });
    world.audio.play('slash', { pitch: 0.9 + Math.random() * 0.2 });
  }
}
