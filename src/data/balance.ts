// Constantes d'équilibrage globales.
import type { StatKey } from './types';

export const BASE_STATS: Record<StatKey, number> = {
  maxHp: 100,
  regen: 0,
  armor: 0,
  moveSpeed: 1,
  might: 1,
  area: 1,
  cooldown: 1,
  projectileSpeed: 1,
  duration: 1,
  amount: 0,
  magnet: 1,
  luck: 1,
  growth: 1,
  greed: 1,
  critChance: 0.05,
  critDamage: 1.5,
  dodge: 0,
  revival: 0,
  rerolls: 0,
  curse: 1,
};

export const BALANCE = {
  playerSpeed: 75,
  playerRadius: 6,
  invulnerability: 0.45,
  magnetRadius: 36,
  pickupRadius: 10,
  maxWeapons: 6,
  maxPassives: 6,
  maxGems: 320,
  waveCount: 15,
  /** Soin (fraction des PV max) entre deux manches. */
  waveHeal: 0.25,
  waveClearGold: 5,
  victoryGold: 200,
  coinDropChance: 0.03,
  /** Distance au-delà de laquelle un ennemi est replacé près du joueur. */
  recycleDistance: 520,
  brazierInterval: 20,
  maxBraziers: 3,
} as const;

/** Expérience nécessaire pour passer du niveau `level` au suivant. */
export function xpToNext(level: number): number {
  return Math.round(5 + (level - 1) * 7 + Math.max(0, level - 20) * 6);
}

/** Multiplicateurs de difficulté appliqués aux ennemis selon la manche. */
export function waveScaling(wave: number): { hp: number; damage: number; speed: number; xp: number } {
  const w = wave - 1;
  return {
    hp: 1 + 0.2 * w + 0.025 * w * w,
    damage: 1 + 0.09 * w,
    speed: 1 + Math.min(0.25, 0.012 * w),
    xp: 1 + 0.04 * w,
  };
}

export const RARITY_INFO = {
  common: { label: 'Commun', color: '#b7b9c7', weight: 60 },
  rare: { label: 'Rare', color: '#4fa3ff', weight: 28 },
  epic: { label: 'Épique', color: '#c06dff', weight: 10 },
  legendary: { label: 'Légendaire', color: '#ffb52e', weight: 2 },
} as const;
