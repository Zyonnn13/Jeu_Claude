// Modificateurs de règles, tirés au sort pour le défi du jour.
import type { StatMod } from './types';

export interface MutatorDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  playerMods?: StatMod[];
  enemyHp?: number;
  enemyDamage?: number;
  enemySpeed?: number;
  enemyScale?: number;
  spawnRate?: number;
  shootRate?: number;
  waveHeal?: number;
  gold?: number;
  xp?: number;
  lightRadius?: number;
}

export const MUTATORS: MutatorDef[] = [
  { id: 'glassCannon', name: 'Canon de verre', description: '+50% dégâts, mais -40% PV max', icon: 'icon_fang', playerMods: [{ stat: 'might', add: 0.5 }, { stat: 'maxHp', mul: -0.4 }] },
  { id: 'horde', name: 'La Horde', description: '+40% d’ennemis, +30% d’expérience', icon: 'icon_skull', spawnRate: 1.4, xp: 1.3 },
  { id: 'goldRush', name: 'Ruée vers l’or', description: 'Or ×2, mais ennemis +25% PV', icon: 'coin', gold: 2, enemyHp: 1.25 },
  { id: 'swift', name: 'Ennemis véloces', description: 'Les ennemis sont 20% plus rapides', icon: 'icon_boots', enemySpeed: 1.2 },
  { id: 'bulletHell', name: 'Pluie de projectiles', description: 'Les ennemis tirent bien plus souvent', icon: 'enemy_bullet', shootRate: 0.55 },
  { id: 'noRest', name: 'Sans répit', description: 'Aucun soin entre les manches, +25% d’expérience', icon: 'icon_hourglass', waveHeal: 0, xp: 1.25 },
  { id: 'giants', name: 'Géants', description: 'Ennemis plus grands (+30% PV), mais 10% plus lents', icon: 'golem', enemyScale: 1.3, enemyHp: 1.3, enemySpeed: 0.9 },
  { id: 'luckyStar', name: 'Bonne étoile', description: '+50% de chance', icon: 'icon_clover', playerMods: [{ stat: 'luck', add: 0.5 }] },
  { id: 'darkness', name: 'Nuit noire', description: 'Votre lumière est réduite de 40%, or +30%', icon: 'icon_cloak', lightRadius: 0.6, gold: 1.3 },
  { id: 'vampirism', name: 'Soif de sang', description: 'Chaque élimination a 3% de chance de soigner 1 PV, mais -25% PV max', icon: 'icon_fang', playerMods: [{ stat: 'maxHp', mul: -0.25 }] },
];

export function getMutator(id: string): MutatorDef | undefined {
  return MUTATORS.find((m) => m.id === id);
}
