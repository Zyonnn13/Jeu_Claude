// Effets purement visuels : particules, cadavres projetés, éclats critiques, nombres de dégâts,
// éclairs, ondes de choc, textes flottants et séquences différées (mort de boss).
import type { Assets } from '../../engine/Assets';
import { rgb, type GLRenderer } from '../../engine/gl/GLRenderer';
import { TAU } from '../../engine/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

interface FloatingText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
  pop: number;
}

interface Bolt {
  points: { x: number; y: number }[];
  life: number;
  maxLife: number;
  color: string;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  fill: boolean;
}

interface Corpse {
  sprite: string;
  frame: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  rotation: number;
  spin: number;
  life: number;
  maxLife: number;
  flip: boolean;
  scale: number;
  tint?: string;
  alpha: number;
}

interface Spark {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
}

const MAX_PARTICLES = 1200;
const MAX_TEXTS = 100;
const MAX_CORPSES = 160;

/** Retire en place les éléments morts (évite d'allouer un nouveau tableau à chaque image). */
function compact<T extends { life: number }>(list: T[]): void {
  let w = 0;
  for (let i = 0; i < list.length; i++) if (list[i].life > 0) list[w++] = list[i];
  list.length = w;
}

export class Effects {
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];
  private bolts: Bolt[] = [];
  private rings: Ring[] = [];
  private corpses: Corpse[] = [];
  private sparks: Spark[] = [];
  private timeline: { t: number; fn: () => void }[] = [];
  showDamageNumbers = true;
  /** Quantité de particules (qualité graphique). */
  particleScale = 1;
  corpsesEnabled = true;
  /** Enregistreur (partie en ligne : les effets de l'hôte sont rejoués chez les clients). */
  recorder: ((ev: (string | number | boolean | null)[]) => void) | null = null;

  burst(x: number, y: number, color: string, count: number, speed = 60, opts: { size?: number; life?: number; gravity?: number } = {}): void {
    this.recorder?.(['burst', x, y, color, count, speed, opts.size ?? 1.5, opts.life ?? 0.45, opts.gravity ?? 0]);
    const n = Math.round(count * this.particleScale);
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const a = Math.random() * TAU;
      const s = speed * (0.3 + Math.random() * 0.7);
      const life = (opts.life ?? 0.45) * (0.6 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (opts.gravity ? speed * 0.4 : 0),
        life,
        maxLife: life,
        size: (opts.size ?? 1.5) * (0.6 + Math.random() * 0.8),
        color,
        gravity: opts.gravity ?? 0,
      });
    }
  }

  damageNumber(x: number, y: number, amount: number, crit: boolean): void {
    this.recorder?.(['dmg', Math.round(x), Math.round(y), Math.round(amount), crit]);
    if (!this.showDamageNumbers) return;
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y - 6,
      vx: (Math.random() - 0.5) * 14,
      vy: crit ? -40 : -30,
      life: crit ? 0.8 : 0.6,
      maxLife: crit ? 0.8 : 0.6,
      text: String(Math.round(amount)),
      color: crit ? '#ffd84a' : '#ffffff',
      size: crit ? 10 : 7,
      pop: crit ? 1 : 0.4,
    });
  }

  text(x: number, y: number, text: string, color = '#ffffff', size = 8, life = 1): void {
    this.recorder?.(['text', x, y, text, color, size, life]);
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({ x, y, vx: 0, vy: -20, life, maxLife: life, text, color, size, pop: 0.6 });
  }

  /** Éclat en étoile, pour les coups critiques. */
  spark(x: number, y: number, color = '#fff1a0', size = 14): void {
    this.recorder?.(['spark', x, y, color, size]);
    this.sparks.push({ x, y, life: 0.18, maxLife: 0.18, size, color, rotation: Math.random() * 0.8 - 0.4 });
  }

  /** Le corps d'un ennemi vaincu est projeté en tournoyant puis s'efface. */
  corpse(sprite: string, frame: number, x: number, y: number, flip: boolean, scale: number, dirX: number, dirY: number, tint?: string, alpha = 1): void {
    this.recorder?.(['corpse', sprite, frame, x, y, flip, scale, dirX, dirY, tint ?? null, alpha]);
    if (!this.corpsesEnabled) return;
    if (this.corpses.length >= MAX_CORPSES) this.corpses.shift();
    const speed = 55 + Math.random() * 45;
    const life = 0.45 + Math.random() * 0.15;
    this.corpses.push({
      sprite,
      frame,
      x,
      y,
      vx: dirX * speed + (Math.random() - 0.5) * 20,
      vy: dirY * speed * 0.6,
      z: 0,
      vz: 70 + Math.random() * 40,
      rotation: 0,
      spin: (dirX >= 0 ? 1 : -1) * (8 + Math.random() * 6),
      life,
      maxLife: life,
      flip,
      scale,
      tint,
      alpha,
    });
  }

  lightning(x: number, y: number, fromX?: number, fromY?: number, color = '#cfe8ff'): void {
    this.recorder?.(['bolt', x, y, fromX ?? null, fromY ?? null, color]);
    const sx = fromX ?? x + (Math.random() - 0.5) * 40;
    const sy = fromY ?? y - 220;
    const points = [{ x: sx, y: sy }];
    const segments = 8;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const jitter = fromX === undefined ? 14 : 8;
      points.push({ x: sx + (x - sx) * t + (Math.random() - 0.5) * jitter, y: sy + (y - sy) * t + (Math.random() - 0.5) * jitter * 0.5 });
    }
    points.push({ x, y });
    this.bolts.push({ points, life: 0.22, maxLife: 0.22, color });
  }

  ring(x: number, y: number, maxRadius: number, color: string, life = 0.35, fill = false): void {
    this.recorder?.(['ring', x, y, maxRadius, color, life, fill]);
    this.rings.push({ x, y, radius: 2, maxRadius, life, maxLife: life, color, fill });
  }

  /** Exécute une action plus tard (séquence d'explosions à la mort d'un boss...). */
  delay(seconds: number, fn: () => void): void {
    this.timeline.push({ t: seconds, fn });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      const drag = 1 - 3 * dt;
      p.vx *= drag;
      p.vy *= drag;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    compact(this.particles);
    for (const t of this.texts) {
      t.life -= dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy *= 1 - 3 * dt;
      t.vx *= 1 - 3 * dt;
    }
    compact(this.texts);
    for (const b of this.bolts) b.life -= dt;
    compact(this.bolts);
    for (const s of this.sparks) s.life -= dt;
    compact(this.sparks);
    for (const r of this.rings) {
      r.life -= dt;
      const k = 1 - r.life / r.maxLife;
      r.radius = r.maxRadius * (1 - Math.pow(1 - k, 3));
    }
    compact(this.rings);
    for (const c of this.corpses) {
      c.life -= dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vz -= 320 * dt;
      c.z = Math.max(0, c.z + c.vz * dt);
      c.rotation += c.spin * dt;
      c.vx *= 1 - 2 * dt;
    }
    compact(this.corpses);
    if (this.timeline.length) {
      for (const item of this.timeline) {
        item.t -= dt;
        if (item.t <= 0) item.fn();
      }
      this.timeline = this.timeline.filter((i) => i.t > 0);
    }
  }

  /** Ondes au sol, sous les entités. */
  renderGround(r: GLRenderer): void {
    for (const ring of this.rings) {
      const a = ring.life / ring.maxLife;
      if (ring.fill) r.ellipse(ring.x, ring.y, ring.radius, ring.radius * 0.75, ring.color, a * 0.3);
      else r.ringShape(ring.x, ring.y, ring.radius, ring.radius * 0.75, ring.color, a * 0.85);
    }
  }

  renderCorpses(r: GLRenderer, assets: Assets): void {
    for (const c of this.corpses) {
      const k = c.life / c.maxLife;
      const sprite = assets.get(c.sprite);
      r.sprite(sprite, c.x, c.y - c.z, {
        frame: c.frame,
        flip: c.flip,
        scale: c.scale * (0.7 + 0.3 * k),
        rotation: c.rotation,
        flash: k > 0.8 ? 1 : 0,
        tint: c.tint,
        alpha: Math.min(1, k * 2) * c.alpha,
      });
    }
  }

  renderParticles(r: GLRenderer): void {
    for (const p of this.particles) {
      const s = p.size;
      r.rect(p.x - s / 2, p.y - s / 2, s, s, p.color, Math.min(1, (p.life / p.maxLife) * 1.5));
    }
  }

  /** Éléments lumineux non affectés par la nuit (éclairs, éclats). */
  renderBright(r: GLRenderer): void {
    for (const b of this.bolts) {
      const a = b.life / b.maxLife;
      for (let i = 1; i < b.points.length; i++) {
        const p0 = b.points[i - 1];
        const p1 = b.points[i];
        r.line(p0.x, p0.y, p1.x, p1.y, 4, b.color, a * 0.45);
        r.line(p0.x, p0.y, p1.x, p1.y, 1.5, '#ffffff', a);
      }
    }
    for (const s of this.sparks) {
      const k = s.life / s.maxLife;
      const size = s.size * (1.4 - k * 0.6);
      r.draw(r.spark, s.x, s.y, size, size, 0.5, 0.5, s.rotation, 0, false, rgb(s.color), 1, k);
    }
  }

  renderTexts(r: GLRenderer): void {
    for (const t of this.texts) {
      const k = t.life / t.maxLife;
      const age = t.maxLife - t.life;
      const pop = 1 + t.pop * Math.max(0, 1 - age / 0.15);
      r.text(t.text, t.x, t.y, { size: t.size * pop, color: t.color, alpha: Math.min(1, k * 2.5) });
    }
  }

  /** Sources de lumière des effets (éclairs, explosions). */
  emitLights(r: GLRenderer): void {
    for (const b of this.bolts) {
      const end = b.points[b.points.length - 1];
      r.light(end.x, end.y, 90, rgb(b.color), (b.life / b.maxLife) * 1.4);
    }
    for (const ring of this.rings) {
      if (ring.fill) r.light(ring.x, ring.y, ring.maxRadius * 1.6, rgb(ring.color), (ring.life / ring.maxLife) * 1.2);
    }
    for (const s of this.sparks) r.light(s.x, s.y, 24, rgb(s.color), s.life / s.maxLife);
  }
}
