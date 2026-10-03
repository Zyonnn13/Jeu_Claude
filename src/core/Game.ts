// Application : services partagés (rendu GPU, entrées, son, sauvegarde, interface) et boucle principale.
import { Assets } from '../engine/Assets';
import { AudioManager } from '../engine/Audio';
import { GLRenderer } from '../engine/gl/GLRenderer';
import { detectGpu, type GpuInfo } from '../engine/gpu';
import { Input, type Bindings, type Controller } from '../engine/Input';
import type { GameMode } from '../game/systems/Director';
import type { RemotePlayer } from '../net/Lobby';
import type { StartInfo } from '../net/Protocol';
import type { LobbyClient } from '../net/Lobby';
import { ClientGameScene } from '../scenes/ClientGameScene';
import { GameScene } from '../scenes/GameScene';
import { MenuScene } from '../scenes/MenuScene';
import { Hud } from '../ui/Hud';
import { Toasts } from '../ui/Toasts';
import { UIManager } from '../ui/UIManager';
import { AchievementTracker, rewardText } from './Achievements';
import { applyDisplaySettings } from './Display';
import { GRAPHICS_PRESETS, SaveManager } from './SaveManager';
import type { Scene } from './Scene';

/** Un joueur d'une partie : local (clavier / manette) ou distant (en ligne). */
export interface PlayerSlot {
  name: string;
  character: string;
  control: Controller | { type: 'remote'; id: string };
  meta?: Record<string, number>;
}

/** Paramètres d'une partie. */
export interface RunConfig {
  mode: GameMode;
  biome: string;
  danger: number;
  mutators: string[];
  players: PlayerSlot[];
  seed?: number;
  daily?: boolean;
  startWave?: number;
  /** Hôte d'une partie en ligne : connexions des joueurs distants. */
  online?: { remotes: { remote: RemotePlayer; heroIndex: number }[] };
}

export class Game {
  readonly renderer: GLRenderer;
  readonly input = new Input(window);
  readonly assets = new Assets();
  readonly audio = new AudioManager();
  readonly save = new SaveManager();
  readonly ui: UIManager;
  readonly achievements: AchievementTracker;
  readonly gpu: GpuInfo;
  hud!: Hud;
  toasts!: Toasts;
  /** Outils de test activés avec ?debug dans l'adresse. */
  readonly debug = new URLSearchParams(location.search).has('debug');
  private scene: Scene | null = null;
  private lastTime = 0;
  private lastFrame = 0;
  private fpsEl: HTMLElement | null = null;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(
    canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
    private readonly hudRoot: HTMLElement,
    private readonly toastRoot: HTMLElement,
  ) {
    this.renderer = new GLRenderer(canvas);
    this.gpu = detectGpu(this.renderer.gl);
    this.ui = new UIManager(uiRoot, this.input, this.audio);
    this.achievements = new AchievementTracker(this.save, (def) => {
      this.toasts?.show('achievement', def.name, rewardText(def.reward), def.icon);
      this.audio.play('chest');
    });
    // Le son ne peut démarrer qu'après une interaction de l'utilisateur.
    const unlock = () => this.audio.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('blur', () => this.audio.setMuted(this.save.data.settings.muteUnfocused));
    window.addEventListener('focus', () => this.audio.setMuted(false));
    // Interface adaptée à la manette (indications de boutons, curseur masqué).
    this.input.onDeviceChange = (device) => document.body.classList.toggle('gamepad', device === 'gamepad');

    // Premier lancement : préréglage graphique choisi selon la carte graphique détectée.
    const s = this.save.data.settings;
    if (!s.gpuChecked) {
      s.gpuChecked = true;
      s.graphics = { ...s.graphics, preset: this.gpu.tier, ...GRAPHICS_PRESETS[this.gpu.tier] };
      this.save.save();
    }
  }

  async boot(onProgress?: (ratio: number) => void): Promise<void> {
    await this.assets.load(onProgress);
    try {
      // Au plus 2 s d'attente : sans la police, le jeu reste jouable avec la police de secours.
      await Promise.race([
        Promise.all([document.fonts.load('16px "Pixelify Sans"'), document.fonts.load('700 16px "Pixelify Sans"')]),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // Police indisponible : on garde la police de secours.
    }
    this.renderer.init(this.assets);
    this.hud = new Hud(this.hudRoot, this.assets);
    this.toasts = new Toasts(this.toastRoot, this.assets);
    this.applySettings();
    // Rattrapage des succès (anciennes sauvegardes).
    this.achievements.check(null);
    this.setScene(new MenuScene(this, true));
    requestAnimationFrame((t) => {
      this.lastTime = t;
      requestAnimationFrame(this.frame);
    });
  }

  /** Applique tous les paramètres (son, commandes, graphismes, accessibilité). */
  applySettings(): void {
    const s = this.save.data.settings;
    this.audio.setVolumes(s.sfxVolume, s.musicVolume, s.masterVolume);
    this.input.setBindings(s.keybinds as Partial<Bindings> | null);
    this.renderer.setRenderScale(s.graphics.renderScale);
    applyDisplaySettings(s);
    const showFps = s.graphics.showFps || this.debug;
    if (showFps && !this.fpsEl) {
      this.fpsEl = document.createElement('div');
      this.fpsEl.className = 'fps';
      document.body.append(this.fpsEl);
    } else if (!showFps && this.fpsEl) {
      this.fpsEl.remove();
      this.fpsEl = null;
    }
  }

  setScene(scene: Scene): void {
    this.scene?.exit();
    this.scene = scene;
    scene.enter();
  }

  goToMenu(): void {
    this.setScene(new MenuScene(this, false));
  }

  startRun(config: RunConfig): void {
    this.setScene(new GameScene(this, config));
  }

  /** Rejoint une partie en ligne lancée par un autre joueur. */
  startClientRun(lobby: LobbyClient, info: StartInfo, heroIndex: number): void {
    this.setScene(new ClientGameScene(this, lobby, info, heroIndex));
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  }

  /** Avance la simulation d'un pas (utilisé par la boucle et par les tests automatisés). */
  step(dt: number): void {
    this.scene?.update(dt);
  }

  render(): void {
    this.scene?.render();
  }

  private frame = (time: number): void => {
    requestAnimationFrame(this.frame);
    // Limite d'images par seconde choisie dans les paramètres.
    const limit = this.save.data.settings.graphics.fpsLimit;
    if (limit > 0 && time - this.lastFrame < 1000 / limit - 1) return;
    this.lastFrame = time;
    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    // Après une mise en veille de l'onglet, on ne rattrape pas des secondes de simulation.
    dt = Math.min(dt, 0.1);
    this.input.poll(dt);
    if (this.scene) {
      // Sous-pas pour garder une simulation stable même à faible framerate.
      const steps = Math.max(1, Math.ceil(dt * 60 - 0.05));
      for (let i = 0; i < steps; i++) this.scene.update(dt / steps);
      this.scene.render();
    }
    if (this.fpsEl) {
      this.fpsFrames++;
      this.fpsTime += dt;
      if (this.fpsTime >= 0.5) {
        const fps = Math.round(this.fpsFrames / this.fpsTime);
        const scene = this.scene as { world?: { enemies: readonly unknown[] } } | null;
        this.fpsEl.textContent = `${fps} i/s · ${scene?.world?.enemies.length ?? 0} ennemis · ${this.renderer.drawCalls} appels GPU`;
        this.fpsFrames = 0;
        this.fpsTime = 0;
      }
    }
  };
}
