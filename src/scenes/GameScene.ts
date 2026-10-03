// Une partie simulée sur cet ordinateur : solo, coopération locale, ou hôte d'une partie en ligne.
// Relie la simulation (World) à l'interface, aux joueurs distants, aux succès et à la sauvegarde.
import { snapshotRun } from '../core/Achievements';
import type { Game, RunConfig } from '../core/Game';
import type { Scene } from '../core/Scene';
import type { AchievementDef } from '../data/achievements';
import { BALANCE } from '../data/balance';
import { getBiome } from '../data/biomes';
import { CHARACTERS } from '../data/characters';
import { getDanger } from '../data/danger';
import { getMutator, type MutatorDef } from '../data/mutators';
import type { CharacterDef } from '../data/types';
import type { Controller } from '../engine/Input';
import { dateKey } from '../core/Daily';
import type { Hero } from '../game/Hero';
import { WorldRenderer } from '../game/render/WorldRenderer';
import { killEnemy, spawnPickup } from '../game/systems/Combat';
import { SURVIVAL_RELIC_HEAL, SurvivalDirector } from '../game/systems/SurvivalDirector';
import { chestOffers, levelUpOffers, offerView, relicOffers, type Offer } from '../game/systems/Upgrades';
import { World, type UiRequest } from '../game/World';
import { HostSession } from '../net/HostSession';
import type { HostMessage } from '../net/Protocol';
import { choiceScreen } from '../ui/screens/ChoiceScreen';
import { pauseScreen } from '../ui/screens/PauseScreen';
import { resultScreen, victoryScreen } from '../ui/screens/ResultScreen';
import { renderOptions } from './renderOptions';

type ChoiceKind = 'levelup' | 'chest' | 'relic';

interface RemoteChoice {
  hero: Hero;
  kind: ChoiceKind;
  offers: Offer[];
}

export class GameScene implements Scene {
  readonly world: World;
  private readonly view: WorldRenderer;
  private readonly unsubscribe: (() => void)[] = [];
  private readonly unlockedThisRun: AchievementDef[] = [];
  private readonly controllers: (Controller | null)[];
  private readonly host: HostSession | null = null;
  private readonly remoteChoices = new Map<number, RemoteChoice>();
  private nextReq = 1;
  private ended = false;
  private killCounter = 0;
  private hostPaused = false;
  private waitEl: HTMLElement | null = null;
  /** Dernier message « en attente de… » envoyé à chaque joueur distant. */
  private readonly sentWait = new Map<number, string | null>();

  constructor(
    private readonly game: Game,
    private readonly config: RunConfig,
  ) {
    const save = game.save;
    this.controllers = config.players.map((p) => (p.control.type === 'remote' ? null : p.control));
    this.world = new World(
      {
        mode: config.mode,
        heroes: config.players.map((p) => ({
          character: (CHARACTERS as Record<string, CharacterDef>)[p.character] ?? CHARACTERS.knight,
          name: p.name,
          // Améliorations permanentes : celles de cette sauvegarde pour tous les joueurs de ce PC, les leurs pour les invités en ligne.
          meta: p.control.type === 'remote' ? (p.meta ?? {}) : save.data.meta,
          netId: p.control.type === 'remote' ? p.control.id : null,
        })),
        biome: getBiome(config.biome),
        danger: getDanger(config.danger),
        mutators: config.mutators.map(getMutator).filter((m): m is MutatorDef => !!m),
        startWave: config.startWave,
        seed: config.seed,
        daily: config.daily,
        sharedCamera: config.players.filter((p) => p.control.type !== 'remote').length > 1,
        isWeaponUnlocked: (id) => save.isWeaponUnlocked(id),
        isRelicUnlocked: (id) => save.isRelicUnlocked(id),
      },
      { audio: game.audio, settings: save.data.settings },
    );
    if (config.online) {
      const host = new HostSession(this.world, config.online.remotes);
      this.host = host;
      this.world.services.audio = host.wrapAudio(game.audio);
      host.onPick = (hero, req, key) => this.resolveRemote(hero, req, key);
      host.onReroll = (hero, req) => this.rerollRemote(hero, req);
      host.onSkip = (hero, req) => this.resolveRemote(hero, req, null);
      host.onDisconnect = (heroIndex) => this.onRemoteLeft(heroIndex);
    }
    this.view = new WorldRenderer(game.renderer, game.assets, this.world.biome);
  }

