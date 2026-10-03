// Copie de la partie chez un joueur en ligne : reconstruite à partir des images d'état envoyées par l'hôte,
// lissée entre deux images, avec prédiction locale du déplacement de son propre héros.
import { BALANCE } from '../data/balance';
import { getBiome, type BiomeDef } from '../data/biomes';
import { CHARACTERS } from '../data/characters';
import { getEnemy } from '../data/enemies';
import type { CharacterDef, EnemyDef } from '../data/types';
import type { AudioManager, SfxName } from '../engine/Audio';
import { Camera } from '../engine/Camera';
import { rgb } from '../engine/color';
import type { Vec2 } from '../engine/math';
import type { PickupKind } from '../game/entities/Pickup';
import { HERO_COLORS } from '../game/Hero';
import type { BulletView, EnemyView, HeroView, HudData, PickupView, ProjectileView, WorldView, ZoneView } from '../game/render/WorldView';
import { Effects } from '../game/systems/Effects';
import type { ProjectileMotion } from '../game/entities/Projectile';
import { AURA_COLORS, colorFromIndex, ENEMY_IDS, PICKUP_KINDS, readSnapshotHeader, SNAPSHOT_RATE, SPRITE_NAMES, type FxEvent, type StartInfo } from './Protocol';

const GEM_SPRITE = (v: number) => (v >= 100 ? 'gem_purple' : v >= 25 ? 'gem_red' : v >= 5 ? 'gem_green' : 'gem_blue');

interface Smoothed {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

class ClientEnemy implements EnemyView {
  def: EnemyDef;
  x = 0;
  y = 0;
  anim = 0;
  flash = 0;
  hitPulse = 0;
  state = 0;
  facing: 1 | -1 = 1;
  elite = false;
  enraged = false;
  spawnFade = 1;
  invulnerable = 0;
  scale = 1;
  dead = false;
  hp = 1;
  maxHp = 255;
  radius = 6;
  s: Smoothed = { fromX: 0, fromY: 0, toX: 0, toY: 0 };
  constructor(
    readonly id: number,
    type: number,
  ) {
    this.def = getEnemy(ENEMY_IDS[type] ?? 'bat');
    this.radius = this.def.radius;
  }
  get isProp(): boolean {
    return !!this.def.prop;
  }
  get isBoss(): boolean {
    return !!this.def.boss;
  }
}

interface ClientProjectile extends ProjectileView {
  s: Smoothed;
}

interface ClientPickup extends PickupView {
  s: Smoothed;
}

export class ClientWorld implements WorldView {
  readonly biome: BiomeDef;
  readonly camera = new Camera();
  readonly effects = new Effects();
  readonly flash = { r: 1, g: 1, b: 1, a: 0 };
  time = 0;
  viewW = 640;
  viewH = 360;
  lightRadius = 1;
  enemies: ClientEnemy[] = [];
  projectiles: ClientProjectile[] = [];
  bullets: BulletView[] = [];
  pickups: ClientPickup[] = [];
  zones: ZoneView[] = [];
  boss: ClientEnemy | null = null;
  heroViews: HeroView[] = [];
  readonly multiplayer = true;
  hud: HudData | null = null;

  private heroSmooth: Smoothed[] = [];
  private sinceSnapshot = 0;
  private enemyMap = new Map<number, ClientEnemy>();
  private projMap = new Map<number, ClientProjectile>();
  private pickupMap = new Map<number, ClientPickup>();
  private zoneMap = new Map<number, ZoneView & { id: number }>();
  private readonly heroInfo: { name: string; color: string; sprite: string }[];

  // Prédiction locale
  private inputs: { seq: number; x: number; y: number; dt: number }[] = [];
  private seq = 0;
  private serverX = 0;
  private serverY = 0;
  private predX = 0;
  private predY = 0;
  private speed: number = BALANCE.playerSpeed;
  private localAnim = 0;
  private localFacing: 1 | -1 = 1;
  private localMoving = false;

  constructor(
    info: StartInfo,
    readonly localHeroIndex: number,
    private readonly audio: AudioManager,
  ) {
    this.biome = getBiome(info.biome);
    this.heroInfo = info.heroes.map((h, i) => ({
      name: h.name,
      color: HERO_COLORS[i % HERO_COLORS.length],
      sprite: (CHARACTERS as Record<string, CharacterDef>)[h.character]?.sprite ?? 'knight',
    }));
  }

