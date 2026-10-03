// Choix de la carte (biome) et du niveau de danger avant de lancer une partie.
import type { Game } from '../../core/Game';
import { ACHIEVEMENTS } from '../../data/achievements';
import { BIOME_LIST, type BiomeDef } from '../../data/biomes';
import { DANGERS } from '../../data/danger';
import type { Assets } from '../../engine/Assets';
import type { GameMode } from '../../game/systems/Director';
import { button, h, spriteEl } from '../dom';
import type { Screen } from '../UIManager';

const previewCache = new Map<string, string>();

/** Petite illustration générée à partir des tuiles et décors du biome. */
export function biomePreview(assets: Assets, biome: BiomeDef): string {
  const cached = previewCache.get(biome.id);
  if (cached) return cached;
  const W = 160;
  const H = 80;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  let seed = biome.id.length * 977;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < H; y += 16) {
    for (let x = 0; x < W; x += 16) {
      const pathy = Math.abs(y - 32 - Math.sin(x / 30) * 10) < 10;
      const tile = pathy ? biome.path : biome.tiles[Math.floor(rand() * biome.tiles.length)].sprite;
      ctx.drawImage(assets.get(tile).image, x, y);
    }
  }
  for (let i = 0; i < 6; i++) {
    const d = assets.get(biome.decals[Math.floor(rand() * biome.decals.length)]);
    ctx.drawImage(d.image, Math.floor(rand() * (W - 16)), Math.floor(rand() * (H - 16)));
  }
  const propXs = [12, 52, 96, 132];
  for (const px of propXs) {
    const p = assets.get(biome.props[Math.floor(rand() * biome.props.length)]);
    ctx.drawImage(p.image, 0, 0, p.w, p.h, px + Math.floor(rand() * 8), H - p.h - 6 - Math.floor(rand() * 20), p.w, p.h);
  }
  // Assombrissement nocturne
  ctx.fillStyle = biome.ambient;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillRect(0, 0, W, H);
  const url = canvas.toDataURL();
  previewCache.set(biome.id, url);
  return url;
}

function remember(key: string, value?: string): string | null {
  try {
    if (value !== undefined) sessionStorage.setItem(key, value);
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Choix de la carte et du niveau de danger. */
export function mapSelectScreen(game: Game, mode: GameMode, onStart: (choice: { biome: string; danger: number }) => void, startLabel = 'Commencer'): Screen {
  const save = game.save;
  let biomeId = BIOME_LIST.find((b) => save.isBiomeUnlocked(b.id) && b.id === remember('lastBiome'))?.id ?? 'cemetery';
  let danger = Math.min(save.maxDangerUnlocked, Number(remember('lastDanger') ?? 0) || 0);

  const biomeRow = h('div', { class: 'biome-grid' });
  const dangerRow = h('div', { class: 'danger-row' });
  const dangerDesc = h('div', { class: 'danger-desc' });

  const renderBiomes = () => {
    biomeRow.replaceChildren(
      ...BIOME_LIST.map((b) => {
        const unlocked = save.isBiomeUnlocked(b.id);
        const ach = ACHIEVEMENTS.find((a) => a.reward.type === 'biome' && 'id' in a.reward && a.reward.id === b.id);
        const wins = save.data.stats.winsByBiome[b.id] ?? 0;
        const card = h(
          'div',
          { class: `biome-card${b.id === biomeId ? ' selected' : ''}${unlocked ? '' : ' locked is-disabled'}`, nav: true },
          h('img', { class: 'biome-preview', attrs: { src: biomePreview(game.assets, b), alt: '' } }),
          h('div', { class: 'biome-name' }, spriteEl(game.assets, b.emblem, 22), unlocked ? b.name : '???'),
          h('div', { class: 'biome-desc', text: unlocked ? b.description : `Succès requis : ${ach?.name ?? ''} (${b.unlockHint})` }),
          unlocked && (b.enemyHp > 1 || b.gold > 1)
            ? h('div', { class: 'biome-mods', text: `Ennemis +${Math.round((b.enemyHp - 1) * 100)}% PV · Or +${Math.round((b.gold - 1) * 100)}%` })
            : null,
          wins ? h('div', { class: 'char-wins', text: `${wins} victoire${wins > 1 ? 's' : ''}` }) : null,
        );
        card.addEventListener('click', () => {
          if (!unlocked) return;
          biomeId = b.id;
          renderBiomes();
          (biomeRow.children[BIOME_LIST.indexOf(b)] as HTMLElement).focus();
        });
        return card;
      }),
    );
  };

  const renderDanger = () => {
    dangerRow.replaceChildren(
      ...DANGERS.map((d) => {
        const unlocked = d.level <= save.maxDangerUnlocked;
        const b = h('button', {
          class: `danger-btn${d.level === danger ? ' selected' : ''}${unlocked ? '' : ' is-disabled'}`,
          text: unlocked ? String(d.level) : '🔒',
          nav: true,
          style: { '--danger': d.color },
          title: d.description,
        });
        b.type = 'button';
        b.addEventListener('click', () => {
          if (!unlocked) return;
          danger = d.level;
          renderDanger();
          (dangerRow.children[d.level] as HTMLElement).focus();
        });
        return b;
      }),
    );
    const d = DANGERS[danger];
    dangerDesc.replaceChildren(h('strong', { text: d.name, style: { color: d.color } }), ` — ${d.description}`);
    if (save.maxDangerUnlocked < 5) dangerDesc.append(h('div', { class: 'muted', text: 'Gagnez une partie pour débloquer le niveau de danger suivant.' }));
  };

  renderBiomes();
  renderDanger();

  const start = button(
    startLabel,
    () => {
      remember('lastBiome', biomeId);
      remember('lastDanger', String(danger));
      onStart({ biome: biomeId, danger });
    },
    'btn-primary',
  );

  const el = h(
    'div',
    { class: 'panel-screen' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Choisissez la carte' }), h('div', { class: 'gold-display', text: mode === 'survival' ? 'Mode Survie' : 'Mode Manches' })),
    biomeRow,
    h('h3', { text: 'Niveau de danger' }),
    dangerRow,
    dangerDesc,
    h('div', { class: 'screen-actions' }, button('Retour', () => game.ui.pop()), start),
  );
  return { el, onBack: () => game.ui.pop() };
}
