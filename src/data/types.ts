// Types des définitions de contenu. Les données (src/data/*) sont séparées de la logique (src/game/*) :
// ajouter une arme, un ennemi ou une relique consiste surtout à compléter une table.

export type StatKey =
  | 'maxHp'
  | 'regen'
  | 'armor'
  | 'moveSpeed'
  | 'might'
  | 'area'
  | 'cooldown'
  | 'projectileSpeed'
  | 'duration'
  | 'amount'
  | 'magnet'
  | 'luck'
  | 'growth'
  | 'greed'
  | 'critChance'
  | 'critDamage'
  | 'dodge'
  | 'revival'
  | 'rerolls'
  | 'curse';

/** Modificateur de statistique : valeur finale = (base + Σadd) × Π(1 + mul). */
export interface StatMod {
  stat: StatKey;
  add?: number;
  mul?: number;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  description: string;
  perk: string;
  sprite: string;
  startWeapon: string;
  mods: StatMod[];
  /** Coût en or pour débloquer le personnage (0 = disponible dès le départ, -1 = débloqué par un succès). */
  unlockCost: number;
  /** Succès qui débloque le personnage. */
  unlockAchievement?: string;
}

export type EnemyBehavior =
  | 'chase'
  | 'erratic'
  | 'phase'
  | 'ranged'
  | 'charger'
  | 'static'
  | 'skitter'
  | 'slimeKing'
  | 'lich'
  | 'vampire'
  | 'reaper';

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  radius: number;
  behavior: EnemyBehavior;
  /** 0 = subit tout le recul, 1 = insensible. */
  knockbackResist: number;
  scale?: number;
  animSpeed?: number;
  alpha?: number;
  boss?: boolean;
  /** Objet destructible du décor (brasero) : ne blesse pas et n'est pas ciblé par les armes. */
  prop?: boolean;
  splitInto?: { enemy: string; count: number };
  shoot?: { cooldown: number; speed: number; damage: number };
  /** Accessoire dessiné au-dessus du sprite (couronne du Roi Gluant). */
  overlay?: string;
  /** Hauteur (en pixels du sprite, depuis le centre) où poser l'accessoire, pour chaque frame. */
  overlayY?: number[];
  /** Seuils de PV (fractions) déclenchant les phases d'un boss, ex. [0.5, 0.2]. */
  phases?: number[];
  /** Couleur des projectiles tirés. */
  bulletColor?: string;
  /** Description pour le bestiaire. */
  lore?: string;
  /** Ennemi volant : ombre plus petite et plus basse. */
  flying?: boolean;
}

export interface WeaponStats {
  damage: number;
  cooldown: number;
  amount: number;
  area: number;
  speed: number;
  duration: number;
  pierce: number;
  knockback: number;
}

export type WeaponKind = 'sword' | 'wand' | 'knives' | 'orbs' | 'garlic' | 'lightning' | 'axe' | 'boomerang' | 'flask';

export interface WeaponSpecial {
  /** PV rendus par ennemi touché. */
  lifesteal?: number;
  /** Nombre de rebonds de la foudre. */
  chain?: number;
  /** Projectiles à tête chercheuse. */
  homing?: boolean;
  /** Orbes permanentes. */
  permanent?: boolean;
  /** PV rendus à chaque impulsion qui touche au moins un ennemi. */
  heal?: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  kind: WeaponKind;
  base: WeaponStats;
  /** Améliorations des niveaux 2..max (niveau max = levels.length + 1). */
  levels: { text: string; delta: Partial<WeaponStats> }[];
  evolution?: { passive: string; into: string };
  evolved?: boolean;
  special?: WeaponSpecial;
}

export interface PassiveDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  perLevel: StatMod[];
}

export type RelicEffect =
  | { type: 'healOnKill'; chance: number; amount: number }
  | { type: 'thorns'; damage: number; radius: number }
  | { type: 'explodeOnKill'; chance: number; damage: number; radius: number }
  | { type: 'healOnPick'; amount: number };

export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  description: string;
  mods?: StatMod[];
  effect?: RelicEffect;
  /** Ne peut être obtenue qu'une fois. */
  unique?: boolean;
}

export interface MetaUpgradeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  mod: StatMod;
}

export interface WaveSpawn {
  enemy: string;
  weight: number;
}

export interface WaveEvent {
  /** Moment du déclenchement, en fraction de la durée de la manche (0..1). */
  at: number;
  type: 'ring' | 'burst';
  enemy: string;
  count: number;
}

export interface WaveDef {
  duration: number;
  /** Ennemis par seconde : début et fin de manche. */
  spawnRate: [number, number];
  maxAlive: number;
  pool: WaveSpawn[];
  elites?: { at: number; enemy: string }[];
  events?: WaveEvent[];
  /** Manche de boss : elle se termine quand le boss est vaincu. */
  boss?: string;
}
