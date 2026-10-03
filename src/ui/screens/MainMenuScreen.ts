// Écran-titre et menu principal.
import type { Game } from '../../core/Game';
import { ACHIEVEMENTS } from '../../data/achievements';
import { button, formatNumber, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { collectionScreen } from './CollectionScreen';
import { multiplayerScreen } from './MultiplayerScreen';
import { settingsScreen } from './SettingsScreen';
import { shopScreen } from './ShopScreen';
import { soloScreen } from './SoloScreen';

function logo(game: Game): HTMLElement {
  return h(
    'div',
    { class: 'title-block' },
    h('div', { class: 'title-art' }, spriteEl(game.assets, 'bat', 48, { animate: true }), spriteEl(game.assets, 'vampire', 96, { animate: true }), spriteEl(game.assets, 'bat', 48, { animate: true, class: 'mirror' })),
    h('h1', { class: 'title', text: 'Nuit Éternelle' }),
  );
}

/** Écran-titre : « Appuyez sur une touche ». */
export function titleScreen(game: Game): Screen {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    game.audio.play('select');
    game.ui.replace(mainMenuScreen(game));
  };
  const press = h('button', { class: 'press-start', text: 'Appuyez sur une touche', nav: true, attrs: { 'data-autofocus': '' } });
  press.type = 'button';
  press.addEventListener('click', go);
  const el = h(
    'div',
    { class: 'menu-main title-screen' },
    logo(game),
    h('div', { class: 'subtitle', text: 'Un roguelike de survie au cœur de la nuit' }),
    press,
    h('div', { class: 'title-footer', text: 'Version 2.0 · Solo · Coopération locale · En ligne' }),
  );
  return {
    el,
    onKey: (e) => {
      if (e.repeat) return false;
      go();
      return true;
    },
    onBack: go,
    onMount: () => {
      el.addEventListener('pointerdown', go);
    },
  };
}

export function mainMenuScreen(game: Game): Screen {
  const footer = h('div', { class: 'menu-footer' });
  const renderFooter = () => {
    const save = game.save.data;
    footer.replaceChildren(
      h('div', { class: 'footer-stat gold' }, spriteEl(game.assets, 'coin', 16), `${formatNumber(save.gold)} or`),
      h('div', { class: 'footer-stat' }, `Record : manche ${save.stats.bestWave || '—'}`),
      h('div', { class: 'footer-stat' }, `Victoires : ${save.stats.wins}`),
      h('div', { class: 'footer-stat' }, `Succès : ${save.achievements.length}/${ACHIEVEMENTS.length}`),
    );
  };
  renderFooter();

  const tile = (label: string, desc: string, icon: string, onClick: () => void, cls = '') => {
    const b = h('button', { class: `menu-tile ${cls}`.trim(), nav: true }, spriteEl(game.assets, icon, 40), h('span', { class: 'tile-label', text: label }), h('span', { class: 'tile-desc', text: desc }));
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };

  const solo = tile('Solo', 'Manches, Survie 10 min, défi du jour', 'knight', () => game.ui.push(soloScreen(game)), 'primary');
  solo.setAttribute('data-autofocus', '');
  const quit = button('Quitter', () => {
    window.close();
    window.setTimeout(() => (quit.textContent = 'Fermez la fenêtre'), 150);
  });

  const el = h(
    'div',
    { class: 'menu-main' },
    logo(game),
    h(
      'div',
      { class: 'menu-tiles' },
      solo,
      tile('Multijoueur', 'En ligne avec un code, ou à plusieurs sur ce PC', 'priestess', () => game.ui.push(multiplayerScreen(game))),
      tile('Améliorations', 'Bonus permanents achetés avec l’or', 'coin', () => game.ui.push(shopScreen(game))),
      tile('Collection', 'Succès et bestiaire', 'icon_book', () => game.ui.push(collectionScreen(game))),
    ),
    h('div', { class: 'menu-row' }, button('Paramètres', () => game.ui.push(settingsScreen(game))), quit),
    footer,
  );
  return { el, onResume: renderFooter, onBack: () => game.ui.replace(titleScreen(game)) };
}