  private get online(): boolean {
    return !!this.host;
  }

  /** Les autres joueurs attendent nos images d'état : la partie continue fenêtre cachée. */
  get runsInBackground(): boolean {
    return this.online && !this.ended;
  }

  enter(): void {
    const { game, world } = this;
    game.ui.clear();
    game.hud.show();
    this.music('battle');

    const ev = world.events;
    const settings = game.save.data.settings;
    const rumbleHero = (hero: Hero | null, strength: number, ms: number) => {
      if (!settings.rumble) return;
      const c = hero ? this.controllers[hero.index] : { type: 'any' as const };
      if (!c) return;
      game.input.rumble(strength, ms, c.type === 'pad' ? c.index : undefined);
    };
    this.unsubscribe.push(
      ev.on('wave:start', ({ wave, boss }) => {
        if (world.director.mode === 'survival') {
          this.banner('Survie — 10 minutes', `${world.biome.name} · sous-boss à 5:00, La Faucheuse à 10:00`, 'normal');
        } else {
          const total = world.run.endless ? '' : ` / ${BALANCE.waveCount}`;
          if (boss) this.banner(`Manche ${wave}${total}`, 'Un boss approche…', 'boss');
          else this.banner(`Manche ${wave}${total}`, wave === 1 ? world.biome.name : '', 'normal');
        }
        this.music(boss ? 'boss' : 'battle');
        this.checkAchievements();
      }),
      ev.on('survival:milestone', ({ text }) => this.banner(text, '', text.includes('Faucheuse') ? 'boss' : 'success')),
      ev.on('boss:spawn', ({ enemy }) => {
        this.banner(enemy.def.name, 'Boss', 'boss');
        this.music('boss');
        rumbleHero(null, 0.8, 600);
      }),
      ev.on('boss:phase', ({ enemy, phase }) => {
        this.banner(`Phase ${phase}`, enemy.def.name, 'boss');
        rumbleHero(null, 0.9, 400);
      }),
      ev.on('boss:defeated', () => {
        rumbleHero(null, 1, 700);
        if (world.director.mode === 'survival') this.music('battle');
        this.checkAchievements();
      }),
      ev.on('wave:cleared', ({ wave, noHit }) => {
        const gold = Math.round(BALANCE.waveClearGold * wave * world.globalStat('greed') * world.mods.gold);
        this.banner('Manche terminée !', noHit ? `+${gold} or · Sans une égratignure !` : `+${gold} or`, 'success');
        this.checkAchievements();
      }),
      ev.on('player:hurt', ({ hero }) => rumbleHero(hero, 0.45, 140)),
      ev.on('player:downed', ({ hero }) => this.banner(`${hero.name} est à terre !`, 'Restez près de lui pour le relever', 'boss')),
      ev.on('player:levelup', () => this.checkAchievements()),
      ev.on('pickup:chest', () => this.checkAchievements()),
      ev.on('weapon:evolved', () => {
        world.screenFlash('#ffd84a', 0.45);
        this.checkAchievements();
      }),
      ev.on('synergy:activated', ({ hero, synergy }) => {
        if (hero === world.localHero || !this.online) game.toasts.show('synergy', synergy.name, synergy.description, 'icon_ring');
        else this.host?.sendTo(hero.index, { t: 'ui', kind: 'toast', toast: 'synergy', name: synergy.name, detail: synergy.description, icon: 'icon_ring' });
        world.effects.ring(hero.x, hero.y, 80, '#c06dff', 0.6);
        this.checkAchievements();
      }),
      ev.on('enemy:killed', () => {
        if (++this.killCounter % 50 === 0) this.checkAchievements();
      }),
      game.input.onAction((action) => {
        if ((action !== 'pause' && action !== 'back') || game.ui.isOpen || this.ended || world.state !== 'playing') return false;
        this.openPause();
        return true;
      }),
    );

    // Pause automatique si la fenêtre perd le focus (hors partie en ligne).
    const onBlur = () => {
      if (!this.online && settings.gameplay.autoPause && !game.ui.isOpen && !this.ended && world.state === 'playing') this.openPause();
    };
    window.addEventListener('blur', onBlur);
    this.unsubscribe.push(() => window.removeEventListener('blur', onBlur));

    if (game.debug) this.unsubscribe.push(game.input.onKey((e) => this.debugKey(e)));
  }

