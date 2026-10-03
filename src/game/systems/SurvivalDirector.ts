// Mode « Survie » : 10 minutes de vagues continues de plus en plus fortes,
// un sous-boss à 5:00 et le méga-boss (La Faucheuse) à 10:00.
// Sans fin de manche pour souffler, ce mode compense autrement : une relique à 1:40, 3:20, 6:40, 8:20 et après
// le sous-boss, chacune avec un petit soin, et les gemmes restées au sol sont aspirées (aussi à l'arrivée de La Faucheuse).
import { BALANCE } from '../../data/balance';
import { getEnemy } from '../../data/enemies';
import { formatTime } from '../../engine/math';
import type { World } from '../World';
import { healPlayer, killEnemy } from './Combat';
import { playerScale, spawnAroundHero, type Director, type DirectorHud, type WavePhase } from './Director';

const SUB_BOSS_AT = 300;
const MEGA_BOSS_AT = 600;
const RELIC_MARKS = [100, 200, 400, 500];
/** Soin (fraction des PV max) après chaque relique : 15 % contre 25 % entre deux manches, réduit par le danger. */
export const SURVIVAL_RELIC_HEAL = BALANCE.waveHeal * 0.6;

/** Ennemis possibles selon la minute écoulée. */
const POOLS: [string, number][][] = [
  [['bat', 6], ['slime', 4]],
  [['bat', 4], ['slime', 3], ['zombie', 3]],
  [['bat', 3], ['zombie', 4], ['skeleton', 3]],
  [['skeleton', 4], ['zombie', 2], ['eye', 3], ['bat', 2]],
  [['skeleton', 3], ['eye', 3], ['ghost', 3], ['zombie', 2]],
  [['skeleton', 4], ['ghost', 3], ['bat', 2]],
  [['ghost', 3], ['cultist', 2], ['eye', 3], ['bat', 3]],
  [['zombie', 2], ['golem', 2], ['ghost', 3], ['cultist', 2], ['skeleton', 2]],
  [['golem', 2], ['eye', 3], ['cultist', 3], ['skeleton', 3]],
  [['bat', 2], ['zombie', 2], ['skeleton', 3], ['eye', 3], ['ghost', 3], ['cultist', 2], ['golem', 2]],
  [['bat', 3], ['skeleton', 3], ['eye', 3], ['ghost', 3], ['cultist', 3], ['golem', 3]],
];

/** Vagues spéciales : encerclements et ruées. */
const EVENTS: { at: number; type: 'ring' | 'burst'; enemy: string; count: number }[] = [
  { at: 100, type: 'ring', enemy: 'bat', count: 20 },
  { at: 210, type: 'ring', enemy: 'zombie', count: 24 },
  { at: 270, type: 'burst', enemy: 'skeleton', count: 18 },
  { at: 380, type: 'ring', enemy: 'ghost', count: 24 },
  { at: 430, type: 'burst', enemy: 'golem', count: 6 },
  { at: 500, type: 'ring', enemy: 'bat', count: 45 },
  { at: 560, type: 'ring', enemy: 'skeleton', count: 40 },
];

type Stage = 'normal' | 'subBoss' | 'megaBoss' | 'won' | 'endless';

export class SurvivalDirector implements Director {
  readonly mode = 'survival' as const;
  wave = 1;
  phase: WavePhase = 'intro';
  /** Temps de survie écoulé. */
  elapsed = 0;
  private phaseTimer = 2.5;
  private spawnAcc = 0;
  private stage: Stage = 'normal';
  private nextElite = 75;
  private eventsDone = new Set<number>();
  private relicsDone = new Set<number>();
  /** Reliques accordées depuis la dernière reprise : chacune soigne (deux peuvent tomber dans la même image). */
  private relicHeals = 0;

  constructor(private readonly world: World) {
    queueMicrotask(() => world.events.emit('wave:start', { wave: 1, boss: false }));
  }

  get isBossWave(): boolean {
    return this.stage === 'subBoss' || this.stage === 'megaBoss';
  }

  update(dt: number): void {
    if (this.phase === 'intro') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.phase = 'active';
      return;
    }
    if (this.phase !== 'active') return;
    const w = this.world;
    this.elapsed += dt;
    // Difficulté équivalente aux manches : ~15 à 10 minutes.
    this.wave = 1 + Math.floor(this.elapsed / 42);

    // Reliques intermédiaires (y compris pendant le combat contre le sous-boss).
    for (const mark of RELIC_MARKS) {
      if (this.elapsed >= mark && !this.relicsDone.has(mark) && (this.stage === 'normal' || this.stage === 'subBoss')) {
        this.relicsDone.add(mark);
        this.phase = 'waiting';
        w.audio.play('wave');
        w.events.emit('survival:milestone', { text: 'Relique !' });
        this.collectGems();
        this.relicHeals++;
        w.grantRelicChoice();
        return;
      }
    }

