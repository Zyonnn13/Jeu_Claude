import type { WeaponStats } from '../../data/types';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Dagues : lancées en rafale dans la direction du mouvement. */
export class KnivesWeapon extends Weapon {
  protected fire(world: World, s: WeaponStats): boolean {
    const player = this.owner.entity;
    const dirX = player.aimX;
    const dirY = player.aimY;
    const speed = 260 * s.speed;
    for (let i = 0; i < s.amount; i++) {
      // Décalage perpendiculaire alterné pour élargir la volée.
      const offset = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 4;
      this.schedule(i * 0.05, () => {
        this.spawn(world, (k) => {
          k.x += -dirY * offset;
          k.y += dirX * offset;
          k.vx = dirX * speed;
          k.vy = dirY * speed;
          k.sprite = 'knife';
          k.faceVelocity = true;
          k.scale = Math.sqrt(s.area);
          k.radius = 3.5 * Math.sqrt(s.area);
          k.life = s.duration;
          k.pierce = s.pierce;
          k.damage = s.damage;
          k.knockback = s.knockback;
        });
      });
    }
    world.audio.play('throw', { pitch: 1 + Math.random() * 0.2 });
    return true;
  }
}
