// Collection : succès, bestiaire et records.
import type { Game } from '../../core/Game';
import { ACHIEVEMENTS } from '../../data/achievements';
import { BESTIARY_IDS } from '../../data/enemies';
import { formatTime } from '../../engine/math';
import { button, formatNumber, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { achievementsScreen } from './AchievementsScreen';
import { bestiaryScreen } from './BestiaryScreen';

export function collectionScreen(game: Game): Screen {
  const d = game.save.data;
  const st = d.stats;
  const tile = (label: string, desc: string, icon: string, onClick: () => void) => {
    const b = h('button', { class: 'menu-tile', nav: true }, spriteEl(game.assets, icon, 40), h('span', { class: 'tile-label', text: label }), h('span', { class: 'tile-desc', text: desc }));
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };
  const known = BESTIARY_IDS.filter((id) => (d.bestiary[id] ?? 0) > 0).length;
  const first = tile('Succès', `${d.achievements.length} / ${ACHIEVEMENTS.length} débloqués`, 'icon_star', () => game.ui.push(achievementsScreen(game)));
  first.setAttribute('data-autofocus', '');
  const records: [string, string][] = [
    ['Parties jouées', formatNumber(st.runs)],
    ['Victoires', formatNumber(st.wins)],
    ['Victoires en équipe', formatNumber(st.coopWins)],
    ['Parties en ligne', formatNumber(st.onlineGames)],
    ['Meilleure manche', st.bestWave ? String(st.bestWave) : '—'],
    ['Meilleure survie', st.bestSurvivalTime ? formatTime(st.bestSurvivalTime) : '—'],
    ['Meilleur niveau', st.bestLevel ? String(st.bestLevel) : '—'],
    ['Ennemis vaincus', formatNumber(st.totalKills)],
    ['Or gagné au total', formatNumber(st.totalGold)],
    ['Coffres ouverts', formatNumber(st.chestsOpened)],
    ['Évolutions', formatNumber(st.evolutions)],
  ];
  const el = h(
    'div',
    { class: 'panel-screen narrow' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Collection' })),
    h('div', { class: 'menu-tiles two' }, first, tile('Bestiaire', `${known} / ${BESTIARY_IDS.length} créatures découvertes`, 'icon_book', () => game.ui.push(bestiaryScreen(game)))),
    h('h3', { text: 'Records' }),
    h('div', { class: 'stat-grid records' }, ...records.flatMap(([k, v]) => [h('span', { text: k }), h('strong', { text: v })])),
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop())),
  );
  return { el, onBack: () => game.ui.pop() };
}
