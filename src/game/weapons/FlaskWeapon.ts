import type { WeaponStats } from '../../data/types';
import { Zone } from '../entities/Zone';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Fiole : lancée en cloche, elle laisse une zone de flammes à l'impact. */
export class FlaskWeapon extends Weapon {
  protected fire(world: World, s: WeaponStats): boolean {
    const p = this.owner.entity;
    const targets = world.randomEnemiesNear(this.owner, s.amount);
    for (let i = 0; i < s.amount; i++) {
      const t = targets[i];
      const tx = t ? t.x : p.x + world.rng.range(-90, 90);
      const ty = t ? t.y : p.y + world.rng.range(-70, 70);
      this.schedule(i * 0.12, () => {
        this.spawn(world, (f) => {
          f.motion = 'lob';
          f.lobFromX = this.owner.entity.x;
          f.lobFromY = this.owner.entity.y;
          f.lobToX = tx;
          f.lobToY = ty;
          f.life = 0.5;
          f.spin = 12;
          f.sprite = 'flask';
          f.damage = 0;
          f.onExpire = (proj, w) => {
            const radius = 22 * s.area;
            w.zones.push(new Zone(proj.lobToX, proj.lobToY, radius, s.damage, s.duration, 0.35, this.uid, this.owner));
            w.effects.burst(proj.lobToX, proj.lobToY, '#f28c28', 12, 80);
            w.audio.play('shatter', { volume: 0.7 });
          };
        });
        world.audio.play('throw', { pitch: 0.8 });
      });
    }
    return true;
  }
}
