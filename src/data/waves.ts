// Déroulement des 15 manches. Au-delà (mode infini), les manches sont générées.
import type { WaveDef } from './types';

export const WAVES: WaveDef[] = [
  // 1
  { duration: 30, spawnRate: [1.6, 2.6], maxAlive: 50, pool: [{ enemy: 'bat', weight: 6 }, { enemy: 'slime', weight: 4 }] },
  // 2
  {
    duration: 35, spawnRate: [2.0, 3.2], maxAlive: 70,
    pool: [{ enemy: 'bat', weight: 5 }, { enemy: 'slime', weight: 3 }, { enemy: 'zombie', weight: 3 }],
    events: [{ at: 0.5, type: 'ring', enemy: 'bat', count: 12 }],
  },
  // 3
  {
    duration: 40, spawnRate: [2.4, 3.6], maxAlive: 90,
    pool: [{ enemy: 'bat', weight: 4 }, { enemy: 'zombie', weight: 4 }, { enemy: 'skeleton', weight: 3 }],
    elites: [{ at: 0.6, enemy: 'zombie' }],
  },
  // 4
  {
    duration: 45, spawnRate: [2.8, 4.0], maxAlive: 110,
    pool: [{ enemy: 'bat', weight: 3 }, { enemy: 'zombie', weight: 3 }, { enemy: 'skeleton', weight: 4 }, { enemy: 'eye', weight: 2 }],
    elites: [{ at: 0.5, enemy: 'skeleton' }],
    events: [{ at: 0.75, type: 'ring', enemy: 'bat', count: 20 }],
  },
  // 5 — Boss : Roi Gluant
  {
    duration: 0, spawnRate: [1.6, 1.6], maxAlive: 70, boss: 'slimeKing',
    pool: [{ enemy: 'slime', weight: 5 }, { enemy: 'bat', weight: 3 }],
  },
  // 6
  {
    duration: 50, spawnRate: [3.0, 4.4], maxAlive: 140,
    pool: [{ enemy: 'skeleton', weight: 4 }, { enemy: 'ghost', weight: 3 }, { enemy: 'eye', weight: 3 }, { enemy: 'zombie', weight: 2 }],
    elites: [{ at: 0.5, enemy: 'ghost' }],
  },
  // 7
  {
    duration: 50, spawnRate: [2.8, 4.4], maxAlive: 160,
    pool: [{ enemy: 'skeleton', weight: 3 }, { enemy: 'ghost', weight: 3 }, { enemy: 'cultist', weight: 2 }, { enemy: 'bat', weight: 4 }],
    elites: [{ at: 0.4, enemy: 'eye' }, { at: 0.8, enemy: 'cultist' }],
    events: [{ at: 0.6, type: 'ring', enemy: 'bat', count: 30 }],
  },
  // 8
  {
    duration: 55, spawnRate: [3.0, 4.8], maxAlive: 180,
    pool: [{ enemy: 'zombie', weight: 3 }, { enemy: 'golem', weight: 2 }, { enemy: 'ghost', weight: 3 }, { enemy: 'cultist', weight: 2 }],
    elites: [{ at: 0.5, enemy: 'golem' }],
    events: [{ at: 0.3, type: 'burst', enemy: 'skeleton', count: 16 }],
  },
  // 9
  {
    duration: 55, spawnRate: [3.2, 5.2], maxAlive: 200,
    pool: [{ enemy: 'skeleton', weight: 3 }, { enemy: 'golem', weight: 2 }, { enemy: 'eye', weight: 3 }, { enemy: 'cultist', weight: 2 }, { enemy: 'ghost', weight: 2 }],
    elites: [{ at: 0.3, enemy: 'skeleton' }, { at: 0.7, enemy: 'golem' }],
    events: [{ at: 0.5, type: 'ring', enemy: 'zombie', count: 30 }],
  },
  // 10 — Boss : Liche
  {
    duration: 0, spawnRate: [1.8, 2.4], maxAlive: 120, boss: 'lich',
    pool: [{ enemy: 'skeleton', weight: 5 }, { enemy: 'ghost', weight: 3 }],
  },
  // 11
  {
    duration: 55, spawnRate: [3.6, 5.6], maxAlive: 240,
    pool: [
      { enemy: 'bat', weight: 3 }, { enemy: 'zombie', weight: 2 }, { enemy: 'skeleton', weight: 3 }, { enemy: 'eye', weight: 2 },
      { enemy: 'ghost', weight: 2 }, { enemy: 'cultist', weight: 2 }, { enemy: 'golem', weight: 1 },
    ],
    elites: [{ at: 0.3, enemy: 'eye' }, { at: 0.7, enemy: 'golem' }],
  },
  // 12
  {
    duration: 60, spawnRate: [4.0, 6.0], maxAlive: 260,
    pool: [{ enemy: 'skeleton', weight: 3 }, { enemy: 'ghost', weight: 3 }, { enemy: 'cultist', weight: 2 }, { enemy: 'golem', weight: 2 }, { enemy: 'eye', weight: 2 }],
    elites: [{ at: 0.25, enemy: 'cultist' }, { at: 0.6, enemy: 'ghost' }, { at: 0.9, enemy: 'golem' }],
    events: [{ at: 0.4, type: 'ring', enemy: 'bat', count: 40 }, { at: 0.8, type: 'ring', enemy: 'ghost', count: 24 }],
  },
  // 13
  {
    duration: 60, spawnRate: [4.2, 6.4], maxAlive: 280,
    pool: [{ enemy: 'zombie', weight: 3 }, { enemy: 'golem', weight: 2 }, { enemy: 'eye', weight: 3 }, { enemy: 'cultist', weight: 3 }, { enemy: 'skeleton', weight: 2 }],
    elites: [{ at: 0.3, enemy: 'golem' }, { at: 0.6, enemy: 'eye' }, { at: 0.85, enemy: 'cultist' }],
    events: [{ at: 0.5, type: 'burst', enemy: 'golem', count: 8 }],
  },
  // 14
  {
    duration: 60, spawnRate: [4.6, 7.0], maxAlive: 300,
    pool: [
      { enemy: 'bat', weight: 2 }, { enemy: 'skeleton', weight: 3 }, { enemy: 'ghost', weight: 3 }, { enemy: 'eye', weight: 3 },
      { enemy: 'cultist', weight: 2 }, { enemy: 'golem', weight: 2 },
    ],
    elites: [{ at: 0.2, enemy: 'skeleton' }, { at: 0.45, enemy: 'golem' }, { at: 0.7, enemy: 'ghost' }, { at: 0.9, enemy: 'golem' }],
    events: [{ at: 0.35, type: 'ring', enemy: 'zombie', count: 40 }, { at: 0.75, type: 'ring', enemy: 'bat', count: 50 }],
  },
  // 15 — Boss final : le Comte
  {
    duration: 0, spawnRate: [2.5, 3.2], maxAlive: 160, boss: 'vampire',
    pool: [{ enemy: 'bat', weight: 6 }, { enemy: 'cultist', weight: 2 }, { enemy: 'ghost', weight: 2 }],
  },
];

