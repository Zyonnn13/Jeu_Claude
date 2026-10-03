import type { Hero } from '../Hero';

let nextZoneId = 1;

/** Zone au sol qui inflige des dégâts périodiques (flammes de la fiole incendiaire). */
export class Zone {
  readonly id = nextZoneId++;
  dead = false;
  age = 0;
  tickTimer = 0;
  readonly flames: { dx: number; dy: number; phase: number; scale: number }[] = [];

  constructor(
    public x: number,
    public y: number,
    public radius: number,
    public damage: number,
    public life: number,
    public tickInterval: number,
    public sourceUid: number,
    public owner: Hero | null = null,
  ) {
    const count = Math.max(3, Math.round((radius * radius) / 90));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius * 0.8;
      this.flames.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.7, phase: Math.random() * 10, scale: 0.7 + Math.random() * 0.5 });
    }
    this.flames.sort((a, b) => a.dy - b.dy);
  }
}
