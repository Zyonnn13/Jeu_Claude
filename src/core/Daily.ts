// Défi du jour : héros, carte, danger et modificateurs tirés d'une graine liée à la date.
import { BIOME_LIST } from '../data/biomes';
import { CHARACTER_LIST } from '../data/characters';
import { MUTATORS } from '../data/mutators';
import { Rng } from '../engine/Rng';

export interface DailyChallenge {
  date: string;
  seed: number;
  character: string;
  biome: string;
  danger: number;
  mutators: string[];
}

/** Date locale au format AAAA-MM-JJ. */
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyChallenge(date = dateKey()): DailyChallenge {
  const seed = hashString(`nuit-eternelle:${date}`);
  const rng = new Rng(seed);
  const character = rng.pick(CHARACTER_LIST).id;
  const biome = rng.pick(BIOME_LIST).id;
  const danger = rng.int(1, 3);
  const pool = [...MUTATORS];
  rng.shuffle(pool);
  return { date, seed, character, biome, danger, mutators: pool.slice(0, 2).map((m) => m.id) };
}
