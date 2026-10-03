// Dessine une partie avec le moteur GPU : sol, zones, auras, objets, entités triées en profondeur,
// projectiles, éclairage nocturne, lueurs additives, textes et indicateurs.
import type { BiomeDef } from '../../data/biomes';
import type { Assets } from '../../engine/Assets';
import { rgb, type GLRenderer } from '../../engine/gl/GLRenderer';
import { TAU } from '../../engine/math';
import { GroundRenderer } from './GroundRenderer';
import type { EnemyView, HeroView, WorldView } from './WorldView';

/** Options graphiques choisies dans les paramètres. */
export interface RenderOptions {
  lighting: 'off' | 'low' | 'high';
  bloom: boolean;
  shadows: boolean;
  /** Intensité de la vignette (0 à 1). */
  vignette: number;
  /** Projectiles ennemis très contrastés (accessibilité). */
  highContrastBullets: boolean;
  /** Pseudos au-dessus des joueurs (multijoueur). */
  nameTags: boolean;
  offscreenIndicators: boolean;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  lighting: 'high',
  bloom: true,
  shadows: true,
  vignette: 0.8,
  highContrastBullets: false,
  nameTags: true,
  offscreenIndicators: true,
};

const WARM = rgb('#ffe2b8');
const GEM_COLORS: Record<string, string> = {
  gem_blue: '#6fe3f0',
  gem_green: '#8fd94f',
  gem_red: '#ff6a5a',
  gem_purple: '#c06dff',
};

type Bounds = { left: number; top: number; right: number; bottom: number };

export class WorldRenderer {
  private readonly ground: GroundRenderer;
  private sorted: (EnemyView | HeroView)[] = [];

  constructor(
    private readonly r: GLRenderer,
    private readonly assets: Assets,
    biome: BiomeDef,
  ) {
    this.ground = new GroundRenderer(r, assets, biome, 1337);
  }

  dispose(): void {
    this.ground.dispose();
  }

  render(view: WorldView, o: RenderOptions = DEFAULT_RENDER_OPTIONS): void {
    const r = this.r;
    r.beginFrame(view.biome.clearColor);
    r.setWorldView(view.camera);
    const bounds = r.viewBounds(view.camera, 40);
    const heroes = view.heroViews;

    this.ground.render(bounds);
    this.renderZones(view);
    this.renderAuras(view, heroes);
    view.effects.renderGround(r);
    this.renderPickups(view, o);
    this.renderActors(view, heroes, o);
    view.effects.renderCorpses(r, this.assets);
    this.renderProjectiles(view, o);
    this.renderBullets(view, o);
    view.effects.renderParticles(r);

    if (o.lighting !== 'off') this.renderLights(view, heroes, bounds, o.lighting === 'high' ? 2 : 3);

    if (o.bloom) {
      r.setBlend('add');
      this.renderGlows(view);
      r.setBlend('normal');
    }
    view.effects.renderBright(r);
    view.effects.renderTexts(r);
    this.renderBars(view, heroes, o);

    r.setScreenView();
    if (o.offscreenIndicators) this.renderIndicators(view, heroes);
    const local = heroes[view.localHeroIndex] ?? heroes[0];
    const ratio = local ? local.hp / local.maxHp : 1;
    const f = view.flash;
    r.post({
      vignette: o.vignette,
      flash: [f.r, f.g, f.b, f.a],
      lowHp: !local || local.dead || local.downed ? 0 : Math.max(0, (0.3 - ratio) / 0.3),
      time: view.time,
    });
    r.endFrame();
  }

  private renderZones(view: WorldView): void {
    const r = this.r;
    const flame = this.assets.get('flame');
    for (const z of view.zones) {
      if (!view.isInView(z.x, z.y, z.radius + 16)) continue;
      const a = Math.min(1, z.age * 6) * Math.min(1, (z.life - z.age) * 2);
      r.ellipse(z.x, z.y, z.radius, z.radius * 0.75, '#f28c28', 0.2 * a);
      const scaleMul = Math.min(1.4, z.radius / 26);
      for (const fl of z.flames) {
        r.sprite(flame, z.x + fl.dx, z.y + fl.dy, {
          frame: Math.floor(view.time * 10 + fl.phase),
          scale: fl.scale * scaleMul * (0.6 + 0.4 * a),
          alpha: a,
          anchorY: 0.85,
        });
      }
    }
  }

