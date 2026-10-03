// Salon d'une partie en ligne : code, joueurs, héros, réglages de l'hôte, discussion et lancement.
import type { Game } from '../../core/Game';
import { BIOME_LIST, getBiome } from '../../data/biomes';
import { CHARACTERS } from '../../data/characters';
import { DANGERS } from '../../data/danger';
import type { CharacterDef } from '../../data/types';
import { LobbyHost, MAX_PLAYERS, type LobbyClient } from '../../net/Lobby';
import { button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { characterSelectScreen } from './CharacterSelectScreen';
import { messageScreen } from './ResultScreen';

export function lobbyScreen(game: Game, lobby: LobbyHost | LobbyClient): Screen {
  const isHost = lobby instanceof LobbyHost;
  const playersEl = h('div', { class: 'lobby-players' });
  const settingsEl = h('div', { class: 'lobby-settings' });
  const chatLog = h('div', { class: 'chat-log' });
  const actions = h('div', { class: 'screen-actions' });
  const codeEl = h('div', { class: 'lobby-code' });
  let ready = false;
  let left = false;

  const me = () => (isHost ? lobby.players[0] : lobby.players.find((p) => p.id === lobby.myId));
  const charName = (id: string) => (CHARACTERS as Record<string, CharacterDef>)[id];

  const leave = () => {
    if (left) return;
    left = true;
    if (isHost) lobby.close();
    else lobby.leave();
    game.ui.pop();
  };

  const renderCode = () => {
    const code = isHost ? lobby.code : lobby.code;
    const copy = button('Copier', () => {
      void navigator.clipboard?.writeText(code).then(() => (copy.textContent = 'Copié !'));
    });
    codeEl.replaceChildren(h('span', { class: 'muted', text: 'Code de la partie' }), h('strong', { text: code || '…' }), copy);
  };

  const renderPlayers = () => {
    const players = lobby.players;
    const rows = players.map((p) => {
      const c = charName(p.character);
      return h(
        'div',
        { class: `lobby-player${p.ready ? ' ready' : ''}` },
        h('div', { class: 'lp-portrait' }, c ? spriteEl(game.assets, c.sprite, 48, { animate: true }) : null),
        h('div', { class: 'lp-info' }, h('div', { class: 'lp-name', text: p.name + (p.host ? ' (hôte)' : '') }), h('div', { class: 'muted', text: c ? `${c.name}, ${c.title}` : '' })),
        h('div', { class: `lp-status${p.ready ? ' ok' : ''}`, text: p.host ? 'Hôte' : p.ready ? 'Prêt' : 'Pas prêt' }),
        isHost && !p.host ? button('Exclure', () => lobby.kick(p.id), 'btn-small') : null,
      );
    });
    for (let i = players.length; i < MAX_PLAYERS; i++) rows.push(h('div', { class: 'lobby-player empty' }, h('div', { class: 'muted', text: 'En attente d’un joueur…' })));
    playersEl.replaceChildren(...rows);
  };

  const segment = <T extends string | number>(options: { value: T; label: string; disabled?: boolean }[], value: T, onChange: (v: T) => void) =>
    h(
      'div',
      { class: 'segmented' },
      ...options.map((o) => {
        const b = h('button', { class: `seg${o.value === value ? ' selected' : ''}${o.disabled ? ' is-disabled' : ''}`, text: o.label, nav: isHost });
        b.type = 'button';
        if (isHost && !o.disabled) b.addEventListener('click', () => onChange(o.value));
        return b;
      }),
    );

  const renderSettings = () => {
    const s = lobby.settings;
    const save = game.save;
    settingsEl.replaceChildren(
      h('h3', { text: isHost ? 'Réglages de la partie' : 'Réglages (choisis par l’hôte)' }),
      h('div', { class: 'option-row' }, h('span', { class: 'option-label', text: 'Mode' }), segment([{ value: 'waves', label: 'Manches' }, { value: 'survival', label: 'Survie 10 min' }], s.mode, (v) => (lobby as LobbyHost).setSettings({ mode: v }))),
      h(
        'div',
        { class: 'option-row' },
        h('span', { class: 'option-label', text: 'Carte' }),
        isHost
          ? segment(BIOME_LIST.map((b) => ({ value: b.id, label: b.name, disabled: !save.isBiomeUnlocked(b.id) })), s.biome, (v) => (lobby as LobbyHost).setSettings({ biome: v }))
          : h('strong', { text: getBiome(s.biome).name }),
      ),
      h(
        'div',
        { class: 'option-row' },
        h('span', { class: 'option-label', text: 'Danger' }),
        isHost
          ? segment(DANGERS.map((d) => ({ value: d.level, label: String(d.level), disabled: d.level > save.maxDangerUnlocked })), s.danger, (v) => (lobby as LobbyHost).setSettings({ danger: v }))
          : h('strong', { text: DANGERS[s.danger]?.name ?? '' }),
      ),
    );
  };

  const renderChat = () => {
    chatLog.replaceChildren(...lobby.chat.slice(-30).map((l) => h('div', { class: `chat-line${l.from ? '' : ' system'}` }, l.from ? h('strong', { text: `${l.from} : ` }) : null, l.text)));
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const renderActions = () => {
    const changeHero = button('Changer de héros', () =>
      game.ui.push(
        characterSelectScreen(
          game,
          (id) => {
            try {
              localStorage.setItem('nuit-last-character', id);
            } catch {
              // stockage indisponible
            }
            if (isHost) lobby.setHost(id);
            else lobby.set({ character: id });
            game.ui.pop();
          },
          'Votre héros pour cette partie',
        ),
      ),
    );
    const leaveBtn = button('Quitter le salon', leave);
    if (isHost) {
      const start = button(lobby.allReady ? 'Lancer la partie' : 'En attente des joueurs prêts…', () => {
        if (!lobby.allReady) return;
        const { info, remotes } = lobby.start();
        game.startRun({
          mode: info.mode,
          biome: info.biome,
          danger: info.danger,
          mutators: [],
          seed: info.seed,
          players: info.heroes.map((hr, i) => {
            const remote = remotes.find((r) => r.heroIndex === i);
            return remote
              ? { name: hr.name, character: hr.character, control: { type: 'remote' as const, id: hr.id }, meta: remote.remote.meta }
              : { name: hr.name, character: hr.character, control: { type: 'any' as const } };
          }),
          online: { remotes },
        });
      }, 'btn-primary');
      if (!lobby.allReady) start.classList.add('is-disabled');
      actions.replaceChildren(changeHero, start, leaveBtn);
    } else {
      const readyBtn = button(ready ? 'Je ne suis plus prêt' : 'Je suis prêt !', () => {
        ready = !ready;
        lobby.set({ ready });
        renderActions();
      }, ready ? '' : 'btn-primary');
      actions.replaceChildren(changeHero, readyBtn, leaveBtn);
    }
  };

  const chatInput = h('input', { nav: true, attrs: { type: 'text', maxlength: '120', placeholder: 'Écrire un message… (Entrée)' } });
  chatInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    lobby.sendChat(chatInput.value);
    chatInput.value = '';
  });

  const renderAll = () => {
    const focused = document.activeElement;
    renderCode();
    renderPlayers();
    renderSettings();
    renderChat();
    renderActions();
    if (focused instanceof HTMLElement && !el.contains(focused)) chatInput.blur();
    void me;
  };

  lobby.onChange = renderAll;
  if (!isHost) {
    lobby.onStart = (info, you) => game.startClientRun(lobby, info, you);
    lobby.onKicked = (reason) => {
      left = true;
      game.ui.clear();
      game.ui.push(messageScreen(game, 'Salon fermé', reason));
    };
  }

  const el = h(
    'div',
    { class: 'panel-screen lobby' },
    h('div', { class: 'screen-header' }, h('h2', { text: isHost ? 'Votre partie en ligne' : 'Salon en ligne' }), codeEl),
    h('div', { class: 'lobby-body' }, h('div', { class: 'lobby-left' }, playersEl, settingsEl), h('div', { class: 'lobby-chat' }, h('h3', { text: 'Discussion' }), chatLog, chatInput)),
    actions,
  );
  renderAll();
  return { el, onBack: leave };
}
