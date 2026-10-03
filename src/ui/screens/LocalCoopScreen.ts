// Coopération locale : jusqu'à 4 joueurs sur le même écran (clavier + manettes).
import type { Game, PlayerSlot } from '../../core/Game';
import { CHARACTER_LIST } from '../../data/characters';
import type { Controller } from '../../engine/Input';
import type { GameMode } from '../../game/systems/Director';
import { HERO_COLORS } from '../../game/Hero';
import { button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { mapSelectScreen } from './MapSelectScreen';

interface Slot {
  control: Controller;
  character: string;
}

export function localCoopScreen(game: Game): Screen {
  const slots: Slot[] = [];
  let mode: GameMode = 'waves';
  const grid = h('div', { class: 'coop-grid' });
  const actions = h('div', { class: 'screen-actions' });
  const unlocked = () => CHARACTER_LIST.filter((c) => game.save.data.unlockedCharacters.includes(c.id));

  const label = (c: Controller) => (c.type === 'keyboard' ? 'Clavier' : c.type === 'pad' ? `Manette ${c.index + 1}` : 'Clavier/manette');

  const render = () => {
    grid.replaceChildren(
      ...[0, 1, 2, 3].map((i) => {
        const s = slots[i];
        if (!s) {
          return h(
            'div',
            { class: 'coop-slot empty' },
            h('div', { class: 'coop-num', text: `Joueur ${i + 1}` }),
            h('div', { class: 'muted', text: i === 0 || !slots.some((x) => x.control.type === 'keyboard') ? 'Clavier : bouton « Rejoindre au clavier »' : '' }),
            h('div', { class: 'muted', text: 'Manette : appuyez sur Y' }),
          );
        }
        const c = CHARACTER_LIST.find((ch) => ch.id === s.character)!;
        const cycle = button(`${c.name} ▸`, () => {
          const list = unlocked();
          s.character = list[(list.findIndex((x) => x.id === s.character) + 1) % list.length].id;
          render();
        }, 'btn-small');
        const remove = button('Retirer', () => {
          slots.splice(i, 1);
          render();
        }, 'btn-small');
        return h(
          'div',
          { class: 'coop-slot', style: { '--accent': HERO_COLORS[i] } },
          h('div', { class: 'coop-num', text: `Joueur ${i + 1}` }),
          spriteEl(game.assets, c.sprite, 64, { animate: true }),
          h('div', { class: 'coop-device', text: label(s.control) }),
          h('div', { class: 'char-title', text: c.title }),
          h('div', { class: 'coop-buttons' }, cycle, remove),
        );
      }),
    );
    const kbJoined = slots.some((s) => s.control.type === 'keyboard');
    const joinKb = button('Rejoindre au clavier', () => {
      if (kbJoined || slots.length >= 4) return;
      slots.push({ control: { type: 'keyboard' }, character: unlocked()[slots.length % unlocked().length].id });
      render();
    });
    if (kbJoined || slots.length >= 4) joinKb.classList.add('is-disabled');
    const modeBtn = button(`Mode : ${mode === 'waves' ? 'Manches' : 'Survie 10 min'}`, () => {
      mode = mode === 'waves' ? 'survival' : 'waves';
      render();
    });
    const start = button('Choisir la carte et jouer', () => {
      if (!slots.length) return;
      game.ui.push(
        mapSelectScreen(game, mode, ({ biome, danger }) => {
          const players: PlayerSlot[] = slots.map((s, i) => ({ name: `Joueur ${i + 1}`, character: s.character, control: s.control }));
          game.startRun({ mode, biome, danger, mutators: [], players });
        }),
      );
    }, 'btn-primary');
    if (!slots.length) start.classList.add('is-disabled');
    actions.replaceChildren(joinKb, modeBtn, start, button('Retour', () => game.ui.pop()));
  };

  let offPad: (() => void) | null = null;
  const el = h(
    'div',
    { class: 'panel-screen coop' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Coopération locale' })),
    h('p', { class: 'screen-hint', text: 'Chaque manette rejoint la partie en appuyant sur Y. La caméra suit le groupe : restez ensemble ! Un joueur à terre peut être relevé par un coéquipier.' }),
    grid,
    actions,
  );
  render();
  return {
    el,
    onBack: () => game.ui.pop(),
    onMount: () => {
      offPad = game.input.onPadButton((pad, b) => {
        if (b !== 3 || slots.length >= 4 || slots.some((s) => s.control.type === 'pad' && s.control.index === pad)) return;
        slots.push({ control: { type: 'pad', index: pad }, character: unlocked()[slots.length % unlocked().length].id });
        game.audio.play('select');
        render();
      });
    },
    onUnmount: () => offPad?.(),
    onReroll: () => undefined,
  };
}
