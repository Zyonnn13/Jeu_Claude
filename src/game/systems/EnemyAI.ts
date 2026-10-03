// Comportements des ennemis et des boss (avec leurs phases), séparation entre ennemis et dégâts de contact.
import { BALANCE } from '../../data/balance';
import type { EnemyBehavior } from '../../data/types';
import { normalize, TAU } from '../../engine/math';
import type { Enemy } from '../entities/Enemy';
import { EnemyBullet } from '../entities/Projectile';
import type { Hero } from '../Hero';
import type { World } from '../World';
import { damagePlayer } from './Combat';

/** `t` : héros ciblé (le plus proche). */
type Behavior = (e: Enemy, w: World, dt: number, t: Hero) => void;

function moveToward(e: Enemy, tx: number, ty: number, speed: number, dt: number): void {
  const n = normalize(tx - e.x, ty - e.y);
  e.x += n.x * speed * dt;
  e.y += n.y * speed * dt;
  if (Math.abs(n.x) > 0.05) e.facing = n.x > 0 ? 1 : -1;
}

function bullet(w: World, e: Enemy, x: number, y: number, angle: number, speed: number, damage?: number): void {
  const shot = e.def.shoot;
  const dmg = damage ?? Math.round((shot?.damage ?? 10) * (e.damage / e.def.damage));
  w.bullets.push(new EnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, dmg, e.def.bulletColor));
}

function shootAt(w: World, e: Enemy, tx: number, ty: number, spread = 0, count = 1): void {
  const shot = e.def.shoot;
  if (!shot) return;
  const base = Math.atan2(ty - e.y, tx - e.x);
  for (let i = 0; i < count; i++) {
    const a = base + (count > 1 ? (i - (count - 1) / 2) * spread : 0);
    bullet(w, e, e.x, e.y, a, shot.speed);
  }
  w.audio.play('enemyShot');
}

function shootRing(w: World, e: Enemy, count: number, offset = 0, speedMul = 1): void {
  const shot = e.def.shoot;
  if (!shot) return;
  for (let i = 0; i < count; i++) bullet(w, e, e.x, e.y, offset + (i / count) * TAU, shot.speed * speedMul);
  w.audio.play('enemyShot');
}

function summonAround(w: World, x: number, y: number, id: string, count: number, radius: number): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + w.rng.range(0, 0.5);
    const sx = x + Math.cos(a) * radius;
    const sy = y + Math.sin(a) * radius;
    w.spawnEnemyById(id, sx, sy);
    w.effects.burst(sx, sy, '#6a3a9e', 6, 40);
  }
}

/** Temps de recharge d'un tir, ajusté par les modificateurs de la partie. */
function cooldown(w: World, base: number): number {
  return base * w.mods.shootRate;
}

