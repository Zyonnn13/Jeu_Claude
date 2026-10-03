// Fait apparaître des braseros destructibles qui contiennent des bonus (soin, or, aimant, bombe).
import { BALANCE } from '../../data/balance';
import type { World } from '../World';

export class PropSpawner {
  private timer = 8;

  constructor(private readonly world: World) {}

  update(dt: number): void {
    const w = this.world;
    // Les braseros trop éloignés de tous les joueurs disparaissent.
    for (const e of w.enemies) {
      if (!e.isProp || e.dead) continue;
      const near = w.nearestHero(e.x, e.y);
      if (!near || Math.hypot(e.x - near.x, e.y - near.y) > BALANCE.recycleDistance * 1.5) e.dead = true;
    }
    if (w.director.phase !== 'active') return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = BALANCE.brazierInterval * w.rng.range(0.7, 1.3);
    const count = w.enemies.filter((e) => e.isProp && !e.dead).length;
    if (count >= BALANCE.maxBraziers) return;
    const hero = w.randomAliveHero();
    if (!hero) return;
    const a = w.rng.angle();
    const d = w.rng.range(140, 220);
    w.spawnEnemyById('brazier', hero.x + Math.cos(a) * d, hero.y + Math.sin(a) * d * 0.7);
  }
}
