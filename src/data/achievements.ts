// Succès : objectifs à long terme qui débloquent armes, reliques, héros, cartes ou de l'or.
import type { SaveData } from '../core/SaveManager';
import { BESTIARY_IDS } from './enemies';

export type Reward =
  | { type: 'weapon' | 'relic' | 'character' | 'biome'; id: string }
  | { type: 'gold'; amount: number };

/** Instantané d'une partie (en cours ou terminée) pour évaluer les succès. */
export interface RunSnapshot {
  /** Vrai si les statistiques de la partie ont déjà été ajoutées à la sauvegarde. */
  committed: boolean;
  kills: number;
  wave: number;
  level: number;
  gold: number;
  victory: boolean;
  endless: boolean;
  character: string;
  biome: string;
  danger: number;
  daily: boolean;
  chests: number;
  evolutions: number;
  weapons: number;
  synergies: number;
  noHitWaves: number;
  bossKills: string[];
  fastestBossKill: number;
  killsByType: Map<string, number>;
}

export interface AchievementContext {
  save: SaveData;
  run: RunSnapshot | null;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: Reward;
  check(c: AchievementContext): boolean;
  /** Progression affichée (actuel, objectif). */
  progress?(c: AchievementContext): [number, number];
}

/** Valeur cumulée : sauvegarde + partie en cours (si pas encore enregistrée). */
function total(c: AchievementContext, fromSave: number, fromRun: (r: RunSnapshot) => number): number {
  return fromSave + (c.run && !c.run.committed ? fromRun(c.run) : 0);
}

