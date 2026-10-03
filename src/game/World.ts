// État complet d'une partie (solo ou multijoueur) et orchestration des systèmes à chaque frame.
import { BALANCE, waveScaling, xpToNext } from '../data/balance';
import type { BiomeDef } from '../data/biomes';
import type { DangerDef } from '../data/danger';
import { getEnemy } from '../data/enemies';
import type { MutatorDef } from '../data/mutators';
import type { SynergyDef } from '../data/synergies';
import type { EnemyDef, StatKey } from '../data/types';
import type { SfxName } from '../engine/Audio';
import { Camera } from '../engine/Camera';
import { rgb } from '../engine/color';
import { EventBus } from '../engine/EventBus';
import { Rng } from '../engine/Rng';
import { SpatialHash } from '../engine/SpatialHash';
import { dist2, TAU } from '../engine/math';
import type { Settings } from '../core/SaveManager';
import { Enemy } from './entities/Enemy';
import type { EnemyBullet, Projectile } from './entities/Projectile';
import type { Pickup } from './entities/Pickup';
import type { Zone } from './entities/Zone';
import { Hero, type HeroSetup } from './Hero';
import type { HeroView, HudData, HudSlot, WorldView } from './render/WorldView';
import { getPassive } from '../data/passives';
import { buildModifiers, type RunModifiers } from './RunModifiers';
import { Effects } from './systems/Effects';
import type { Director, GameMode } from './systems/Director';
import { WaveDirector } from './systems/WaveDirector';
import { SurvivalDirector } from './systems/SurvivalDirector';
import { PropSpawner } from './systems/PropSpawner';
import { updateEnemies } from './systems/EnemyAI';
import { updateProjectiles, updateBullets, updateZones } from './systems/ProjectileSystem';
import { updatePickups } from './systems/PickupSystem';
import { explode, healPlayer } from './systems/Combat';

export interface WorldEvents {
  'enemy:killed': { enemy: Enemy; cause?: string; killer: Hero | null };
  'player:hurt': { hero: Hero; amount: number };
  'player:downed': { hero: Hero };
  'player:revived': { hero: Hero; byTeammate: boolean };
  'player:levelup': { level: number };
  'wave:start': { wave: number; boss: boolean };
  'wave:cleared': { wave: number; noHit: boolean };
  'survival:milestone': { text: string };
  'boss:spawn': { enemy: Enemy };
  'boss:phase': { enemy: Enemy; phase: number };
  'boss:defeated': { enemy: Enemy; fightTime: number };
  'pickup:chest': { hero: Hero };
  'weapon:evolved': { hero: Hero; from: string; into: string };
  'synergy:activated': { hero: Hero; synergy: SynergyDef };
}

export type UiRequest =
  | { type: 'levelup'; hero: number }
  | { type: 'chest'; hero: number }
  | { type: 'relic'; hero: number }
  | { type: 'gameover' }
  | { type: 'victory' };

/** Ce dont la simulation a besoin pour jouer des sons. */
export interface SoundPlayer {
  play(name: SfxName, opts?: { pitch?: number; volume?: number }): boolean;
}

export interface WorldServices {
  audio: SoundPlayer;
  settings: Settings;
}

export interface RunSetup {
  mode: GameMode;
  heroes: HeroSetup[];
  biome: BiomeDef;
  danger: DangerDef;
  mutators: MutatorDef[];
  startWave?: number;
  seed?: number;
  daily?: boolean;
  /** Coopération locale : une seule caméra pour tous les joueurs. */
  sharedCamera?: boolean;
  isWeaponUnlocked(id: string): boolean;
  isRelicUnlocked(id: string): boolean;
}

/** Retire en place les éléments morts d'une liste. */
function compact<T extends { dead: boolean }>(list: T[]): void {
  let w = 0;
  for (let i = 0; i < list.length; i++) if (!list[i].dead) list[w++] = list[i];
  list.length = w;
}

