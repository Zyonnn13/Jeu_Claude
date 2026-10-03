// Cartes (biomes) : apparence du sol, décor, éclairage et variantes d'ennemis.

export interface LightSource {
  color: string;
  radius: number;
  intensity: number;
  /** Décalage vertical de la lumière par rapport au pied de l'objet. */
  offsetY?: number;
  flicker?: boolean;
}

export interface BiomeDef {
  id: string;
  name: string;
  description: string;
  /** Sprite d'illustration sur l'écran de sélection. */
  emblem: string;
  tiles: { sprite: string; weight: number }[];
  /** Tuile des chemins (bruit organique au-dessus du seuil). */
  path: string;
  pathThreshold: number;
  decals: string[];
  decalDensity: number;
  props: string[];
  propDensity: number;
  /** Décors qui émettent de la lumière. */
  lights: Record<string, LightSource>;
  /** Lumière ambiante de la nuit (multipliée sur la scène). */
  ambient: string;
  clearColor: string;
  playerLight: number;
  /** Remplacement d'ennemis dans les manches (ex. zombie -> loup-garou). */
  enemySwap: Record<string, string>;
  enemyHp: number;
  gold: number;
  unlockHint: string;
}

export const BIOMES = {
  cemetery: {
    id: 'cemetery',
    name: 'Cimetière oublié',
    description: 'Des tombes à perte de vue sous la lune. Les morts ne restent pas couchés longtemps.',
    emblem: 'prop_tombstone',
    tiles: [
      { sprite: 'grass_0', weight: 60 },
      { sprite: 'grass_1', weight: 25 },
      { sprite: 'grass_2', weight: 15 },
    ],
    path: 'dirt',
    pathThreshold: 0.72,
    decals: ['deco_flowers', 'deco_pebbles', 'deco_tuft', 'deco_tuft', 'deco_tuft', 'deco_flowers', 'deco_pebbles', 'deco_bones', 'deco_mushroom'],
    decalDensity: 0.045,
    props: ['prop_tombstone', 'prop_cross', 'prop_bush', 'prop_bush', 'prop_tree', 'prop_lantern'],
    propDensity: 0.012,
    lights: {
      prop_lantern: { color: '#ffc86b', radius: 60, intensity: 0.9, offsetY: -12, flicker: true },
    },
    ambient: '#5a6290',
    clearColor: '#101612',
    playerLight: 150,
    enemySwap: {},
    enemyHp: 1,
    gold: 1,
    unlockHint: '',
  },
  forest: {
    id: 'forest',
    name: 'Forêt maudite',
    description: 'Une forêt si dense que la lune n’y entre plus. Seuls les champignons luisent dans le noir.',
    emblem: 'prop_glowshrooms',
    tiles: [
      { sprite: 'forest_0', weight: 55 },
      { sprite: 'forest_1', weight: 30 },
      { sprite: 'forest_2', weight: 15 },
    ],
    path: 'mud',
    pathThreshold: 0.7,
    decals: ['deco_fern', 'deco_leaves', 'deco_leaves', 'deco_roots', 'deco_glowshroom', 'deco_fern'],
    decalDensity: 0.06,
    props: ['prop_oak', 'prop_pine', 'prop_pine', 'prop_stump', 'prop_rock', 'prop_glowshrooms'],
    propDensity: 0.02,
    lights: {
      deco_glowshroom: { color: '#5fe0e8', radius: 22, intensity: 0.55 },
      prop_glowshrooms: { color: '#6fe3f0', radius: 48, intensity: 0.85, offsetY: -6 },
    },
    ambient: '#3c5256',
    clearColor: '#0b1210',
    playerLight: 135,
    enemySwap: { zombie: 'werewolf', skeleton: 'spider' },
    enemyHp: 1.15,
    gold: 1.2,
    unlockHint: 'Vaincre la Liche Ancestrale',
  },
  castle: {
    id: 'castle',
    name: 'Château du Comte',
    description: 'Les couloirs du Comte Vladislav, éclairés de chandeliers. Ses gardes ne dorment jamais.',
    emblem: 'prop_candelabra',
    tiles: [
      { sprite: 'castle_0', weight: 55 },
      { sprite: 'castle_1', weight: 30 },
      { sprite: 'castle_2', weight: 15 },
    ],
    path: 'castle_dark',
    pathThreshold: 0.68,
    decals: ['deco_crack', 'deco_rubble', 'deco_crack', 'deco_bones', 'deco_blood'],
    decalDensity: 0.05,
    props: ['prop_pillar', 'prop_candelabra', 'prop_statue', 'prop_brokencol', 'prop_candelabra'],
    propDensity: 0.014,
    lights: {
      prop_candelabra: { color: '#ffb050', radius: 75, intensity: 1, offsetY: -22, flicker: true },
    },
    ambient: '#523a46',
    clearColor: '#120a0e',
    playerLight: 140,
    enemySwap: { zombie: 'armorKnight', eye: 'gargoyle' },
    enemyHp: 1.3,
    gold: 1.4,
    unlockHint: 'Remporter une victoire',
  },
} satisfies Record<string, BiomeDef>;

export type BiomeId = keyof typeof BIOMES;
export const BIOME_LIST: BiomeDef[] = Object.values(BIOMES);

export function getBiome(id: string): BiomeDef {
  return (BIOMES as Record<string, BiomeDef>)[id] ?? BIOMES.cemetery;
}
