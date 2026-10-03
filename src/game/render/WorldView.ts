// Ce que le rendu et le HUD ont besoin de connaître d'une partie.
// La simulation locale (World) et la copie reçue du réseau (ClientWorld) fournissent toutes deux ces données :
// le même code de rendu sert donc en solo, en coop locale et en ligne.
import type { BiomeDef } from '../../data/biomes';
import type { Camera } from '../../engine/Camera';
import type { Enemy } from '../entities/Enemy';
import type { EnemyBullet, Projectile } from '../entities/Projectile';
import type { PickupKind } from '../entities/Pickup';
import type { Zone } from '../entities/Zone';
import type { Effects } from '../systems/Effects';
import type { DirectorHud } from '../systems/Director';
import type { AuraVisual } from '../weapons/Weapon';

export type EnemyView = Pick<
  Enemy,
  'id' | 'def' | 'x' | 'y' | 'anim' | 'flash' | 'hitPulse' | 'state' | 'facing' | 'elite' | 'enraged' | 'spawnFade' | 'invulnerable' | 'scale' | 'dead' | 'hp' | 'maxHp' | 'isProp' | 'isBoss' | 'radius'
>;

export type ProjectileView = Pick<
  Projectile,
  'sprite' | 'x' | 'y' | 'rotation' | 'scale' | 'alpha' | 'flip' | 'frameRate' | 'age' | 'life' | 'motion' | 'lobFromX' | 'lobFromY' | 'lobToX' | 'lobToY' | 'dead'
>;

export type BulletView = Pick<EnemyBullet, 'x' | 'y' | 'age' | 'color'>;

export interface PickupView {
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
  attracted: boolean;
  age: number;
  readonly sprite: string;
}

export type ZoneView = Pick<Zone, 'x' | 'y' | 'radius' | 'age' | 'life' | 'flames'>;

export interface HeroView {
  index: number;
  name: string;
  color: string;
  sprite: string;
  x: number;
  y: number;
  facing: 1 | -1;
  moving: boolean;
  anim: number;
  invulnerable: number;
  flash: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  downed: boolean;
  reviveProgress: number;
  auras: AuraVisual[];
}

export interface WorldView {
  readonly biome: BiomeDef;
  readonly camera: Camera;
  readonly time: number;
  viewW: number;
  viewH: number;
  readonly flash: { r: number; g: number; b: number; a: number };
  readonly lightRadius: number;
  readonly effects: Effects;
  readonly enemies: readonly EnemyView[];
  readonly projectiles: readonly ProjectileView[];
  readonly bullets: readonly BulletView[];
  readonly pickups: readonly PickupView[];
  readonly zones: readonly ZoneView[];
  readonly boss: EnemyView | null;
  readonly heroViews: HeroView[];
  readonly localHeroIndex: number;
  readonly multiplayer: boolean;
  isInView(x: number, y: number, margin?: number): boolean;
}

export interface HudSlot {
  icon: string;
  level: string;
  evolved: boolean;
  max: boolean;
}

export interface HudParty {
  name: string;
  color: string;
  sprite: string;
  hp: number;
  maxHp: number;
  downed: boolean;
  level: number;
}

/** Données affichées par le HUD. */
export interface HudData {
  director: DirectorHud;
  level: number;
  xpRatio: number;
  kills: number;
  gold: number;
  hp: number;
  maxHp: number;
  weapons: HudSlot[];
  passives: HudSlot[];
  party: HudParty[];
  boss: { name: string; hp: number; maxHp: number; phase: number; phases: number[] } | null;
}
