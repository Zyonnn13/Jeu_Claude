// Petits utilitaires pour construire l'interface en DOM sans framework.
import type { Assets } from '../engine/Assets';

type Child = Node | string | number | null | undefined | false;

export interface ElProps {
  class?: string;
  text?: string;
  title?: string;
  attrs?: Record<string, string>;
  style?: Partial<Record<string, string>>;
  /** Rend l'élément sélectionnable au clavier / à la manette. */
  nav?: boolean;
  onClick?: (e: MouseEvent) => void;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: ElProps = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.title) el.title = props.title;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.style) for (const [k, v] of Object.entries(props.style)) if (v !== undefined) el.style.setProperty(k, v);
  if (props.nav) {
    el.dataset.nav = '';
    if (!(el instanceof HTMLButtonElement) && !(el instanceof HTMLInputElement)) el.tabIndex = 0;
  }
  const onClick = props.onClick;
  if (onClick) el.addEventListener('click', (e) => onClick(e as MouseEvent));
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

/** Bouton navigable. */
export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = h('button', { class: `btn ${cls}`.trim(), text: label, nav: true });
  b.type = 'button';
  b.addEventListener('click', () => {
    if (b.classList.contains('is-disabled')) return;
    onClick();
  });
  return b;
}

/**
 * Affiche une frame d'un sprite en CSS (image pixelisée agrandie).
 * Avec `animate`, les frames défilent en boucle.
 */
export function spriteEl(assets: Assets, name: string, size: number, opts: { animate?: boolean; frame?: number; class?: string } = {}): HTMLDivElement {
  const sprite = assets.get(name);
  const ratio = sprite.h / sprite.w;
  const el = h('div', { class: `sprite ${opts.class ?? ''}`.trim() });
  el.style.width = `${size}px`;
  el.style.height = `${size * ratio}px`;
  el.style.backgroundImage = `url("${sprite.url}")`;
  el.style.backgroundSize = `${sprite.frames * 100}% 100%`;
  if (sprite.frames > 1) {
    if (opts.animate) {
      el.classList.add('sprite-anim');
      el.style.setProperty('--frames', String(sprite.frames));
      el.style.setProperty('--end', `${(sprite.frames / (sprite.frames - 1)) * 100}%`);
    } else {
      el.style.backgroundPosition = `${((opts.frame ?? 0) / (sprite.frames - 1)) * 100}% 0`;
    }
  }
  return el;
}

/** Pastilles de niveau (●●●○○). */
export function levelPips(current: number, max: number, highlight = 0): HTMLDivElement {
  const el = h('div', { class: 'pips' });
  for (let i = 1; i <= max; i++) {
    el.append(h('span', { class: i <= current ? (i > current - highlight ? 'pip on new' : 'pip on') : 'pip' }));
  }
  return el;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}
