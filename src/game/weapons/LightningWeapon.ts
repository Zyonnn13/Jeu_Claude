import type { WeaponStats } from '../../data/types';
import type { Enemy } from '../entities/Enemy';
import { Zone } from '../entities/Zone';
import { damageEnemy } from '../systems/Combat';
import type { World } from '../World';
import { Weapon } from './Weapon';

/** Foudre : frappe des ennemis visibles au hasard, avec rebonds après évolution. */
export class LightningWeapon extends Weapon {
  protected fire(world: World, s: WeaponStats): boolean {
    const targets = world.randomEnemiesNear(this.owner, s.amount);
    if (!targets.length) return false;
    const boss = world.boss;
    if (boss && !boss.dead && world.isNear(this.owner, boss.x, boss.y) && !targets.includes(boss)) targets[0] = boss;
    targets.forEach((target, i) => this.schedule(i * 0.08, () => this.strike(world, s, target)));
    return true;
  }

  private strike(world: World, s: WeaponStats, first: Enemy): void {
    let target: Enemy | null = first.dead ? (world.randomEnemiesNear(this.owner, 1)[0] ?? null) : first;
    if (!target) return;
    const radius = 18 * s.area;
    world.effects.lightning(target.x, target.y);
    this.zap(world, s, target.x, target.y, radius);
    world.audio.play('lightning', { pitch: 0.9 + Math.random() * 0.3, volume: 0.7 });

    const chain = this.def.special?.chain ?? 0;
    const hit = new Set<number>([target.id]);
    for (let c = 0; c < chain && target; c++) {
      const next: Enemy | null = world.nearestEnemy(target.x, target.y, 90, hit);
      if (!next) break;
      world.effects.lightning(next.x, next.y, target.x, target.y, '#fff1a0');
      hit.add(next.id);
      this.zap(world, s, next.x, next.y, radius * 0.7);
      target = next;
    }
  }

  private zap(world: World, s: WeaponStats, x: number, y: number, radius: number): void {
    // Synergie « Orage de feu » : l'impact laisse une petite zone de flammes.
    if (this.owner.synergies.has('lightningIgnites')) world.zones.push(new Zone(x, y, radius * 0.9, s.damage * 0.2, 1.6, 0.35, this.uid, this.owner));
    world.effects.burst(x, y, '#cfe8ff', 6, 70);
    world.effects.ring(x, y, radius, '#cfe8ff', 0.25);
    const candidates = world.queryEnemies(x, y, radius);
    for (const e of candidates) {
      if (e.dead) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const r = radius + e.radius;
      if (dx * dx + dy * dy <= r * r) damageEnemy(world, e, s.damage, { fromX: x, fromY: y, knockback: 0.3, hero: this.owner });
    }
  }
}