  isInView(x: number, y: number, margin = 0): boolean {
    return Math.abs(x - this.camera.x) <= this.viewW / 2 + margin && Math.abs(y - this.camera.y) <= this.viewH / 2 + margin;
  }

  /** Enregistre la commande de déplacement de cette image et renvoie le message à envoyer. */
  pushInput(move: Vec2, dt: number): { s: number; x: number; y: number } {
    const seq = ++this.seq;
    this.inputs.push({ seq, x: move.x, y: move.y, dt });
    if (this.inputs.length > 240) this.inputs.shift();
    this.predX += move.x * this.speed * dt;
    this.predY += move.y * this.speed * dt;
    this.localMoving = Math.abs(move.x) + Math.abs(move.y) > 0.1;
    if (this.localMoving) {
      this.localAnim += dt;
      if (Math.abs(move.x) > 0.15) this.localFacing = move.x > 0 ? 1 : -1;
    } else this.localAnim = 0;
    return { s: seq, x: Math.round(move.x * 1000) / 1000, y: Math.round(move.y * 1000) / 1000 };
  }

  applySnapshot(buf: ArrayBuffer): void {
    const { header, reader: r } = readSnapshotHeader(buf);
    this.time = header.time;
    this.hud = header.hud;
    this.speed = header.speed;
    this.lightRadius = header.lightRadius;
    this.sinceSnapshot = 0;

    // Héros
    const heroCount = r.u8();
    const views: HeroView[] = [];
    for (let i = 0; i < heroCount; i++) {
      const index = r.u8();
      const x = r.f32();
      const y = r.f32();
      const facing = (r.i8() < 0 ? -1 : 1) as 1 | -1;
      const flags = r.u8();
      const anim = r.u16() / 100;
      const invulnerable = r.u8() / 50;
      const flash = r.u8() / 255;
      const hp = r.f32();
      const maxHp = r.f32();
      const reviveProgress = r.u8() / 255;
      const auraCount = r.u8();
      const auras = [];
      for (let a = 0; a < auraCount; a++) auras.push({ radius: r.f32(), color: AURA_COLORS[r.u8()] ?? AURA_COLORS[0], pulse: r.u8() / 255 });
      const info = this.heroInfo[index] ?? { name: '?', color: '#fff', sprite: 'knight' };
      const prev = this.heroSmooth[index];
      const sm = prev ? { fromX: this.heroViews[index]?.x ?? x, fromY: this.heroViews[index]?.y ?? y, toX: x, toY: y } : { fromX: x, fromY: y, toX: x, toY: y };
      this.heroSmooth[index] = sm;
      views[index] = { index, name: info.name, color: info.color, sprite: info.sprite, x: sm.fromX, y: sm.fromY, facing, moving: (flags & 1) !== 0, anim, invulnerable, flash, hp, maxHp, dead: (flags & 2) !== 0, downed: (flags & 4) !== 0, reviveProgress, auras };
      if (index === this.localHeroIndex) {
        this.serverX = x;
        this.serverY = y;
      }
    }
    this.heroViews = views;
    // Réconciliation : position serveur + commandes pas encore prises en compte par l'hôte.
    this.inputs = this.inputs.filter((inp) => inp.seq > header.ack);
    let px = this.serverX;
    let py = this.serverY;
    for (const inp of this.inputs) {
      px += inp.x * this.speed * inp.dt;
      py += inp.y * this.speed * inp.dt;
    }
    if (Math.hypot(px - this.predX, py - this.predY) > 60) {
      this.predX = px;
      this.predY = py;
    } else {
      this.predX += (px - this.predX) * 0.35;
      this.predY += (py - this.predY) * 0.35;
    }

    // Ennemis
    const seen = new Set<number>();
    const enemyCount = r.u16();
    const enemies: ClientEnemy[] = [];
    for (let i = 0; i < enemyCount; i++) {
      const id = r.u32();
      const type = r.u8();
      const x = r.f32();
      const y = r.f32();
      const flags = r.u8();
      const anim = r.u16() / 100;
      const hitPulse = r.u8() / 255;
      const spawnFade = r.u8() / 255;
      const scale = r.u16() / 100;
      const hpRatio = r.u8();
      let e = this.enemyMap.get(id);
      if (!e) {
        e = new ClientEnemy(id, type);
        e.x = x;
        e.y = y;
        e.s = { fromX: x, fromY: y, toX: x, toY: y };
        this.enemyMap.set(id, e);
      } else {
        e.s = { fromX: e.x, fromY: e.y, toX: x, toY: y };
      }
      e.facing = flags & 1 ? -1 : 1;
      e.elite = (flags & 2) !== 0;
      e.enraged = (flags & 4) !== 0;
      e.state = flags & 8 ? 1 : flags & 16 ? 3 : 0;
      e.invulnerable = flags & 32 ? 1 : 0;
      e.flash = flags & 64 ? 0.1 : 0;
      e.anim = anim;
      e.hitPulse = hitPulse;
      e.spawnFade = spawnFade;
      e.scale = scale;
      e.radius = e.def.radius * (e.elite ? 1.6 : 1);
      e.hp = hpRatio;
      seen.add(id);
      enemies.push(e);
    }
    for (const id of this.enemyMap.keys()) if (!seen.has(id)) this.enemyMap.delete(id);
    this.enemies = enemies;
    this.boss = header.boss !== null ? (this.enemyMap.get(header.boss) ?? null) : null;

    // Projectiles
    const projSeen = new Set<number>();
    const projCount = r.u16();
    const projs: ClientProjectile[] = [];
    for (let i = 0; i < projCount; i++) {
      const id = r.u32();
      const sprite = SPRITE_NAMES[r.u8()] ?? 'bolt';
      const x = r.f32();
      const y = r.f32();
      const rotation = r.f32();
      const flags = r.u8();
      const scale = r.u16() / 100;
      const alpha = r.u8() / 255;
      const age = r.u16() / 100;
      const frameRate = r.u8();
      let lob = { fromX: 0, fromY: 0, toX: 0, toY: 0, life: 1 };
      if (flags & 2) lob = { fromX: r.f32(), fromY: r.f32(), toX: r.f32(), toY: r.f32(), life: r.u16() / 100 };
      let p = this.projMap.get(id);
      if (!p) {
        p = {
          sprite, x, y, rotation, scale, alpha, flip: false, frameRate, age, life: lob.life, motion: 'linear' as ProjectileMotion,
          lobFromX: 0, lobFromY: 0, lobToX: 0, lobToY: 0, dead: false, s: { fromX: x, fromY: y, toX: x, toY: y },
        };
        this.projMap.set(id, p);
      } else {
        p.s = { fromX: p.x, fromY: p.y, toX: x, toY: y };
      }
      Object.assign(p, { sprite, rotation, scale, alpha, frameRate, age, flip: (flags & 1) !== 0, motion: flags & 2 ? 'lob' : 'linear', lobFromX: lob.fromX, lobFromY: lob.fromY, lobToX: lob.toX, lobToY: lob.toY, life: lob.life });
      projSeen.add(id);
      projs.push(p);
    }
    for (const id of this.projMap.keys()) if (!projSeen.has(id)) this.projMap.delete(id);
    this.projectiles = projs;

    // Tirs ennemis (mouvement rectiligne : pas besoin de lissage)
    const bulletCount = r.u16();
    const bullets: BulletView[] = [];
    for (let i = 0; i < bulletCount; i++) {
      r.u32();
      bullets.push({ x: r.f32(), y: r.f32(), color: colorFromIndex(r.u8()), age: r.u16() / 100 });
    }
    this.bullets = bullets;

    // Objets
    const pickSeen = new Set<number>();
    const pickupCount = r.u16();
    const pickups: ClientPickup[] = [];
    for (let i = 0; i < pickupCount; i++) {
      const id = r.u32();
      const kind = PICKUP_KINDS[r.u8()] ?? ('gem' as PickupKind);
      const x = r.f32();
      const y = r.f32();
      const value = r.u16();
      const attracted = r.u8() === 1;
      const age = r.u16() / 100;
      let p = this.pickupMap.get(id);
      const sprite = kind === 'gem' ? GEM_SPRITE(value) : kind === 'bag' || kind === 'coin' ? 'coin' : kind;
      if (!p) {
        p = { kind, x, y, value, attracted, age, sprite, s: { fromX: x, fromY: y, toX: x, toY: y } };
        this.pickupMap.set(id, p);
      } else {
        p.s = { fromX: p.x, fromY: p.y, toX: x, toY: y };
        Object.assign(p, { value, attracted, age, sprite });
      }
      pickSeen.add(id);
      pickups.push(p);
    }
    for (const id of this.pickupMap.keys()) if (!pickSeen.has(id)) this.pickupMap.delete(id);
    this.pickups = pickups;

    // Zones
    const zoneSeen = new Set<number>();
    const zoneCount = r.u16();
    const zones: ZoneView[] = [];
    for (let i = 0; i < zoneCount; i++) {
      const id = r.u32();
      const x = r.f32();
      const y = r.f32();
      const radius = r.f32();
      const age = r.u16() / 100;
      const life = r.u16() / 100;
      let z = this.zoneMap.get(id);
      if (!z) {
        const flames: ZoneView['flames'] = [];
        const count = Math.max(3, Math.round((radius * radius) / 90));
        for (let k = 0; k < count; k++) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * radius * 0.8;
          flames.push({ dx: Math.cos(a) * rr, dy: Math.sin(a) * rr * 0.7, phase: Math.random() * 10, scale: 0.7 + Math.random() * 0.5 });
        }
        flames.sort((a, b) => a.dy - b.dy);
        z = { id, x, y, radius, age, life, flames };
        this.zoneMap.set(id, z);
      }
      z.age = age;
      z.life = life;
      zoneSeen.add(id);
      zones.push(z);
    }
    for (const id of this.zoneMap.keys()) if (!zoneSeen.has(id)) this.zoneMap.delete(id);
    this.zones = zones;

