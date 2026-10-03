// Bestiaire : chaque ennemi vaincu au moins une fois révèle sa fiche.
import type { Game } from '../../core/Game';
import { BIOME_LIST } from '../../data/biomes';
import { BESTIARY_IDS, getEnemy } from '../../data/enemies';
import { button, formatNumber, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';

/** Cartes où l'ennemi apparaît. */
function habitat(id: string): string {
  const def = getEnemy(id);
  if (def.boss) return 'Boss — toutes les cartes';
  const swappedIn = BIOME_LIST.filter((b) => Object.values(b.enemySwap).includes(id)).map((b) => b.name);
  if (swappedIn.length) return swappedIn.join(', ');
  const replacedIn = BIOME_LIST.filter((b) => b.enemySwap[id]).map((b) => b.name);
  const all = BIOME_LIST.filter((b) => !replacedIn.includes(b.name)).map((b) => b.name);
  return all.length === BIOME_LIST.length ? 'Toutes les cartes' : all.join(', ');
}

export function bestiaryScreen(game: Game): Screen {
  const bestiary = game.save.data.bestiary;
  const known = BESTIARY_IDS.filter((id) => (bestiary[id] ?? 0) > 0).length;
  const grid = h(
    'div',
    { class: 'bestiary-grid' },
    ...BESTIARY_IDS.map((id) => {
      const def = getEnemy(id);
      const kills = bestiary[id] ?? 0;
      const seen = kills > 0;
      return h(
        'div',
        { class: `beast-card${seen ? '' : ' unknown'}${def.boss ? ' boss' : ''}`, nav: true },
        h('div', { class: 'beast-portrait' }, spriteEl(game.assets, def.sprite, def.boss ? 72 : 52, { animate: seen })),
        h(
          'div',
          { class: 'beast-body' },
          h('div', { class: 'beast-name', text: seen ? def.name : '???' }),
          h('div', { class: 'beast-lore', text: seen ? (def.lore ?? '') : 'Vainquez cette créature pour révéler sa fiche.' }),
          seen
            ? h(
                'div',
                { class: 'beast-stats' },
                h('span', { text: `PV ${formatNumber(def.hp)}` }),
                h('span', { text: `Vitesse ${def.speed}` }),
                h('span', { text: `Dégâts ${def.damage}` }),
              )
            : null,
          seen ? h('div', { class: 'beast-meta', text: `${habitat(id)} · ${formatNumber(kills)} vaincu${kills > 1 ? 's' : ''}` }) : null,
        ),
      );
    }),
  );
  const el = h(
    'div',
    { class: 'panel-screen' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Bestiaire' }), h('div', { class: 'gold-display', text: `${known} / ${BESTIARY_IDS.length}` })),
    grid,
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop())),
  );
  return { el, onBack: () => game.ui.pop() };
}