const bossKilled = (c: AchievementContext, id: string) => (c.save.stats.bossKills[id] ?? 0) > 0 || !!c.run?.bossKills.includes(id);
const bestWave = (c: AchievementContext) => Math.max(c.save.stats.bestWave, c.run?.wave ?? 0);
const winIn = (c: AchievementContext, biome: string) => (c.save.stats.winsByBiome[biome] ?? 0) > 0 || (!!c.run?.victory && c.run.biome === biome);
const wins = (c: AchievementContext) => total(c, c.save.stats.wins, (r) => (r.victory ? 1 : 0));

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'firstNight', name: 'Première nuit', description: 'Terminer la manche 3.', icon: 'icon_star', reward: { type: 'gold', amount: 50 },
    check: (c) => bestWave(c) >= 4 || (c.run?.wave ?? 0) >= 4,
  },
  {
    id: 'wave5', name: 'Tenir bon', description: 'Atteindre la manche 5.', icon: 'icon_hourglass', reward: { type: 'weapon', id: 'lightning' },
    check: (c) => bestWave(c) >= 5,
  },
  {
    id: 'slimeKing', name: 'Régicide', description: 'Vaincre le Roi Gluant.', icon: 'icon_crown', reward: { type: 'relic', id: 'volatileSouls' },
    check: (c) => bossKilled(c, 'slimeKing'),
  },
  {
    id: 'hunter', name: 'Chasseur', description: 'Vaincre 1 000 ennemis (au total).', icon: 'icon_skull', reward: { type: 'weapon', id: 'boomerang' },
    check: (c) => total(c, c.save.stats.totalKills, (r) => r.kills) >= 1000,
    progress: (c) => [total(c, c.save.stats.totalKills, (r) => r.kills), 1000],
  },
  {
    id: 'evolution', name: 'Métamorphose', description: 'Faire évoluer une arme.', icon: 'icon_wand', reward: { type: 'weapon', id: 'flask' },
    check: (c) => total(c, c.save.stats.evolutions, (r) => r.evolutions) >= 1,
  },
  {
    id: 'lich', name: 'Briseur de phylactère', description: 'Vaincre la Liche Ancestrale.', icon: 'lich', reward: { type: 'biome', id: 'forest' },
    check: (c) => bossKilled(c, 'lich'),
  },
  {
    id: 'wave10', name: 'Veilleur', description: 'Atteindre la manche 10.', icon: 'icon_book', reward: { type: 'character', id: 'priestess' },
    check: (c) => bestWave(c) >= 10,
  },
  {
    id: 'victory', name: 'Aube nouvelle', description: 'Remporter une partie.', icon: 'icon_star', reward: { type: 'biome', id: 'castle' },
    check: (c) => wins(c) >= 1,
  },
  {
    id: 'collector', name: 'Collectionneur', description: 'Ouvrir 25 coffres (au total).', icon: 'chest', reward: { type: 'character', id: 'alchemist' },
    check: (c) => total(c, c.save.stats.chestsOpened, (r) => r.chests) >= 25,
    progress: (c) => [total(c, c.save.stats.chestsOpened, (r) => r.chests), 25],
  },
  {
    id: 'level30', name: 'Puissance montante', description: 'Atteindre le niveau 30 en une partie.', icon: 'icon_gauntlet', reward: { type: 'relic', id: 'arcaneEcho' },
    check: (c) => Math.max(c.save.stats.bestLevel, c.run?.level ?? 0) >= 30,
  },
  {
    id: 'untouchable', name: 'Intouchable', description: 'Terminer une manche (à partir de la 3e) sans être touché.', icon: 'icon_cloak', reward: { type: 'relic', id: 'divineAegis' },
    check: (c) => total(c, c.save.stats.noHitWaves, (r) => r.noHitWaves) >= 1,
  },
  {
    id: 'slayer', name: 'Massacreur', description: 'Vaincre 5 000 ennemis (au total).', icon: 'icon_skull', reward: { type: 'relic', id: 'kingsCrown' },
    check: (c) => total(c, c.save.stats.totalKills, (r) => r.kills) >= 5000,
    progress: (c) => [total(c, c.save.stats.totalKills, (r) => r.kills), 5000],
  },
  {
    id: 'synergy', name: 'Alchimie martiale', description: 'Activer une synergie entre deux armes.', icon: 'icon_ring', reward: { type: 'relic', id: 'quiver' },
    check: (c) => c.save.stats.synergies.length > 0 || (c.run?.synergies ?? 0) > 0,
  },
  {
    id: 'arsenal', name: 'Arsenal complet', description: 'Posséder 6 armes en même temps.', icon: 'icon_sword', reward: { type: 'gold', amount: 200 },
    check: (c) => (c.run?.weapons ?? 0) >= 6,
  },
  {
    id: 'rich', name: 'Fortune', description: 'Gagner 1 000 or en une seule partie.', icon: 'coin', reward: { type: 'gold', amount: 300 },
    check: (c) => (c.run?.gold ?? 0) >= 1000,
  },
  {
    id: 'speedrun', name: 'Exécution', description: 'Vaincre un boss en moins de 30 secondes.', icon: 'icon_fang', reward: { type: 'gold', amount: 300 },
    check: (c) => (c.run?.fastestBossKill ?? Infinity) < 30,
  },
  {
    id: 'forestWin', name: 'Seigneur de la forêt', description: 'Gagner dans la Forêt maudite.', icon: 'prop_glowshrooms', reward: { type: 'gold', amount: 500 },
    check: (c) => winIn(c, 'forest'),
  },
  {
    id: 'castleWin', name: 'Fin du Comte', description: 'Gagner au Château du Comte.', icon: 'vampire', reward: { type: 'gold', amount: 1000 },
    check: (c) => winIn(c, 'castle'),
  },
  {
    id: 'danger3', name: 'Téméraire', description: 'Gagner en danger 3 ou plus.', icon: 'icon_spikes', reward: { type: 'gold', amount: 800 },
    check: (c) => c.save.maxDangerWon >= 3 || (!!c.run?.victory && c.run.danger >= 3),
  },
  {
    id: 'danger5', name: 'Immortel', description: 'Gagner en danger 5.', icon: 'icon_phoenix', reward: { type: 'gold', amount: 3000 },
    check: (c) => c.save.maxDangerWon >= 5 || (!!c.run?.victory && c.run.danger >= 5),
  },
  {
    id: 'versatile', name: 'Polyvalent', description: 'Gagner avec 3 héros différents.', icon: 'icon_shield', reward: { type: 'gold', amount: 600 },
    check: (c) => {
      const heroes = new Set(Object.keys(c.save.stats.winsByCharacter));
      if (c.run?.victory) heroes.add(c.run.character);
      return heroes.size >= 3;
    },
    progress: (c) => [new Set([...Object.keys(c.save.stats.winsByCharacter), ...(c.run?.victory ? [c.run.character] : [])]).size, 3],
  },
  {
    id: 'endless20', name: 'Nuit sans fin', description: 'Atteindre la manche 20 en mode infini.', icon: 'icon_cloak', reward: { type: 'gold', amount: 500 },
    check: (c) => c.save.stats.bestEndlessWave >= 20 || (!!c.run?.endless && c.run.wave >= 20),
  },
  {
    id: 'daily', name: 'Défi relevé', description: 'Atteindre la manche 10 lors d’un défi du jour.', icon: 'icon_scroll', reward: { type: 'gold', amount: 300 },
    check: (c) => !!c.run?.daily && c.run.wave >= 10,
  },
  {
    id: 'scholar', name: 'Érudit', description: 'Découvrir tous les ennemis du bestiaire.', icon: 'icon_book', reward: { type: 'gold', amount: 500 },
    check: (c) => BESTIARY_IDS.every((id) => (c.save.bestiary[id] ?? 0) > 0 || (!!c.run && !c.run.committed && (c.run.killsByType.get(id) ?? 0) > 0)),
    progress: (c) => [BESTIARY_IDS.filter((id) => (c.save.bestiary[id] ?? 0) > 0 || (!!c.run && !c.run.committed && (c.run.killsByType.get(id) ?? 0) > 0)).length, BESTIARY_IDS.length],
  },
];
