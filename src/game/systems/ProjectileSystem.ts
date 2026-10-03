// Déplacement et collisions des projectiles du joueur, des zones au sol et des tirs ennemis.
import { normalize } from '../../engine/math';
import type { Enemy } from '../entities/Enemy';
import type { Projectile } from '../entities/Projectile';
import type { World } from '../World';
import { damageEnemy, damagePlayer } from './Combat';

const scratch: Enemy[] = [];

function move(p: Projectile, world: World, dt: number): void {
  const player = p.owner.entity;
  switch (p.motion) {
    case 'linear':
      break;
    case 'homing': {
      if (!p.target || p.target.dead) p.target = world.nearestEnemy(p.x, p.y, 220, p.hitSet);
      if (p.target) {
        const desired = normalize(p.target.x - p.x, p.target.y - p.y);
        const cur = normalize(p.vx, p.vy);
        const k = Math.min(1, p.turnRate * dt);
        const n = normalize(cur.x + (desired.x - cur.x) * k, cur.y + (desired.y - cur.y) * k);
        p.vx = n.x * p.speed;
        p.vy = n.y * p.speed;
      }
      break;
    }
    case 'gravity':
      p.vy += p.gravity * dt;
      break;
    case 'boomerang': {
      if (!p.returning) {
        const k = Math.max(0, 1 - p.age / p.outTime);
        p.vx = p.offsetX * p.speed * k;
        p.vy = p.offsetY * p.speed * k;
        if (p.age >= p.outTime) {
          p.returning = true;
          p.hitSet.clear();
        }
      } else {
        const n = normalize(player.x - p.x, player.y - p.y);
        const s = p.speed * Math.min(1.6, 0.2 + (p.age - p.outTime) * 2.5);
        p.vx = n.x * s;
        p.vy = n.y * s;
        if (Math.hypot(player.x - p.x, player.y - p.y) < 8) p.dead = true;
      }
      break;
    }
    case 'orbit':
      p.orbitAngle += p.orbitSpeed * dt;
      p.x = player.x + Math.cos(p.orbitAngle) * p.orbitRadius;
      p.y = player.y + Math.sin(p.orbitAngle) * p.orbitRadius;
      return;
    case 'attached':
      p.x = player.x + p.offsetX;
      p.y = player.y + p.offsetY;
      return;
    case 'lob': {
      const t = Math.min(1, p.age / p.life);
      p.x = p.lobFromX + (p.lobToX - p.lobFromX) * t;
      p.y = p.lobFromY + (p.lobToY - p.lobFromY) * t - Math.sin(Math.PI * t) * 40;
      return;
    }
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

function collide(p: Projectile, world: World): void {
  const reach = Math.max(p.radius, p.halfW, p.halfH);
  const candidates = world.queryEnemies(p.x, p.y, reach, scratch);
  for (const e of candidates) {
    if (e.dead) continue;
    if (p.halfW > 0) {
      if (Math.abs(e.x - p.x) > p.halfW + e.radius || Math.abs(e.y - p.y) > p.halfH + e.radius) continue;
    } else {
      const r = p.radius + e.radius;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > r * r) continue;
    }
    if (p.hitInterval > 0) {
      const until = e.hitCooldowns.get(p.hitKey);
      if (until !== undefined && until > world.time) continue;
      e.hitCooldowns.set(p.hitKey, world.time + p.hitInterval);
    } else {
      if (p.hitSet.has(e.id)) continue;
      p.hitSet.add(e.id);
    }
    const moving = p.motion === 'linear' || p.motion === 'homing';
    const dir = moving ? normalize(p.vx, p.vy) : null;
    const attached = p.motion === 'attached' || p.motion === 'orbit';
    const dealt = damageEnemy(world, e, p.damage, {
      fromX: attached ? p.owner.x : p.x,
      fromY: attached ? p.owner.y : p.y,
      dirX: dir?.x,
      dirY: dir?.y,
      knockback: p.knockback,
      hero: p.owner,
    });
    p.onHit?.(p, e, world, dealt);
    if (!e.isProp) p.pierce--;
    if (p.pierce <= 0) {
      p.dead = true;
      p.onExpire?.(p, world);
      return;
    }
  }
}

export function updateProjectiles(world: World, dt: number): void {
  for (const p of world.projectiles) {
    if (p.dead) continue;
    p.age += dt;
    if (p.age >= p.life) {
      p.dead = true;
      p.onExpire?.(p, world);
      continue;
    }
    move(p, world, dt);
    if (p.dead) continue;
    if (p.faceVelocity) p.rotation = Math.atan2(p.vy, p.vx);
    else p.rotation += p.spin * dt;
    if (p.fadeOut) p.alpha = Math.max(0, 1 - (p.age / p.life) ** 2);
    if (p.damage > 0 && p.motion !== 'lob') collide(p, world);
  }
}

export function updateZones(world: World, dt: number): void {
  for (const z of world.zones) {
    z.age += dt;
    if (z.age >= z.life) {
      z.dead = true;
      continue;
    }
    z.tickTimer -= dt;
    if (z.tickTimer > 0) continue;
    z.tickTimer = z.tickInterval;
    const candidates = world.queryEnemies(z.x, z.y, z.radius, scratch);
    const targets = candidates.filter((e) => {
      if (e.dead) return false;
      const dx = e.x - z.x;
      const dy = (e.y - z.y) / 0.75;
      const r = z.radius + e.radius;
      return dx * dx + dy * dy <= r * r;
    });
    for (const e of targets) damageEnemy(world, e, z.damage, { canCrit: true, hero: z.owner });
  }
}

export function updateBullets(world: World, dt: number): void {
  for (const b of world.bullets) {
    b.age += dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.age >= b.life) {
      b.dead = true;
      continue;
    }
    for (const h of world.heroes) {
      if (!h.alive) continue;
      const r = b.radius + h.entity.radius - 1;
      const dx = b.x - h.x;
      const dy = b.y - h.y;
      if (dx * dx + dy * dy < r * r) {
        b.dead = true;
        damagePlayer(world, h, b.damage);
        break;
      }
    }
  }
}
