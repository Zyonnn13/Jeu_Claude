// Règles de combat : dégâts infligés/subis, morts, butin, explosions, soins — et leur ressenti
// (cadavres projetés, éclats critiques, micro-pauses, flashs).
import { BALANCE } from '../../data/balance';
import { getEnemy } from '../../data/enemies';
import { normalize } from '../../engine/math';
import type { Enemy } from '../entities/Enemy';
import { Pickup, type PickupKind } from '../entities/Pickup';
import type { Hero } from '../Hero';
import type { World } from '../World';

export interface DamageOptions {
  /** Origine du coup, pour la direction du recul. */
  fromX?: number;
  fromY?: number;
  /** Direction de recul explicite (prioritaire sur l'origine). */
  dirX?: number;
  dirY?: number;
  knockback?: number;
  canCrit?: boolean;
  /** Dégâts issus d'une explosion : ne déclenchent pas d'autres explosions en chaîne. */
  cause?: 'weapon' | 'explosion' | 'thorns';
  /** Héros à l'origine des dégâts (coups critiques, attribution). */
  hero?: Hero | null;
}

const DEATH_COLORS: Record<string, string> = {
  bat: '#6a3a9e',
  slime: '#8fd94f',
  zombie: '#5f9a5a',
  skeleton: '#ece0c2',
  eye: '#e0413c',
  ghost: '#d7ecff',
  cultist: '#902a35',
  golem: '#b7b9c7',
  spider: '#4a4c63',
  werewolf: '#9a6338',
  armorKnight: '#b7b9c7',
  gargoyle: '#757892',
};

export function damageEnemy(world: World, enemy: Enemy, base: number, opts: DamageOptions = {}): number {
  if (enemy.dead) return 0;
  if (enemy.invulnerable > 0) return 0;
  const hero = opts.hero ?? null;
  if (hero) enemy.lastHitBy = hero;
  let amount = base;
  let crit = false;
  const stats = (hero ?? world.heroes[0]).stats;
  if (opts.canCrit !== false && !enemy.isProp && world.rng.chance(stats.get('critChance'))) {
    crit = true;
    amount *= stats.get('critDamage');
  }
  amount = Math.max(1, Math.round(amount));
  enemy.hp -= amount;
  enemy.flash = 0.1;
  enemy.hitPulse = 1;

  let dx = opts.dirX;
  let dy = opts.dirY;
  if (dx === undefined || dy === undefined) {
    const src = hero ?? world.heroes[0];
    const n = normalize(enemy.x - (opts.fromX ?? src.x), enemy.y - (opts.fromY ?? src.y));
    dx = n.x;
    dy = n.y;
  }
  enemy.lastDirX = dx;
  enemy.lastDirY = dy;
  const kb = opts.knockback ?? 0;
  if (kb > 0 && !enemy.isBoss) {
    const force = kb * 110 * (1 - enemy.def.knockbackResist);
    enemy.vx += dx * force;
    enemy.vy += dy * force;
  }

  if (!enemy.isProp) {
    world.run.damageDealt += amount;
    world.effects.damageNumber(enemy.x, enemy.y - enemy.radius * 0.8, amount, crit);
    world.audio.play('hit', { pitch: 0.85 + Math.random() * 0.3, volume: 0.8 });
    if (crit) {
      world.effects.spark(enemy.x + (Math.random() - 0.5) * 6, enemy.y - enemy.radius * 0.4);
      if (amount >= 60 || enemy.isBoss || enemy.elite) world.hitStop(0.035, true);
    }
  }

  // Changement de phase d'un boss.
  const phases = enemy.def.phases;
  if (enemy.isBoss && phases && enemy.hp > 0) {
    while (enemy.phase - 1 < phases.length && enemy.hp / enemy.maxHp <= phases[enemy.phase - 1]) {
      enemy.phase++;
      world.onBossPhase(enemy, enemy.phase);
    }
  }

  if (enemy.hp <= 0) killEnemy(world, enemy, { cause: opts.cause });
  return amount;
}

