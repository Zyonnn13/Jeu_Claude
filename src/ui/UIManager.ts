// Pile d'écrans d'interface + navigation spatiale au clavier / à la manette.
import type { AudioManager } from '../engine/Audio';
import type { Action, Input } from '../engine/Input';

export interface Screen {
  el: HTMLElement;
  /** Échap / bouton B. */
  onBack?(): void;
  /** Raccourcis clavier propres à l'écran ; renvoyer true si la touche est utilisée. */
  onKey?(e: KeyboardEvent): boolean;
  onMount?(): void;
  onUnmount?(): void;
  /** L'écran redevient visible après la fermeture de celui du dessus. */
  onResume?(): void;
  /** Touche / bouton « relancer » (R, Y). */
  onReroll?(): void;
}

interface Entry {
  screen: Screen;
  lastFocus: HTMLElement | null;
}

export class UIManager {
  private stack: Entry[] = [];

  constructor(
    private readonly root: HTMLElement,
    input: Input,
    private readonly audio: AudioManager,
  ) {
    input.onAction((action, event) => this.onAction(action, event));
    input.onKey((e) => {
      const top = this.top;
      if (top?.onKey?.(e)) e.preventDefault();
    });
    // La souris déplace aussi le focus : clavier et souris restent synchronisés.
    root.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
      if (target && target !== document.activeElement && this.isInTop(target)) target.focus({ preventScroll: true });
    });
    root.addEventListener('focusin', (e) => {
      if ((e.target as HTMLElement).matches('[data-nav]')) this.audio.play('hover');
    });
    root.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
      if (!target) return;
      this.audio.play(target.classList.contains('is-disabled') ? 'denied' : 'select');
    });
  }

  get top(): Screen | null {
    return this.stack[this.stack.length - 1]?.screen ?? null;
  }

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  private isInTop(el: HTMLElement): boolean {
    return !!this.top && this.top.el.contains(el);
  }

  push(screen: Screen): void {
    const current = this.stack[this.stack.length - 1];
    if (current) {
      current.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      current.screen.el.classList.add('covered');
    }
    this.stack.push({ screen, lastFocus: null });
    screen.el.classList.add('screen');
    this.root.append(screen.el);
    screen.onMount?.();
    this.focusFirst();
  }

  pop(): void {
    const entry = this.stack.pop();
    if (!entry) return;
    entry.screen.el.remove();
    entry.screen.onUnmount?.();
    const below = this.stack[this.stack.length - 1];
    if (below) {
      below.screen.el.classList.remove('covered');
      below.screen.onResume?.();
      if (below.lastFocus && below.screen.el.contains(below.lastFocus)) below.lastFocus.focus({ preventScroll: true });
      else this.focusFirst();
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  replace(screen: Screen): void {
    this.pop();
    this.push(screen);
  }

  clear(): void {
    while (this.stack.length) this.pop();
  }

  private items(): HTMLElement[] {
    const top = this.top;
    if (!top) return [];
    return [...top.el.querySelectorAll<HTMLElement>('[data-nav]')].filter((el) => el.offsetParent !== null && !el.hasAttribute('disabled'));
  }

  focusFirst(): void {
    const items = this.items();
    const preferred = items.find((el) => el.hasAttribute('data-autofocus')) ?? items[0];
    preferred?.focus({ preventScroll: true });
  }

  private onAction(action: Action, event?: KeyboardEvent): boolean {
    const top = this.top;
    if (!top) return false;
    const active = document.activeElement as HTMLElement | null;
    switch (action) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        // Les curseurs (volume) : gauche/droite modifient la valeur (le clavier le fait nativement).
        if ((action === 'left' || action === 'right') && active instanceof HTMLInputElement && active.type === 'range') {
          if (!event) {
            const step = Number(active.step) || 1;
            active.value = String(Number(active.value) + (action === 'right' ? step : -step));
            active.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return true;
        }
        this.navigate(action);
        return true;
      case 'confirm':
        event?.preventDefault();
        if (active && this.isInTop(active) && active.matches('[data-nav]')) {
          if (active instanceof HTMLInputElement && active.type === 'checkbox') active.click();
          else if (!(active instanceof HTMLInputElement)) active.click();
        } else {
          this.focusFirst();
        }
        return true;
      case 'back':
      case 'pause':
        top.onBack?.();
        return true;
      case 'reroll':
        top.onReroll?.();
        return true;
    }
  }

  private navigate(dir: 'up' | 'down' | 'left' | 'right'): void {
    const items = this.items();
    if (!items.length) return;
    const current = document.activeElement as HTMLElement;
    if (!items.includes(current)) {
      items[0].focus({ preventScroll: true });
      return;
    }
    const cr = current.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const el of items) {
      if (el === current) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx;
      const dy = r.top + r.height / 2 - cy;
      const primary = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
      const secondary = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (primary <= 4) continue;
      const score = primary + secondary * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (!best) {
      // Boucle en bout de liste.
      const idx = items.indexOf(current);
      if (dir === 'down' || dir === 'right') best = items[(idx + 1) % items.length];
      else best = items[(idx - 1 + items.length) % items.length];
    }
    best.focus({ preventScroll: false });
  }
}