const BEHAVIORS: Record<EnemyBehavior, Behavior> = {
  chase(e, _w, dt, t) {
    moveToward(e, t.x, t.y, e.speed, dt);
  },

  phase(e, _w, dt, t) {
    moveToward(e, t.x, t.y, e.speed, dt);
  },

  erratic(e, w, dt, t) {
    const n = normalize(t.x - e.x, t.y - e.y);
    const wobble = Math.sin(w.time * 5 + e.wobble) * 0.7;
    const d = normalize(n.x - n.y * wobble, n.y + n.x * wobble);
    e.x += d.x * e.speed * dt;
    e.y += d.y * e.speed * dt;
    if (Math.abs(d.x) > 0.05) e.facing = d.x > 0 ? 1 : -1;
  },

  /** Araignée : courtes ruées en biais entrecoupées de pauses. */
  skitter(e, _w, dt, t) {
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      e.state = e.state === 0 ? 1 : 0;
      e.stateTimer = e.state === 1 ? 0.45 + Math.random() * 0.25 : 0.2 + Math.random() * 0.2;
      if (e.state === 1) {
        const n = normalize(t.x - e.x, t.y - e.y);
        const side = (Math.random() - 0.5) * 1.2;
        const d = normalize(n.x - n.y * side, n.y + n.x * side);
        e.dirX = d.x;
        e.dirY = d.y;
      }
    }
    if (e.state === 1) {
      e.x += e.dirX * e.speed * 1.5 * dt;
      e.y += e.dirY * e.speed * 1.5 * dt;
      if (Math.abs(e.dirX) > 0.05) e.facing = e.dirX > 0 ? 1 : -1;
    }
  },

  ranged(e, w, dt, t) {
    const p = t.entity;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d > 125) moveToward(e, p.x, p.y, e.speed, dt);
    else if (d < 85) moveToward(e, 2 * e.x - p.x, 2 * e.y - p.y, e.speed * 0.7, dt);
    e.facing = p.x > e.x ? 1 : -1;
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 230) {
      e.shootTimer = cooldown(w, e.def.shoot!.cooldown * (e.elite ? 0.6 : 1));
      shootAt(w, e, p.x, p.y, 0.25, e.elite ? 3 : 1);
    }
  },

  charger(e, _w, dt, t) {
    const p = t.entity;
    e.stateTimer -= dt;
    if (e.state === 0) {
      moveToward(e, p.x, p.y, e.speed, dt);
      if (e.stateTimer <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 150) {
        e.state = 1;
        e.stateTimer = 0.5;
        const n = normalize(p.x - e.x, p.y - e.y);
        e.dirX = n.x;
        e.dirY = n.y;
      }
    } else if (e.state === 1) {
      if (e.stateTimer <= 0) {
        e.state = 2;
        e.stateTimer = 0.45;
      }
    } else {
      e.x += e.dirX * e.speed * 4.5 * dt;
      e.y += e.dirY * e.speed * 4.5 * dt;
      if (e.stateTimer <= 0) {
        e.state = 0;
        e.stateTimer = 2.5 + Math.random() * 1.5;
      }
    }
  },

  static() {},

  /**
   * Roi Gluant. Phase 1 : bonds réguliers. Phase 2 : chaque atterrissage projette un anneau de gelée.
   * Phase 3 : bonds frénétiques et invocations doublées.
   */
  slimeKing(e, w, dt, t) {
    const p = t.entity;
    e.stateTimer -= dt;
    if (e.state === 0) {
      moveToward(e, p.x, p.y, e.speed * (e.phase >= 2 ? 1.3 : 1), dt);
      if (e.stateTimer <= 0) {
        e.state = 1;
        e.stateTimer = e.phase >= 3 ? 0.45 : 0.7;
      }
    } else if (e.state === 1) {
      if (e.stateTimer <= 0) {
        const n = normalize(p.x - e.x, p.y - e.y);
        e.dirX = n.x;
        e.dirY = n.y;
        e.state = 2;
        e.stateTimer = 0.55;
      }
    } else {
      e.x += e.dirX * 230 * dt;
      e.y += e.dirY * 230 * dt;
      if (e.stateTimer <= 0) {
        e.state = 0;
        e.stateTimer = e.phase >= 3 ? 1.3 : e.phase >= 2 ? 1.9 : 2.6;
        w.camera.shake(4, 0.3);
        w.effects.ring(e.x, e.y + 8, 60, '#8fd94f', 0.5, true);
        summonAround(w, e.x, e.y, 'slime', e.phase >= 3 ? 6 : 3, 26);
        if (e.phase >= 2) shootRing(w, e, e.phase >= 3 ? 12 : 8, Math.random());
      }
    }
    // Se divise à chaque quart de PV perdu.
    const lost = Math.floor((1 - e.hp / e.maxHp) * 4);
    if (lost > e.thresholds && e.hp > 0) {
      e.thresholds = lost;
      summonAround(w, e.x, e.y, 'slime', 6, 30);
    }
  },

  /**
   * Liche. Phase 1 : anneaux et salves. Phase 2 : spirales de projectiles et spectres.
   * Phase 3 : « prison d'os », un cercle de projectiles qui se referme sur le joueur.
   */
  lich(e, w, dt, t) {
    const p = t.entity;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d > 150) moveToward(e, p.x, p.y, e.speed * (d > 220 ? 1.8 : 1), dt);
    else if (d < 80) moveToward(e, 2 * e.x - p.x, 2 * e.y - p.y, e.speed * 0.6, dt);
    else {
      const n = normalize(p.x - e.x, p.y - e.y);
      e.x += -n.y * e.speed * 0.6 * dt;
      e.y += n.x * e.speed * 0.6 * dt;
    }
    e.facing = p.x > e.x ? 1 : -1;

    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      e.shootTimer = cooldown(w, e.def.shoot!.cooldown * (e.phase >= 3 ? 0.75 : 1));
      e.state = (e.state + 1) % 3;
      if (e.phase >= 2 && e.state === 1) {
        e.patternTimer = 1.6; // spirale
      } else if (e.state === 2) shootAt(w, e, p.x, p.y, 0.18, 5);
      else shootRing(w, e, 12, e.state * 0.26);
    }
    if (e.patternTimer > 0) {
      e.patternTimer -= dt;
      e.specialTimer -= dt;
      if (e.specialTimer <= 0) {
        e.specialTimer = 0.09;
        const a = w.time * 4;
        bullet(w, e, e.x, e.y, a, 70);
        bullet(w, e, e.x, e.y, a + Math.PI, 70);
      }
    }

    e.summonTimer -= dt;
    if (e.summonTimer <= 0) {
      e.summonTimer = e.phase >= 2 ? 6 : 7;
      summonAround(w, e.x, e.y, 'skeleton', 5, 30);
      if (e.phase >= 2) summonAround(w, e.x, e.y, 'ghost', 3, 40);
      if (e.phase >= 3) {
        // Prison d'os : un cercle de projectiles autour du joueur, avec deux ouvertures.
        const gap = Math.random() * TAU;
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * TAU;
          const diff = Math.abs(((a - gap + Math.PI * 3) % TAU) - Math.PI);
          if (diff < 0.35 || Math.abs(diff - Math.PI) < 0.35) continue;
          const bx = p.x + Math.cos(a) * 140;
          const by = p.y + Math.sin(a) * 140;
          w.bullets.push(new EnemyBullet(bx, by, -Math.cos(a) * 45, -Math.sin(a) * 45, e.def.shoot!.damage, '#ece0c2', 3, 4));
        }
        w.effects.ring(p.x, p.y, 140, '#b06de0', 0.6);
      }
    }
    e.stateTimer -= dt;
    if (d < 50 && e.stateTimer <= 0) {
      // Téléportation loin du joueur.
      e.stateTimer = 4;
      w.effects.burst(e.x, e.y, '#b06de0', 20, 80);
      const a = w.rng.angle();
      e.x = p.x + Math.cos(a) * 160;
      e.y = p.y + Math.sin(a) * 110;
      w.effects.burst(e.x, e.y, '#b06de0', 20, 80);
    }
  },

  /**
   * Comte Vladislav. Phase 1 : charges et salves. Phase 2 : enragé, plus rapide.
   * Phase 3 : forme de brume invulnérable qui appelle une nuée, puis nova de sang.
   */
  vampire(e, w, dt, t) {
    const p = t.entity;
    const rate = e.phase >= 2 ? 0.7 : 1;
    const speed = e.speed * (e.phase >= 2 ? 1.3 : 1);

    // Forme de brume (phase 3, périodique).
    if (e.phase >= 3) {
      e.specialTimer -= dt;
      if (e.specialTimer <= 0 && e.state !== 3) {
        e.state = 3;
        e.patternTimer = 3;
        e.invulnerable = 3;
        summonAround(w, p.x, p.y, 'bat', 14, Math.max(w.viewW, w.viewH) * 0.5);
        w.effects.text(e.x, e.y - 30, 'Forme de brume !', '#ff6070', 9, 1.5);
      }
    }
    if (e.state === 3) {
      moveToward(e, p.x, p.y, speed * 0.6, dt);
      e.patternTimer -= dt;
      if (e.patternTimer <= 0) {
        e.state = 0;
        e.stateTimer = 1.5;
        e.specialTimer = 12;
        shootRing(w, e, 24, Math.random(), 0.9);
        w.camera.shake(6, 0.4);
        w.effects.ring(e.x, e.y, 90, '#e0413c', 0.5, true);
      }
      return;
    }

    e.stateTimer -= dt;
    if (e.state === 0) {
      moveToward(e, p.x, p.y, speed, dt);
      if (e.stateTimer <= 0) {
        e.state = 1;
        e.stateTimer = 0.55;
      }
    } else if (e.state === 1) {
      if (e.stateTimer <= 0) {
        const n = normalize(p.x - e.x, p.y - e.y);
        e.dirX = n.x;
        e.dirY = n.y;
        e.state = 2;
        e.stateTimer = 0.5;
      }
    } else {
      e.x += e.dirX * speed * 5 * dt;
      e.y += e.dirY * speed * 5 * dt;
      if (Math.abs(e.dirX) > 0.05) e.facing = e.dirX > 0 ? 1 : -1;
      if (e.stateTimer <= 0) {
        e.state = 0;
        e.stateTimer = 4 * rate;
      }
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      e.shootTimer = cooldown(w, e.def.shoot!.cooldown * rate);
      shootAt(w, e, p.x, p.y, 0.2, e.phase >= 2 ? 7 : 5);
    }
    e.summonTimer -= dt;
    if (e.summonTimer <= 0) {
      e.summonTimer = 6 * rate;
      summonAround(w, p.x, p.y, 'bat', e.phase >= 2 ? 12 : 8, Math.max(w.viewW, w.viewH) * 0.5);
    }
  },

  /**
   * La Faucheuse (méga-boss). Phase 1 : poursuite, ruées et anneaux de faux.
   * Phase 2 : invoque des spectres. Phase 3 : se téléporte derrière le joueur.
   */
  reaper(e, w, dt, t) {
    const p = t.entity;
    const speed = e.speed * (1 + 0.15 * (e.phase - 1));
    e.stateTimer -= dt;
    if (e.state === 0) {
      moveToward(e, p.x, p.y, speed, dt);
      if (e.stateTimer <= 0) {
        e.state = 1;
        e.stateTimer = 0.6;
      }
    } else if (e.state === 1) {
      if (e.stateTimer <= 0) {
        const n = normalize(p.x - e.x, p.y - e.y);
        e.dirX = n.x;
        e.dirY = n.y;
        e.state = 2;
        e.stateTimer = 0.55;
      }
    } else {
      e.x += e.dirX * speed * 4 * dt;
      e.y += e.dirY * speed * 4 * dt;
      if (Math.abs(e.dirX) > 0.05) e.facing = e.dirX > 0 ? 1 : -1;
      if (e.stateTimer <= 0) {
        e.state = 0;
        e.stateTimer = 4.5 - e.phase * 0.8;
      }
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      e.shootTimer = cooldown(w, e.def.shoot!.cooldown * (1 - 0.2 * (e.phase - 1)));
      shootRing(w, e, 8 + 4 * (e.phase - 1), Math.random());
    }
    if (e.phase >= 2) {
      e.summonTimer -= dt;
      if (e.summonTimer <= 0) {
        e.summonTimer = 7;
        summonAround(w, p.x, p.y, 'ghost', 8, 120);
      }
    }
    if (e.phase >= 3) {
      e.specialTimer -= dt;
      if (e.specialTimer <= 0) {
        e.specialTimer = 8;
        w.effects.burst(e.x, e.y, '#cfd8ff', 24, 90);
        const back = normalize(p.aimX, p.aimY);
        e.x = p.x - back.x * 70;
        e.y = p.y - back.y * 70;
        e.state = 1;
        e.stateTimer = 0.7;
        w.effects.burst(e.x, e.y, '#cfd8ff', 24, 90);
        w.effects.text(e.x, e.y - 34, 'Derrière vous…', '#cfd8ff', 9, 1.2);
        shootRing(w, e, 16, Math.random(), 0.8);
      }
    }
  },
};