    for (const ev of header.fx) this.playFx(ev);
  }

  /** Rejoue un effet visuel ou sonore reçu de l'hôte. */
  private playFx(ev: FxEvent): void {
    const fx = this.effects;
    const n = (i: number) => Number(ev[i]);
    const str = (i: number) => String(ev[i]);
    switch (ev[0]) {
      case 'burst':
        fx.burst(n(1), n(2), str(3), n(4), n(5), { size: n(6), life: n(7), gravity: n(8) });
        break;
      case 'dmg':
        fx.damageNumber(n(1), n(2), n(3), ev[4] === true);
        break;
      case 'text':
        fx.text(n(1), n(2), str(3), str(4), n(5), n(6));
        break;
      case 'spark':
        fx.spark(n(1), n(2), str(3), n(4));
        break;
      case 'corpse':
        fx.corpse(str(1), n(2), n(3), n(4), ev[5] === true, n(6), n(7), n(8), ev[9] ? str(9) : undefined, n(10));
        break;
      case 'bolt':
        fx.lightning(n(1), n(2), ev[3] === null ? undefined : n(3), ev[4] === null ? undefined : n(4), str(5));
        break;
      case 'ring':
        fx.ring(n(1), n(2), n(3), str(4), n(5), ev[6] === true);
        break;
      case 'sfx':
        this.audio.play(str(1) as SfxName, { pitch: n(2), volume: n(3) });
        break;
      case 'shake':
        this.camera.shake(n(1), n(2));
        break;
      case 'flash': {
        const c = rgb(str(1));
        if (n(2) >= this.flash.a) Object.assign(this.flash, { r: c[0], g: c[1], b: c[2], a: n(2) });
        break;
      }
    }
  }