  exit(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.setWait(null);
    this.game.hud.hide();
    this.game.ui.clear();
    this.view.dispose();
    this.host?.close();
  }

  // --- Présentation (retransmise aux joueurs en ligne) ----------------------

  private banner(title: string, sub: string, style: 'normal' | 'boss' | 'success'): void {
    this.game.hud.showBanner(title, sub, style);
    this.host?.broadcast({ t: 'ui', kind: 'banner', title, sub, style });
  }

  private music(mood: 'menu' | 'battle' | 'boss' | null): void {
    this.game.audio.setMusic(mood);
    this.host?.broadcast({ t: 'ui', kind: 'music', mood });
  }

  private setWait(text: string | null): void {
    if (!text) {
      this.waitEl?.remove();
      this.waitEl = null;
      return;
    }
    if (!this.waitEl) {
      this.waitEl = document.createElement('div');
      this.waitEl.className = 'net-wait';
      document.getElementById('app')?.append(this.waitEl);
    }
    this.waitEl.textContent = text;
  }

  // --- Boucle --------------------------------------------------------------

  private get simulationPaused(): boolean {
    if (this.hostPaused) return true;
    if (this.remoteChoices.size > 0) return true;
    if (!this.online && this.game.ui.isOpen) return true;
    // En ligne, seul un choix de bonus local fige la partie (pour tout le monde).
    return this.online && this.game.ui.isOpen && this.game.ui.top?.el.classList.contains('choice-screen') === true;
  }

  update(dt: number): void {
    const { game, world } = this;
    world.viewW = game.renderer.viewW;
    world.viewH = game.renderer.viewH;
    const localChoice = game.ui.top?.el.classList.contains('choice-screen') ?? false;
    if (world.uiQueue.length && !this.hostPaused) this.processQueue(localChoice || (!this.online && game.ui.isOpen));
    if (!this.simulationPaused && !world.uiQueue.length) {
      world.heroes.forEach((h, i) => {
        const c = this.controllers[i];
        if (c) h.move = game.input.vectorFor(c);
      });
      world.update(dt);
    }
    this.host?.update(dt);
    game.hud.update(world.hudData(world.focusHero));
  }

  render(): void {
    this.world.viewW = this.game.renderer.viewW;
    this.world.viewH = this.game.renderer.viewH;
    this.view.render(this.world, renderOptions(this.game.save.data.settings));
  }

  // --- Choix de bonus --------------------------------------------------------

  private checkAchievements(committed = false): void {
    const snap = snapshotRun(this.world, this.config.players[0].character, this.config.danger, !!this.config.daily, committed);
    this.unlockedThisRun.push(...this.game.achievements.check(snap));
  }

  private offersFor(kind: ChoiceKind, hero: Hero): Offer[] {
    if (kind === 'levelup') return levelUpOffers(this.world, hero);
    if (kind === 'chest') return chestOffers(this.world, hero);
    return relicOffers(this.world, hero);
  }

  private choiceTexts(kind: ChoiceKind, hero: Hero, gold = 0): { title: string; subtitle: string } {
    const w = this.world;
    const who = w.multiplayer ? `${hero.name} — ` : '';
    if (kind === 'levelup') return { title: `${who}Niveau supérieur !`, subtitle: `Niveau ${w.run.level} · Choisissez une amélioration` };
    if (kind === 'chest') return { title: `${who}Coffre au trésor !`, subtitle: `+${gold} or · Choisissez un trésor` };
    const survival = w.director.mode === 'survival';
    const heal = Math.round((survival ? SURVIVAL_RELIC_HEAL : BALANCE.waveHeal) * w.mods.waveHeal * 100);
    const title = survival ? `${who}Relique !` : `${who}Manche ${w.director.wave} terminée !`;
    return { title, subtitle: heal > 0 ? `Choisissez une relique · Vous récupérez ${heal}% de vos PV` : 'Choisissez une relique' };
  }