export function killEnemy(world: World, enemy: Enemy, opts: { drops?: boolean; cause?: string } = {}): void {
  if (enemy.dead) return;
  enemy.dead = true;
  const drops = opts.drops ?? true;

  if (enemy.isProp) {
    world.effects.burst(enemy.x, enemy.y, '#f28c28', 14, 70, { gravity: 120 });
    world.audio.play('shatter');
    dropPropLoot(world, enemy.x, enemy.y);
    return;
  }

  const color = enemy.elite ? '#e0413c' : (DEATH_COLORS[enemy.def.id] ?? '#b06de0');
  world.effects.burst(enemy.x, enemy.y, color, enemy.isBoss ? 60 : enemy.elite ? 24 : 6, enemy.isBoss ? 140 : 60);
  if (!enemy.isBoss) {
    // Le corps est projeté dans la direction du dernier coup.
    const frame = Math.floor(enemy.anim * (enemy.def.animSpeed ?? 4));
    world.effects.corpse(enemy.def.sprite, frame, enemy.x, enemy.y, enemy.facing < 0, enemy.scale, enemy.lastDirX, enemy.lastDirY, enemy.elite ? '#ff2a2a' : undefined, enemy.def.alpha ?? 1);
  }
  if (!drops) return;

  const killer = enemy.lastHitBy;
  world.run.kills++;
  world.run.killsByType.set(enemy.def.id, (world.run.killsByType.get(enemy.def.id) ?? 0) + 1);
  spawnGem(world, enemy.x, enemy.y, enemy.xp);
  const luck = killer ? killer.stats.get('luck') : world.globalStat('luck');
  if (world.rng.chance(BALANCE.coinDropChance * luck)) spawnPickup(world, 'coin', enemy.x, enemy.y, 1);
  if (world.rng.chance(0.002 * luck)) spawnPickup(world, 'chicken', enemy.x, enemy.y);
  if (enemy.elite || enemy.isBoss) spawnPickup(world, 'chest', enemy.x, enemy.y);
  if (enemy.isBoss) {
    for (let i = 0; i < 12; i++) spawnPickup(world, 'coin', enemy.x, enemy.y, 5);
  }
  if (enemy.elite && opts.cause !== 'waveEnd') {
    world.hitStop(0.07);
    world.camera.shake(3, 0.2);
  }
  if (killer && world.mods.flags.has('vampirism') && opts.cause !== 'waveEnd' && world.rng.chance(0.03)) healPlayer(world, killer, 1, false);

  const split = enemy.def.splitInto;
  if (split) {
    const def = getEnemy(split.enemy);
    for (let i = 0; i < split.count; i++) {
      const a = (i / split.count) * Math.PI * 2;
      const e = world.spawnEnemy(def, enemy.x + Math.cos(a) * 14, enemy.y + Math.sin(a) * 10);
      e.vx = Math.cos(a) * 120;
      e.vy = Math.sin(a) * 120;
    }
  }

  world.audio.play('kill', { pitch: 0.8 + Math.random() * 0.4, volume: 0.7 });
  world.events.emit('enemy:killed', { enemy, cause: opts.cause, killer });
  if (enemy.isBoss) world.onBossDefeated(enemy);
}

export function spawnPickup(world: World, kind: PickupKind, x: number, y: number, value = 1): Pickup {
  const p = new Pickup(kind, x, y, value);
  // Petit « saut » à l'apparition.
  const a = Math.random() * Math.PI * 2;
  const s = kind === 'gem' ? 20 : 45;
  p.vx = Math.cos(a) * s;
  p.vy = Math.sin(a) * s;
  world.pickups.push(p);
  return p;
}

