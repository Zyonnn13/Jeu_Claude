// Améliorations permanentes achetées avec l'or entre les parties.
import type { MetaUpgradeDef } from './types';

export const META_UPGRADES: MetaUpgradeDef[] = [
  { id: 'might', name: 'Puissance', icon: 'icon_gauntlet', description: '+5% dégâts', maxLevel: 5, baseCost: 60, mod: { stat: 'might', add: 0.05 } },
  { id: 'maxHp', name: 'Vitalité', icon: 'icon_heart', description: '+10 PV max', maxLevel: 5, baseCost: 50, mod: { stat: 'maxHp', add: 10 } },
  { id: 'armor', name: 'Armure', icon: 'icon_shield', description: '+1 armure', maxLevel: 3, baseCost: 120, mod: { stat: 'armor', add: 1 } },
  { id: 'regen', name: 'Récupération', icon: 'icon_apple', description: '+0,1 PV/s', maxLevel: 5, baseCost: 80, mod: { stat: 'regen', add: 0.1 } },
  { id: 'moveSpeed', name: 'Célérité', icon: 'icon_boots', description: '+4% vitesse', maxLevel: 4, baseCost: 80, mod: { stat: 'moveSpeed', add: 0.04 } },
  { id: 'cooldown', name: 'Concentration', icon: 'icon_hourglass', description: '-3% recharge', maxLevel: 4, baseCost: 120, mod: { stat: 'cooldown', add: -0.03 } },
  { id: 'area', name: 'Amplitude', icon: 'icon_lens', description: '+5% zone d’effet', maxLevel: 4, baseCost: 100, mod: { stat: 'area', add: 0.05 } },
  { id: 'magnet', name: 'Magnétisme', icon: 'magnet', description: '+15% rayon de collecte', maxLevel: 4, baseCost: 50, mod: { stat: 'magnet', add: 0.15 } },
  { id: 'growth', name: 'Sagesse', icon: 'icon_scroll', description: '+5% expérience', maxLevel: 5, baseCost: 80, mod: { stat: 'growth', add: 0.05 } },
  { id: 'greed', name: 'Avidité', icon: 'coin', description: '+10% or ramassé', maxLevel: 5, baseCost: 60, mod: { stat: 'greed', add: 0.1 } },
  { id: 'luck', name: 'Chance', icon: 'icon_clover', description: '+5% chance', maxLevel: 4, baseCost: 100, mod: { stat: 'luck', add: 0.05 } },
  { id: 'rerolls', name: 'Relance', icon: 'icon_star', description: '+1 relance des choix par partie', maxLevel: 3, baseCost: 150, mod: { stat: 'rerolls', add: 1 } },
  { id: 'revival', name: 'Seconde vie', icon: 'icon_phoenix', description: 'Ressuscite une fois par partie', maxLevel: 1, baseCost: 1200, mod: { stat: 'revival', add: 1 } },
];

/** Coût du prochain niveau (le prix augmente à chaque achat). */
export function metaUpgradeCost(def: MetaUpgradeDef, currentLevel: number): number {
  return Math.round((def.baseCost * Math.pow(currentLevel + 1, 1.5)) / 5) * 5;
}
