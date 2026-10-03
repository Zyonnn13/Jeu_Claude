import type { Game } from '../../core/Game';
import { META_UPGRADES, metaUpgradeCost } from '../../data/metaUpgrades';
import type { MetaUpgradeDef } from '../../data/types';
import { button, formatNumber, h, levelPips, spriteEl } from '../dom';
import type { Screen } from '../UIManager';

export function shopScreen(game: Game): Screen {
  const save = game.save;
  const goldLabel = h('div', { class: 'gold-display' });
  const grid = h('div', { class: 'shop-grid' });

  const refresh = (focusId?: string) => {
    goldLabel.replaceChildren(spriteEl(game.assets, 'coin', 16), `${formatNumber(save.data.gold)} or`);
    grid.replaceChildren(...META_UPGRADES.map(item));
    if (focusId) grid.querySelector<HTMLElement>(`[data-id="${focusId}"]`)?.focus();
  };

  const item = (def: MetaUpgradeDef): HTMLElement => {
    const level = save.metaLevel(def.id);
    const maxed = level >= def.maxLevel;
    const cost = metaUpgradeCost(def, level);
    const affordable = !maxed && save.data.gold >= cost;
    const el = h(
      'div',
      { class: `shop-item${maxed ? ' maxed' : ''}${affordable ? ' affordable' : ''}`, nav: true, attrs: { 'data-id': def.id } },
      h('div', { class: 'shop-icon' }, spriteEl(game.assets, def.icon, 40)),
      h('div', { class: 'shop-body' }, h('div', { class: 'shop-name', text: def.name }), h('div', { class: 'shop-desc', text: def.description }), levelPips(level, def.maxLevel)),
      h('div', { class: 'shop-cost' }, maxed ? 'MAX' : h('span', {}, spriteEl(game.assets, 'coin', 12), ` ${formatNumber(cost)}`)),
    );
    if (!affordable) el.classList.add('is-disabled');
    el.addEventListener('click', () => {
      if (!affordable) return;
      save.data.gold -= cost;
      save.data.meta[def.id] = level + 1;
      save.save();
      game.audio.play('coin');
      refresh(def.id);
    });
    return el;
  };

  const refund = button('Tout rembourser', () => {
    let total = 0;
    for (const def of META_UPGRADES) {
      const level = save.metaLevel(def.id);
      for (let l = 0; l < level; l++) total += metaUpgradeCost(def, l);
    }
    if (total === 0) return;
    save.data.gold += total;
    save.data.meta = {};
    save.save();
    refresh();
    refund.focus();
  });

  refresh();
  const el = h(
    'div',
    { class: 'panel-screen' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Améliorations permanentes' }), goldLabel),
    h('p', { class: 'screen-hint', text: 'L’or ramassé pendant vos parties est conservé. Investissez-le pour devenir plus fort à chaque nouvelle tentative.' }),
    grid,
    h('div', { class: 'screen-actions' }, refund, button('Retour', () => game.ui.pop())),
  );
  return { el, onBack: () => game.ui.pop() };
}