const scratch: Enemy[] = [];

export function updateEnemies(world: World, dt: number): void {
  const decay = Math.exp(-9 * dt);
  const recycle2 = BALANCE.recycleDistance * BALANCE.recycleDistance;
  // Un boss semé par les joueurs réapparaît au bord de l'écran.
  const bossLeash = Math.max(world.viewW, world.viewH) * 0.75;
  const bossLeash2 = bossLeash * bossLeash;
  const heroes = world.heroes;

  for (const e of world.enemies) {
    if (e.dead) continue;
    e.anim += dt;
    e.flash -= dt;
    e.hitPulse = Math.max(0, e.hitPulse - dt * 7);
    e.invulnerable = Math.max(0, e.invulnerable - dt);
    e.spawnFade = Math.min(1, e.spawnFade + dt * 3);

    // Recul
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vx *= decay;
    e.vy *= decay;

    const target = world.nearestHero(e.x, e.y);
    if (!target) continue;
    BEHAVIORS[e.def.behavior](e, world, dt, target);
    if (e.isProp) continue;

    // Les ennemis distancés sont replacés près des joueurs pour maintenir la pression.
    const dx = e.x - target.x;
    const dy = e.y - target.y;
    const limit = e.isBoss ? bossLeash2 : recycle2;
    if (dx * dx + dy * dy > limit) {
      const pos = world.director.spawnPosition();
      if (e.isBoss) world.effects.burst(e.x, e.y, '#b06de0', 20, 80);
      e.x = pos.x;
      e.y = pos.y;
      if (e.isBoss) world.effects.burst(e.x, e.y, '#b06de0', 20, 80);
      continue;
    }

    if (e.def.behavior !== 'phase') separate(world, e);

    if (e.spawnFade <= 0.5 || (e.isBoss && e.state === 3 && e.def.behavior === 'vampire')) continue;
    for (const h of heroes) {
      if (!h.alive) continue;
      const r = e.radius + h.entity.radius - 2;
      const hx = e.x - h.x;
      const hy = e.y - h.y;
      if (hx * hx + hy * hy < r * r) damagePlayer(world, h, e.damage);
    }
  }
}

/** Écarte les ennemis qui se chevauchent (évite qu'ils s'empilent en un seul point). */
function separate(world: World, e: Enemy): void {
  if (e.isBoss) return;
  const neighbors = world.enemyHash.query(e.x, e.y, e.radius * 2 + 8, scratch);
  let checked = 0;
  for (const o of neighbors) {
    if (o === e || o.dead || o.def.behavior === 'phase') continue;
    const dx = e.x - o.x;
    const dy = e.y - o.y;
    const min = (e.radius + o.radius) * 0.85;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    if (++checked > 10) break;
    if (d2 < 1e-4) {
      e.x += Math.random() - 0.5;
      e.y += Math.random() - 0.5;
      continue;
    }
    const d = Math.sqrt(d2);
    const push = (min - d) * (o.isBoss || o.isProp ? 1 : 0.5);
    e.x += (dx / d) * push;
    e.y += (dy / d) * push;
  }
}
