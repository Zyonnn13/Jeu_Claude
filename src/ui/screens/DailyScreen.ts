// Défi du jour : même héros, même carte et mêmes règles pour tout le monde, renouvelés chaque jour.
import { dailyChallenge, dateKey } from '../../core/Daily';
import type { Game } from '../../core/Game';
import { getBiome } from '../../data/biomes';
import { CHARACTERS } from '../../data/characters';
import { getDanger } from '../../data/danger';
import { getMutator } from '../../data/mutators';
import type { CharacterDef } from '../../data/types';
import { button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { biomePreview } from './MapSelectScreen';

export function dailyScreen(game: Game): Screen {
  const challenge = dailyChallenge();
  const character = (CHARACTERS as Record<string, CharacterDef>)[challenge.character];
  const biome = getBiome(challenge.biome);
  const danger = getDanger(challenge.danger);
  const record = game.save.data.daily.date === dateKey() ? game.save.data.daily : null;
  const [y, m, d] = challenge.date.split('-');

  const start = button(
    'Relever le défi',
    () =>
      game.startRun({
        mode: 'waves',
        biome: challenge.biome,
        danger: challenge.danger,
        mutators: challenge.mutators,
        seed: challenge.seed,
        daily: true,
        players: [{ name: game.save.data.settings.playerName, character: challenge.character, control: { type: 'any' } }],
      }),
    'btn-primary',
  );
  start.setAttribute('data-autofocus', '');

  const el = h(
    'div',
    { class: 'panel-screen narrow daily' },
    h('div', { class: 'screen-header column' }, h('h2', { text: 'Défi du jour' }), h('div', { class: 'result-sub', text: `${d}/${m}/${y} · un nouveau défi chaque jour` })),
    h(
      'div',
      { class: 'daily-card' },
      h(
        'div',
        { class: 'daily-row' },
        h('div', { class: 'daily-hero' }, spriteEl(game.assets, character.sprite, 72, { animate: true })),
        h('div', {}, h('div', { class: 'daily-label', text: 'Héros imposé' }), h('div', { class: 'daily-value', text: `${character.name}, ${character.title}` }), h('div', { class: 'muted', text: character.perk })),
      ),
      h(
        'div',
        { class: 'daily-row' },
        h('img', { class: 'daily-map', attrs: { src: biomePreview(game.assets, biome), alt: '' } }),
        h('div', {}, h('div', { class: 'daily-label', text: 'Carte' }), h('div', { class: 'daily-value', text: biome.name }), h('div', { class: 'daily-value', text: danger.name, style: { color: danger.color } })),
      ),
      h('div', { class: 'daily-label', text: 'Règles spéciales' }),
      ...challenge.mutators.map((id) => {
        const mut = getMutator(id)!;
        return h('div', { class: 'mutator' }, spriteEl(game.assets, mut.icon, 28), h('div', {}, h('strong', { text: mut.name }), h('div', { class: 'muted', text: mut.description })));
      }),
    ),
    h('div', { class: 'daily-record', text: record ? `Aujourd’hui : ${record.attempts} tentative${record.attempts > 1 ? 's' : ''} · meilleure manche ${record.bestWave}${record.won ? ' · défi réussi !' : ''}` : 'Aucune tentative aujourd’hui.' }),
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop()), start),
  );
  return { el, onBack: () => game.ui.pop() };
}
