// Synergies : posséder deux armes précises (ou leurs évolutions) active un bonus.
import type { StatMod, WeaponKind, WeaponStats } from './types';

export interface SynergyDef {
  id: string;
  name: string;
  description: string;
  /** Les deux armes de base requises (leurs évolutions comptent aussi). */
  weapons: [string, string];
  stats?: StatMod[];
  weaponDeltas?: Partial<Record<WeaponKind, Partial<WeaponStats>>>;
  /** Effets spéciaux lus par les armes. */
  flags?: string[];
}

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'firestorm',
    name: 'Orage de feu',
    description: 'Les éclairs embrasent le sol. Zones de feu +20%.',
    weapons: ['lightning', 'flask'],
    weaponDeltas: { flask: { area: 0.2 } },
    flags: ['lightningIgnites'],
  },
  {
    id: 'arcaneStorm',
    name: 'Tempête arcanique',
    description: 'Les projectiles magiques électrocutent parfois un ennemi proche.',
    weapons: ['wand', 'lightning'],
    flags: ['boltsChain'],
  },
  {
    id: 'bladeDance',
    name: 'Danse des lames',
    description: '+8% coups critiques et +25% dégâts critiques.',
    weapons: ['sword', 'knives'],
    stats: [
      { stat: 'critChance', add: 0.08 },
      { stat: 'critDamage', add: 0.25 },
    ],
  },
  {
    id: 'holyGuard',
    name: 'Garde sacrée',
    description: 'Aura +30% de zone et un orbe de plus.',
    weapons: ['orbs', 'garlic'],
    weaponDeltas: { garlic: { area: 0.3 }, orbs: { amount: 1 } },
  },
  {
    id: 'whirlwind',
    name: 'Tourbillon d’acier',
    description: 'Une hache de plus ; haches et boomerangs +25% de taille.',
    weapons: ['axe', 'boomerang'],
    weaponDeltas: { axe: { amount: 1, area: 0.25 }, boomerang: { area: 0.25 } },
  },
  {
    id: 'purgingFire',
    name: 'Feu purificateur',
    description: 'Flammes +1 s de durée et +3 dégâts ; aura +3 dégâts.',
    weapons: ['flask', 'garlic'],
    weaponDeltas: { flask: { duration: 1, damage: 3 }, garlic: { damage: 3 } },
  },
  {
    id: 'guardian',
    name: 'Rempart',
    description: 'Lame +20% de zone ; orbes plus rapides et +5 dégâts.',
    weapons: ['orbs', 'sword'],
    weaponDeltas: { sword: { area: 0.2 }, orbs: { speed: 0.3, damage: 5 } },
  },
  {
    id: 'starfall',
    name: 'Pluie d’étoiles',
    description: 'Un projectile magique de plus qui traverse un ennemi de plus.',
    weapons: ['wand', 'orbs'],
    weaponDeltas: { wand: { amount: 1, pierce: 1 } },
  },
];