  private renderAuras(view: WorldView, heroes: HeroView[]): void {
    for (const h of heroes) {
      if (h.dead || h.downed) continue;
      for (const aura of h.auras) {
        const radius = aura.radius + Math.sin(view.time * 4) * 1.2;
        this.r.glow(h.x, h.y, radius, radius * 0.8, aura.color, 0.22 + aura.pulse * 0.15);
        this.r.ringShape(h.x, h.y, radius, radius * 0.8, aura.color, 0.25 + aura.pulse * 0.35);
      }
    }
  }

  private renderPickups(view: WorldView, o: RenderOptions): void {
    const r = this.r;
    for (const pk of view.pickups) {
      if (!view.isInView(pk.x, pk.y, 12)) continue;
      const sprite = this.assets.get(pk.sprite);
      const bob = pk.attracted ? 0 : Math.sin(pk.age * 4 + pk.x) * 1.2;
      if (o.shadows) r.ellipse(pk.x, pk.y + sprite.h / 2 - 1, sprite.w * 0.3, 1.5, '#000000', 0.3);
      if (pk.kind === 'chest') r.glow(pk.x, pk.y, 16, 13, '#ffd84a', 0.35 + Math.sin(view.time * 5) * 0.12);
      const scale = pk.kind === 'bag' ? 1.5 : pk.kind === 'gem' && pk.value >= 100 ? 1.4 : 1;
      r.sprite(sprite, pk.x, pk.y + bob, { scale });
    }
  }

  private renderActors(view: WorldView, heroes: HeroView[], o: RenderOptions): void {
    const r = this.r;
    const sorted = this.sorted;
    sorted.length = 0;
    for (const e of view.enemies) {
      if (!e.dead && view.isInView(e.x, e.y, 40 * e.scale)) sorted.push(e);
    }
    for (const h of heroes) if (!h.dead || h.downed) sorted.push(h);
    sorted.sort((a, b) => a.y - b.y);

    // Ombres d'abord, pour qu'aucune ombre ne recouvre un personnage.
    if (o.shadows) {
      for (const a of sorted) {
        if ('index' in a) {
          if (!a.downed) r.ellipse(a.x, a.y + 7, 5, 2, '#000000', 0.35);
          continue;
        }
        const sprite = this.assets.get(a.def.sprite);
        const flying = !!a.def.flying;
        const h = sprite.h * a.scale;
        r.ellipse(a.x, a.y + h * (flying ? 0.55 : 0.42), a.radius * (flying ? 0.8 : 1.1), a.radius * 0.4, '#000000', flying ? 0.22 : 0.35);
      }
    }
    for (const a of sorted) {
      if ('index' in a) this.renderHero(view, a);
      else this.renderEnemy(view, a);
    }
  }

  private renderHero(view: WorldView, h: HeroView): void {
    const r = this.r;
    if (h.downed) {
      // Héros à terre : pierre tombale et jauge de relevage.
      r.sprite(this.assets.get('prop_tombstone'), h.x, h.y - 2, { scale: 0.8, alpha: 0.9 });
      if (h.reviveProgress > 0) {
        r.ringShape(h.x, h.y, 14, 11, '#ffffff', 0.25);
        const steps = Math.ceil(h.reviveProgress * 24);
        for (let i = 0; i < steps; i++) {
          const a = -Math.PI / 2 + (i / 24) * TAU;
          r.rect(h.x + Math.cos(a) * 14 - 1, h.y + Math.sin(a) * 11 - 1, 2, 2, '#8fd94f');
        }
      }
      return;
    }
    const sprite = this.assets.get(h.sprite);
    const frame = h.moving ? Math.floor(h.anim * 9) % sprite.frames : 0;
    const blink = h.invulnerable > 0 && Math.floor(view.time * 20) % 2 === 0;
    r.sprite(sprite, h.x, h.y, { frame, flip: h.facing < 0, flash: h.flash > 0.1 ? 1 : 0, alpha: blink ? 0.45 : 1 });
  }

