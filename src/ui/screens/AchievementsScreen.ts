import { rewardText } from '../../core/Achievements';
import type { Game } from '../../core/Game';
import { ACHIEVEMENTS } from '../../data/achievements';
import { formatNumber, button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';

export function achievementsScreen(game: Game): Screen {
  const save = game.save.data;
  const done = save.achievements.length;
  const ctx = { save, run: null };
  const grid = h(
    'div',
    { class: 'ach-grid' },
    ...ACHIEVEMENTS.map((a) => {
      const unlocked = save.achievements.includes(a.id);
      const progress = !unlocked && a.progress ? a.progress(ctx) : null;
      return h(
        'div',
        { class: `ach-card${unlocked ? ' unlocked' : ''}`, nav: true },
        h('div', { class: 'ach-icon' }, spriteEl(game.assets, a.icon, 36)),
        h(
          'div',
          { class: 'ach-body' },
          h('div', { class: 'ach-name', text: a.name }),
          h('div', { class: 'ach-desc', text: a.description }),
          progress
            ? h(
                'div',
                { class: 'ach-progress' },
                h('div', { class: 'ach-bar' }, h('div', { class: 'ach-fill', style: { width: `${Math.min(100, (progress[0] / progress[1]) * 100)}%` } })),
                h('span', { text: `${formatNumber(Math.min(progress[0], progress[1]))} / ${formatNumber(progress[1])}` }),
              )
            : null,
          h('div', { class: 'ach-reward', text: `Récompense : ${rewardText(a.reward)}` }),
        ),
        unlocked ? h('div', { class: 'ach-check', text: '✓' }) : null,
      );
    }),
  );
  const el = h(
    'div',
    { class: 'panel-screen' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Succès' }), h('div', { class: 'gold-display', text: `${done} / ${ACHIEVEMENTS.length}` })),
    grid,
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop())),
  );
  return { el, onBack: () => game.ui.pop() };
}
