// Sauvegarde locale (localStorage) : or, améliorations, déblocages, succès, bestiaire, records, options.
import { LOCKED_BIOMES, LOCKED_RELICS, LOCKED_WEAPONS } from '../data/unlocks';

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra' | 'custom';

export interface GraphicsSettings {
  preset: QualityPreset;
  /** Résolution de rendu (fraction de la résolution de l'écran). */
  renderScale: number;
  lighting: 'off' | 'low' | 'high';
  bloom: boolean;
  shadows: boolean;
  particles: 'low' | 'medium' | 'high';
  corpses: boolean;
  /** Images par seconde maximum (0 = illimité). */
  fpsLimit: number;
  showFps: boolean;
  vignette: number;
}

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilitySettings {
  colorblind: ColorblindMode;
  reduceFlashes: boolean;
  /** Intensité des tremblements d'écran (0 à 1). */
  screenShake: number;
  /** Taille de l'interface. */
  uiScale: number;
  highContrastBullets: boolean;
}

export interface GameplaySettings {
  damageNumbers: boolean;
  autoPause: boolean;
  offscreenIndicators: boolean;
  nameTags: boolean;
}

export interface Settings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muteUnfocused: boolean;
  rumble: boolean;
  /** Touches personnalisées (null = touches par défaut). */
  keybinds: Record<string, string[]> | null;
  /** Pseudo affiché en multijoueur. */
  playerName: string;
  /** Préréglage graphique déjà choisi automatiquement selon la carte graphique. */
  gpuChecked: boolean;
  graphics: GraphicsSettings;
  accessibility: AccessibilitySettings;
  gameplay: GameplaySettings;
}

export const GRAPHICS_PRESETS: Record<Exclude<QualityPreset, 'custom'>, Omit<GraphicsSettings, 'preset' | 'showFps' | 'fpsLimit'> & { fpsLimit: number }> = {
  low: { renderScale: 0.75, lighting: 'off', bloom: false, shadows: false, particles: 'low', corpses: false, vignette: 0.6, fpsLimit: 60 },
  medium: { renderScale: 1, lighting: 'low', bloom: false, shadows: true, particles: 'medium', corpses: true, vignette: 0.8, fpsLimit: 60 },
  high: { renderScale: 1, lighting: 'high', bloom: true, shadows: true, particles: 'high', corpses: true, vignette: 0.8, fpsLimit: 0 },
  ultra: { renderScale: 1, lighting: 'high', bloom: true, shadows: true, particles: 'high', corpses: true, vignette: 0.9, fpsLimit: 0 },
};

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.9,
    sfxVolume: 0.7,
    musicVolume: 0.5,
    muteUnfocused: true,
    rumble: true,
    keybinds: null,
    playerName: 'Joueur',
    gpuChecked: false,
    graphics: { preset: 'high', showFps: false, ...GRAPHICS_PRESETS.high },
    accessibility: { colorblind: 'none', reduceFlashes: false, screenShake: 1, uiScale: 1, highContrastBullets: false },
    gameplay: { damageNumbers: true, autoPause: true, offscreenIndicators: true, nameTags: true },
  };
}

/** Fusionne des options (éventuellement d'une ancienne version) avec les valeurs par défaut. */
function mergeSettings(raw: Record<string, unknown> | undefined): Settings {
  const d = defaultSettings();
  if (!raw) return d;
  const old = raw as Record<string, unknown>;
  const s: Settings = {
    ...d,
    ...(raw as Partial<Settings>),
    graphics: { ...d.graphics, ...((raw.graphics as object) ?? {}) },
    accessibility: { ...d.accessibility, ...((raw.accessibility as object) ?? {}) },
    gameplay: { ...d.gameplay, ...((raw.gameplay as object) ?? {}) },
  };
  // Anciennes options (version 1) à plat.
  if (typeof old.screenShake === 'boolean') s.accessibility.screenShake = old.screenShake ? 1 : 0;
  if (typeof old.damageNumbers === 'boolean') s.gameplay.damageNumbers = old.damageNumbers;
  if (typeof old.lighting === 'boolean' && !raw.graphics) s.graphics.lighting = old.lighting ? 'high' : 'off';
  delete (s as unknown as Record<string, unknown>).screenShake;
  delete (s as unknown as Record<string, unknown>).damageNumbers;
  delete (s as unknown as Record<string, unknown>).lighting;
  return s;
}

