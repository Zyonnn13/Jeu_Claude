// Génération des choix proposés à un héros : montée de niveau, coffres, reliques.
import { RARITY_INFO } from '../../data/balance';
import { getPassive, PASSIVE_IDS } from '../../data/passives';
import { RELIC_LIST } from '../../data/relics';
import type { Rarity, RelicDef } from '../../data/types';
import { BASE_WEAPON_IDS, getWeapon } from '../../data/weapons';
import type { Hero } from '../Hero';
import type { World } from '../World';
import { healPlayer } from './Combat';

export interface Offer {
  key: string;
  kind: 'weapon' | 'passive' | 'evolution' | 'relic' | 'gold' | 'heal';
  icon: string;
  name: string;
  /** Étiquette courte : « Nouveau ! », « Niv. 3 », « Évolution »... */
  tag: string;
  description: string;
  rarity?: Rarity;
  /** Niveau atteint / niveau max, pour l'affichage des pastilles. */
  level?: { next: number; max: number };
  /** Synergie(s) que ce choix activerait. */
  synergy?: string;
  apply(): void;
}

/** Version sérialisable d'une offre (envoyée aux joueurs en ligne). */
export type OfferView = Omit<Offer, 'apply'>;

export function offerView(o: Offer): OfferView {
  const { apply: _apply, ...view } = o;
  return view;
}

interface Candidate {
  offer: Offer;
  weight: number;
}

function evolutionOffer(hero: Hero, fromId: string, intoId: string): Offer {
  const into = getWeapon(intoId);
  return {
    key: `e:${fromId}`,
    kind: 'evolution',
    icon: into.icon,
    name: into.name,
    tag: 'Évolution !',
    description: into.description,
    rarity: 'legendary',
    apply: () => hero.inventory.evolve(fromId),
  };
}

function weaponCandidates(world: World, hero: Hero): Candidate[] {
  const inv = hero.inventory;
  const out: Candidate[] = [];
  for (const w of inv.weapons) {
    if (inv.canEvolve(w)) {
      out.push({ weight: 5, offer: evolutionOffer(hero, w.def.id, w.def.evolution!.into) });
    } else if (!w.isMaxLevel) {
      const next = w.level + 1;
      out.push({
        weight: 3,
        offer: {
          key: `w:${w.def.id}`,
          kind: 'weapon',
          icon: w.def.icon,
          name: w.def.name,
          tag: `Niv. ${next}`,
          description: w.def.levels[w.level - 1].text,
          level: { next, max: w.maxLevel },
          apply: () => inv.levelUpWeapon(w.def.id),
        },
      });
    }
  }
  if (!inv.weaponSlotsFull) {
    for (const id of BASE_WEAPON_IDS) {
      if (inv.ownsWeaponLine(id) || !world.setup.isWeaponUnlocked(id)) continue;
      const def = getWeapon(id);
      const synergies = hero.synergies.wouldComplete(id);
      out.push({
        weight: 1.6,
        offer: {
          key: `w:${id}`,
          kind: 'weapon',
          icon: def.icon,
          name: def.name,
          tag: 'Nouveau !',
          description: def.description,
          synergy: synergies.length ? synergies.map((s) => s.name).join(', ') : undefined,
          level: { next: 1, max: def.levels.length + 1 },
          apply: () => inv.addWeapon(id),
        },
      });
    }
  }
  return out;
}

function passiveCandidates(hero: Hero): Candidate[] {
  const inv = hero.inventory;
  const out: Candidate[] = [];
  for (const id of PASSIVE_IDS) {
    const def = getPassive(id);
    const level = inv.passiveLevel(id);
    if (level >= def.maxLevel) continue;
    if (level === 0 && inv.passiveSlotsFull) continue;
    // Signale si ce passif permet de faire évoluer une arme possédée.
    const enables = inv.weapons.find((w) => w.def.evolution?.passive === id);
    out.push({
      weight: level > 0 ? 2.5 : 1.2,
      offer: {
        key: `p:${id}`,
        kind: 'passive',
        icon: def.icon,
        name: def.name,
        tag: level === 0 ? 'Nouveau !' : `Niv. ${level + 1}`,
        description: def.description + (enables && level === 0 ? ` — permet l’évolution : ${getWeapon(enables.def.evolution!.into).name}` : ''),
        level: { next: level + 1, max: def.maxLevel },
        apply: () => inv.addOrLevelPassive(id),
      },
    });
  }
  return out;
}

