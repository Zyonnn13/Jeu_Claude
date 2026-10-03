import { rewardText } from '../../core/Achievements';
import type { Game } from '../../core/Game';
import type { AchievementDef } from '../../data/achievements';
import { formatTime } from '../../engine/math';
import type { Hero } from '../../game/Hero';
import type { GameMode } from '../../game/systems/Director';
import type { World } from '../../game/World';
import type { HostMessage } from '../../net/Protocol';
import { button, formatNumber, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { buildSummary } from './PauseScreen';

export interface RunResult {
  victory: boolean;
  abandoned: boolean;
  goldEarned: number;
  newRecord: boolean;
  achievements: AchievementDef[];
  daily: boolean;
  mode: GameMode;
  survivalTime: number;
}

export function resultScreen(game: Game, world: World, hero: Hero, result: RunResult, onRetry: (() => void) | null): Screen {
  const survival = result.mode === 'survival';
  const title = result.victory ? 'Victoire !' : result.abandoned ? 'Partie abandonnée' : 'Vous avez succombé…';
  let subtitle: string;
  if (result.victory) {
    subtitle = survival ? 'La Faucheuse est vaincue. Vous avez survécu à la nuit !' : world.run.endless ? `Vous avez tenu jusqu’à la manche ${world.director.wave}.` : 'Le Comte Vladislav est vaincu. L’aube se lève enfin.';
  } else {
    subtitle = survival ? `Vous avez survécu ${formatTime(result.survivalTime)}.` : `La nuit vous a emporté à la manche ${world.director.wave}.`;
  }
  const rows: [string, string][] = [
    survival ? ['Temps de survie', formatTime(result.survivalTime)] : ['Manche atteinte', String(world.director.wave)],
    ['Niveau', String(world.run.level)],
    ['Ennemis vaincus', formatNumber(world.run.kills)],
    ['Dégâts infligés', formatNumber(world.run.damageDealt)],
    ['Durée de la partie', formatTime(world.time)],
  ];
  const retry = onRetry ? button('Rejouer', onRetry, 'btn-primary') : null;
  const menu = button('Menu principal', () => game.goToMenu(), onRetry ? '' : 'btn-primary');
  (retry ?? menu).setAttribute('data-autofocus', '');
  const el = h(
    'div',
    { class: `panel-screen result ${result.victory ? 'victory' : 'defeat'}` },
    h(
      'div',
      { class: 'screen-header column' },
      h('h2', { text: title }),
      h('div', { class: 'result-sub', text: result.daily ? `Défi du jour — ${subtitle}` : subtitle }),
      result.newRecord ? h('div', { class: 'record', text: 'Nouveau record !' }) : null,
    ),
    result.achievements.length
      ? h(
          'div',
          { class: 'result-achievements' },
          ...result.achievements.map((a) => h('div', { class: 'result-ach' }, spriteEl(game.assets, a.icon, 24), h('div', {}, h('strong', { text: a.name }), h('div', { class: 'muted', text: rewardText(a.reward) })))),
        )
      : null,
    h(
      'div',
      { class: 'result-body' },
      h(
        'div',
        { class: 'result-stats' },
        ...rows.map(([k, v]) => h('div', { class: 'result-row' }, h('span', { text: k }), h('strong', { text: v }))),
        h('div', { class: 'result-row gold' }, h('span', {}, spriteEl(game.assets, 'coin', 16), ' Or gagné'), h('strong', { text: `+${formatNumber(result.goldEarned)}` })),
      ),
      buildSummary(game, hero),
    ),
    h('div', { class: 'screen-actions' }, retry, menu),
  );
  return { el, onBack: () => game.goToMenu() };
}

/** Résultat d'une partie en ligne vue par un invité. */
export function onlineResultScreen(game: Game, m: Extract<HostMessage, { t: 'end' }>): Screen {
  const menu = button('Menu principal', () => game.goToMenu(), 'btn-primary');
  menu.setAttribute('data-autofocus', '');
  const rows: [string, string][] = [
    m.mode === 'survival' ? ['Durée', formatTime(m.time)] : ['Manche atteinte', String(m.wave)],
    ['Niveau', String(m.level)],
    ['Ennemis vaincus', formatNumber(m.kills)],
  ];
  const el = h(
    'div',
    { class: `panel-screen narrow result ${m.victory ? 'victory' : 'defeat'}` },
    h('div', { class: 'screen-header column' }, h('h2', { text: m.victory ? 'Victoire en équipe !' : 'L’équipe a succombé…' })),
    h(
      'div',
      { class: 'result-stats' },
      ...rows.map(([k, v]) => h('div', { class: 'result-row' }, h('span', { text: k }), h('strong', { text: v }))),
      h('div', { class: 'result-row gold' }, h('span', {}, spriteEl(game.assets, 'coin', 16), ' Or gagné'), h('strong', { text: `+${formatNumber(m.gold)}` })),
    ),
    h('div', { class: 'screen-actions' }, menu),
  );
  return { el, onBack: () => game.goToMenu() };
}

export function victoryScreen(game: Game, mode: GameMode, actions: { endless: () => void; finish: () => void }): Screen {
  const cont = button('Continuer en mode infini', actions.endless, 'btn-primary');
  cont.setAttribute('data-autofocus', '');
  const text =
    mode === 'survival'
      ? 'La Faucheuse est vaincue ! Vous pouvez encaisser vos gains ou continuer à survivre face à des hordes toujours plus nombreuses.'
      : 'Le Comte Vladislav est vaincu et les 15 manches sont terminées. Vous pouvez encaisser vos gains ou affronter la nuit sans fin pour gagner encore plus d’or.';
  const el = h(
    'div',
    { class: 'panel-screen narrow victory-screen' },
    h('div', { class: 'victory-art' }, spriteEl(game.assets, 'icon_star', 64), spriteEl(game.assets, 'icon_crown', 64), spriteEl(game.assets, 'icon_star', 64)),
    h('h2', { text: 'Victoire !' }),
    h('p', { text }),
    h('div', { class: 'screen-actions column' }, cont, button('Terminer et encaisser', actions.finish)),
  );
  return { el };
}

/** Message simple avec retour au menu (déconnexion, erreur...). */
export function messageScreen(game: Game, title: string, text: string): Screen {
  const ok = button('Retour au menu', () => game.goToMenu(), 'btn-primary');
  ok.setAttribute('data-autofocus', '');
  const el = h('div', { class: 'panel-screen narrow' }, h('div', { class: 'screen-header column' }, h('h2', { text: title }), h('p', { class: 'result-sub', text })), h('div', { class: 'screen-actions' }, ok));
  return { el, onBack: () => game.goToMenu() };
}
