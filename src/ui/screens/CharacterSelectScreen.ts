import type { Game } from '../../core/Game';
import { ACHIEVEMENTS } from '../../data/achievements';
import { CHARACTER_LIST } from '../../data/characters';
import type { CharacterDef } from '../../data/types';
import { getWeapon } from '../../data/weapons';
import { button, formatNumber, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';

/** Choix du héros (achat des héros verrouillés par or ou indication du succès requis). */
export function characterSelectScreen(game: Game, onSelect: (characterId: string) => void, title = 'Choisissez votre héros'): Screen {
  const save = game.save;
  const goldLabel = h('div', { class: 'gold-display' });
  const grid = h('div', { class: 'char-grid' });

  const refresh = () => {
    goldLabel.replaceChildren(spriteEl(game.assets, 'coin', 16), `${formatNumber(save.data.gold)} or`);
    grid.replaceChildren(...CHARACTER_LIST.map((c) => card(c)));
  };

  const card = (c: CharacterDef): HTMLElement => {
    const unlocked = save.data.unlockedCharacters.includes(c.id);
    const purchasable = c.unlockCost > 0;
    const affordable = purchasable && save.data.gold >= c.unlockCost;
    const weapon = getWeapon(c.startWeapon);
    const wins = save.data.stats.winsByCharacter[c.id] ?? 0;
    let lock: HTMLElement | null = null;
    if (!unlocked) {
      if (purchasable) {
        lock = h('div', { class: `char-lock${affordable ? ' affordable' : ''}` }, spriteEl(game.assets, 'coin', 14), `Débloquer : ${formatNumber(c.unlockCost)} or`);
      } else {
        const ach = ACHIEVEMENTS.find((a) => a.id === c.unlockAchievement);
        lock = h('div', { class: 'char-lock' }, `Succès « ${ach?.name ?? '?'} » : ${ach?.description ?? ''}`);
      }
    }
    const el = h(
      'div',
      { class: `char-card${unlocked ? '' : ' locked'}`, nav: true },
      h('div', { class: 'char-portrait' }, spriteEl(game.assets, c.sprite, 88, { animate: unlocked })),
      h('div', { class: 'char-name', text: unlocked ? c.name : '???' }),
      h('div', { class: 'char-title', text: c.title }),
      h('div', { class: 'char-desc', text: c.description }),
      h('div', { class: 'char-perk', text: c.perk }),
      h('div', { class: 'char-weapon' }, spriteEl(game.assets, weapon.icon, 24), weapon.name),
      wins > 0 ? h('div', { class: 'char-wins', text: `${wins} victoire${wins > 1 ? 's' : ''}` }) : null,
      lock,
    );
    if (!unlocked && !affordable) el.classList.add('is-disabled');
    el.addEventListener('click', () => {
      if (unlocked) {
        onSelect(c.id);
      } else if (affordable) {
        save.data.gold -= c.unlockCost;
        save.data.unlockedCharacters.push(c.id);
        save.save();
        game.audio.play('chest');
        refresh();
        ([...grid.children][CHARACTER_LIST.indexOf(c)] as HTMLElement | undefined)?.focus();
      }
    });
    return el;
  };

  refresh();
  const el = h(
    'div',
    { class: 'panel-screen' },
    h('div', { class: 'screen-header' }, h('h2', { text: title }), goldLabel),
    grid,
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop())),
  );
  return { el, onBack: () => game.ui.pop(), onResume: refresh };
}
