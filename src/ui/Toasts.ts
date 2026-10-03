// Notifications temporaires (succès débloqué, synergie activée...).
import type { Assets } from '../engine/Assets';
import { h, spriteEl } from './dom';

export type ToastKind = 'achievement' | 'synergy' | 'info';

const LABELS: Record<ToastKind, string> = {
  achievement: 'Succès débloqué !',
  synergy: 'Synergie activée !',
  info: '',
};

export class Toasts {
  constructor(
    private readonly root: HTMLElement,
    private readonly assets: Assets,
  ) {}

  show(kind: ToastKind, name: string, detail: string, icon: string): void {
    const toast = h(
      'div',
      { class: `toast toast-${kind}` },
      h('div', { class: 'toast-icon' }, this.assets.has(icon) ? spriteEl(this.assets, icon, 36) : null),
      h('div', { class: 'toast-body' }, LABELS[kind] ? h('div', { class: 'toast-label', text: LABELS[kind] }) : null, h('div', { class: 'toast-name', text: name }), detail ? h('div', { class: 'toast-detail', text: detail }) : null),
    );
    this.root.append(toast);
    window.setTimeout(() => toast.classList.add('leaving'), 4200);
    window.setTimeout(() => toast.remove(), 4700);
  }
}