const ENDLESS_POOL = ['bat', 'zombie', 'skeleton', 'eye', 'ghost', 'cultist', 'golem'];

/** Définition de la manche `wave` (1-indexée). Les manches au-delà de 15 sont générées (mode infini). */
export function getWave(wave: number): WaveDef {
  if (wave <= WAVES.length) return WAVES[wave - 1];
  const extra = wave - WAVES.length;
  const bosses = ['slimeKing', 'lich', 'vampire'];
  if (extra % 5 === 0) {
    return {
      duration: 0,
      spawnRate: [3, 4],
      maxAlive: 200,
      boss: bosses[(extra / 5 - 1) % bosses.length],
      pool: ENDLESS_POOL.map((enemy) => ({ enemy, weight: enemy === 'golem' ? 1 : 2 })),
    };
  }
  return {
    duration: 60,
    spawnRate: [5 + extra * 0.3, 7.5 + extra * 0.4],
    maxAlive: Math.min(400, 300 + extra * 10),
    pool: ENDLESS_POOL.map((enemy) => ({ enemy, weight: enemy === 'golem' ? 2 : 3 })),
    elites: [{ at: 0.25, enemy: 'golem' }, { at: 0.5, enemy: 'eye' }, { at: 0.75, enemy: 'golem' }],
    events: [{ at: 0.5, type: 'ring', enemy: 'bat', count: 50 }],
  };
}
