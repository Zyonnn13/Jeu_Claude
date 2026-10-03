// Mode « Manches » : 15 manches chronométrées, boss aux manches 5, 10 et 15, relique entre chaque manche.
import { BALANCE } from '../../data/balance';
import { getEnemy } from '../../data/enemies';
import type { WaveDef } from '../../data/types';
import { getWave } from '../../data/waves';
import { formatTime, lerp } from '../../engine/math';
import type { World } from '../World';
import { killEnemy } from './Combat';
import { playerScale, spawnAroundHero, type Director, type DirectorHud, type WavePhase } from './Director';

export class WaveDirector implements Director {
  readonly mode = 'waves' as const;
  wave: number;
  def: WaveDef;
  phase: WavePhase = 'intro';
  /** Temps écoulé dans la phase active. */
  time = 0;
  private phaseTimer = 2;
  private spawnAcc = 0;
  private elitesDone = new Set<number>();
  private eventsDone = new Set<number>();
  private extraElitesDone = 0;
  private bossDefeated = false;

  constructor(
    private readonly world: World,
    startWave: number,
  ) {
    this.wave = startWave;
    this.def = getWave(startWave);
    queueMicrotask(() => world.events.emit('wave:start', { wave: this.wave, boss: this.isBossWave }));
  }

  get isBossWave(): boolean {
    return !!this.def.boss;
  }

  get remaining(): number {
    return Math.max(0, this.def.duration - this.time);
  }

  get progress(): number {
    return this.def.duration > 0 ? Math.min(1, this.time / this.def.duration) : 0;
  }

  update(dt: number): void {
    switch (this.phase) {
      case 'intro':
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
          this.phase = 'active';
          this.time = 0;
          if (this.def.boss) this.world.spawnBoss(getEnemy(this.def.boss));
        }
        break;
      case 'active':
        this.time += dt;
        this.updateSpawns(dt);
        if (!this.isBossWave && this.time >= this.def.duration) this.beginClearing();
        if (this.isBossWave && this.bossDefeated) this.beginClearing();
        break;
      case 'clearing': {
        this.phaseTimer -= dt;
        const collecting = this.world.pickups.some((p) => p.attracted);
        if (this.phaseTimer <= 0 && (!collecting || this.phaseTimer < -2.5)) {
          this.phase = 'waiting';
          this.world.onWaveCleared();
        }
        break;
      }
      case 'waiting':
        break;
    }
  }

  private aliveCount(): number {
    let n = 0;
    for (const e of this.world.enemies) if (!e.dead && !e.isProp) n++;
    return n;
  }

  private updateSpawns(dt: number): void {
    const def = this.def;
    const w = this.world;
    const scale = playerScale(w);
    const t = this.isBossWave ? 0.5 : this.progress;
    const rate = lerp(def.spawnRate[0], def.spawnRate[1], t) * w.globalStat('curse') * w.mods.spawnRate * scale.spawn;
    const maxAlive = def.maxAlive * scale.alive;
    this.spawnAcc += rate * dt;
    let alive = this.aliveCount();
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (alive >= maxAlive) continue;
      const pick = w.rng.weighted(def.pool, (s) => s.weight);
      const pos = this.spawnPosition();
      w.spawnEnemyById(pick.enemy, pos.x, pos.y);
      alive++;
    }

    def.elites?.forEach((elite, i) => {
      if (this.elitesDone.has(i) || t < elite.at) return;
      this.elitesDone.add(i);
      const pos = this.spawnPosition();
      w.spawnEnemyById(elite.enemy, pos.x, pos.y, true);
    });

    // Élites supplémentaires dues au niveau de danger.
    const extra = this.isBossWave || this.wave < 2 ? 0 : w.mods.eliteExtra;
    const extraTimes = [0.35, 0.8];
    while (this.extraElitesDone < extra && t >= extraTimes[this.extraElitesDone]) {
      this.extraElitesDone++;
      const pick = w.rng.weighted(def.pool, (s) => s.weight);
      const pos = this.spawnPosition();
      w.spawnEnemyById(pick.enemy, pos.x, pos.y, true);
    }

    def.events?.forEach((ev, i) => {
      if (this.eventsDone.has(i) || t < ev.at) return;
      this.eventsDone.add(i);
      w.spawnEvent(ev.type, ev.enemy, ev.count);
    });
  }

  spawnPosition(margin = 14): { x: number; y: number } {
    return spawnAroundHero(this.world, margin);
  }

  onBossDefeated(): void {
    this.bossDefeated = true;
  }

  private beginClearing(): void {
    this.phase = 'clearing';
    this.phaseTimer = 1.4;
    const w = this.world;
    // Les survivants s'effondrent en lâchant leurs gemmes, aspirées vers les joueurs.
    for (const e of w.enemies) if (!e.isProp && !e.dead) killEnemy(w, e, { cause: 'waveEnd' });
    for (const b of w.bullets) b.dead = true;
    w.defer(() => {
      for (const p of w.pickups) if (p.kind === 'gem' || p.kind === 'coin' || p.kind === 'bag') p.attracted = true;
    });
    w.addGold(BALANCE.waveClearGold * this.wave, null);
    w.audio.play('wave');
    const noHit = !w.run.hitThisWave && this.wave >= 3;
    if (noHit) w.run.noHitWaves++;
    w.events.emit('wave:cleared', { wave: this.wave, noHit });
  }

  resume(): void {
    this.wave++;
    this.def = getWave(this.wave);
    this.phase = 'intro';
    this.phaseTimer = 2.2;
    this.time = 0;
    this.spawnAcc = 0;
    this.elitesDone.clear();
    this.eventsDone.clear();
    this.extraElitesDone = 0;
    this.bossDefeated = false;
    this.world.run.hitThisWave = false;
    this.world.events.emit('wave:start', { wave: this.wave, boss: this.isBossWave });
  }

  hud(): DirectorHud {
    const total = this.world.run.endless ? '∞' : String(BALANCE.waveCount);
    let timer: string;
    if (this.phase === 'intro') timer = 'Préparez-vous…';
    else if (this.phase !== 'active') timer = 'Terminée';
    else if (this.isBossWave) timer = 'BOSS';
    else timer = formatTime(this.remaining);
    return {
      title: `Manche ${this.wave} / ${total}`,
      timer,
      hint: '',
      boss: timer === 'BOSS',
      urgent: this.phase === 'active' && !this.isBossWave && this.remaining <= 5,
    };
  }

  debugSkip(): void {
    if (this.phase !== 'active') return;
    if (this.world.boss) killEnemy(this.world, this.world.boss);
    this.time = this.def.duration;
  }
}
