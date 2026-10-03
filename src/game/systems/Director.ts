// Interface commune des « directeurs » de partie : ils décident quand et où apparaissent les ennemis.
import type { Enemy } from '../entities/Enemy';
import type { World } from '../World';

export type GameMode = 'waves' | 'survival';
export type WavePhase = 'intro' | 'active' | 'clearing' | 'waiting';

export interface DirectorHud {
  title: string;
  timer: string;
  /** Sous-titre (prochaine étape...). */
  hint: string;
  boss: boolean;
  urgent: boolean;
}

export interface Director {
  readonly mode: GameMode;
  /** Niveau de difficulté courant (numéro de manche, ou équivalent en mode Survie). */
  wave: number;
  phase: WavePhase;
  readonly isBossWave: boolean;
  update(dt: number): void;
  /** Position aléatoire juste hors de l'écran d'un héros. */
  spawnPosition(margin?: number): { x: number; y: number };
  onBossDefeated(enemy: Enemy): void;
  /** Reprise après les choix de reliques. */
  resume(): void;
  hud(): DirectorHud;
  /** Raccourci de test : termine l'étape en cours. */
  debugSkip(): void;
}

/** Facteur de difficulté selon le nombre de joueurs. */
export function playerScale(world: World): { spawn: number; alive: number } {
  const n = Math.max(1, world.heroes.filter((h) => !h.left).length);
  return { spawn: 1 + 0.6 * (n - 1), alive: 1 + 0.5 * (n - 1) };
}

/** Position aléatoire juste en dehors de la vue d'un héros vivant. */
export function spawnAroundHero(world: World, margin = 14): { x: number; y: number } {
  const hero = world.randomAliveHero();
  const cx = hero ? hero.x : world.camera.x;
  const cy = hero ? hero.y : world.camera.y;
  const hw = world.viewW / 2 + margin;
  const hh = world.viewH / 2 + margin;
  const perimeter = 4 * (hw + hh);
  let r = world.rng.next() * perimeter;
  if (r < 2 * hw) return { x: cx - hw + r, y: cy - hh };
  r -= 2 * hw;
  if (r < 2 * hw) return { x: cx - hw + r, y: cy + hh };
  r -= 2 * hw;
  if (r < 2 * hh) return { x: cx - hw, y: cy - hh + r };
  r -= 2 * hh;
  return { x: cx + hw, y: cy - hh + r };
}
