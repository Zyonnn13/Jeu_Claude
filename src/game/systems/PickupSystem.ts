// Attraction (aimant) et collecte des objets au sol.
import { BALANCE } from '../../data/balance';
import type { Pickup } from '../entities/Pickup';
import type { Hero } from '../Hero';
import type { World } from '../World';
import { damageEnemy, healPlayer } from './Combat';

export function updatePickups(world: World, dt: number): void {
  const decay = Math.exp(-6 * dt);
  const heroes = world.heroes;

  for (const pk of world.pickups) {
    if (pk.dead) continue;
    pk.age += dt;

    // Héros vers lequel l'objet se dirige (le plus proche dont l'aimant l'atteint).
    let hero: Hero | null = pk.target >= 0 && heroes[pk.target]?.alive ? heroes[pk.target] : null;
    if (!hero) {
      hero = world.nearestHero(pk.x, pk.y);
      if (!hero) continue;
      if (pk.attracted) pk.target = hero.index;
    }
    const dx = hero.x - pk.x;
    const dy = hero.y - pk.y;
    const d2 = dx * dx + dy * dy;
    const magnet = BALANCE.magnetRadius * hero.stats.get('magnet');

    if (!pk.attracted && pk.magnetic && d2 < magnet * magnet && pk.age > 0.25) {
      pk.attracted = true;
      pk.target = hero.index;
      pk.speed = -40; // petit recul avant d'être aspiré, comme une pièce qu'on attire
    }
    if (pk.attracted) {
      pk.speed = Math.min(420, pk.speed + 700 * dt);
      const d = Math.sqrt(d2) || 1;
      const step = Math.min(d, pk.speed * dt);
      pk.x += (dx / d) * step;
      pk.y += (dy / d) * step;
    } else {
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      pk.vx *= decay;
      pk.vy *= decay;
    }

    const collect = hero.entity.radius + (pk.kind === 'chest' ? 10 : 5);
    if (d2 < collect * collect) {
      pk.dead = true;
      collectPickup(world, pk, hero);
    }
  }
}

function collectPickup(world: World, pk: Pickup, hero: Hero): void {
  const p = hero.entity;
  switch (pk.kind) {
    case 'gem': {
      world.run.gemStreak = Math.min(world.run.gemStreak + 1, 24);
      world.run.gemStreakTimer = 0.6;
      world.audio.play('gem', { pitch: 1 + world.run.gemStreak * 0.03, volume: 0.6 });
      world.addXp(pk.value, hero);
      break;
    }
    case 'coin':
    case 'bag': {
      const gained = world.addGold(pk.value, hero);
      world.audio.play('coin');
      world.effects.text(p.x, p.y - 12, `+${gained} or`, '#ffd84a', 6, 0.7);
      break;
    }
    case 'chicken':
      healPlayer(world, hero, 30);
      world.audio.play('heal');
      break;
    case 'magnet':
      for (const other of world.pickups) {
        if (other.kind === 'gem' && !other.dead) {
          other.attracted = true;
          other.target = hero.index;
        }
      }
      world.effects.ring(p.x, p.y, 120, '#6fe3f0', 0.5);
      world.audio.play('heal', { pitch: 1.5 });
      break;
    case 'bomb': {
      if (hero === world.localHero) {
        world.camera.shake(7, 0.5, false);
        world.screenFlash('#ffffff', 0.55, false);
      }
      world.hitStop(0.12);
      world.effects.ring(p.x, p.y, Math.max(world.viewW, world.viewH) * 0.6, '#ffffff', 0.5, true);
      world.audio.play('explosion');
      const damage = 120 + world.director.wave * 25;
      for (const e of world.enemies) {
        if (!e.dead && !e.isProp && world.isNear(hero, e.x, e.y, 16)) {
          damageEnemy(world, e, e.isBoss ? damage * 0.5 : damage, { knockback: 1.5, canCrit: false, cause: 'explosion', hero });
        }
      }
      break;
    }
    case 'chest':
      world.run.chests++;
      world.audio.play('chest');
      world.uiQueue.push({ type: 'chest', hero: hero.index });
      world.events.emit('pickup:chest', { hero });
      break;
  }
}
