// Partie en ligne vue par un invité : l'hôte simule le monde, nous l'affichons et envoyons nos commandes.
import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import { WorldRenderer } from '../game/render/WorldRenderer';
import type { Offer, OfferView } from '../game/systems/Upgrades';
import { ClientWorld } from '../net/ClientWorld';
import type { LobbyClient } from '../net/Lobby';
import { decodeMessage, encodeMessage, type ClientMessage, type HostMessage, type StartInfo } from '../net/Protocol';
import type { NetData } from '../net/Transport';
import { button, h } from '../ui/dom';
import { choiceScreen } from '../ui/screens/ChoiceScreen';
import { messageScreen, onlineResultScreen } from '../ui/screens/ResultScreen';
import { settingsScreen } from '../ui/screens/SettingsScreen';
import type { Screen } from '../ui/UIManager';
import { renderOptions } from './renderOptions';

/** Secondes sans nouvelles de l'hôte avant de prévenir le joueur. */
const HOST_SILENCE = 4;

export class ClientGameScene implements Scene {
  readonly world: ClientWorld;
  private readonly view: WorldRenderer;
  private readonly unsubscribe: (() => void)[] = [];
  private choiceReq: number | null = null;
  private overlay: HTMLElement | null = null;
  private ended = false;
  private inputTimer = 0;
  /** Message affiché à la demande de l'hôte (pause, attente d'un choix). */
  private hostOverlay: string | null = null;
  /** Temps écoulé depuis le dernier message de l'hôte. */
  private silence = 0;

  constructor(
    private readonly game: Game,
    private readonly lobby: LobbyClient,
    info: StartInfo,
    heroIndex: number,
  ) {
    this.world = new ClientWorld(info, heroIndex, game.audio);
    const s = game.save.data.settings;
    this.world.effects.showDamageNumbers = s.gameplay.damageNumbers;
    this.world.camera.shakeScale = s.accessibility.screenShake;
    this.world.effects.particleScale = s.graphics.particles === 'low' ? 0.35 : s.graphics.particles === 'medium' ? 0.65 : 1;
    this.world.effects.corpsesEnabled = s.graphics.corpses;
    this.view = new WorldRenderer(game.renderer, game.assets, this.world.biome);
  }

  private send(m: ClientMessage): void {
    this.lobby.conn.send(encodeMessage(m));
  }

  enter(): void {
    const { game } = this;
    game.ui.clear();
    game.hud.show();
    game.audio.setMusic('battle');
    this.lobby.conn.onMessage((data) => this.onMessage(data));
    this.lobby.conn.onClose(() => this.disconnected('La connexion avec l’hôte a été perdue.'));
    this.unsubscribe.push(
      game.input.onAction((action) => {
        if ((action !== 'pause' && action !== 'back') || game.ui.isOpen || this.ended) return false;
        game.ui.push(this.menuScreen());
        return true;
      }),
    );
  }

  exit(): void {
    for (const off of this.unsubscribe) off();
    this.setOverlay(null);
    this.game.hud.hide();
    this.game.ui.clear();
    this.view.dispose();
    this.lobby.dispose();
  }

  update(dt: number): void {
    const { game, world } = this;
    world.viewW = game.renderer.viewW;
    world.viewH = game.renderer.viewH;
    const choosing = game.ui.top?.el.classList.contains('choice-screen') ?? false;
    const move = this.ended || choosing ? { x: 0, y: 0 } : game.input.moveVector();
    const input = world.pushInput(move, dt);
    // Commandes envoyées à ~60 messages/s au maximum.
    this.inputTimer += dt;
    if (this.inputTimer >= 1 / 60) {
      this.inputTimer = 0;
      this.send({ t: 'i', ...input });
    }
    world.update(dt);
    if (world.hud) game.hud.update(world.hud);
    // Hôte figé (fenêtre réduite, plantage…) : on l'indique au lieu de laisser croire à un bug.
    const silent = this.silence > HOST_SILENCE;
    this.silence += dt;
    if (!silent && this.silence > HOST_SILENCE) this.refreshOverlay();
  }

  render(): void {
    this.world.viewW = this.game.renderer.viewW;
    this.world.viewH = this.game.renderer.viewH;
    this.view.render(this.world, renderOptions(this.game.save.data.settings));
  }

