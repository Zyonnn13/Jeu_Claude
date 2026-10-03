import type { CharacterDef } from './types';

export const CHARACTERS = {
  knight: {
    id: 'knight',
    name: 'Aldric',
    title: 'Le Chevalier',
    description: 'Un vétéran solide comme un rempart. Sa lame fauche tout ce qui approche.',
    perk: '+20 PV max, +1 armure',
    sprite: 'knight',
    startWeapon: 'sword',
    mods: [
      { stat: 'maxHp', add: 20 },
      { stat: 'armor', add: 1 },
    ],
    unlockCost: 0,
  },
  mage: {
    id: 'mage',
    name: 'Lyra',
    title: 'La Mage',
    description: 'Fragile mais redoutable : ses sorts se rechargent plus vite et couvrent plus large.',
    perk: '-10% recharge, +10% zone, -10 PV max',
    sprite: 'mage',
    startWeapon: 'wand',
    mods: [
      { stat: 'cooldown', add: -0.1 },
      { stat: 'area', add: 0.1 },
      { stat: 'maxHp', add: -10 },
    ],
    unlockCost: 0,
  },
  rogue: {
    id: 'rogue',
    name: 'Kaela',
    title: 'La Rôdeuse',
    description: 'Rapide et précise, elle crible ses ennemis de dagues avant qu’ils ne la touchent.',
    perk: '+15% vitesse, +5% coups critiques',
    sprite: 'rogue',
    startWeapon: 'knives',
    mods: [
      { stat: 'moveSpeed', add: 0.15 },
      { stat: 'critChance', add: 0.05 },
    ],
    unlockCost: 0,
  },
  dwarf: {
    id: 'dwarf',
    name: 'Brom',
    title: 'Le Nain',
    description: 'Lent mais dévastateur. Chaque hache lancée fend les rangs ennemis.',
    perk: '+15% dégâts, +30 PV max, -10% vitesse',
    sprite: 'dwarf',
    startWeapon: 'axe',
    mods: [
      { stat: 'might', add: 0.15 },
      { stat: 'maxHp', add: 30 },
      { stat: 'moveSpeed', add: -0.1 },
    ],
    unlockCost: 600,
  },
  priestess: {
    id: 'priestess',
    name: 'Séraphine',
    title: 'La Prêtresse',
    description: 'Protégée par une lumière sacrée, elle se régénère et fait durer ses sortilèges.',
    perk: '+0,4 PV/s, +15% durée, +10% zone',
    sprite: 'priestess',
    startWeapon: 'orbs',
    mods: [
      { stat: 'regen', add: 0.4 },
      { stat: 'duration', add: 0.15 },
      { stat: 'area', add: 0.1 },
    ],
    unlockCost: -1,
    unlockAchievement: 'wave10',
  },
  alchemist: {
    id: 'alchemist',
    name: 'Ozric',
    title: 'L’Alchimiste',
    description: 'Un savant fou qui transforme le champ de bataille en brasier… et en or.',
    perk: '+15% zone, +25% or, +5% chance',
    sprite: 'alchemist',
    startWeapon: 'flask',
    mods: [
      { stat: 'area', add: 0.15 },
      { stat: 'greed', add: 0.25 },
      { stat: 'luck', add: 0.05 },
    ],
    unlockCost: -1,
    unlockAchievement: 'collector',
  },
} satisfies Record<string, CharacterDef>;

export type CharacterId = keyof typeof CHARACTERS;
export const CHARACTER_LIST: CharacterDef[] = Object.values(CHARACTERS);
