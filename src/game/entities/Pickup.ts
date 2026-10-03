export type PickupKind = 'gem' | 'coin' | 'bag' | 'chicken' | 'magnet' | 'bomb' | 'chest';

let nextPickupId = 1;

export class Pickup {
  readonly id = nextPickupId++;
  /** Indice du héros qui attire cet objet (-1 : aucun). */
  target = -1;
  dead = false;
  attracted = false;
  speed = 0;
  age = 0;
  vx = 0;
  vy = 0;

  constructor(
    readonly kind: PickupKind,
    public x: number,
    public y: number,
    public value = 1,
  ) {}

  /** Les coffres doivent être touchés ; le reste est attiré par l'aimant. */
  get magnetic(): boolean {
    return this.kind !== 'chest';
  }

  get sprite(): string {
    switch (this.kind) {
      case 'gem':
        return this.value >= 100 ? 'gem_purple' : this.value >= 25 ? 'gem_red' : this.value >= 5 ? 'gem_green' : 'gem_blue';
      case 'coin':
      case 'bag':
        return 'coin';
      default:
        return this.kind;
    }
  }
}