function fillerOffers(world: World, hero: Hero): Offer[] {
  const gold = 10 + world.director.wave * 3;
  return [
    {
      key: 'gold',
      kind: 'gold',
      icon: 'coin',
      name: 'Bourse d’or',
      tag: 'Bonus',
      description: `+${gold} pièces d’or`,
      apply: () => void world.addGold(gold, hero),
    },
    {
      key: 'heal',
      kind: 'heal',
      icon: 'chicken',
      name: 'Festin',
      tag: 'Bonus',
      description: 'Restaure 40% des PV',
      apply: () => healPlayer(world, hero, hero.maxHp * 0.4),
    },
  ];
}

function pickWeighted(world: World, candidates: Candidate[], count: number): Offer[] {
  const pool = [...candidates];
  const out: Offer[] = [];
  while (out.length < count && pool.length) {
    const c = world.rng.weighted(pool, (x) => x.weight);
    pool.splice(pool.indexOf(c), 1);
    if (!out.some((o) => o.key === c.offer.key)) out.push(c.offer);
  }
  return out;
}

/** Nombre de choix : 3, parfois 4 avec beaucoup de chance. */
function choiceCount(world: World, hero: Hero): number {
  const luck = hero.stats.get('luck');
  return world.rng.chance(Math.max(0, luck - 1) * 0.8) ? 4 : 3;
}

export function levelUpOffers(world: World, hero: Hero): Offer[] {
  const count = choiceCount(world, hero);
  const offers = pickWeighted(world, [...weaponCandidates(world, hero), ...passiveCandidates(hero)], count);
  // Tout est au niveau max : on complète avec de l'or et des soins.
  for (const filler of fillerOffers(world, hero)) if (offers.length < 3) offers.push(filler);
  return offers;
}

export function chestOffers(world: World, hero: Hero): Offer[] {
  const evolutions = hero.inventory.evolutionsAvailable().map((w) => evolutionOffer(hero, w.def.id, w.def.evolution!.into));
  const offers: Offer[] = evolutions.slice(0, 1);
  const rest = pickWeighted(
    world,
    [...weaponCandidates(world, hero), ...passiveCandidates(hero)].filter((c) => !offers.some((o) => o.key === c.offer.key)),
    3 - offers.length,
  );
  offers.push(...rest);
  if (offers.length < 2) offers.push(...fillerOffers(world, hero).slice(0, 2 - offers.length));
  return offers;
}

function rollRarity(world: World, hero: Hero): Rarity {
  const wave = world.director.wave;
  const luck = hero.stats.get('luck');
  const weights: Record<Rarity, number> = {
    common: RARITY_INFO.common.weight,
    rare: (RARITY_INFO.rare.weight + wave) * luck,
    epic: (RARITY_INFO.epic.weight + wave * 0.6) * luck,
    legendary: (RARITY_INFO.legendary.weight + wave * 0.25) * luck,
  };
  return world.rng.weighted(Object.keys(weights) as Rarity[], (r) => weights[r]);
}

function relicOffer(def: RelicDef, hero: Hero): Offer {
  const count = hero.relics.count(def.id);
  return {
    key: `r:${def.id}`,
    kind: 'relic',
    icon: def.icon,
    name: def.name,
    tag: RARITY_INFO[def.rarity].label + (count > 0 ? ` · ×${count + 1}` : ''),
    description: def.description,
    rarity: def.rarity,
    apply: () => hero.relics.add(def.id),
  };
}

export function relicOffers(world: World, hero: Hero): Offer[] {
  const available = RELIC_LIST.filter((r) => hero.relics.canOffer(r) && world.setup.isRelicUnlocked(r.id));
  const chosen: RelicDef[] = [];
  for (let i = 0; i < 3; i++) {
    const rarity = rollRarity(world, hero);
    let pool = available.filter((r) => r.rarity === rarity && !chosen.includes(r));
    if (!pool.length) pool = available.filter((r) => !chosen.includes(r));
    if (!pool.length) break;
    chosen.push(world.rng.pick(pool));
  }
  return chosen.map((def) => relicOffer(def, hero));
}
