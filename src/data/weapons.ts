import type { WeaponDef } from './types';

const INF = Number.POSITIVE_INFINITY;

export const WEAPONS = {
  // --- Armes de base -------------------------------------------------------
  sword: {
    id: 'sword', name: 'Lame du chevalier', icon: 'icon_sword', kind: 'sword',
    description: 'Fend l’air devant vous d’un large arc.',
    base: { damage: 12, cooldown: 1.3, amount: 1, area: 1, speed: 1, duration: 0.22, pierce: INF, knockback: 1 },
    levels: [
      { text: 'Frappe aussi derrière vous', delta: { amount: 1 } },
      { text: 'Dégâts +5', delta: { damage: 5 } },
      { text: 'Zone +15%, dégâts +3', delta: { area: 0.15, damage: 3 } },
      { text: 'Dégâts +5', delta: { damage: 5 } },
      { text: 'Recharge -0,15 s, zone +15%', delta: { cooldown: -0.15, area: 0.15 } },
      { text: 'Dégâts +5', delta: { damage: 5 } },
      { text: 'Une frappe de plus, dégâts +5', delta: { amount: 1, damage: 5 } },
    ],
    evolution: { passive: 'heart', into: 'bloodSword' },
  },
  wand: {
    id: 'wand', name: 'Baguette arcanique', icon: 'icon_wand', kind: 'wand',
    description: 'Tire un projectile magique sur l’ennemi le plus proche.',
    base: { damage: 9, cooldown: 1.1, amount: 1, area: 1, speed: 1, duration: 2, pierce: 1, knockback: 0.5 },
    levels: [
      { text: 'Un projectile de plus', delta: { amount: 1 } },
      { text: 'Recharge -0,15 s', delta: { cooldown: -0.15 } },
      { text: 'Un projectile de plus', delta: { amount: 1 } },
      { text: 'Dégâts +6', delta: { damage: 6 } },
      { text: 'Un projectile de plus', delta: { amount: 1 } },
      { text: 'Traverse un ennemi de plus', delta: { pierce: 1 } },
      { text: 'Dégâts +8', delta: { damage: 8 } },
    ],
    evolution: { passive: 'hourglass', into: 'arcaneStaff' },
  },
  knives: {
    id: 'knives', name: 'Dagues de lancer', icon: 'knife', kind: 'knives',
    description: 'Lance des dagues dans la direction du mouvement.',
    base: { damage: 7, cooldown: 0.9, amount: 1, area: 1, speed: 1, duration: 1.5, pierce: 1, knockback: 0.4 },
    levels: [
      { text: 'Une dague de plus', delta: { amount: 1 } },
      { text: 'Une dague de plus, dégâts +3', delta: { amount: 1, damage: 3 } },
      { text: 'Une dague de plus', delta: { amount: 1 } },
      { text: 'Traverse un ennemi de plus', delta: { pierce: 1 } },
      { text: 'Une dague de plus', delta: { amount: 1 } },
      { text: 'Une dague de plus, dégâts +3', delta: { amount: 1, damage: 3 } },
      { text: 'Traverse un ennemi de plus', delta: { pierce: 1 } },
    ],
    evolution: { passive: 'boots', into: 'thousandEdge' },
  },
  orbs: {
    id: 'orbs', name: 'Orbes sacrés', icon: 'orb', kind: 'orbs',
    description: 'Des orbes lumineux tournent autour de vous.',
    base: { damage: 10, cooldown: 5.5, amount: 1, area: 1, speed: 1, duration: 3, pierce: INF, knockback: 1 },
    levels: [
      { text: 'Un orbe de plus', delta: { amount: 1 } },
      { text: 'Rotation +30%, dégâts +5', delta: { speed: 0.3, damage: 5 } },
      { text: 'Durée +0,5 s, rayon +25%', delta: { duration: 0.5, area: 0.25 } },
      { text: 'Un orbe de plus', delta: { amount: 1 } },
      { text: 'Rotation +30%, dégâts +5', delta: { speed: 0.3, damage: 5 } },
      { text: 'Durée +0,5 s, rayon +25%', delta: { duration: 0.5, area: 0.25 } },
      { text: 'Un orbe de plus', delta: { amount: 1 } },
    ],
    evolution: { passive: 'book', into: 'celestialRing' },
  },
  garlic: {
    id: 'garlic', name: 'Aura d’ail', icon: 'icon_garlic', kind: 'garlic',
    description: 'Une aura qui blesse et repousse les ennemis proches.',
    base: { damage: 5, cooldown: 0.65, amount: 0, area: 1, speed: 1, duration: 0, pierce: INF, knockback: 0.6 },
    levels: [
      { text: 'Zone +20%, dégâts +2', delta: { area: 0.2, damage: 2 } },
      { text: 'Dégâts +2, cadence accrue', delta: { damage: 2, cooldown: -0.05 } },
      { text: 'Zone +20%', delta: { area: 0.2 } },
      { text: 'Dégâts +3', delta: { damage: 3 } },
      { text: 'Zone +20%, cadence accrue', delta: { area: 0.2, cooldown: -0.05 } },
      { text: 'Dégâts +3', delta: { damage: 3 } },
      { text: 'Zone +20%, dégâts +3', delta: { area: 0.2, damage: 3 } },
    ],
    evolution: { passive: 'shield', into: 'holyAura' },
  },
  lightning: {
    id: 'lightning', name: 'Foudre céleste', icon: 'icon_lightning', kind: 'lightning',
    description: 'La foudre frappe des ennemis au hasard.',
    base: { damage: 18, cooldown: 2.6, amount: 2, area: 1, speed: 1, duration: 0, pierce: INF, knockback: 0 },
    levels: [
      { text: 'Un éclair de plus', delta: { amount: 1 } },
      { text: 'Dégâts +8', delta: { damage: 8 } },
      { text: 'Un éclair de plus, zone +25%', delta: { amount: 1, area: 0.25 } },
      { text: 'Recharge -0,3 s', delta: { cooldown: -0.3 } },
      { text: 'Un éclair de plus', delta: { amount: 1 } },
      { text: 'Dégâts +10', delta: { damage: 10 } },
      { text: 'Un éclair de plus, zone +25%', delta: { amount: 1, area: 0.25 } },
    ],
    evolution: { passive: 'ring', into: 'storm' },
  },
  axe: {
    id: 'axe', name: 'Hache de guerre', icon: 'axe', kind: 'axe',
    description: 'Lancée en l’air, elle retombe sur les ennemis. Gros dégâts.',
    base: { damage: 22, cooldown: 1.8, amount: 1, area: 1, speed: 1, duration: 3, pierce: 3, knockback: 1 },
    levels: [
      { text: 'Une hache de plus', delta: { amount: 1 } },
      { text: 'Dégâts +10', delta: { damage: 10 } },
      { text: 'Traverse +2, taille +20%', delta: { pierce: 2, area: 0.2 } },
      { text: 'Une hache de plus', delta: { amount: 1 } },
      { text: 'Dégâts +10', delta: { damage: 10 } },
      { text: 'Taille +20%, traverse +2', delta: { area: 0.2, pierce: 2 } },
      { text: 'Une hache de plus, dégâts +10', delta: { amount: 1, damage: 10 } },
    ],
    evolution: { passive: 'gauntlet', into: 'titanAxe' },
  },
  boomerang: {
    id: 'boomerang', name: 'Boomerang', icon: 'boomerang', kind: 'boomerang',
    description: 'Part vers l’ennemi le plus proche puis revient vers vous.',
    base: { damage: 12, cooldown: 1.5, amount: 1, area: 1, speed: 1, duration: 3, pierce: INF, knockback: 0.8 },
    levels: [
      { text: 'Dégâts +5', delta: { damage: 5 } },
      { text: 'Un boomerang de plus', delta: { amount: 1 } },
      { text: 'Vitesse +25%, taille +20%', delta: { speed: 0.25, area: 0.2 } },
      { text: 'Un boomerang de plus', delta: { amount: 1 } },
      { text: 'Dégâts +8', delta: { damage: 8 } },
      { text: 'Taille +20%, vitesse +25%', delta: { area: 0.2, speed: 0.25 } },
      { text: 'Un boomerang de plus', delta: { amount: 1 } },
    ],
    evolution: { passive: 'clover', into: 'silverMoon' },
  },
  flask: {
    id: 'flask', name: 'Fiole incendiaire', icon: 'flask', kind: 'flask',
    description: 'Se brise en laissant une zone de flammes au sol.',
    base: { damage: 6, cooldown: 3, amount: 1, area: 1, speed: 1, duration: 2.5, pierce: INF, knockback: 0 },
    levels: [
      { text: 'Une fiole de plus', delta: { amount: 1 } },
      { text: 'Dégâts +3, zone +20%', delta: { damage: 3, area: 0.2 } },
      { text: 'Durée +0,5 s', delta: { duration: 0.5 } },
      { text: 'Une fiole de plus', delta: { amount: 1 } },
      { text: 'Dégâts +3, zone +20%', delta: { damage: 3, area: 0.2 } },
      { text: 'Durée +0,5 s, recharge -0,3 s', delta: { duration: 0.5, cooldown: -0.3 } },
      { text: 'Une fiole de plus', delta: { amount: 1 } },
    ],
    evolution: { passive: 'lens', into: 'inferno' },
  },

  // --- Évolutions ----------------------------------------------------------
  bloodSword: {
    id: 'bloodSword', name: 'Faucheuse écarlate', icon: 'icon_sword', kind: 'sword', evolved: true,
    description: 'Évolution de la lame : chaque coup vous soigne.',
    base: { damage: 32, cooldown: 1.0, amount: 3, area: 1.5, speed: 1, duration: 0.25, pierce: INF, knockback: 1.2 },
    levels: [],
    special: { lifesteal: 1 },
  },
  arcaneStaff: {
    id: 'arcaneStaff', name: 'Sceptre du néant', icon: 'icon_wand', kind: 'wand', evolved: true,
    description: 'Évolution de la baguette : une pluie de projectiles chercheurs.',
    base: { damage: 20, cooldown: 0.45, amount: 4, area: 1.3, speed: 1.2, duration: 2.5, pierce: 3, knockback: 0.6 },
    levels: [],
    special: { homing: true },
  },
  thousandEdge: {
    id: 'thousandEdge', name: 'Mille Lames', icon: 'knife', kind: 'knives', evolved: true,
    description: 'Évolution des dagues : un flot ininterrompu de lames.',
    base: { damage: 14, cooldown: 0.12, amount: 2, area: 1.1, speed: 1.3, duration: 1.5, pierce: 3, knockback: 0.4 },
    levels: [],
  },
  celestialRing: {
    id: 'celestialRing', name: 'Anneau céleste', icon: 'orb', kind: 'orbs', evolved: true,
    description: 'Évolution des orbes : ils ne disparaissent plus jamais.',
    base: { damage: 22, cooldown: 1, amount: 5, area: 1.4, speed: 1.6, duration: 1, pierce: INF, knockback: 1.2 },
    levels: [],
    special: { permanent: true },
  },
  holyAura: {
    id: 'holyAura', name: 'Sanctuaire', icon: 'icon_garlic', kind: 'garlic', evolved: true,
    description: 'Évolution de l’aura : immense, elle vous soigne en blessant.',
    base: { damage: 16, cooldown: 0.45, amount: 0, area: 2, speed: 1, duration: 0, pierce: INF, knockback: 0.8 },
    levels: [],
    special: { heal: 0.5 },
  },
  storm: {
    id: 'storm', name: 'Tempête divine', icon: 'icon_lightning', kind: 'lightning', evolved: true,
    description: 'Évolution de la foudre : les éclairs rebondissent d’ennemi en ennemi.',
    base: { damage: 35, cooldown: 1.6, amount: 6, area: 1.6, speed: 1, duration: 0, pierce: INF, knockback: 0 },
    levels: [],
    special: { chain: 3 },
  },
  titanAxe: {
    id: 'titanAxe', name: 'Couperet du titan', icon: 'axe', kind: 'axe', evolved: true,
    description: 'Évolution de la hache : des haches gigantesques qui traversent tout.',
    base: { damage: 55, cooldown: 1.4, amount: 4, area: 2, speed: 1, duration: 3, pierce: INF, knockback: 1.5 },
    levels: [],
  },
  silverMoon: {
    id: 'silverMoon', name: 'Lune d’argent', icon: 'boomerang', kind: 'boomerang', evolved: true,
    description: 'Évolution du boomerang : quatre lames qui tournoient et reviennent.',
    base: { damage: 30, cooldown: 1.1, amount: 4, area: 1.6, speed: 1.4, duration: 3, pierce: INF, knockback: 1 },
    levels: [],
  },
  inferno: {
    id: 'inferno', name: 'Brasier infernal', icon: 'flask', kind: 'flask', evolved: true,
    description: 'Évolution de la fiole : de vastes brasiers persistants.',
    base: { damage: 14, cooldown: 2.2, amount: 4, area: 1.8, speed: 1, duration: 4, pierce: INF, knockback: 0 },
    levels: [],
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;

export function getWeapon(id: string): WeaponDef {
  const def = (WEAPONS as Record<string, WeaponDef>)[id];
  if (!def) throw new Error(`Arme inconnue : ${id}`);
  return def;
}

export const BASE_WEAPON_IDS: string[] = Object.values(WEAPONS as Record<string, WeaponDef>)
  .filter((w) => !w.evolved)
  .map((w) => w.id);

export function maxLevelOf(def: WeaponDef): number {
  return def.levels.length + 1;
}
