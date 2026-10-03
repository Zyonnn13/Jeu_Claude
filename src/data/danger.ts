// Niveaux de danger (comme dans Brotato) : chaque niveau gagné débloque le suivant.

export interface DangerDef {
  level: number;
  name: string;
  description: string;
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  /** Élites supplémentaires par manche (à partir de la manche 2). */
  eliteExtra: number;
  bossHp: number;
  /** Multiplicateur du soin entre deux manches. */
  waveHeal: number;
  gold: number;
  color: string;
}

export const DANGERS: DangerDef[] = [
  { level: 0, name: 'Normal', description: 'L’expérience prévue.', enemyHp: 1, enemyDamage: 1, enemySpeed: 1, eliteExtra: 0, bossHp: 1, waveHeal: 1, gold: 1, color: '#b7b9c7' },
  { level: 1, name: 'Danger 1', description: 'Ennemis +15% PV, +10% dégâts. Or +10%.', enemyHp: 1.15, enemyDamage: 1.1, enemySpeed: 1, eliteExtra: 0, bossHp: 1.1, waveHeal: 1, gold: 1.1, color: '#8fd94f' },
  { level: 2, name: 'Danger 2', description: 'Ennemis +30% PV, +20% dégâts, une élite de plus par manche. Or +20%.', enemyHp: 1.3, enemyDamage: 1.2, enemySpeed: 1, eliteExtra: 1, bossHp: 1.2, waveHeal: 1, gold: 1.2, color: '#ffd84a' },
  { level: 3, name: 'Danger 3', description: 'Ennemis +45% PV, +30% dégâts, plus rapides. Boss +25% PV. Or +35%.', enemyHp: 1.45, enemyDamage: 1.3, enemySpeed: 1.08, eliteExtra: 1, bossHp: 1.25, waveHeal: 1, gold: 1.35, color: '#f28c28' },
  { level: 4, name: 'Danger 4', description: 'Ennemis +65% PV, +40% dégâts. Soins entre manches réduits de moitié. Or +50%.', enemyHp: 1.65, enemyDamage: 1.4, enemySpeed: 1.1, eliteExtra: 1, bossHp: 1.4, waveHeal: 0.5, gold: 1.5, color: '#e0413c' },
  { level: 5, name: 'Danger 5', description: 'Ennemis +90% PV, +60% dégâts, deux élites de plus, aucun soin entre manches. Or +75%.', enemyHp: 1.9, enemyDamage: 1.6, enemySpeed: 1.15, eliteExtra: 2, bossHp: 1.6, waveHeal: 0, gold: 1.75, color: '#b06de0' },
];

export function getDanger(level: number): DangerDef {
  return DANGERS[Math.max(0, Math.min(DANGERS.length - 1, level))];
}