export class World implements WorldView {
  readonly events = new EventBus<WorldEvents>();
  readonly rng: Rng;
  readonly effects = new Effects();
  readonly camera = new Camera();
  readonly enemyHash = new SpatialHash<Enemy>(32);
  readonly biome: BiomeDef;
  readonly mods: RunModifiers;
  readonly heroes: Hero[] = [];
  readonly director: Director;
  readonly props: PropSpawner;
  /** Héros suivi par la caméra (vue locale). */
  focusHero = 0;

  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  bullets: EnemyBullet[] = [];
  pickups: Pickup[] = [];
  zones: Zone[] = [];
  gemCount = 0;
  boss: Enemy | null = null;
  private bossSpawnTime = 0;

  time = 0;
  viewW = 640;
  viewH = 360;
  state: 'playing' | 'dying' | 'over' = 'playing';
  private stateTimer = 0;
  private deferred: (() => void)[] = [];
  private pendingRelics = 0;
  /** Micro-pause (« hit stop ») : la simulation se fige un court instant sur les gros impacts. */
  private freeze = 0;
  private smallStopCooldown = 0;
  /** Flash plein écran (couleur et opacité). */
  readonly flash = { r: 1, g: 1, b: 1, a: 0 };
  readonly uiQueue: UiRequest[] = [];
  debugGodMode = false;
  reduceFlashes = false;
  /** Appelé pour chaque flash « global » (retransmis aux joueurs en ligne). */
  onFlash: ((color: string, alpha: number) => void) | null = null;

  readonly run = {
    kills: 0,
    gold: 0,
    level: 1,
    xp: 0,
    xpNext: xpToNext(1),
    damageDealt: 0,
    endless: false,
    victory: false,
    gemStreak: 0,
    gemStreakTimer: 0,
    chests: 0,
    evolutions: 0,
    bossKills: [] as string[],
    killsByType: new Map<string, number>(),
    hitThisWave: false,
    noHitWaves: 0,
    fastestBossKill: Number.POSITIVE_INFINITY,
  };

  constructor(
    readonly setup: RunSetup,
    readonly services: WorldServices,
  ) {
    this.rng = new Rng(setup.seed ?? Date.now());
    this.biome = setup.biome;
    this.mods = buildModifiers(setup.biome, setup.danger, setup.mutators);
    this.effects.showDamageNumbers = services.settings.gameplay.damageNumbers;
    this.camera.shakeScale = services.settings.accessibility.screenShake;
    this.reduceFlashes = services.settings.accessibility.reduceFlashes;
    const particles = services.settings.graphics.particles;
    this.effects.particleScale = particles === 'low' ? 0.35 : particles === 'medium' ? 0.65 : 1;
    this.effects.corpsesEnabled = services.settings.graphics.corpses;

    setup.heroes.forEach((h, i) => {
      const hero = new Hero(this, i, h);
      // Les joueurs apparaissent en petit cercle.
      if (setup.heroes.length > 1) {
        const a = (i / setup.heroes.length) * TAU;
        hero.entity.x = Math.cos(a) * 18;
        hero.entity.y = Math.sin(a) * 14;
      }
      this.heroes.push(hero);
    });
    this.director = setup.mode === 'survival' ? new SurvivalDirector(this) : new WaveDirector(this, setup.startWave ?? 1);
    this.props = new PropSpawner(this);
    for (const hero of this.heroes) hero.inventory.addWeapon(hero.character.startWeapon);
    this.camera.follow(this.heroes[0].x, this.heroes[0].y, 0, true);
  }

  get audio(): SoundPlayer {
    return this.services.audio;
  }

  /** Héros vu par l'écran local (solo, hôte, ou client). */
  get localHero(): Hero {
    return this.heroes[this.focusHero] ?? this.heroes[0];
  }

  get multiplayer(): boolean {
    return this.heroes.length > 1;
  }

  // --- Données d'affichage (WorldView) ---
  get heroViews(): HeroView[] {
    return this.heroes.map((h) => h.view());
  }