  /** Avance l'affichage (lissage entre deux images d'état, effets, caméra). */
  update(dt: number): void {
    this.sinceSnapshot += dt;
    const t = Math.min(1, this.sinceSnapshot * SNAPSHOT_RATE);
    const lerp = (s: Smoothed, o: { x: number; y: number }) => {
      o.x = s.fromX + (s.toX - s.fromX) * t;
      o.y = s.fromY + (s.toY - s.fromY) * t;
    };
    for (const e of this.enemies) {
      lerp(e.s, e);
      e.anim += dt;
    }
    for (const p of this.projectiles) {
      lerp(p.s, p);
      p.age += dt;
    }
    for (const p of this.pickups) lerp(p.s, p);
    for (const z of this.zones) z.age += dt;
    for (const b of this.bullets) b.age += dt;
    this.heroViews.forEach((h, i) => {
      const s = this.heroSmooth[i];
      if (!h || !s) return;
      if (i === this.localHeroIndex && !h.dead && !h.downed) {
        // Notre héros : position prédite (réponse immédiate aux commandes).
        h.x = this.predX;
        h.y = this.predY;
        h.facing = this.localFacing;
        h.moving = this.localMoving;
        h.anim = this.localAnim;
      } else {
        lerp(s, h);
      }
    });
    this.effects.update(dt);
    this.flash.a = Math.max(0, this.flash.a - dt * 2.5);
    const me = this.heroViews[this.localHeroIndex];
    if (me) this.camera.follow(me.x, me.y, dt);
  }

  /** Repositionne la prédiction (début de partie). */
  resetPrediction(x: number, y: number): void {
    this.predX = this.serverX = x;
    this.predY = this.serverY = y;
    this.camera.follow(x, y, 0, true);
  }
}