  /**
   * Traite les demandes en attente. Chaque joueur reçoit ses choix un par un, dans l'ordre ; les joueurs
   * distants choisissent en même temps que l'hôte. Avec `localBusy`, l'écran local est déjà occupé.
   */
  private processQueue(localBusy: boolean): void {
    const { world } = this;
    const busy = new Set([...this.remoteChoices.values()].map((c) => c.hero.index));
    for (let i = 0; i < world.uiQueue.length; i++) {
      const req = world.uiQueue[i];
      if (req.type === 'gameover' || req.type === 'victory') {
        // La fin de partie attend que tous les choix en cours soient faits.
        if (i > 0 || this.remoteChoices.size || localBusy) break;
        world.uiQueue.shift();
        this.openGlobal(req);
        return;
      }
      const hero = world.heroes[req.hero];
      if (!hero || hero.left) {
        world.uiQueue.splice(i--, 1);
        if (req.type === 'relic') world.relicResolved();
        continue;
      }
      if (this.host?.isRemote(hero.index)) {
        if (busy.has(hero.index)) continue;
        world.uiQueue.splice(i--, 1);
        busy.add(hero.index);
        this.openRemoteChoice(req.type, hero);
      } else if (!localBusy) {
        world.uiQueue.splice(i--, 1);
        localBusy = true;
        this.openLocalChoice(req.type, hero);
      }
    }
    this.refreshWait();
  }

  private openLocalChoice(kind: ChoiceKind, hero: Hero): void {
    const { game, world } = this;
    const gold = kind === 'chest' ? world.addGold(10 + world.director.wave * 4, hero) : 0;
    const texts = this.choiceTexts(kind, hero, gold);
    const skipGold = 10 * world.director.wave;
    if (kind === 'levelup') game.audio.play('levelup');
    game.ui.push(
      choiceScreen({
        assets: game.assets,
        variant: kind,
        title: texts.title,
        subtitle: texts.subtitle,
        accent: world.multiplayer ? hero.color : undefined,
        // Coop locale : seul le clavier ou la manette de ce joueur peut choisir.
        owner: this.controllers[hero.index] ?? undefined,
        offers: this.offersFor(kind, hero),
        rerolls: {
          remaining: () => hero.rerolls,
          reroll: () => {
            hero.rerolls--;
            return this.offersFor(kind, hero);
          },
        },
        skip:
          kind === 'relic'
            ? {
                label: `Passer (+${skipGold} or)`,
                onSkip: () => {
                  world.addGold(skipGold, hero);
                  game.ui.pop();
                  world.relicResolved();
                  this.refreshWait();
                },
              }
            : undefined,
        onPick: (offer) => {
          offer.apply();
          if (offer.kind === 'evolution') game.audio.play('victory');
          game.ui.pop();
          if (kind === 'relic') world.relicResolved();
          // Les joueurs en ligne n'attendent plus le choix de l'hôte.
          this.refreshWait();
        },
      }),
    );
    this.refreshWait();
  }

  private openRemoteChoice(kind: ChoiceKind, hero: Hero): void {
    const req = this.nextReq++;
    const gold = kind === 'chest' ? this.world.addGold(10 + this.world.director.wave * 4, hero) : 0;
    const offers = this.offersFor(kind, hero);
    this.remoteChoices.set(req, { hero, kind, offers });
    this.sendChoice(req, kind, hero, offers, gold);
    this.refreshWait();
  }

  private sendChoice(req: number, kind: ChoiceKind, hero: Hero, offers: Offer[], gold = 0): void {
    const texts = this.choiceTexts(kind, hero, gold);
    const msg: HostMessage = {
      t: 'choice',
      req,
      variant: kind,
      title: texts.title,
      subtitle: texts.subtitle,
      offers: offers.map(offerView),
      rerolls: hero.rerolls,
      skip: kind === 'relic' ? `Passer (+${10 * this.world.director.wave} or)` : undefined,
    };
    this.host?.sendTo(hero.index, msg);
  }

