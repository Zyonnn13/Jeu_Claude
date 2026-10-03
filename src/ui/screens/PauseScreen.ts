import type { Game, RunConfig } from '../../core/Game';
import { RARITY_INFO } from '../../data/balance';
import { getDanger } from '../../data/danger';
import { getMutator } from '../../data/mutators';
import { getPassive } from '../../data/passives';
import { formatTime } from '../../engine/math';
import type { Hero } from '../../game/Hero';
import type { World } from '../../game/World';
import { button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';
import { settingsScreen } from './SettingsScreen';

const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;

/** Résumé de la construction d'un héros (armes, objets, reliques, synergies, statistiques). */
export function buildSummary(game: Game, hero: Hero): HTMLElement {
  const st = hero.stats;
  const weapons = hero.inventory.weapons.map((w) =>
    h(
      'div',
      { class: `build-item${w.def.evolved ? ' evolved' : ''}`, title: w.def.description },
      spriteEl(game.assets, w.def.icon, 28),
      h('div', {}, h('div', { class: 'build-name', text: w.def.name }), h('div', { class: 'build-level', text: w.def.evolved ? 'Évolution' : `Niveau ${w.level}/${w.maxLevel}` })),
    ),
  );
  const passives = [...hero.inventory.passives].map(([id, level]) => {
    const def = getPassive(id);
    return h('div', { class: 'build-item', title: def.description }, spriteEl(game.assets, def.icon, 28), h('div', {}, h('div', { class: 'build-name', text: def.name }), h('div', { class: 'build-level', text: `Niveau ${level}/${def.maxLevel}` })));
  });
  const relics = hero.relics.list().map(({ def, count }) =>
    h('div', { class: 'relic-chip', title: `${def.name} — ${def.description}`, style: { '--rarity': RARITY_INFO[def.rarity].color } }, spriteEl(game.assets, def.icon, 24), count > 1 ? h('span', { text: `×${count}` }) : null),
  );
  const synergies = hero.synergies.list();
  const stats: [string, string][] = [
    ['PV max', String(Math.round(st.get('maxHp')))],
    ['Régénération', `${st.get('regen').toFixed(1)}/s`],
    ['Armure', String(Math.round(st.get('armor')))],
    ['Dégâts', pct(st.get('might') - 1)],
    ['Zone', pct(st.get('area') - 1)],
    ['Recharge', pct(st.get('cooldown') - 1)],
    ['Vitesse', pct(st.get('moveSpeed') - 1)],
    ['Projectiles', `+${Math.round(st.get('amount'))}`],
    ['Critique', `${Math.round(st.get('critChance') * 100)}%`],
    ['Esquive', `${Math.round(st.get('dodge') * 100)}%`],
    ['Chance', pct(st.get('luck') - 1)],
    ['Expérience', pct(st.get('growth') - 1)],
  ];
  return h(
    'div',
    { class: 'build-summary' },
    h(
      'div',
      { class: 'build-col' },
      h('h3', { text: 'Armes' }),
      h('div', { class: 'build-grid' }, ...weapons),
      h('h3', { text: 'Objets' }),
      passives.length ? h('div', { class: 'build-grid' }, ...passives) : h('div', { class: 'muted', text: 'Aucun' }),
    ),
    h(
      'div',
      { class: 'build-col' },
      h('h3', { text: 'Statistiques' }),
      h('div', { class: 'stat-grid' }, ...stats.flatMap(([k, v]) => [h('span', { text: k }), h('strong', { text: v })])),
      h('h3', { text: 'Reliques' }),
      relics.length ? h('div', { class: 'relic-list' }, ...relics) : h('div', { class: 'muted', text: 'Aucune pour l’instant' }),
      ...(synergies.length ? [h('h3', { text: 'Synergies' }), ...synergies.map((s) => h('div', { class: 'synergy-line' }, h('strong', { text: s.name }), ` — ${s.description}`))] : []),
    ),
  );
}

export function pauseScreen(game: Game, world: World, hero: Hero, config: RunConfig, actions: { resume: () => void; abandon: () => void }): Screen {
  let armed = false;
  const abandon = button('Abandonner la partie', () => {
    if (!armed) {
      armed = true;
      abandon.textContent = 'Vraiment abandonner ?';
      abandon.classList.add('danger');
      return;
    }
    actions.abandon();
  });
  const resume = button('Reprendre', actions.resume, 'btn-primary');
  resume.setAttribute('data-autofocus', '');
  const modeLabel = config.mode === 'survival' ? 'Survie' : `Manche ${world.director.wave}`;
  // En coopération, un onglet par joueur pour consulter chaque construction.
  const summaryHost = h('div', {}, buildSummary(game, hero));
  const tabs = world.multiplayer ? h('div', { class: 'tabs' }) : null;
  if (tabs) {
    for (const hr of world.heroes) {
      const tab = h('button', { class: `tab${hr === hero ? ' active' : ''}`, text: hr.name, nav: true, style: { '--accent': hr.color } });
      tab.type = 'button';
      tab.addEventListener('click', () => {
        summaryHost.replaceChildren(buildSummary(game, hr));
        tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      });
      tabs.append(tab);
    }
  }
  const el = h(
    'div',
    { class: 'panel-screen pause' },
    h(
      'div',
      { class: 'screen-header' },
      h('h2', { text: config.online ? 'Pause (tous les joueurs)' : 'Pause' }),
      h(
        'div',
        { class: 'pause-info' },
        h('div', { text: `${modeLabel} · Niveau ${world.run.level} · ${formatTime(world.time)}` }),
        h('div', { class: 'muted', text: [world.biome.name, getDanger(config.danger).name, ...config.mutators.map((m) => getMutator(m)?.name ?? m), config.daily ? 'Défi du jour' : ''].filter(Boolean).join(' · ') }),
      ),
    ),
    tabs,
    summaryHost,
    h('div', { class: 'screen-actions' }, resume, button('Paramètres', () => game.ui.push(settingsScreen(game))), abandon),
  );
  return { el, onBack: actions.resume };
}