    if (this.stage === 'normal' && this.elapsed >= SUB_BOSS_AT && !this.relicsDone.has(SUB_BOSS_AT)) {
      this.relicsDone.add(SUB_BOSS_AT);
      this.stage = 'subBoss';
      w.spawnBoss(getEnemy(w.biome.id === 'forest' ? 'slimeKing' : 'lich'), 0.45);
    }
    if ((this.stage === 'normal' || this.stage === 'subBoss') && this.elapsed >= MEGA_BOSS_AT) {
      this.stage = 'megaBoss';
      // La Faucheuse balaie tout sur son passage, y compris un sous-boss encore en vie (sans récompense).
      for (const e of w.enemies) if (!e.isProp && !e.dead) killEnemy(w, e, { cause: 'waveEnd', drops: !e.isBoss });
      for (const b of w.bullets) b.dead = true;
      w.defer(() => this.collectGems());
      w.events.emit('survival:milestone', { text: 'La Faucheuse arrive…' });
      w.spawnBoss(getEnemy('reaper'));
    }

    this.updateSpawns(dt);
  }

  private updateSpawns(dt: number): void {
    const w = this.world;
    const t = this.elapsed;
    const scale = playerScale(w);
    let rate = (1.6 + (Math.min(t, 720) / 600) * 6) * w.globalStat('curse') * w.mods.spawnRate * scale.spawn;
    if (this.stage === 'subBoss') rate *= 0.5;
    if (this.stage === 'megaBoss') rate *= 0.35;
    if (this.stage === 'endless') rate *= 1 + (t - MEGA_BOSS_AT) / 120;
    const maxAlive = Math.min(2000, (50 + t * 0.5) * scale.alive * (this.stage === 'endless' ? 2 : 1));
    const pool = POOLS[Math.min(POOLS.length - 1, Math.floor(t / 60))];

    this.spawnAcc += rate * dt;
    let alive = 0;
    for (const e of w.enemies) if (!e.dead && !e.isProp) alive++;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (alive >= maxAlive) continue;
      const pick = w.rng.weighted(pool, (p) => p[1]);
      const pos = this.spawnPosition();
      w.spawnEnemyById(pick[0], pos.x, pos.y);
      alive++;
    }

    if (t >= this.nextElite && !this.isBossWave) {
      this.nextElite += Math.max(35, 60 - w.mods.eliteExtra * 10);
      const pick = w.rng.weighted(pool, (p) => p[1]);
      const pos = this.spawnPosition();
      w.spawnEnemyById(pick[0], pos.x, pos.y, true);
    }

    EVENTS.forEach((ev, i) => {
      if (this.eventsDone.has(i) || t < ev.at) return;
      this.eventsDone.add(i);
      w.spawnEvent(ev.type, ev.enemy, ev.count);
    });
  }

  spawnPosition(margin = 14): { x: number; y: number } {
    return spawnAroundHero(this.world, margin);
  }

  onBossDefeated(enemy: { def: { id: string } }): void {
    const w = this.world;
    if (this.stage === 'subBoss') {
      this.stage = 'normal';
      this.phase = 'waiting';
      // Comme pour les autres reliques, le butin du sous-boss et les gemmes au sol sont aspirés.
      w.defer(() => this.collectGems());
      this.relicHeals++;
      w.grantRelicChoice();
    } else if (this.stage === 'megaBoss' && enemy.def.id === 'reaper') {
      this.stage = 'won';
      this.phase = 'waiting';
      w.run.victory = true;
      w.uiQueue.push({ type: 'victory' });
    }
  }

  resume(): void {
    if (this.stage === 'won') this.stage = 'endless';
    else {
      // Après une relique : petit soin (le soin entre manches n'existe qu'en mode Manches).
      const heal = SURVIVAL_RELIC_HEAL * this.world.mods.waveHeal * this.relicHeals;
      this.relicHeals = 0;
      if (heal > 0) for (const h of this.world.heroes) if (h.alive) healPlayer(this.world, h, h.maxHp * heal);
    }
    this.phase = 'active';
  }

  /** Les gemmes (et l'or) restés au sol sont aspirés vers les joueurs, comme à la fin d'une manche. */
  private collectGems(): void {
    for (const p of this.world.pickups) if (p.kind === 'gem' || p.kind === 'coin' || p.kind === 'bag') p.attracted = true;
  }

  hud(): DirectorHud {
    const t = this.elapsed;
    let hint = '';
    if (this.stage === 'normal' && t < SUB_BOSS_AT) hint = `Sous-boss dans ${formatTime(SUB_BOSS_AT - t)}`;
    else if (this.stage === 'normal' || this.stage === 'subBoss') hint = `La Faucheuse dans ${formatTime(Math.max(0, MEGA_BOSS_AT - t))}`;
    else if (this.stage === 'megaBoss') hint = 'Vainquez La Faucheuse !';
    else if (this.stage === 'endless') hint = 'Nuit sans fin';
    return {
      title: this.phase === 'intro' ? 'Survie — préparez-vous' : 'Survie',
      timer: formatTime(t),
      hint,
      boss: this.isBossWave,
      urgent: this.stage === 'normal' && ((t > SUB_BOSS_AT - 10 && t < SUB_BOSS_AT) || (t > MEGA_BOSS_AT - 10 && t < MEGA_BOSS_AT)),
    };
  }

  debugSkip(): void {
    if (this.world.boss) killEnemy(this.world, this.world.boss);
    else if (this.elapsed < SUB_BOSS_AT) this.elapsed = SUB_BOSS_AT - 1;
    else if (this.elapsed < MEGA_BOSS_AT) this.elapsed = MEGA_BOSS_AT - 1;
  }
}