  private resolveRemote(heroIndex: number, req: number, key: string | null): void {
    const choice = this.remoteChoices.get(req);
    if (!choice || choice.hero.index !== heroIndex) return;
    this.remoteChoices.delete(req);
    if (key === null) {
      if (choice.kind === 'relic') this.world.addGold(10 * this.world.director.wave, choice.hero);
    } else {
      choice.offers.find((o) => o.key === key)?.apply();
    }
    if (choice.kind === 'relic') this.world.relicResolved();
    this.host?.sendTo(heroIndex, { t: 'choice:close', req });
    this.refreshWait();
  }

  private rerollRemote(heroIndex: number, req: number): void {
    const choice = this.remoteChoices.get(req);
    if (!choice || choice.hero.index !== heroIndex || choice.hero.rerolls <= 0) return;
    choice.hero.rerolls--;
    choice.offers = this.offersFor(choice.kind, choice.hero);
    this.sendChoice(req, choice.kind, choice.hero, choice.offers);
  }

  private onRemoteLeft(heroIndex: number): void {
    for (const [req, c] of this.remoteChoices) {
      if (c.hero.index !== heroIndex) continue;
      this.remoteChoices.delete(req);
      if (c.kind === 'relic') this.world.relicResolved();
    }
    this.game.toasts.show('info', `${this.world.heroes[heroIndex].name} a quitté la partie`, '', 'icon_skull');
    this.refreshWait();
  }

  /** Message « en attente de... » pendant que des joueurs distants choisissent. */
  private refreshWait(): void {
    if (!this.host) return;
    const choosing = new Set([...this.remoteChoices.values()].map((c) => c.hero));
    const localChoosing = this.game.ui.top?.el.classList.contains('choice-screen') ?? false;
    if (localChoosing) choosing.add(this.world.heroes[0]);
    const text = (heroes: Hero[]) => (heroes.length ? `En attente du choix de : ${heroes.map((h) => h.name).join(', ')}…` : null);
    this.setWait(localChoosing ? null : text([...choosing]));
    for (const h of this.world.heroes) {
      if (!this.host.isRemote(h.index)) continue;
      const msg = choosing.has(h) ? null : text([...choosing]);
      // Appelé à chaque image tant qu'un choix est en attente : on n'envoie que les changements.
      if (this.sentWait.get(h.index) === msg) continue;
      this.sentWait.set(h.index, msg);
      this.host.sendTo(h.index, { t: 'wait', text: msg });
    }
  }


  private openGlobal(req: UiRequest): void {
    const { game, world } = this;
    if (req.type === 'victory') {
      game.audio.play('victory');
      this.music('menu');
      this.checkAchievements();
      game.ui.push(
        victoryScreen(game, world.director.mode, {
          endless: () => {
            game.ui.pop();
            world.continueEndless();
          },
          finish: () => this.endRun({ abandoned: false }),
        }),
      );
    } else if (req.type === 'gameover') {
      this.endRun({ abandoned: false });
    }
  }

  private openPause(): void {
    const { game, world } = this;
    if (this.online) {
      this.hostPaused = true;
      this.host?.broadcast({ t: 'paused', paused: true });
    }
    game.ui.push(
      pauseScreen(game, world, world.heroes[0], this.config, {
        resume: () => {
          game.ui.pop();
          if (this.online) {
            this.hostPaused = false;
            this.host?.broadcast({ t: 'paused', paused: false });
            // La reprise efface le message des invités : on renvoie l'attente en cours.
            this.sentWait.clear();
            this.refreshWait();
          }
        },
        abandon: () => this.endRun({ abandoned: true }),
      }),
    );
  }

