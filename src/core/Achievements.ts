// Vérifie les succès, applique leurs récompenses et prévient l'interface.
import { ACHIEVEMENTS, type AchievementDef, type Reward, type RunSnapshot } from '../data/achievements';
import { getBiome } from '../data/biomes';
import { CHARACTERS } from '../data/characters';
import { getRelic } from '../data/relics';
import type { CharacterDef } from '../data/types';
import { getWeapon } from '../data/weapons';
import type { World } from '../game/World';
import type { SaveManager } from './SaveManager';

export function rewardText(reward: Reward): string {
  switch (reward.type) {
    case 'gold':
      return `+${reward.amount} or`;
    case 'weapon':
      return `Nouvelle arme : ${getWeapon(reward.id).name}`;
    case 'relic':
      return `Nouvelle relique : ${getRelic(reward.id).name}`;
    case 'character':
      return `Nouveau héros : ${(CHARACTERS as Record<string, CharacterDef>)[reward.id]?.name ?? reward.id}`;
    case 'biome':
      return `Nouvelle carte : ${getBiome(reward.id).name}`;
  }
}

export function snapshotRun(world: World, characterId: string, danger: number, daily: boolean, committed: boolean): RunSnapshot {
  const run = world.run;
  return {
    committed,
    kills: run.kills,
    wave: world.director.wave,
    level: run.level,
    gold: run.gold,
    victory: run.victory,
    endless: run.endless,
    character: characterId,
    biome: world.biome.id,
    danger,
    daily,
    chests: run.chests,
    evolutions: run.evolutions,
    weapons: world.heroes[0].inventory.weapons.length,
    synergies: world.heroes[0].synergies.active.size,
    noHitWaves: run.noHitWaves,
    bossKills: run.bossKills,
    fastestBossKill: run.fastestBossKill,
    killsByType: run.killsByType,
  };
}

export class AchievementTracker {
  constructor(
    private readonly save: SaveManager,
    private readonly onUnlock: (def: AchievementDef) => void,
  ) {}

  isUnlocked(id: string): boolean {
    return this.save.data.achievements.includes(id);
  }

  /** Vérifie tous les succès non obtenus ; renvoie ceux qui viennent d'être débloqués. */
  check(run: RunSnapshot | null): AchievementDef[] {
    const unlocked: AchievementDef[] = [];
    const ctx = { save: this.save.data, run };
    for (const def of ACHIEVEMENTS) {
      if (this.isUnlocked(def.id)) continue;
      if (!def.check(ctx)) continue;
      this.save.data.achievements.push(def.id);
      this.apply(def.reward);
      unlocked.push(def);
    }
    if (unlocked.length) {
      this.save.save();
      for (const def of unlocked) this.onUnlock(def);
    }
    return unlocked;
  }

  private apply(reward: Reward): void {
    const d = this.save.data;
    const add = (list: string[], id: string) => {
      if (!list.includes(id)) list.push(id);
    };
    switch (reward.type) {
      case 'gold':
        d.gold += reward.amount;
        break;
      case 'weapon':
        add(d.unlocks.weapons, reward.id);
        break;
      case 'relic':
        add(d.unlocks.relics, reward.id);
        break;
      case 'biome':
        add(d.unlocks.biomes, reward.id);
        break;
      case 'character':
        add(d.unlockedCharacters, reward.id);
        break;
    }
  }
}
