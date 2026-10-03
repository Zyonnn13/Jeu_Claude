import type { WeaponStats } from '../../data/types';
import { normalize } from '../../engine/math';
import { damageEnemy } from '../systems/Combat';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Baguette : projectiles magiques vers les ennemis les plus proches. */
export class WandWeapon extends Weapon {
  protected fire(world: World, s: WeaponStats): boolean {
    const p = this.owner.entity;
    const targets = world.nearestEnemies(p.x, p.y, s.amount, 260);
    if (!targets.length) return false;
    const homing = !!this.def.special?.homing;
    for (let i = 0; i < s.amount; i++) {
      const target = targets[i % targets.length];
      this.schedule(i * 0.07, () => {
        // Si la cible est morte entre-temps, on vise sa dernière position.
        const dir = normalize(target.x - this.owner.entity.x, target.y - this.owner.entity.y);
        const speed = 170 * s.speed;
        this.spawn(world, (b) => {
          b.motion = homing ? 'homing' : 'linear';
          b.target = homing ? target : null;
          b.speed = speed;
          b.vx = dir.x * speed;
          b.vy = dir.y * speed;
          b.sprite = 'bolt';
          b.frameRate = 10;
          b.scale = Math.sqrt(s.area);
          b.radius = 4 * Math.sqrt(s.area);
          b.life = s.duration;
          b.pierce = s.pierce;
          b.damage = s.damage;
          b.knockback = s.knockback;
          b.turnRate = 8;
          // Synergie « Tempête arcanique » : le projectile peut électrocuter un ennemi voisin.
          b.onHit = (_p, enemy, w) => {
            if (!this.owner.synergies.has('boltsChain') || !w.rng.chance(0.3)) return;
            const next = w.nearestEnemy(enemy.x, enemy.y, 70, new Set([enemy.id]));
            if (!next) return;
            w.effects.lightning(next.x, next.y, enemy.x, enemy.y, '#e8a2ff');
            damageEnemy(w, next, s.damage * 0.6, { fromX: enemy.x, fromY: enemy.y, knockback: 0.3, hero: this.owner });
          };
        });
        world.audio.play('bolt', { pitch: 0.9 + Math.random() * 0.2 });
      });
    }
    return true;
  }
}
