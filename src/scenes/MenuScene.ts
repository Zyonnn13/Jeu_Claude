// Menu principal : décor nocturne qui défile lentement, éclairé par des feux follets.
import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import { BIOMES } from '../data/biomes';
import { Camera } from '../engine/Camera';
import { rgb } from '../engine/color';
import { GroundRenderer } from '../game/render/GroundRenderer';
import { mainMenuScreen, titleScreen } from '../ui/screens/MainMenuScreen';

interface Flyer {
  sprite: string;
  x: number;
  y: number;
  speed: number;
  phase: number;
}

export class MenuScene implements Scene {
  private readonly camera = new Camera();
  private readonly ground: GroundRenderer;
  private time = 0;
  private flyers: Flyer[] = [];

  constructor(
    private readonly game: Game,
    /** Afficher d'abord l'écran-titre (au lancement du jeu). */
    private readonly showTitle = false,
  ) {
    this.ground = new GroundRenderer(game.renderer, game.assets, BIOMES.cemetery, 4242);
    for (let i = 0; i < 9; i++) {
      this.flyers.push({
        sprite: i % 4 === 3 ? 'ghost' : 'bat',
        x: Math.random() * 800 - 400,
        y: Math.random() * 400 - 200,
        speed: 25 + Math.random() * 30,
        phase: Math.random() * 10,
      });
    }
  }

  enter(): void {
    this.game.hud.hide();
    this.game.ui.clear();
    this.game.ui.push(this.showTitle ? titleScreen(this.game) : mainMenuScreen(this.game));
    this.game.audio.setMusic('menu');
  }

  exit(): void {
    this.game.ui.clear();
    this.ground.dispose();
  }

  update(dt: number): void {
    this.time += dt;
    this.camera.x += dt * 14;
    this.camera.y += dt * 5;
    const r = this.game.renderer;
    for (const f of this.flyers) {
      f.x += f.speed * dt;
      f.y += Math.sin(this.time * 1.5 + f.phase) * 8 * dt;
      const left = this.camera.x - r.viewW / 2 - 30;
      const right = this.camera.x + r.viewW / 2 + 30;
      if (f.x > right) {
        f.x = left;
        f.y = this.camera.y + (Math.random() - 0.5) * r.viewH;
      }
    }
  }

  render(): void {
    const r = this.game.renderer;
    const t = this.time;
    r.beginFrame('#0c100e');
    r.setWorldView(this.camera);
    const view = r.viewBounds(this.camera, 40);
    this.ground.render(view);
    for (const f of this.flyers) {
      const sprite = this.game.assets.get(f.sprite);
      r.ellipse(f.x, f.y + 14, 4, 1.5, '#000000', 0.25);
      r.sprite(sprite, f.x, f.y, { frame: Math.floor((t + f.phase) * 10), alpha: f.sprite === 'ghost' ? 0.7 : 1 });
    }
    if (this.game.save.data.settings.graphics.lighting !== 'off') {
      r.beginLights(rgb('#2e3352'), this.camera);
      this.ground.emitLights(view, t);
      // Feux follets qui dérivent lentement.
      for (let i = 0; i < 5; i++) {
        const x = this.camera.x + Math.sin(t * 0.3 + i * 1.7) * r.viewW * 0.4;
        const y = this.camera.y + Math.cos(t * 0.23 + i * 2.3) * r.viewH * 0.35;
        r.light(x, y, 90 + Math.sin(t * 2 + i) * 10, rgb(i % 2 ? '#7fd0ff' : '#c58bff'), 0.8);
      }
      for (const f of this.flyers) if (f.sprite === 'ghost') r.light(f.x, f.y, 26, rgb('#bfe0ff'), 0.5);
      r.endLights(this.camera);
    }
    r.setScreenView();
    r.post({ vignette: 1, flash: [0, 0, 0, 0], lowHp: 0, time: t });
    r.endFrame();
  }
}