export interface SaveStats {
  runs: number;
  wins: number;
  bestWave: number;
  totalKills: number;
  totalGold: number;
  bestLevel: number;
  chestsOpened: number;
  evolutions: number;
  noHitWaves: number;
  bestEndlessWave: number;
  /** Meilleur temps de survie en mode Survie (secondes). */
  bestSurvivalTime: number;
  coopWins: number;
  onlineGames: number;
  bossKills: Record<string, number>;
  winsByCharacter: Record<string, number>;
  winsByBiome: Record<string, number>;
  synergies: string[];
}

export interface DailyRecord {
  date: string;
  bestWave: number;
  bestKills: number;
  attempts: number;
  won: boolean;
}

export interface SaveData {
  version: 2;
  gold: number;
  meta: Record<string, number>;
  unlockedCharacters: string[];
  /** Éléments verrouillés au départ qui ont été débloqués. */
  unlocks: { weapons: string[]; relics: string[]; biomes: string[] };
  achievements: string[];
  /** Plus haut niveau de danger remporté (-1 : aucune victoire). */
  maxDangerWon: number;
  bestiary: Record<string, number>;
  stats: SaveStats;
  daily: DailyRecord;
  settings: Settings;
}

const KEY = 'nuit-eternelle-save-v1';

function defaults(): SaveData {
  return {
    version: 2,
    gold: 0,
    meta: {},
    unlockedCharacters: ['knight', 'mage', 'rogue'],
    unlocks: { weapons: [], relics: [], biomes: [] },
    achievements: [],
    maxDangerWon: -1,
    bestiary: {},
    stats: {
      runs: 0,
      wins: 0,
      bestWave: 0,
      totalKills: 0,
      totalGold: 0,
      bestLevel: 0,
      chestsOpened: 0,
      evolutions: 0,
      noHitWaves: 0,
      bestEndlessWave: 0,
      bestSurvivalTime: 0,
      coopWins: 0,
      onlineGames: 0,
      bossKills: {},
      winsByCharacter: {},
      winsByBiome: {},
      synergies: [],
    },
    daily: { date: '', bestWave: 0, bestKills: 0, attempts: 0, won: false },
    settings: defaultSettings(),
  };
}

export class SaveManager {
  data: SaveData;

  constructor() {
    this.data = this.load();
  }

  /** Fusionne une sauvegarde (éventuellement ancienne ou partielle) avec les valeurs par défaut. */
  private merge(parsed: Partial<SaveData>): SaveData {
    const base = defaults();
    return {
      ...base,
      ...parsed,
      version: 2,
      meta: { ...base.meta, ...parsed.meta },
      unlocks: { ...base.unlocks, ...parsed.unlocks },
      achievements: parsed.achievements ?? [],
      bestiary: { ...parsed.bestiary },
      stats: { ...base.stats, ...parsed.stats },
      daily: { ...base.daily, ...parsed.daily },
      settings: mergeSettings(parsed.settings as unknown as Record<string, unknown>),
      unlockedCharacters: Array.from(new Set([...base.unlockedCharacters, ...(parsed.unlockedCharacters ?? [])])),
    };
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return this.merge(JSON.parse(raw) as Partial<SaveData>);
    } catch {
      return defaults();
    }
  }

  save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Stockage indisponible (navigation privée...) : la partie continue sans sauvegarde.
    }
  }

  metaLevel(id: string): number {
    return this.data.meta[id] ?? 0;
  }

  isWeaponUnlocked(id: string): boolean {
    return !LOCKED_WEAPONS.includes(id) || this.data.unlocks.weapons.includes(id);
  }

  isRelicUnlocked(id: string): boolean {
    return !LOCKED_RELICS.includes(id) || this.data.unlocks.relics.includes(id);
  }

  isBiomeUnlocked(id: string): boolean {
    return !LOCKED_BIOMES.includes(id) || this.data.unlocks.biomes.includes(id);
  }

  /** Niveau de danger maximum sélectionnable. */
  get maxDangerUnlocked(): number {
    return Math.min(5, this.data.maxDangerWon + 1);
  }

  /** Exporte la sauvegarde (fichier JSON). */
  export(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /** Importe une sauvegarde ; renvoie false si le contenu est invalide. */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as Partial<SaveData>;
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.gold !== 'number') return false;
      const settings = this.data.settings;
      this.data = this.merge(parsed);
      this.data.settings = settings;
      this.save();
      return true;
    } catch {
      return false;
    }
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = defaults();
    this.data.settings = settings;
    this.save();
  }
}