  private renderEnemy(view: WorldView, e: EnemyView): void {
    const sprite = this.assets.get(e.def.sprite);
    const frame = Math.floor(e.anim * (e.def.animSpeed ?? 4)) % sprite.frames;
    let x = e.x;
    const winding = e.state === 1 && (e.def.behavior === 'charger' || e.def.behavior === 'slimeKing' || e.def.behavior === 'vampire' || e.def.behavior === 'reaper');
    if (winding) x += Math.sin(view.time * 60) * 1.2;
    const misty = e.def.behavior === 'vampire' && e.state === 3;
    let alpha = (e.def.alpha ?? 1) * e.spawnFade;
    if (misty) alpha *= 0.35;
    const shielded = e.invulnerable > 0 && !misty;
    const pulse = e.hitPulse;
    this.r.sprite(sprite, x, e.y, {
      frame,
      flip: e.facing < 0,
      flash: e.flash > 0 || (winding && Math.floor(view.time * 16) % 2 === 0) || (shielded && Math.floor(view.time * 12) % 2 === 0) ? 1 : 0,
      tint: e.elite ? '#ff2a2a' : misty ? '#b06de0' : e.enraged ? '#ff0040' : undefined,
      tintAmount: misty ? 0.6 : e.enraged && !e.elite ? 0.25 : 0.45,
      scale: e.scale,
      scaleX: 1 + 0.22 * pulse,
      scaleY: 1 - 0.14 * pulse,
      alpha,
    });
    if (e.def.overlay) {
      const overlay = this.assets.get(e.def.overlay);
      const top = (e.def.overlayY?.[frame] ?? -sprite.h / 2) * e.scale;
      this.r.sprite(overlay, x, e.y + top + e.scale, { scale: e.scale * 0.6, anchorY: 1, flip: e.facing < 0, alpha });
    }
  }

  private renderProjectiles(view: WorldView, o: RenderOptions): void {
    const r = this.r;
    for (const p of view.projectiles) {
      if (p.dead || !view.isInView(p.x, p.y, 40 * p.scale)) continue;
      const sprite = this.assets.get(p.sprite);
      if (p.motion === 'lob' && o.shadows) {
        const t = Math.min(1, p.age / p.life);
        r.ellipse(p.lobFromX + (p.lobToX - p.lobFromX) * t, p.lobFromY + (p.lobToY - p.lobFromY) * t + 4, 4, 1.5, '#000000', 0.3);
      }
      r.sprite(sprite, p.x, p.y, {
        frame: p.frameRate ? Math.floor(p.age * p.frameRate) : 0,
        rotation: p.rotation,
        scale: p.scale,
        alpha: p.alpha,
        flip: p.flip,
      });
    }
  }

  private renderBullets(view: WorldView, o: RenderOptions): void {
    const sprite = this.assets.get('enemy_bullet');
    for (const b of view.bullets) {
      if (!view.isInView(b.x, b.y, 8)) continue;
      if (o.highContrastBullets) {
        // Contour noir et cœur blanc : visibles quelle que soit la perception des couleurs.
        this.r.ellipse(b.x, b.y, 5, 5, '#000000', 1);
        this.r.ellipse(b.x, b.y, 3.6, 3.6, '#ffffff', 1);
        this.r.ellipse(b.x, b.y, 2, 2, b.color, 1);
        continue;
      }
      this.r.sprite(sprite, b.x, b.y, { frame: Math.floor(b.age * 10), tint: b.color, tintAmount: 0.55 });
    }
  }

