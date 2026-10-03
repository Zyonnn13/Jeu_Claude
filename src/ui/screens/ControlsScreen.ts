// Reconfiguration des touches (deux touches par commande) et rappel des boutons de manette.
import type { Game } from '../../core/Game';
import { BINDABLE_LABELS, DEFAULT_BINDINGS, type Bindable, type Bindings } from '../../engine/Input';
import { button, h } from '../dom';

const ORDER: Bindable[] = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'pause', 'reroll'];

/** Panneau de réassignation des touches (utilisé dans l'onglet Commandes des paramètres). */
export function controlsPanel(game: Game): HTMLElement {
  const input = game.input;
  let bindings: Bindings = input.getBindings();
  const list = h('div', { class: 'options-list' });
  const status = h('div', { class: 'controls-status' });

  const persist = () => {
    game.save.data.settings.keybinds = bindings;
    game.save.save();
    game.applySettings();
  };

  const render = (focus?: string) => {
    list.replaceChildren(
      ...ORDER.map((action) =>
        h(
          'div',
          { class: 'option-row bind-row' },
          h('span', { class: 'option-label', text: BINDABLE_LABELS[action] }),
          ...[0, 1].map((slot) => {
            const code = bindings[action][slot];
            const b = h('button', { class: 'bind-btn', text: code ? input.keyLabel(code) : '—', nav: true, attrs: { 'data-slot': `${action}:${slot}` } });
            b.type = 'button';
            b.addEventListener('click', () => {
              b.textContent = 'Appuyez…';
              b.classList.add('waiting');
              status.textContent = 'Appuyez sur la nouvelle touche (Échap pour annuler).';
              // Laisse passer l'événement de clic/Entrée avant de capturer.
              window.setTimeout(() => {
                input.captureNextKey((newCode) => {
                  status.textContent = '';
                  if (newCode) {
                    // Une touche ne peut servir qu'à une seule commande.
                    for (const other of ORDER) bindings[other] = bindings[other].filter((c) => c !== newCode);
                    const next = [...bindings[action]];
                    next[slot] = newCode;
                    bindings[action] = next.filter(Boolean);
                    persist();
                  }
                  render(`${action}:${slot}`);
                });
              }, 50);
            });
            return b;
          }),
        ),
      ),
    );
    if (focus) list.querySelector<HTMLElement>(`[data-slot="${focus}"]`)?.focus();
  };
  render();

  const reset = button('Touches par défaut', () => {
    bindings = structuredClone(DEFAULT_BINDINGS);
    persist();
    render();
    reset.focus();
  });

  return h(
    'div',
    { class: 'controls-panel' },
    list,
    status,
    h('div', { class: 'screen-actions' }, reset),
    h(
      'div',
      { class: 'pad-help' },
      h('h3', { text: 'Manette' }),
      h('div', { text: 'Stick gauche / croix : se déplacer et naviguer dans les menus' }),
      h('div', { text: 'A : valider · B : retour · Y : relancer les choix · Start : pause' }),
    ),
  );
}
