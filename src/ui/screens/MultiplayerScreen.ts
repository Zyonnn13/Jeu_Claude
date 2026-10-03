// Menu Multijoueur : créer ou rejoindre une partie en ligne, ou jouer à plusieurs sur ce PC.
import type { Game } from '../../core/Game';
import { LobbyClient, LobbyHost } from '../../net/Lobby';
import { hostOnline, joinOnline, normalizeCode } from '../../net/Transport';
import { button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { lobbyScreen } from './LobbyScreen';
import { localCoopScreen } from './LocalCoopScreen';

/** Héros par défaut : le dernier joué, sinon le chevalier. */
export function defaultCharacter(game: Game): string {
  try {
    const last = localStorage.getItem('nuit-last-character');
    if (last && game.save.data.unlockedCharacters.includes(last)) return last;
  } catch {
    // stockage indisponible
  }
  return 'knight';
}

export function multiplayerScreen(game: Game): Screen {
  const settings = game.save.data.settings;
  const status = h('div', { class: 'net-status' });
  const nameInput = h('input', { nav: true, attrs: { type: 'text', maxlength: '16', value: settings.playerName, placeholder: 'Votre pseudo' } });
  nameInput.addEventListener('change', () => {
    settings.playerName = nameInput.value.trim().slice(0, 16) || 'Joueur';
    game.save.save();
  });
  const name = () => nameInput.value.trim().slice(0, 16) || 'Joueur';
  let busy = false;

  const fail = (err: unknown) => {
    busy = false;
    status.textContent = (err as Error).message;
    status.className = 'net-status error';
    game.audio.play('denied');
  };

  const host = button('Créer une partie en ligne', async () => {
    if (busy) return;
    busy = true;
    status.className = 'net-status';
    status.textContent = 'Connexion au serveur de mise en relation…';
    try {
      const transport = await hostOnline();
      busy = false;
      status.textContent = '';
      game.ui.push(lobbyScreen(game, new LobbyHost(transport, name(), defaultCharacter(game))));
    } catch (err) {
      fail(err);
    }
  }, 'btn-primary');
  host.setAttribute('data-autofocus', '');

  const codeInput = h('input', { nav: true, attrs: { type: 'text', maxlength: '7', placeholder: 'CODE', class: 'code-input' } });
  codeInput.addEventListener('input', () => (codeInput.value = normalizeCode(codeInput.value)));
  const join = button('Rejoindre', async () => {
    if (busy) return;
    busy = true;
    status.className = 'net-status';
    status.textContent = 'Recherche de la partie…';
    try {
      const { conn, close } = await joinOnline(codeInput.value);
      busy = false;
      status.textContent = '';
      const client = new LobbyClient(conn, close, name(), defaultCharacter(game), game.save.data.meta);
      game.ui.push(lobbyScreen(game, client));
    } catch (err) {
      fail(err);
    }
  });

  const el = h(
    'div',
    { class: 'panel-screen narrow multiplayer' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Multijoueur' })),
    h('label', { class: 'option-row' }, h('span', { class: 'option-label', text: 'Votre pseudo' }), nameInput),
    h(
      'div',
      { class: 'mp-section' },
      h('h3', {}, spriteEl(game.assets, 'icon_star', 20), ' En ligne (jusqu’à 4 joueurs)'),
      h('p', { class: 'muted', text: 'Créez une partie et donnez le code à vos amis. Ils doivent avoir le jeu (même version). Connexion directe entre joueurs, sans compte.' }),
      h('div', { class: 'screen-actions' }, host),
      h('div', { class: 'join-row' }, codeInput, join),
      status,
    ),
    h(
      'div',
      { class: 'mp-section' },
      h('h3', {}, spriteEl(game.assets, 'icon_ring', 20), ' Sur ce PC'),
      h('p', { class: 'muted', text: 'Jusqu’à 4 joueurs sur le même écran : un au clavier et les autres avec des manettes.' }),
      h('div', { class: 'screen-actions' }, button('Coopération locale', () => game.ui.push(localCoopScreen(game)))),
    ),
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop())),
  );
  return { el, onBack: () => game.ui.pop() };
}
