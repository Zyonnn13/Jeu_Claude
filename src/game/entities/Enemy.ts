import type { EnemyDef } from '../../data/types';
import type { Hero } from '../Hero';

let nextId = 1;

export interface EnemyScaling {
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  scale?: number;
}

export class Enemy {
  readonly id = nextId++;
  x: number;
  y: number;
  /** Vitesse de recul (knockback), amortie chaque frame. */
  vx = 0;
  vy = 0;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  xp: number;
  radius: number;
  scale: number;
  elite = false;
  dead = false;
  flash = 0;
  anim = Math.random() * 10;
  facing: 1 | -1 = 1;
  spawnFade = 0;
  /** Moment (temps du monde) à partir duquel une source donnée peut de nouveau toucher cet ennemi. */
  hitCooldowns = new Map<number, number>();

  // État libre utilisé par les comportements (IA).
  state = 0;
  stateTimer = 0;
  shootTimer: number;
  dirX = 0;
  dirY = 0;
  wobble = Math.random() * Math.PI * 2;
  summonTimer = 0;
  enraged = false;
  thresholds = 0;
  /** Phase de combat d'un boss (1, 2, 3...). */
  phase = 1;
  /** Temps restant d'invulnérabilité (changement de phase, forme de brume...). */
  invulnerable = 0;
  /** Impulsion visuelle quand l'ennemi est touché (écrasement du sprite). */
  hitPulse = 0;
  /** Direction du dernier coup reçu (pour projeter le cadavre). */
  lastDirX = 0;
  lastDirY = -1;
  /** Héros responsable du dernier coup (attribution des éliminations). */
  lastHitBy: Hero | null = null;
  patternTimer = 0;
  specialTimer = 0;

  constructor(
    readonly def: EnemyDef,
    x: number,
    y: number,
    scaling: EnemyScaling,
    elite = false,
  ) {
    this.x = x;
    this.y = y;
    this.elite = elite;
    const eliteHp = elite ? 12 : 1;
    this.maxHp = this.hp = Math.round(def.hp * scaling.hp * eliteHp);
    this.damage = Math.round(def.damage * scaling.damage * (elite ? 1.5 : 1));
    this.speed = def.speed * scaling.speed * (elite ? 1.1 : 1);
    this.xp = Math.max(def.prop ? 0 : 1, Math.round(def.xp * scaling.xp * (elite ? 12 : 1)));
    const extraScale = scaling.scale ?? 1;
    this.scale = (def.scale ?? 1) * (elite ? 1.6 : 1) * extraScale;
    this.radius = def.radius * (elite ? 1.6 : 1) * extraScale;
    this.shootTimer = (def.shoot?.cooldown ?? 2) * (0.5 + Math.random() * 0.5);
    this.stateTimer = 1 + Math.random() * 2;
  }

  get isBoss(): boolean {
    return !!this.def.boss;
  }

  get isProp(): boolean {
    return !!this.def.prop;
  }

  /** Les objets du décor ne sont pas des cibles pour les armes à visée automatique. */
  get targetable(): boolean {
    return !this.dead && !this.def.prop;
  }
}