  get localHeroIndex(): number {
    return this.focusHero;
  }

  get lightRadius(): number {
    return this.mods.lightRadius;
  }

  /** Données du HUD pour un héros. */
  hudData(heroIndex = this.focusHero): HudData {
    const hero = this.heroes[heroIndex] ?? this.heroes[0];
    const weapons: HudSlot[] = hero.inventory.weapons.map((w) => ({ icon: w.def.icon, level: w.def.evolved ? '★' : String(w.level), evolved: !!w.def.evolved, max: w.isMaxLevel }));
    const passives: HudSlot[] = [...hero.inventory.passives].map(([id, level]) => {
      const def = getPassive(id);
      return { icon: def.icon, level: String(level), evolved: false, max: level >= def.maxLevel };
    });
    const boss = this.boss && !this.boss.dead ? this.boss : null;
    return {
      director: this.director.hud(),
      level: this.run.level,
      xpRatio: Math.min(1, this.run.xp / this.run.xpNext),
      kills: this.run.kills,
      gold: this.run.gold,
      hp: Math.max(0, hero.entity.hp),
      maxHp: hero.maxHp,
      weapons,
      passives,
      party: this.multiplayer
        ? this.heroes.map((h) => ({ name: h.name, color: h.color, sprite: h.character.sprite, hp: Math.max(0, h.entity.hp), maxHp: h.maxHp, downed: h.downed || h.entity.dead, level: this.run.level }))
        : [],
      boss: boss ? { name: boss.def.name, hp: boss.hp, maxHp: boss.maxHp, phase: boss.phase, phases: boss.def.phases ?? [] } : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Boucle principale

  update(dt: number): void {
    this.flash.a = Math.max(0, this.flash.a - dt * 2.5);
    this.smallStopCooldown -= dt;
    if (this.freeze > 0) {
      this.freeze -= dt;
      this.updateCamera(dt);
      return;
    }
    this.time += dt;
    for (const h of this.heroes) h.syncStats();

    if (this.state === 'dying') {
      this.stateTimer -= dt;
      this.effects.update(dt);
      this.updateCamera(dt);
      if (this.stateTimer <= 0) {
        this.state = 'over';
        this.uiQueue.push({ type: 'gameover' });
      }
      return;
    }
    if (this.state === 'over') return;

    this.updateHeroes(dt);
    this.director.update(dt);
    this.props.update(dt);

    this.enemyHash.clear();
    for (const e of this.enemies) if (!e.dead) this.enemyHash.insert(e);

    updateEnemies(this, dt);
    for (const h of this.heroes) if (h.alive) for (const w of h.inventory.weapons) w.update(dt, this);
    updateProjectiles(this, dt);
    updateZones(this, dt);
    updateBullets(this, dt);
    updatePickups(this, dt);
    this.effects.update(dt);

    while (this.deferred.length) this.deferred.shift()!();
    this.cleanup();
    this.updateCamera(dt);
  }

  private updateHeroes(dt: number): void {
    for (const hero of this.heroes) {
      const p = hero.entity;
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      p.flash = Math.max(0, p.flash - dt);
      if (!hero.alive) {
        p.moving = false;
        if (hero.downed) this.updateRevive(hero, dt);
        continue;
      }
      const move = hero.move;
      const speed = BALANCE.playerSpeed * hero.stats.get('moveSpeed');
      p.x += move.x * speed * dt;
      p.y += move.y * speed * dt;
      p.moving = Math.abs(move.x) + Math.abs(move.y) > 0.1;
      if (p.moving) {
        const len = Math.hypot(move.x, move.y);
        p.aimX = move.x / len;
        p.aimY = move.y / len;
        if (Math.abs(move.x) > 0.15) p.facing = move.x > 0 ? 1 : -1;
        p.anim += dt;
      } else {
        p.anim = 0;
      }
      const regen = hero.stats.get('regen');
      if (regen > 0) healPlayer(this, hero, regen * dt, false);
    }
    // Coop locale : les joueurs restent dans le cadre de la caméra partagée.
    if (this.setup.sharedCamera && this.multiplayer) {
      const hw = this.viewW / 2 - 12;
      const hh = this.viewH / 2 - 14;
      for (const hero of this.heroes) {
        if (!hero.alive) continue;
        hero.entity.x = Math.max(this.camera.x - hw, Math.min(this.camera.x + hw, hero.entity.x));
        hero.entity.y = Math.max(this.camera.y - hh, Math.min(this.camera.y + hh, hero.entity.y));
      }
    }
    this.run.gemStreakTimer -= dt;
    if (this.run.gemStreakTimer <= 0) this.run.gemStreak = 0;
  }

  /** Un coéquipier proche relève un héros à terre. */
  private updateRevive(hero: Hero, dt: number): void {
    const helper = this.heroes.find((h) => h !== hero && h.alive && dist2(h.x, h.y, hero.x, hero.y) < 24 * 24);
    hero.reviveProgress = helper ? hero.reviveProgress + dt / 2.5 : Math.max(0, hero.reviveProgress - dt * 0.5);
    if (hero.reviveProgress >= 1) this.reviveHero(hero, 0.35, true);
  }

  reviveHero(hero: Hero, hpRatio: number, byTeammate: boolean): void {
    hero.downed = false;
    hero.reviveProgress = 0;
    hero.entity.dead = false;
    hero.entity.hp = hero.maxHp * hpRatio;
    hero.entity.invulnerable = 2;
    this.effects.ring(hero.x, hero.y, 50, '#8fd94f', 0.5);
    this.effects.text(hero.x, hero.y - 16, 'Relevé !', '#8fd94f', 8, 1.2);
    this.audio.play('revive');
    this.events.emit('player:revived', { hero, byTeammate });
  }

  private updateCamera(dt: number): void {
    let tx: number;
    let ty: number;
    if (this.setup.sharedCamera && this.multiplayer) {
      const alive = this.heroes.filter((h) => h.alive);
      const list = alive.length ? alive : this.heroes;
      tx = list.reduce((s, h) => s + h.x, 0) / list.length;
      ty = list.reduce((s, h) => s + h.y, 0) / list.length;
    } else {
      tx = this.localHero.x;
      ty = this.localHero.y;
    }
    this.camera.follow(tx, ty, dt);
  }

  private cleanup(): void {
    compact(this.enemies);
    compact(this.projectiles);
    compact(this.bullets);
    compact(this.zones);
    const before = this.pickups.length;
    compact(this.pickups);
    if (this.pickups.length !== before) {
      let gems = 0;
      for (const p of this.pickups) if (p.kind === 'gem') gems++;
      this.gemCount = gems;
    }
  }

  /** Exécute une action à la fin de la frame (évite de modifier des listes en cours de parcours). */
  defer(fn: () => void): void {
    this.deferred.push(fn);
  }

  // ---------------------------------------------------------------------------
  // Sensations de jeu

  /** Fige brièvement la simulation pour donner du poids à un impact. */
  hitStop(seconds: number, small = false): void {
    if (small) {
      if (this.smallStopCooldown > 0) return;
      this.smallStopCooldown = 0.35;
    }
    this.freeze = Math.max(this.freeze, Math.min(seconds, 0.4));
  }

  /** `broadcast` : faux pour un flash qui ne concerne que le joueur local. */
  screenFlash(color: string, alpha: number, broadcast = true): void {
    if (broadcast) this.onFlash?.(color, alpha);
    const a = this.reduceFlashes ? alpha * 0.25 : alpha;
    if (a < this.flash.a) return;
    const c = rgb(color);
    this.flash.r = c[0];
    this.flash.g = c[1];
    this.flash.b = c[2];
    this.flash.a = a;
  }

  // ---------------------------------------------------------------------------
  // Héros

  /** Héros vivant le plus proche d'un point. */
  nearestHero(x: number, y: number): Hero | null {
    let best: Hero | null = null;
    let bestD = Infinity;
    for (const h of this.heroes) {
      if (!h.alive) continue;
      const d = dist2(x, y, h.x, h.y);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  }

  randomAliveHero(): Hero | null {
    const alive = this.heroes.filter((h) => h.alive);
    return alive.length ? this.rng.pick(alive) : null;
  }

  /** Statistique « de groupe » (la plus élevée parmi les héros). */
  globalStat(stat: StatKey): number {
    let v = -Infinity;
    for (const h of this.heroes) if (!h.left) v = Math.max(v, h.stats.get(stat));
    return Number.isFinite(v) ? v : 1;
  }

  handleHeroDeath(hero: Hero): void {
    const p = hero.entity;
    if (hero.stats.get('revival') > hero.revivalsUsed) {
      hero.revivalsUsed++;
      p.hp = hero.maxHp * 0.5;
      p.invulnerable = 2.5;
      this.effects.text(p.x, p.y - 16, 'Résurrection !', '#ffd84a', 9, 1.6);
      this.effects.ring(p.x, p.y, 140, '#ffd84a', 0.6);
      this.screenFlash('#ffd84a', 0.6);
      this.hitStop(0.3);
      this.audio.play('revive');
      this.defer(() => explode(this, p.x, p.y, 140, 200 * hero.stats.get('might'), { color: '#ffd84a', shake: 6, hero }));
      this.events.emit('player:revived', { hero, byTeammate: false });
      return;
    }
    p.hp = 0;
    this.effects.burst(p.x, p.y, '#e0413c', 40, 90);
    if (this.multiplayer && this.heroes.some((h) => h !== hero && h.alive)) {
      hero.downed = true;
      hero.reviveProgress = 0;
      this.effects.text(p.x, p.y - 16, `${hero.name} est à terre !`, '#e0413c', 8, 1.6);
      this.audio.play('hurt');
      this.events.emit('player:downed', { hero });
      return;
    }
    p.dead = true;
    hero.downed = this.multiplayer;
    this.state = 'dying';
    this.stateTimer = 1.6;
    this.screenFlash('#e0413c', 0.45);
    this.audio.play('death');
  }

  // ---------------------------------------------------------------------------
  // Requêtes spatiales

  /** Ennemis (et objets destructibles) potentiellement dans le cercle. Filtrage exact à faire. */
  queryEnemies(x: number, y: number, radius: number, out: Enemy[] = []): Enemy[] {
    return this.enemyHash.query(x, y, radius + 32, out);
  }

  /** Les `count` ennemis ciblables les plus proches de (x, y), à moins de `maxDist`. */
  nearestEnemies(x: number, y: number, count: number, maxDist: number): Enemy[] {
    const max2 = maxDist * maxDist;
    const list: { e: Enemy; d: number }[] = [];
    for (const e of this.enemies) {
      if (!e.targetable) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d <= max2) list.push({ e, d });
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, count).map((l) => l.e);
  }

  nearestEnemy(x: number, y: number, maxDist: number, exclude?: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist * maxDist;
    for (const e of this.enemies) {
      if (!e.targetable || exclude?.has(e.id)) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Visible sur l'écran local (rendu). */
  isInView(x: number, y: number, margin = 0): boolean {
    return Math.abs(x - this.camera.x) <= this.viewW / 2 + margin && Math.abs(y - this.camera.y) <= this.viewH / 2 + margin;
  }

  /** Dans le champ de vision d'un héros (règles de jeu). */
  isNear(hero: Hero, x: number, y: number, margin = 0): boolean {
    return Math.abs(x - hero.x) <= this.viewW / 2 + margin && Math.abs(y - hero.y) <= this.viewH / 2 + margin;
  }

  /** `count` ennemis visibles d'un héros tirés au hasard (distincts si possible). */
  randomEnemiesNear(hero: Hero, count: number): Enemy[] {
    const visible = this.enemies.filter((e) => e.targetable && this.isNear(hero, e.x, e.y, -8));
    // Tirage partiel : inutile de mélanger 2000 ennemis pour en choisir 3.
    const n = Math.min(count, visible.length);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(this.rng.next() * (visible.length - i));
      [visible[i], visible[j]] = [visible[j], visible[i]];
    }
    visible.length = n;
    return visible;
  }

  // ---------------------------------------------------------------------------
  // Création d'entités

  spawnEnemy(def: EnemyDef, x: number, y: number, elite = false, bossHpMul = 1): Enemy {
    const wave = this.director.wave;
    const m = this.mods;
    const curse = this.globalStat('curse');
    const players = Math.max(1, this.heroes.filter((h) => !h.left).length);
    let scaling;
    if (def.boss) {
      const endless = wave > BALANCE.waveCount ? waveScaling(wave).hp / waveScaling(BALANCE.waveCount).hp : 1;
      scaling = {
        hp: endless * curse * m.bossHp * bossHpMul * (1 + 0.5 * (players - 1)),
        damage: (1 + Math.max(0, wave - BALANCE.waveCount) * 0.05) * m.enemyDamage,
        speed: 1,
        xp: 1,
        scale: 1,
      };
    } else if (def.prop) {
      scaling = { hp: 1, damage: 1, speed: 1, xp: 1, scale: 1 };
    } else {
      const w = waveScaling(wave);
      scaling = { hp: w.hp * curse * m.enemyHp * (1 + 0.3 * (players - 1)), damage: w.damage * m.enemyDamage, speed: w.speed * m.enemySpeed, xp: w.xp, scale: m.enemyScale };
    }
    const enemy = new Enemy(def, x, y, scaling, elite);
    this.enemies.push(enemy);
    return enemy;
  }

  /** Crée un ennemi par identifiant, en appliquant les variantes du biome. */
  spawnEnemyById(id: string, x: number, y: number, elite = false): Enemy {
    return this.spawnEnemy(getEnemy(this.biome.enemySwap[id] ?? id), x, y, elite);
  }

  /** Encerclement ou ruée autour d'un héros. */
  spawnEvent(type: 'ring' | 'burst', enemy: string, count: number): void {
    const hero = this.randomAliveHero();
    if (!hero) return;
    if (type === 'ring') {
      const radius = Math.max(this.viewW, this.viewH) * 0.55;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * TAU;
        this.spawnEnemyById(enemy, hero.x + Math.cos(a) * radius, hero.y + Math.sin(a) * radius);
      }
    } else {
      const pos = this.director.spawnPosition(40);
      for (let k = 0; k < count; k++) this.spawnEnemyById(enemy, pos.x + this.rng.range(-30, 30), pos.y + this.rng.range(-30, 30));
    }
  }

  spawnBoss(def: EnemyDef, hpMul = 1): Enemy {
    const hero = this.randomAliveHero() ?? this.heroes[0];
    const boss = this.spawnEnemy(def, hero.x, hero.y - this.viewH * 0.45, false, hpMul);
    boss.summonTimer = 4;
    boss.specialTimer = 2;
    this.boss = boss;
    this.bossSpawnTime = this.time;
    this.audio.play('boss');
    this.camera.shake(5, 0.8);
    this.events.emit('boss:spawn', { enemy: boss });
    return boss;
  }

  // ---------------------------------------------------------------------------
  // Progression (expérience et or communs à l'équipe)

  addXp(amount: number, hero: Hero | null): void {
    const growth = hero ? hero.stats.get('growth') : 1;
    this.run.xp += amount * growth * this.mods.xp;
    while (this.run.xp >= this.run.xpNext) {
      this.run.xp -= this.run.xpNext;
      this.run.level++;
      this.run.xpNext = xpToNext(this.run.level);
      for (const h of this.heroes) {
        if (h.left) continue;
        this.uiQueue.push({ type: 'levelup', hero: h.index });
        this.effects.ring(h.x, h.y, 50, '#6fe3f0', 0.5);
        this.effects.burst(h.x, h.y, '#6fe3f0', 16, 70);
      }
      this.events.emit('player:levelup', { level: this.run.level });
    }
  }

  /** Ajoute de l'or (avidité du héros et bonus de la partie compris) ; renvoie la quantité gagnée. */
  addGold(amount: number, hero: Hero | null): number {
    const greed = hero ? hero.stats.get('greed') : this.globalStat('greed');
    const gained = Math.round(amount * greed * this.mods.gold);
    this.run.gold += gained;
    return gained;
  }

  /** Propose une relique à chaque héros ; la partie reprend quand tous ont choisi. */
  grantRelicChoice(): void {
    for (const h of this.heroes) {
      if (h.left) continue;
      this.uiQueue.push({ type: 'relic', hero: h.index });
      this.pendingRelics++;
    }
    if (this.pendingRelics === 0) this.relicResolved();
  }

  /** Appelé quand un héros a choisi (ou passé) sa relique. */
  relicResolved(): void {
    this.pendingRelics = Math.max(0, this.pendingRelics - 1);
    if (this.pendingRelics > 0) return;
    const heal = BALANCE.waveHeal * this.mods.waveHeal;
    for (const h of this.heroes) {
      if (h.downed && !h.left) this.reviveHero(h, 0.3, false);
      else if (heal > 0 && h.alive && this.director.mode === 'waves') healPlayer(this, h, h.maxHp * heal);
    }
    this.director.resume();
  }

  onBossPhase(enemy: Enemy, phase: number): void {
    enemy.invulnerable = 1.2;
    if (phase >= 2) enemy.enraged = true;
    this.hitStop(0.22);
    this.camera.shake(7, 0.5);
    this.screenFlash('#ffffff', 0.35);
    this.effects.ring(enemy.x, enemy.y, 110, '#e0413c', 0.6, true);
    this.effects.burst(enemy.x, enemy.y, '#e0413c', 30, 120);
    this.audio.play('boss');
    this.events.emit('boss:phase', { enemy, phase });
  }

  onBossDefeated(enemy: Enemy): void {
    if (this.boss === enemy) this.boss = null;
    const fightTime = this.time - this.bossSpawnTime;
    this.run.bossKills.push(enemy.def.id);
    this.run.fastestBossKill = Math.min(this.run.fastestBossKill, fightTime);
    this.camera.shake(10, 0.8);
    this.hitStop(0.35);
    this.screenFlash('#ffffff', 0.7);
    // Séquence d'explosions finale.
    for (let i = 0; i < 6; i++) {
      this.effects.delay(0.12 + i * 0.13, () => {
        const ox = (Math.random() - 0.5) * 50;
        const oy = (Math.random() - 0.5) * 40;
        this.effects.ring(enemy.x + ox, enemy.y + oy, 40 + i * 6, i % 2 ? '#ffd84a' : '#e0413c', 0.4, true);
        this.effects.burst(enemy.x + ox, enemy.y + oy, '#ffd84a', 14, 110);
        this.audio.play('explosion', { volume: 0.6, pitch: 0.8 + i * 0.08 });
      });
    }
    this.effects.ring(enemy.x, enemy.y, 150, '#ffd84a', 0.9);
    this.director.onBossDefeated(enemy);
    this.events.emit('boss:defeated', { enemy, fightTime });
  }

  /** Mode Manches : appelé quand la manche est terminée et nettoyée. */
  onWaveCleared(): void {
    if (this.director.wave === BALANCE.waveCount && !this.run.endless) {
      this.run.victory = true;
      this.uiQueue.push({ type: 'victory' });
    } else {
      this.grantRelicChoice();
    }
  }

  /** Après la victoire : continuer sans fin. */
  continueEndless(): void {
    this.run.endless = true;
    if (this.director.mode === 'waves') this.grantRelicChoice();
    else this.director.resume();
  }
}