/** Fait apparaître une gemme ; au-delà d'un certain nombre, la valeur est fusionnée dans une gemme existante. */
export function spawnGem(world: World, x: number, y: number, value: number): void {
  if (world.gemCount >= BALANCE.maxGems) {
    for (let tries = 0; tries < 6; tries++) {
      const target = world.pickups[Math.floor(Math.random() * world.pickups.length)];
      if (target && target.kind === 'gem' && !target.dead && !target.attracted) {
        target.value += value;
        return;
      }
    }
  }
  spawnPickup(world, 'gem', x, y, value);
  world.gemCount++;
}

function dropPropLoot(world: World, x: number, y: number): void {
  const table: { kind: PickupKind; weight: number; value: number }[] = [
    { kind: 'chicken', weight: 30, value: 1 },
    { kind: 'bag', weight: 30, value: 10 },
    { kind: 'magnet', weight: 12, value: 1 },
    { kind: 'bomb', weight: 12, value: 1 },
    { kind: 'gem', weight: 16, value: 5 * world.director.wave },
  ];
  const pick = world.rng.weighted(table, (t) => t.weight);
  if (pick.kind === 'gem') spawnGem(world, x, y, pick.value);
  else spawnPickup(world, pick.kind, x, y, pick.value);
}

export function damagePlayer(world: World, hero: Hero, amount: number): void {
  const p = hero.entity;
  if (p.invulnerable > 0 || !hero.alive || world.state !== 'playing' || world.debugGodMode) return;
  if (world.rng.chance(hero.stats.get('dodge'))) {
    p.invulnerable = 0.25;
    world.effects.text(p.x, p.y - 12, 'Esquive !', '#cfe8ff', 7, 0.6);
    world.audio.play('dodge');
    return;
  }
  const dmg = Math.max(1, Math.round(amount - hero.stats.get('armor')));
  p.hp -= dmg;
  p.invulnerable = BALANCE.invulnerability;
  p.flash = 0.2;
  world.run.hitThisWave = true;
  world.effects.burst(p.x, p.y, '#e0413c', 8, 50);
  if (hero === world.localHero) {
    world.camera.shake(3, 0.2, false);
    world.hitStop(0.045);
    world.screenFlash('#e0413c', 0.18, false);
  }
  world.audio.play('hurt');
  world.events.emit('player:hurt', { hero, amount: dmg });
  if (p.hp <= 0) world.handleHeroDeath(hero);
}

export function healPlayer(world: World, hero: Hero, amount: number, showText = true): void {
  const p = hero.entity;
  if (!hero.alive) return;
  const max = hero.maxHp;
  const before = p.hp;
  p.hp = Math.min(max, p.hp + amount);
  const healed = p.hp - before;
  if (healed >= 1 && showText) {
    world.effects.text(p.x, p.y - 14, `+${Math.round(healed)}`, '#8fd94f', 7, 0.8);
  }
}

/** Dégâts de zone (bombe, âmes instables, épines...). */
export function explode(
  world: World,
  x: number,
  y: number,
  radius: number,
  damage: number,
  opts: { color?: string; cause?: DamageOptions['cause']; shake?: number; hero?: Hero | null } = {},
): void {
  world.effects.ring(x, y, radius, opts.color ?? '#f28c28', 0.35, true);
  world.effects.ring(x, y, radius * 1.1, '#ffd84a', 0.3);
  world.effects.burst(x, y, opts.color ?? '#f28c28', 16, radius * 2.5);
  world.audio.play('explosion', { volume: 0.7 });
  if (opts.shake) world.camera.shake(opts.shake, 0.3);
  const candidates = world.queryEnemies(x, y, radius);
  const r2 = radius * radius;
  for (const e of candidates) {
    if (e.dead) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy <= r2 + e.radius * e.radius) {
      damageEnemy(world, e, damage, { fromX: x, fromY: y, knockback: 1.2, cause: opts.cause ?? 'explosion', hero: opts.hero });
    }
  }
}
