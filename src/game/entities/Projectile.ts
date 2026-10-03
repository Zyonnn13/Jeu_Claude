import type { Enemy } from './Enemy';
import type { Hero } from '../Hero';
import type { World } from '../World';

let nextUid = 1;
export const newUid = () => nextUid++;

export type ProjectileMotion = 'linear' | 'homing' | 'gravity' | 'boomerang' | 'orbit' | 'attached' | 'lob';

/**
 * Projectile générique des armes du joueur. Son comportement est paramétré
 * par `motion` et quelques champs ; les armes les configurent à la création.
 */
export class Projectile {
  readonly uid = newUid();
  /** Héros qui a tiré ce projectile. */
  owner!: Hero;
  /** Clé utilisée pour le délai entre deux touches sur un même ennemi. */
  hitKey: number = this.uid;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  rotation = 0;
  spin = 0;
  faceVelocity = false;
  sprite = 'bolt';
  frameRate = 0;
  scale = 1;
  alpha = 1;
  fadeOut = false;
  flip = false;

  /** Rayon de collision (cercle) ; si halfW > 0, la collision est rectangulaire. */
  radius = 4;
  halfW = 0;
  halfH = 0;

  damage = 0;
  knockback = 0;
  /** Nombre d'ennemis qu'il peut encore toucher. */
  pierce = 1;
  /** 0 : chaque ennemi n'est touché qu'une fois. Sinon délai (s) entre deux touches. */
  hitInterval = 0;
  hitSet = new Set<number>();

  age = 0;
  life = 1;
  dead = false;
  motion: ProjectileMotion = 'linear';

  // Paramètres de mouvement
  speed = 0;
  gravity = 0;
  target: Enemy | null = null;
  turnRate = 6;
  orbitAngle = 0;
  orbitRadius = 0;
  orbitSpeed = 0;
  offsetX = 0;
  offsetY = 0;
  outTime = 0.5;
  returning = false;
  lobFromX = 0;
  lobFromY = 0;
  lobToX = 0;
  lobToY = 0;

  onHit?: (p: Projectile, enemy: Enemy, world: World, dealt: number) => void;
  onExpire?: (p: Projectile, world: World) => void;
}

export class EnemyBullet {
  readonly id = newUid();
  dead = false;
  age = 0;
  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public damage: number,
    public color = '#f0408a',
    public radius = 3,
    public life = 6,
  ) {}
}
