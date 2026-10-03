// Reliques d'un héros : bonus de statistiques et effets déclenchés par des événements.
import { getRelic } from '../../data/relics';
import type { RelicDef } from '../../data/types';
import type { Hero } from '../Hero';
import type { World } from '../World';
import { explode, healPlayer } from './Combat';

export class RelicSystem {
  readonly owned = new Map<string, number>();

  constructor(
    private readonly world: World,
    private readonly hero: Hero,
  ) {
    world.events.on('enemy:killed', ({ enemy, cause, killer }) => {
      if (cause === 'waveEnd' || killer !== hero) return;
      for (const [id, count] of this.owned) {
        const effect = getRelic(id).effect;
        if (!effect) continue;
        if (effect.type === 'healOnKill' && world.rng.chance(effect.chance * count)) {
          healPlayer(world, hero, effect.amount);
        } else if (effect.type === 'explodeOnKill' && cause !== 'explosion' && world.rng.chance(effect.chance * count)) {
          const { x, y } = enemy;
          const damage = effect.damage * hero.stats.get('might');
          world.defer(() => explode(world, x, y, effect.radius * hero.stats.get('area'), damage, { color: '#b06de0', hero }));
        }
      }
    });
    world.events.on('player:hurt', ({ hero: hurt }) => {
      if (hurt !== hero) return;
      for (const [id, count] of this.owned) {
        const effect = getRelic(id).effect;
        if (effect?.type === 'thorns') {
          const damage = effect.damage * count * hero.stats.get('might');
          world.defer(() => explode(world, hero.x, hero.y, effect.radius, damage, { color: '#b7b9c7', cause: 'thorns', hero }));
        }
      }
    });
  }

  count(id: string): number {
    return this.owned.get(id) ?? 0;
  }

  canOffer(def: RelicDef): boolean {
    return !(def.unique && this.owned.has(def.id));
  }

  add(id: string): void {
    const def = getRelic(id);
    const count = this.count(id) + 1;
    this.owned.set(id, count);
    if (def.mods) {
      this.hero.stats.set(
        `relic:${id}`,
        def.mods.map((m) => ({ stat: m.stat, add: (m.add ?? 0) * count, mul: m.mul ? m.mul * count : undefined })),
      );
    }
    if (def.effect?.type === 'healOnPick') {
      const amount = def.effect.amount;
      this.world.defer(() => healPlayer(this.world, this.hero, amount));
    }
  }

  list(): { def: RelicDef; count: number }[] {
    return [...this.owned].map(([id, count]) => ({ def: getRelic(id), count }));
  }
}