  /** Fin de partie : l'or et les statistiques sont versés dans la sauvegarde, puis les succès vérifiés. */
  private endRun({ abandoned }: { abandoned: boolean }): void {
    if (this.ended) return;
    this.ended = true;
    const { game, world, config } = this;
    this.checkAchievements();
    const save = game.save.data;
    const stats = save.stats;
    const run = world.run;
    const victory = run.victory;
    const goldEarned = run.gold + (victory ? Math.round(BALANCE.victoryGold * world.mods.gold) : 0);
    const wave = world.director.wave;
    const survival = world.director instanceof SurvivalDirector ? world.director.elapsed : 0;
    const newRecord = config.mode === 'waves' ? wave > stats.bestWave : survival > stats.bestSurvivalTime;

    this.host?.broadcast({ t: 'end', victory, wave, level: run.level, kills: run.kills, gold: goldEarned, time: world.time, mode: config.mode });

    save.gold += goldEarned;
    stats.runs++;
    if (config.mode === 'waves') stats.bestWave = Math.max(stats.bestWave, wave);
    else stats.bestSurvivalTime = Math.max(stats.bestSurvivalTime, survival);
    stats.bestLevel = Math.max(stats.bestLevel, run.level);
    stats.totalKills += run.kills;
    stats.totalGold += goldEarned;
    stats.chestsOpened += run.chests;
    stats.evolutions += run.evolutions;
    stats.noHitWaves += run.noHitWaves;
    if (this.online) stats.onlineGames++;
    if (run.endless) stats.bestEndlessWave = Math.max(stats.bestEndlessWave, wave);
    for (const id of run.bossKills) stats.bossKills[id] = (stats.bossKills[id] ?? 0) + 1;
    for (const s of world.heroes[0].synergies.active) if (!stats.synergies.includes(s)) stats.synergies.push(s);
    for (const [id, n] of run.killsByType) save.bestiary[id] = (save.bestiary[id] ?? 0) + n;
    if (victory) {
      const character = config.players[0].character;
      stats.wins++;
      if (world.multiplayer) stats.coopWins++;
      stats.winsByCharacter[character] = (stats.winsByCharacter[character] ?? 0) + 1;
      stats.winsByBiome[config.biome] = (stats.winsByBiome[config.biome] ?? 0) + 1;
      if (!config.daily) save.maxDangerWon = Math.max(save.maxDangerWon, config.danger);
    }
    if (config.daily) {
      const today = dateKey();
      if (save.daily.date !== today) save.daily = { date: today, bestWave: 0, bestKills: 0, attempts: 0, won: false };
      save.daily.attempts++;
      save.daily.bestWave = Math.max(save.daily.bestWave, wave);
      save.daily.bestKills = Math.max(save.daily.bestKills, run.kills);
      save.daily.won ||= victory;
    }
    game.save.save();
    this.checkAchievements(true);

    this.setWait(null);
    game.audio.setMusic(victory ? 'menu' : null);
    game.hud.hide();
    game.ui.clear();
    game.ui.push(
      resultScreen(
        game,
        world,
        world.heroes[0],
        { victory, abandoned, goldEarned, newRecord, achievements: this.unlockedThisRun, daily: !!config.daily, mode: config.mode, survivalTime: survival },
        this.online ? null : () => game.startRun(this.config),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Outils de test (adresse avec ?debug) : F1 niveau, F2 étape suivante, F3 invincible, F4 coffre,
  // F6 +1000 or, F7 +500 ennemis (test de performance).

  private debugKey(e: KeyboardEvent): boolean {
    const w = this.world;
    const h = w.localHero;
    switch (e.code) {
      case 'F1':
        w.addXp(w.run.xpNext - w.run.xp + 0.01, h);
        return true;
      case 'F2':
        w.director.debugSkip();
        return true;
      case 'F3':
        w.debugGodMode = !w.debugGodMode;
        w.effects.text(h.x, h.y - 20, w.debugGodMode ? 'Invincible' : 'Mortel', '#ffffff', 8);
        return true;
      case 'F4':
        spawnPickup(w, 'chest', h.x + 20, h.y);
        return true;
      case 'F6':
        this.game.save.data.gold += 1000;
        this.game.save.save();
        return true;
      case 'F7':
        for (let i = 0; i < 500; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = 120 + Math.random() * 300;
          w.spawnEnemyById(['bat', 'zombie', 'skeleton', 'slime'][i % 4], h.x + Math.cos(a) * d, h.y + Math.sin(a) * d);
        }
        return true;
      case 'F9':
        if (w.boss) killEnemy(w, w.boss);
        return true;
    }
    return false;
  }
}
