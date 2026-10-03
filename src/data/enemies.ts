import type { EnemyDef } from './types';

export const ENEMIES = {
  bat: {
    id: 'bat', name: 'Chauve-souris', sprite: 'bat', hp: 6, speed: 52, damage: 5, xp: 1, radius: 5, behavior: 'erratic', knockbackResist: 0, animSpeed: 14, flying: true,
    lore: 'Elles chassent en nuées et virevoltent sans cesse pour éviter les coups.',
  },
  slime: {
    id: 'slime', name: 'Gluant', sprite: 'slime', hp: 12, speed: 30, damage: 6, xp: 1, radius: 6, behavior: 'chase', knockbackResist: 0.2, animSpeed: 6,
    lore: 'Une gelée vorace qui rampe vers tout ce qui respire.',
  },
  zombie: {
    id: 'zombie', name: 'Zombie', sprite: 'zombie', hp: 22, speed: 26, damage: 8, xp: 2, radius: 6, behavior: 'chase', knockbackResist: 0.3, animSpeed: 5,
    lore: 'Lent mais tenace. Il ne s’arrête jamais de marcher.',
  },
  skeleton: {
    id: 'skeleton', name: 'Squelette', sprite: 'skeleton', hp: 18, speed: 40, damage: 8, xp: 2, radius: 5, behavior: 'chase', knockbackResist: 0.1, animSpeed: 8,
    lore: 'Les anciens gardiens du cimetière, réveillés par la nuit éternelle.',
  },
  eye: {
    id: 'eye', name: 'Œil maudit', sprite: 'eye', hp: 16, speed: 44, damage: 9, xp: 3, radius: 6, behavior: 'charger', knockbackResist: 0.1, animSpeed: 6, flying: true,
    lore: 'Il fixe sa proie, frémit… puis fonce sur elle à toute vitesse.',
  },
  ghost: {
    id: 'ghost', name: 'Spectre', sprite: 'ghost', hp: 20, speed: 42, damage: 10, xp: 3, radius: 6, behavior: 'phase', knockbackResist: 0.4, animSpeed: 4, alpha: 0.8, flying: true,
    lore: 'Il traverse ses semblables comme s’ils n’existaient pas.',
  },
  cultist: {
    id: 'cultist', name: 'Cultiste', sprite: 'cultist', hp: 26, speed: 30, damage: 8, xp: 4, radius: 6, behavior: 'ranged', knockbackResist: 0.2, animSpeed: 4,
    shoot: { cooldown: 2.6, speed: 90, damage: 10 },
    lore: 'Fidèle du Comte. Il garde ses distances et lance des sorts maudits.',
  },
  golem: {
    id: 'golem', name: 'Golem', sprite: 'golem', hp: 90, speed: 24, damage: 16, xp: 8, radius: 9, behavior: 'chase', knockbackResist: 0.75, scale: 1.5, animSpeed: 4,
    lore: 'Une montagne de pierre animée par la magie. Presque impossible à repousser.',
  },
  spider: {
    id: 'spider', name: 'Araignée géante', sprite: 'spider', hp: 14, speed: 62, damage: 7, xp: 2, radius: 5, behavior: 'skitter', knockbackResist: 0.1, animSpeed: 14,
    lore: 'Elle avance par bonds rapides et imprévisibles entre les racines.',
  },
  werewolf: {
    id: 'werewolf', name: 'Loup-garou', sprite: 'werewolf', hp: 42, speed: 40, damage: 12, xp: 4, radius: 7, behavior: 'charger', knockbackResist: 0.4, scale: 1.15, animSpeed: 8,
    lore: 'Un chasseur de la forêt maudite qui bondit sur sa proie.',
  },
  armorKnight: {
    id: 'armorKnight', name: 'Armure maudite', sprite: 'armorKnight', hp: 65, speed: 24, damage: 14, xp: 5, radius: 7, behavior: 'chase', knockbackResist: 0.8, animSpeed: 5,
    lore: 'Une armure vide qui garde encore les couloirs du château.',
  },
  gargoyle: {
    id: 'gargoyle', name: 'Gargouille', sprite: 'gargoyle', hp: 30, speed: 48, damage: 11, xp: 4, radius: 6, behavior: 'charger', knockbackResist: 0.3, animSpeed: 8, flying: true,
    lore: 'Elle se détache des remparts pour fondre en piqué sur les intrus.',
  },
  brazier: {
    id: 'brazier', name: 'Brasero', sprite: 'brazier', hp: 1, speed: 0, damage: 0, xp: 0, radius: 7, behavior: 'static', knockbackResist: 1, animSpeed: 8, prop: true,
  },

  slimeKing: {
    id: 'slimeKing', name: 'Roi Gluant', sprite: 'slime', hp: 1000, speed: 28, damage: 18, xp: 100, radius: 22, behavior: 'slimeKing', knockbackResist: 1,
    scale: 4, animSpeed: 6, boss: true, overlay: 'crown_boss', overlayY: [-3, -2, -3, -5], splitInto: { enemy: 'slime', count: 10 },
    shoot: { cooldown: 99, speed: 75, damage: 12 }, bulletColor: '#8fd94f', phases: [0.5, 0.2],
    lore: 'Souverain des gelées. Il bondit sur ses ennemis et se divise quand on le blesse.',
  },
  lich: {
    id: 'lich', name: 'Liche Ancestrale', sprite: 'lich', hp: 2800, speed: 34, damage: 22, xp: 200, radius: 15, behavior: 'lich', knockbackResist: 1,
    scale: 1.4, animSpeed: 4, boss: true, shoot: { cooldown: 2.4, speed: 75, damage: 14 }, bulletColor: '#b06de0', phases: [0.6, 0.25],
    lore: 'Un sorcier mort depuis des siècles. Ses sortilèges remplissent le ciel de projectiles.',
  },
  vampire: {
    id: 'vampire', name: 'Comte Vladislav', sprite: 'vampire', hp: 15000, speed: 46, damage: 28, xp: 400, radius: 15, behavior: 'vampire', knockbackResist: 1,
    scale: 1.4, animSpeed: 4, boss: true, shoot: { cooldown: 2.8, speed: 105, damage: 16 }, bulletColor: '#e0413c', phases: [0.5, 0.2],
    lore: 'Le maître de la nuit éternelle. Blessé, il se change en brume et appelle ses nuées.',
  },
  reaper: {
    id: 'reaper', name: 'La Faucheuse', sprite: 'reaper', hp: 22000, speed: 52, damage: 40, xp: 600, radius: 16, behavior: 'reaper', knockbackResist: 1,
    scale: 1.6, animSpeed: 4, boss: true, flying: true, shoot: { cooldown: 3, speed: 95, damage: 20 }, bulletColor: '#cfd8ff', phases: [0.66, 0.33],
    lore: 'Elle vient chercher ceux qui survivent trop longtemps. Personne ne lui échappe… en principe.',
  },
} satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;

export function getEnemy(id: string): EnemyDef {
  const def = (ENEMIES as Record<string, EnemyDef>)[id];
  if (!def) throw new Error(`Ennemi inconnu : ${id}`);
  return def;
}

/** Ennemis listés dans le bestiaire (hors objets du décor). */
export const BESTIARY_IDS: string[] = Object.values(ENEMIES as Record<string, EnemyDef>)
  .filter((e) => !e.prop)
  .map((e) => e.id);
