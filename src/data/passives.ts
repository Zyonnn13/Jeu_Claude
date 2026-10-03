import type { PassiveDef } from './types';

export const PASSIVES = {
  heart: { id: 'heart', name: 'Cœur vaillant', icon: 'icon_heart', description: '+20 PV max par niveau', maxLevel: 5, perLevel: [{ stat: 'maxHp', add: 20 }] },
  shield: { id: 'shield', name: 'Plastron', icon: 'icon_shield', description: '+1 armure par niveau', maxLevel: 5, perLevel: [{ stat: 'armor', add: 1 }] },
  boots: { id: 'boots', name: 'Bottes ailées', icon: 'icon_boots', description: '+10% vitesse de déplacement', maxLevel: 5, perLevel: [{ stat: 'moveSpeed', add: 0.1 }] },
  gauntlet: { id: 'gauntlet', name: 'Gantelet de force', icon: 'icon_gauntlet', description: '+10% dégâts', maxLevel: 5, perLevel: [{ stat: 'might', add: 0.1 }] },
  lens: { id: 'lens', name: 'Lentille', icon: 'icon_lens', description: '+10% zone d’effet', maxLevel: 5, perLevel: [{ stat: 'area', add: 0.1 }] },
  hourglass: { id: 'hourglass', name: 'Sablier', icon: 'icon_hourglass', description: '-8% temps de recharge', maxLevel: 5, perLevel: [{ stat: 'cooldown', add: -0.08 }] },
  ring: { id: 'ring', name: 'Anneau de duplication', icon: 'icon_ring', description: '+1 projectile pour toutes les armes', maxLevel: 2, perLevel: [{ stat: 'amount', add: 1 }] },
  book: {
    id: 'book', name: 'Grimoire', icon: 'icon_book', description: '+10% durée et vitesse des projectiles', maxLevel: 5,
    perLevel: [{ stat: 'duration', add: 0.1 }, { stat: 'projectileSpeed', add: 0.1 }],
  },
  magnet: { id: 'magnet', name: 'Aimant', icon: 'magnet', description: '+30% rayon de collecte', maxLevel: 5, perLevel: [{ stat: 'magnet', add: 0.3 }] },
  clover: {
    id: 'clover', name: 'Trèfle', icon: 'icon_clover', description: '+10% chance, +2% coups critiques', maxLevel: 5,
    perLevel: [{ stat: 'luck', add: 0.1 }, { stat: 'critChance', add: 0.02 }],
  },
  crown: { id: 'crown', name: 'Couronne', icon: 'icon_crown', description: '+8% d’expérience gagnée', maxLevel: 5, perLevel: [{ stat: 'growth', add: 0.08 }] },
  apple: { id: 'apple', name: 'Pomme d’or', icon: 'icon_apple', description: '+0,25 PV régénérés par seconde', maxLevel: 5, perLevel: [{ stat: 'regen', add: 0.25 }] },
} satisfies Record<string, PassiveDef>;

export type PassiveId = keyof typeof PASSIVES;

export function getPassive(id: string): PassiveDef {
  const def = (PASSIVES as Record<string, PassiveDef>)[id];
  if (!def) throw new Error(`Objet passif inconnu : ${id}`);
  return def;
}

export const PASSIVE_IDS: string[] = Object.keys(PASSIVES);
