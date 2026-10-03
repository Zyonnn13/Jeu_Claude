// Reliques : les bonus proposés à la fin de chaque manche.
import type { RelicDef } from './types';

export const RELICS = {
  // Communes
  vitalFlask: {
    id: 'vitalFlask', name: 'Fiole de vie', icon: 'icon_potion', rarity: 'common',
    description: '+15 PV max et soigne 30 PV', mods: [{ stat: 'maxHp', add: 15 }], effect: { type: 'healOnPick', amount: 30 },
  },
  whetstone: { id: 'whetstone', name: 'Pierre à aiguiser', icon: 'icon_stone', rarity: 'common', description: '+8% dégâts', mods: [{ stat: 'might', add: 0.08 }] },
  lightBoots: { id: 'lightBoots', name: 'Semelles de vent', icon: 'icon_boots', rarity: 'common', description: '+7% vitesse de déplacement', mods: [{ stat: 'moveSpeed', add: 0.07 }] },
  nimbleHands: { id: 'nimbleHands', name: 'Mains agiles', icon: 'icon_gauntlet', rarity: 'common', description: '-5% temps de recharge', mods: [{ stat: 'cooldown', add: -0.05 }] },
  prism: { id: 'prism', name: 'Prisme', icon: 'icon_lens', rarity: 'common', description: '+10% zone d’effet', mods: [{ stat: 'area', add: 0.1 }] },
  goldTooth: { id: 'goldTooth', name: 'Dent en or', icon: 'coin', rarity: 'common', description: '+25% d’or ramassé', mods: [{ stat: 'greed', add: 0.25 }] },
  oldScroll: { id: 'oldScroll', name: 'Vieux parchemin', icon: 'icon_scroll', rarity: 'common', description: '+10% d’expérience', mods: [{ stat: 'growth', add: 0.1 }] },
  thickHide: { id: 'thickHide', name: 'Peau épaisse', icon: 'icon_shield', rarity: 'common', description: '+1 armure', mods: [{ stat: 'armor', add: 1 }] },
  lodestone: { id: 'lodestone', name: 'Pierre aimantée', icon: 'magnet', rarity: 'common', description: '+30% rayon de collecte', mods: [{ stat: 'magnet', add: 0.3 }] },

  // Rares
  vampireFang: {
    id: 'vampireFang', name: 'Croc de vampire', icon: 'icon_fang', rarity: 'rare',
    description: '6% de chance de récupérer 2 PV par ennemi vaincu', effect: { type: 'healOnKill', chance: 0.06, amount: 2 },
  },
  thornMail: {
    id: 'thornMail', name: 'Cotte d’épines', icon: 'icon_spikes', rarity: 'rare',
    description: 'Quand vous êtes touché, inflige 40 dégâts autour de vous', effect: { type: 'thorns', damage: 40, radius: 70 },
  },
  luckyCharm: {
    id: 'luckyCharm', name: 'Porte-bonheur', icon: 'icon_clover', rarity: 'rare', description: '+20% chance, +4% coups critiques',
    mods: [{ stat: 'luck', add: 0.2 }, { stat: 'critChance', add: 0.04 }],
  },
  hawkEye: {
    id: 'hawkEye', name: 'Œil de faucon', icon: 'icon_amulet', rarity: 'rare', description: '+8% coups critiques, +30% dégâts critiques',
    mods: [{ stat: 'critChance', add: 0.08 }, { stat: 'critDamage', add: 0.3 }],
  },
  griffinFeather: {
    id: 'griffinFeather', name: 'Plume de griffon', icon: 'icon_feather', rarity: 'rare', description: '+20% vitesse des projectiles, +10% durée',
    mods: [{ stat: 'projectileSpeed', add: 0.2 }, { stat: 'duration', add: 0.1 }],
  },
  feast: { id: 'feast', name: 'Festin', icon: 'chicken', rarity: 'rare', description: '+30 PV max', mods: [{ stat: 'maxHp', add: 30 }], effect: { type: 'healOnPick', amount: 30 } },
  mossHeart: { id: 'mossHeart', name: 'Mousse vivace', icon: 'icon_leaf', rarity: 'rare', description: '+0,6 PV régénérés par seconde', mods: [{ stat: 'regen', add: 0.6 }] },

  // Épiques
  volatileSouls: {
    id: 'volatileSouls', name: 'Âmes instables', icon: 'icon_skull', rarity: 'epic', unique: true,
    description: '12% de chance qu’un ennemi vaincu explose', effect: { type: 'explodeOnKill', chance: 0.12, damage: 25, radius: 40 },
  },
  quiver: { id: 'quiver', name: 'Carquois enchanté', icon: 'knife', rarity: 'epic', description: '+1 projectile pour toutes les armes', mods: [{ stat: 'amount', add: 1 }] },
  shadowCloak: { id: 'shadowCloak', name: 'Cape d’ombre', icon: 'icon_cloak', rarity: 'epic', description: '+12% d’esquive', mods: [{ stat: 'dodge', add: 0.12 }] },
  berserk: {
    id: 'berserk', name: 'Rage du berserker', icon: 'icon_fang', rarity: 'epic', description: '+25% dégâts, mais -15 PV max',
    mods: [{ stat: 'might', add: 0.25 }, { stat: 'maxHp', add: -15 }],
  },
  brokenHourglass: {
    id: 'brokenHourglass', name: 'Sablier fêlé', icon: 'icon_hourglass', rarity: 'epic', description: '-10% recharge, +10% vitesse',
    mods: [{ stat: 'cooldown', add: -0.1 }, { stat: 'moveSpeed', add: 0.1 }],
  },
  giantPotion: {
    id: 'giantPotion', name: 'Potion de géant', icon: 'icon_potion', rarity: 'epic', description: '+20% zone d’effet, +20 PV max',
    mods: [{ stat: 'area', add: 0.2 }, { stat: 'maxHp', add: 20 }],
  },

  // Légendaires
  phoenixFeather: { id: 'phoenixFeather', name: 'Plume de phénix', icon: 'icon_phoenix', rarity: 'legendary', description: 'Vous ressuscitez une fois avec la moitié de vos PV', mods: [{ stat: 'revival', add: 1 }] },
  kingsCrown: {
    id: 'kingsCrown', name: 'Couronne des rois', icon: 'icon_crown', rarity: 'legendary', unique: true, description: '+15% dégâts, zone, vitesse et expérience',
    mods: [{ stat: 'might', add: 0.15 }, { stat: 'area', add: 0.15 }, { stat: 'moveSpeed', add: 0.15 }, { stat: 'growth', add: 0.15 }],
  },
  arcaneEcho: {
    id: 'arcaneEcho', name: 'Écho arcanique', icon: 'icon_star', rarity: 'legendary', unique: true, description: '+1 projectile et +15% dégâts',
    mods: [{ stat: 'amount', add: 1 }, { stat: 'might', add: 0.15 }],
  },
  divineAegis: {
    id: 'divineAegis', name: 'Égide divine', icon: 'icon_shield', rarity: 'legendary', unique: true, description: '+3 armure et +1 PV régénéré par seconde',
    mods: [{ stat: 'armor', add: 3 }, { stat: 'regen', add: 1 }],
  },
} satisfies Record<string, RelicDef>;

export const RELIC_LIST: RelicDef[] = Object.values(RELICS);

export function getRelic(id: string): RelicDef {
  const def = (RELICS as Record<string, RelicDef>)[id];
  if (!def) throw new Error(`Relique inconnue : ${id}`);
  return def;
}