  /** Carte de lumière : chaque source « perce » l'obscurité ambiante. */
  private renderLights(view: WorldView, heroes: HeroView[], bounds: Bounds, divisor: number): void {
    const r = this.r;
    const t = view.time;
    r.beginLights(rgb(view.biome.ambient), view.camera, divisor);
    const radius = view.biome.playerLight * view.lightRadius;
    for (const h of heroes) {
      if (h.dead && !h.downed) continue;
      const k = h.downed ? 0.4 : 1;
      r.light(h.x, h.y - 4, radius * k, WARM, 1);
      r.light(h.x, h.y - 4, radius * 0.35 * k, WARM, 0.5);
      for (const aura of h.auras) r.light(h.x, h.y, aura.radius * 1.4, rgb(aura.color), 0.35 + aura.pulse * 0.3);
    }

    this.ground.emitLights(bounds, t);

    for (const z of view.zones) {
      if (!view.isInView(z.x, z.y, z.radius * 2)) continue;
      const a = Math.min(1, z.age * 6) * Math.min(1, (z.life - z.age) * 2);
      const flicker = 0.85 + Math.sin(t * 13 + z.x) * 0.15;
      r.light(z.x, z.y, z.radius * 2.6 * flicker, rgb('#ff9a40'), 0.95 * a);
    }
    for (const pr of view.projectiles) {
      if (pr.dead || !view.isInView(pr.x, pr.y, 40)) continue;
      switch (pr.sprite) {
        case 'bolt':
          r.light(pr.x, pr.y, 30, rgb('#c080ff'), 0.85);
          break;
        case 'orb':
          r.light(pr.x, pr.y, 42 * pr.scale, rgb('#ffd870'), 0.9);
          break;
        case 'slash':
          r.light(pr.x, pr.y, 38 * pr.scale, rgb('#9fefff'), 0.7 * pr.alpha);
          break;
        case 'flask':
          r.light(pr.x, pr.y, 18, rgb('#ff9a40'), 0.6);
          break;
      }
    }
    for (const b of view.bullets) {
      if (view.isInView(b.x, b.y, 16)) r.light(b.x, b.y, 18, rgb(b.color), 0.75);
    }
    for (const pk of view.pickups) {
      if (!view.isInView(pk.x, pk.y, 16)) continue;
      if (pk.kind === 'gem') r.light(pk.x, pk.y, 12, rgb(GEM_COLORS[pk.sprite] ?? '#6fe3f0'), 0.5);
      else if (pk.kind === 'chest') r.light(pk.x, pk.y, 38, rgb('#ffd84a'), 0.85);
      else if (pk.kind === 'coin' || pk.kind === 'bag') r.light(pk.x, pk.y, 10, rgb('#ffd84a'), 0.4);
    }
    for (const e of view.enemies) {
      if (e.dead || !view.isInView(e.x, e.y, 60)) continue;
      if (e.isProp) {
        const flicker = 0.85 + Math.sin(t * 11 + e.id) * 0.1;
        r.light(e.x, e.y - 8, 75 * flicker, rgb('#ffa040'), 1);
      } else if (e.isBoss) {
        r.light(e.x, e.y, 80, rgb(e.def.bulletColor ?? '#e0413c'), 0.55);
      } else if (e.elite) {
        r.light(e.x, e.y, 28, rgb('#ff4030'), 0.45);
      } else if (e.def.id === 'ghost') {
        r.light(e.x, e.y, 20, rgb('#bfe0ff'), 0.45);
      } else if (e.def.id === 'eye' || e.def.id === 'cultist' || e.def.id === 'armorKnight') {
        r.light(e.x, e.y - 3, 12, rgb('#ff5040'), 0.35);
      }
    }
    view.effects.emitLights(r);
    r.endLights(view.camera);
  }

  /** Lueurs additives (petit « bloom ») autour des éléments lumineux. */
  private renderGlows(view: WorldView): void {
    const r = this.r;
    for (const pr of view.projectiles) {
      if (pr.dead || !view.isInView(pr.x, pr.y, 30)) continue;
      if (pr.sprite === 'bolt') r.glow(pr.x, pr.y, 9, 9, '#b06de0', 0.5);
      else if (pr.sprite === 'orb') r.glow(pr.x, pr.y, 12 * pr.scale, 12 * pr.scale, '#ffc850', 0.45);
    }
    for (const b of view.bullets) {
      if (view.isInView(b.x, b.y, 8)) r.glow(b.x, b.y, 7, 7, b.color, 0.5);
    }
    for (const z of view.zones) {
      if (!view.isInView(z.x, z.y, z.radius)) continue;
      const a = Math.min(1, z.age * 6) * Math.min(1, (z.life - z.age) * 2);
      r.glow(z.x, z.y - 3, z.radius * 1.1, z.radius * 0.8, '#ff7a20', 0.35 * a);
    }
    for (const pk of view.pickups) {
      if (pk.kind === 'gem' && view.isInView(pk.x, pk.y, 8)) r.glow(pk.x, pk.y, 5, 5, GEM_COLORS[pk.sprite] ?? '#6fe3f0', 0.3);
    }
  }

