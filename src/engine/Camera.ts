import { damp } from './math';

export class Camera {
  x = 0;
  y = 0;
  private shakeTime = 0;
  private shakeDuration = 0;
  private shakeIntensity = 0;
  offsetX = 0;
  offsetY = 0;
  shakeEnabled = true;
  /** Intensité des tremblements (accessibilité). */
  shakeScale = 1;
  /** Appelé pour chaque tremblement « global » (retransmis aux joueurs en ligne). */
  onShake: ((intensity: number, duration: number) => void) | null = null;

  follow(targetX: number, targetY: number, dt: number, snap = false): void {
    if (snap) {
      this.x = targetX;
      this.y = targetY;
    } else {
      this.x = damp(this.x, targetX, 10, dt);
      this.y = damp(this.y, targetY, 10, dt);
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / this.shakeDuration);
      const amount = this.shakeIntensity * k;
      this.offsetX = (Math.random() * 2 - 1) * amount;
      this.offsetY = (Math.random() * 2 - 1) * amount;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  /** `broadcast` : faux pour un tremblement qui ne concerne que le joueur local (dégâts reçus). */
  shake(intensity: number, duration = 0.25, broadcast = true): void {
    if (broadcast) this.onShake?.(intensity, duration);
    if (!this.shakeEnabled || this.shakeScale <= 0) return;
    intensity *= this.shakeScale;
    if (intensity >= this.shakeIntensity * (this.shakeTime / Math.max(this.shakeDuration, 0.001))) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
      this.shakeTime = duration;
    }
  }
}
