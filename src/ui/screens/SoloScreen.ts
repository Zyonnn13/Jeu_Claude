// Menu Solo : choix du mode de jeu, puis du héros et de la carte.
import type { Game } from '../../core/Game';
import { formatTime } from '../../engine/math';
import type { GameMode } from '../../game/systems/Director';
import { button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { characterSelectScreen } from './CharacterSelectScreen';
import { dailyScreen } from './DailyScreen';
import { mapSelectScreen } from './MapSelectScreen';

/** Enchaîne héros → carte → partie solo. */
export function startSoloFlow(game: Game, mode: GameMode): void {
  game.ui.push(
    characterSelectScreen(game, (character) => {
      game.ui.push(
        mapSelectScreen(game, mode, ({ biome, danger }) =>
          game.startRun({
            mode,
            biome,
            danger,
            mutators: [],
            players: [{ name: game.save.data.settings.playerName, character, control: { type: 'any' } }],
          }),
        ),
      );
    }),
  );
}

export function soloScreen(game: Game): Screen {
  const stats = game.save.data.stats;
  const card = (title: string, desc: string, detail: string, icon: string, onClick: () => void) => {
    const b = h(
      'button',
      { class: 'mode-card', nav: true },
      h('div', { class: 'mode-icon' }, spriteEl(game.assets, icon, 72, { animate: true })),
      h('div', { class: 'mode-title', text: title }),
      h('div', { class: 'mode-desc', text: desc }),
      h('div', { class: 'mode-detail', text: detail }),
    );
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };
  const waves = card(
    'Manches',
    '15 manches chronométrées. Une relique à choisir après chaque manche, un boss toutes les 5 manches.',
    `Record : manche ${stats.bestWave || '—'}`,
    'lich',
    () => startSoloFlow(game, 'waves'),
  );
  waves.setAttribute('data-autofocus', '');
  const el = h(
    'div',
    { class: 'panel-screen' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Solo — choisissez un mode' })),
    h(
      'div',
      { class: 'mode-grid' },
      waves,
      card(
        'Survie',
        'Survivez 10 minutes à des hordes ininterrompues. Sous-boss à 5:00, La Faucheuse à 10:00.',
        `Record : ${stats.bestSurvivalTime ? formatTime(stats.bestSurvivalTime) : '—'}`,
        'reaper',
        () => startSoloFlow(game, 'survival'),
      ),
      card('Défi du jour', 'Héros, carte et règles spéciales imposés, identiques pour tous, renouvelés chaque jour.', 'Nouveau défi chaque jour', 'icon_scroll', () => game.ui.push(dailyScreen(game))),
    ),
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop())),
  );
  return { el, onBack: () => game.ui.pop() };
}