  private renderBars(view: WorldView, heroes: HeroView[], o: RenderOptions): void {
    for (const h of heroes) {
      if (h.dead || h.downed) {
        if (h.downed && view.multiplayer && o.nameTags) this.r.text(h.name, h.x, h.y - 18, { size: 6, color: '#e0413c' });
        continue;
      }
      const ratio = Math.max(0, h.hp / h.maxHp);
      this.bar(h.x - 8, h.y + 10, 16, 2, ratio, ratio < 0.3 ? '#ff5050' : '#e0413c');
      if (view.multiplayer && o.nameTags) this.r.text(h.name, h.x, h.y - 15, { size: 6, color: h.color });
    }
    for (const e of view.enemies) {
      if (!e.elite || e.dead || e.hp >= e.maxHp || !view.isInView(e.x, e.y, 20)) continue;
      const sprite = this.assets.get(e.def.sprite);
      const w = 18 * Math.min(1.5, e.scale / 1.6);
      this.bar(e.x - w / 2, e.y - (sprite.h * e.scale) / 2 - 4, w, 2, e.hp / e.maxHp, '#e0413c');
    }
  }

  private bar(x: number, y: number, w: number, h: number, ratio: number, color: string): void {
    const r = this.r;
    r.rect(x - 0.5, y - 0.5, w + 1, h + 1, '#1b1424');
    r.rect(x, y, w, h, '#3b2d4a');
    r.rect(x, y, w * Math.max(0, Math.min(1, ratio)), h, color);
  }

  /** Flèches au bord de l'écran vers le boss, les coffres et les coéquipiers hors champ. */
  private renderIndicators(view: WorldView, heroes: HeroView[]): void {
    const targets: { x: number; y: number; icon: string; color: string }[] = [];
    const boss = view.boss;
    if (boss && !boss.dead && !view.isInView(boss.x, boss.y, -10)) targets.push({ x: boss.x, y: boss.y, icon: 'icon_skull', color: '#e0413c' });
    for (const pk of view.pickups) {
      if (pk.kind === 'chest' && !view.isInView(pk.x, pk.y, -10)) targets.push({ x: pk.x, y: pk.y, icon: 'chest', color: '#ffd84a' });
    }
    for (const h of heroes) {
      if (h.index === view.localHeroIndex || (h.dead && !h.downed)) continue;
      if (!view.isInView(h.x, h.y, -10)) targets.push({ x: h.x, y: h.y, icon: h.downed ? 'prop_tombstone' : h.sprite, color: h.color });
    }
    if (!targets.length) return;
    const r = this.r;
    const pad = 30 * (r.zoom / 2);
    const cx = r.width / 2;
    const cy = r.height / 2;
    for (const t of targets) {
      const s = r.worldToScreen(t.x, t.y);
      const dx = s.x - cx;
      const dy = s.y - cy;
      const k = Math.min((cx - pad) / Math.abs(dx || 1e-6), (cy - pad) / Math.abs(dy || 1e-6));
      const ex = cx + dx * k;
      const ey = cy + dy * k;
      const angle = Math.atan2(dy, dx);
      const size = 16 * r.zoom * 0.8;
      r.draw(r.arrow, ex + Math.cos(angle) * size * 0.4, ey + Math.sin(angle) * size * 0.4, size, size, 0.5, 0.5, angle, 0, false, rgb(t.color), -1, 1);
      r.sprite(this.assets.get(t.icon), ex - Math.cos(angle) * size * 0.5, ey - Math.sin(angle) * size * 0.5, { scale: r.zoom * 0.8 });
    }
  }
}
