// Regroupe en un seul objet tous les ajustements d'une partie : biome, niveau de danger et modificateurs.
import type { BiomeDef } from '../data/biomes';
import type { DangerDef } from '../data/danger';
import type { MutatorDef } from '../data/mutators';
import type { StatMod } from '../data/types';

export interface RunModifiers {
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  enemyScale: number;
  spawnRate: number;
  eliteExtra: number;
  bossHp: number;
  waveHeal: number;
  gold: number;
  xp: number;
  shootRate: number;
  lightRadius: number;
  playerMods: StatMod[];
  /** Effets spéciaux nommés (ex. « vampirism »). */
  flags: Set<string>;
}

export function buildModifiers(biome: BiomeDef, danger: DangerDef, mutators: MutatorDef[]): RunModifiers {
  const m: RunModifiers = {
    enemyHp: biome.enemyHp * danger.enemyHp,
    enemyDamage: danger.enemyDamage,
    enemySpeed: danger.enemySpeed,
    enemyScale: 1,
    spawnRate: 1,
    eliteExtra: danger.eliteExtra,
    bossHp: danger.bossHp * (biome.enemyHp > 1 ? 1 + (biome.enemyHp - 1) * 0.5 : 1),
    waveHeal: danger.waveHeal,
    gold: biome.gold * danger.gold,
    xp: 1,
    shootRate: 1,
    lightRadius: 1,
    playerMods: [],
    flags: new Set(),
  };
  for (const mut of mutators) {
    m.enemyHp *= mut.enemyHp ?? 1;
    m.enemyDamage *= mut.enemyDamage ?? 1;
    m.enemySpeed *= mut.enemySpeed ?? 1;
    m.enemyScale *= mut.enemyScale ?? 1;
    m.spawnRate *= mut.spawnRate ?? 1;
    m.shootRate *= mut.shootRate ?? 1;
    m.gold *= mut.gold ?? 1;
    m.xp *= mut.xp ?? 1;
    m.lightRadius *= mut.lightRadius ?? 1;
    if (mut.waveHeal !== undefined) m.waveHeal *= mut.waveHeal;
    if (mut.playerMods) m.playerMods.push(...mut.playerMods);
    m.flags.add(mut.id);
  }
  return m;
}
