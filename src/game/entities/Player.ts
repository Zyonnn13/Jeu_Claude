import { BALANCE } from '../../data/balance';
import type { CharacterDef } from '../../data/types';

export class Player {
  x = 0;
  y = 0;
  hp = 100;
  radius = BALANCE.playerRadius;
  facing: 1 | -1 = 1;
  /** Dernière direction de déplacement non nulle (pour les dagues). */
  aimX = 1;
  aimY = 0;
  moving = false;
  anim = 0;
  invulnerable = 0;
  flash = 0;
  regenBuffer = 0;
  dead = false;

  constructor(readonly character: CharacterDef) {}

  get sprite(): string {
    return this.character.sprite;
  }
}