  private onMessage(data: NetData): void {
    const wasSilent = this.silence > HOST_SILENCE;
    this.silence = 0;
    if (wasSilent) this.refreshOverlay();
    if (data instanceof ArrayBuffer) {
      this.world.applySnapshot(data);
      return;
    }
    const m = decodeMessage<HostMessage>(data);
    if (!m) return;
    const { game } = this;
    switch (m.t) {
      case 'choice':
        this.openChoice(m);
        break;
      case 'choice:close':
        if (this.choiceReq === m.req) {
          this.choiceReq = null;
          if (game.ui.top?.el.classList.contains('choice-screen')) game.ui.pop();
        }
        break;
      case 'wait':
        this.hostOverlay = m.text;
        this.refreshOverlay();
        break;
      case 'paused':
        this.hostOverlay = m.paused ? 'Partie en pause (hôte)' : null;
        this.refreshOverlay();
        break;
      case 'ui':
        if (m.kind === 'banner') game.hud.showBanner(m.title, m.sub, m.style);
        else if (m.kind === 'toast') game.toasts.show(m.toast, m.name, m.detail, m.icon);
        else game.audio.setMusic(m.mood);
        break;
      case 'end':
        this.finish(m);
        break;
      case 'kick':
        this.disconnected(m.reason);
        break;
    }
  }

  private openChoice(m: Extract<HostMessage, { t: 'choice' }>): void {
    const { game } = this;
    const req = m.req;
    const offers: Offer[] = m.offers.map((o: OfferView) => ({ ...o, apply: () => undefined }));
    let rerolls = m.rerolls;
    const screen = choiceScreen({
      assets: game.assets,
      variant: m.variant,
      title: m.title,
      subtitle: m.subtitle,
      offers,
      rerolls: {
        remaining: () => rerolls,
        reroll: () => {
          rerolls--;
          this.send({ t: 'reroll', req });
          return offers;
        },
      },
      skip: m.skip ? { label: m.skip, onSkip: () => this.send({ t: 'skip', req }) } : undefined,
      onPick: (offer) => this.send({ t: 'pick', req, key: offer.key }),
    });
    if (m.variant === 'levelup' && this.choiceReq !== req) game.audio.play('levelup');
    if (this.choiceReq === req && game.ui.top?.el.classList.contains('choice-screen')) game.ui.replace(screen);
    else game.ui.push(screen);
    this.choiceReq = req;
  }

  private refreshOverlay(): void {
    if (this.ended) return;
    this.setOverlay(this.silence > HOST_SILENCE ? 'L’hôte ne répond plus… (sa fenêtre est peut-être réduite)' : this.hostOverlay);
  }

  private setOverlay(text: string | null): void {
    if (!text) {
      this.overlay?.remove();
      this.overlay = null;
      return;
    }
    if (!this.overlay) {
      this.overlay = h('div', { class: 'net-wait' });
      document.getElementById('app')?.append(this.overlay);
    }
    this.overlay.textContent = text;
  }

  private menuScreen(): Screen {
    const { game } = this;
    const close = () => game.ui.pop();
    const resume = button('Reprendre', close, 'btn-primary');
    resume.setAttribute('data-autofocus', '');
    const el = h(
      'div',
      { class: 'panel-screen narrow' },
      h('div', { class: 'screen-header column' }, h('h2', { text: 'Menu' }), h('div', { class: 'result-sub', text: 'La partie continue pendant que ce menu est ouvert.' })),
      h(
        'div',
        { class: 'screen-actions column' },
        resume,
        button('Paramètres', () => game.ui.push(settingsScreen(game))),
        button('Quitter la partie', () => {
          this.ended = true;
          this.lobby.leave();
          game.goToMenu();
        }),
      ),
    );
    return { el, onBack: close };
  }

  private finish(m: Extract<HostMessage, { t: 'end' }>): void {
    if (this.ended) return;
    this.ended = true;
    const { game } = this;
    const save = game.save;
    save.data.gold += m.gold;
    save.data.stats.runs++;
    save.data.stats.onlineGames++;
    save.data.stats.totalKills += m.kills;
    save.data.stats.totalGold += m.gold;
    if (m.victory) {
      save.data.stats.wins++;
      save.data.stats.coopWins++;
    }
    save.save();
    this.setOverlay(null);
    game.audio.setMusic(m.victory ? 'menu' : null);
    game.hud.hide();
    game.ui.clear();
    game.ui.push(onlineResultScreen(game, m));
  }

  private disconnected(reason: string): void {
    if (this.ended) return;
    this.ended = true;
    this.setOverlay(null);
    this.game.hud.hide();
    this.game.ui.clear();
    this.game.ui.push(messageScreen(this.game, 'Partie interrompue', reason));
  }
}
