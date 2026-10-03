// Un héros dans la partie : chaque joueur (solo, coop locale ou en ligne) en contrôle un.
// Il possède ses propres statistiques, armes, objets, reliques et synergies.
import { META_UPGRADES } from '../data/metaUpgrades';
import type { CharacterDef } from '../data/types';
import type { Vec2 } from '../engine/math';
import { Player } from './entities/Player';
import type { HeroView } from './render/WorldView';
import type { AuraVisual } from './weapons/Weapon';
import { Stats } from './Stats';
import { Inventory } from './systems/Inventory';
import { RelicSystem } from './systems/RelicSystem';
import { SynergySystem } from './systems/SynergySystem';
import type { World } from './World';

export interface HeroSetup {
  character: CharacterDef;
  name: string;
  /** Améliorations permanentes du joueur (chacun a sa propre sauvegarde). */
  meta: Record<string, number>;
  /** Identifiant réseau (null pour un joueur local). */
  netId?: string | null;
}

/** Couleurs d'identification des joueurs (pseudo, indicateurs). */
export const HERO_COLORS = ['#ffd84a', '#6fe3f0', '#f070b0', '#8fd94f'];

export class Hero {
  readonly entity: Player;
  readonly stats = new Stats();
  readonly inventory: Inventory;
  readonly relics: RelicSystem;
  readonly synergies: SynergySystem;
  readonly name: string;
  readonly netId: string | null;
  readonly color: string;
  /** Direction de déplacement demandée (clavier, manette ou réseau). */
  move: Vec2 = { x: 0, y: 0 };
  rerolls = 0;
  revivalsUsed = 0;
  /** À terre (multijoueur) : un coéquipier peut le relever. */
  downed = false;
  reviveProgress = 0;
  /** A quitté la partie (déconnexion). */
  left = false;
  private lastMaxHp: number;
  private statsVersion = -1;

  constructor(
    readonly world: World,
    readonly index: number,
    setup: HeroSetup,
  ) {
    this.entity = new Player(setup.character);
    this.name = setup.name;
    this.netId = setup.netId ?? null;
    this.color = HERO_COLORS[index % HERO_COLORS.length];

    for (const meta of META_UPGRADES) {
      const level = setup.meta[meta.id] ?? 0;
      if (level > 0) this.stats.set(`meta:${meta.id}`, [{ ...meta.mod, add: (meta.mod.add ?? 0) * level }]);
    }
    this.stats.set('character', setup.character.mods);
    if (world.mods.playerMods.length) this.stats.set('mutators', world.mods.playerMods);
    this.lastMaxHp = this.stats.get('maxHp');
    this.entity.hp = this.lastMaxHp;
    this.rerolls = Math.round(this.stats.get('rerolls'));

    this.inventory = new Inventory(world, this);
    this.relics = new RelicSystem(world, this);
    this.synergies = new SynergySystem(world, this);
  }

  get x(): number {
    return this.entity.x;
  }

  get y(): number {
    return this.entity.y;
  }

  get character(): CharacterDef {
    return this.entity.character;
  }

  /** En jeu et capable d'agir. */
  get alive(): boolean {
    return !this.downed && !this.entity.dead && !this.left;
  }

  get maxHp(): number {
    return this.stats.get('maxHp');
  }

  /** Données d'affichage du héros. */
  view(): HeroView {
    const p = this.entity;
    return {
      index: this.index,
      name: this.name,
      color: this.color,
      sprite: p.sprite,
      x: p.x,
      y: p.y,
      facing: p.facing,
      moving: p.moving,
      anim: p.anim,
      invulnerable: p.invulnerable,
      flash: p.flash,
      hp: p.hp,
      maxHp: this.maxHp,
      dead: p.dead || this.left,
      downed: this.downed,
      reviveProgress: this.reviveProgress,
      auras: this.inventory.weapons.map((w) => w.aura()).filter((a): a is AuraVisual => !!a),
    };
  }

  /** Applique les changements de PV max (un bonus de PV max soigne d'autant). */
  syncStats(): void {
    if (this.stats.version === this.statsVersion) return;
    this.statsVersion = this.stats.version;
    const max = this.stats.get('maxHp');
    if (max > this.lastMaxHp && this.alive) this.entity.hp += max - this.lastMaxHp;
    this.entity.hp = Math.min(this.entity.hp, max);
    this.lastMaxHp = max;
  }
}
