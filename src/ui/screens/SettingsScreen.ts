// Paramètres façon « grand jeu » : onglets Graphismes, Audio, Commandes, Accessibilité, Jeu et Sauvegarde.
import type { Game } from '../../core/Game';
import { GRAPHICS_PRESETS, type ColorblindMode, type QualityPreset } from '../../core/SaveManager';
import { button, h } from '../dom';
import type { Screen } from '../UIManager';
import { controlsPanel } from './ControlsScreen';

type Tab = 'graphics' | 'audio' | 'controls' | 'accessibility' | 'gameplay' | 'save';

const TABS: { id: Tab; label: string }[] = [
  { id: 'graphics', label: 'Graphismes' },
  { id: 'audio', label: 'Audio' },
  { id: 'controls', label: 'Commandes' },
  { id: 'accessibility', label: 'Accessibilité' },
  { id: 'gameplay', label: 'Jeu' },
  { id: 'save', label: 'Sauvegarde' },
];

const PRESET_LABELS: Record<QualityPreset, string> = { low: 'Bas', medium: 'Moyen', high: 'Élevé', ultra: 'Ultra', custom: 'Personnalisé' };

export function settingsScreen(game: Game, initialTab: Tab = 'graphics'): Screen {
  const s = game.save.data.settings;
  let tab: Tab = initialTab;
  const tabBar = h('div', { class: 'tabs settings-tabs' });
  const panel = h('div', { class: 'settings-panel' });
  const desc = h('div', { class: 'settings-desc' });

  const persist = () => {
    game.save.save();
    game.applySettings();
  };

  // --- Contrôles génériques ---------------------------------------------------
  const row = (label: string, help: string, control: HTMLElement) => {
    const r = h('div', { class: 'option-row' }, h('span', { class: 'option-label', text: label }), control);
    r.addEventListener('focusin', () => (desc.textContent = help));
    r.addEventListener('mouseenter', () => (desc.textContent = help));
    return r;
  };

  const slider = (label: string, help: string, value: number, min: number, max: number, step: number, format: (v: number) => string, set: (v: number) => void) => {
    const output = h('span', { class: 'option-value', text: format(value) });
    const input = h('input', { nav: true, attrs: { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) } });
    input.addEventListener('input', () => {
      const v = Number(input.value);
      output.textContent = format(v);
      set(v);
      persist();
    });
    input.addEventListener('change', () => game.audio.play('select'));
    return row(label, help, h('div', { class: 'slider-wrap' }, input, output));
  };

  const toggle = (label: string, help: string, value: boolean, set: (v: boolean) => void) => {
    let current = value;
    const b = h('button', { class: 'toggle-btn', nav: true });
    b.type = 'button';
    const paint = () => {
      b.textContent = current ? 'Activé' : 'Désactivé';
      b.classList.toggle('on', current);
    };
    b.addEventListener('click', () => {
      current = !current;
      set(current);
      persist();
      paint();
    });
    paint();
    return row(label, help, b);
  };

  const choice = <T extends string | number>(label: string, help: string, options: { value: T; label: string }[], value: T, set: (v: T) => void) => {
    const wrap = h('div', { class: 'segmented' });
    const paint = (v: T) => wrap.querySelectorAll('.seg').forEach((el, i) => el.classList.toggle('selected', options[i].value === v));
    for (const o of options) {
      const b = h('button', { class: 'seg', text: o.label, nav: true });
      b.type = 'button';
      b.addEventListener('click', () => {
        set(o.value);
        persist();
        paint(o.value);
      });
      wrap.append(b);
    }
    paint(value);
    return row(label, help, wrap);
  };

  const markCustom = () => {
    s.graphics.preset = 'custom';
  };

  // --- Onglets ------------------------------------------------------------------
  const graphics = (): HTMLElement[] => {
    const g = s.graphics;
    const gpu = game.gpu;
    const tierLabel = PRESET_LABELS[gpu.tier];
    return [
      h('div', { class: 'gpu-info' }, h('strong', { text: 'Carte graphique détectée : ' }), gpu.name || 'inconnue', h('div', { class: 'muted', text: `${gpu.dedicated ? 'Carte dédiée' : 'Carte intégrée'} · préréglage recommandé : ${tierLabel}` })),
      choice('Préréglage', 'Règle tous les paramètres graphiques d’un coup. « Ultra » et « Élevé » demandent une carte graphique dédiée.', (['low', 'medium', 'high', 'ultra', 'custom'] as QualityPreset[]).map((p) => ({ value: p, label: PRESET_LABELS[p] + (p === gpu.tier ? ' ★' : '') })), g.preset, (p) => {
        g.preset = p;
        if (p !== 'custom') Object.assign(g, GRAPHICS_PRESETS[p]);
        render();
      }),
      slider('Résolution de rendu', 'Moins de pixels à calculer : plus fluide sur les petites cartes graphiques, mais image moins fine.', g.renderScale, 0.5, 1, 0.05, (v) => `${Math.round(v * 100)}%`, (v) => {
        g.renderScale = v;
        markCustom();
      }),
      choice('Éclairage dynamique', 'La nuit est éclairée par votre lumière, les flammes, les sorts et les décors. « Simple » utilise une carte de lumière moins détaillée.', [
        { value: 'off', label: 'Désactivé' },
        { value: 'low', label: 'Simple' },
        { value: 'high', label: 'Complet' },
      ] as const, g.lighting, (v) => {
        g.lighting = v;
        markCustom();
      }),
      toggle('Lueurs (bloom)', 'Halo lumineux autour des projectiles magiques, des gemmes et des flammes.', g.bloom, (v) => {
        g.bloom = v;
        markCustom();
      }),
      toggle('Ombres', 'Ombres sous les personnages, les ennemis et les objets.', g.shadows, (v) => {
        g.shadows = v;
        markCustom();
      }),
      choice('Particules', 'Quantité d’étincelles et d’éclats lors des combats.', [
        { value: 'low', label: 'Basses' },
        { value: 'medium', label: 'Moyennes' },
        { value: 'high', label: 'Élevées' },
      ] as const, g.particles, (v) => {
        g.particles = v;
        markCustom();
      }),
      toggle('Cadavres projetés', 'Les ennemis vaincus sont projetés en tournoyant.', g.corpses, (v) => {
        g.corpses = v;
        markCustom();
      }),
      slider('Vignette', 'Assombrissement des bords de l’écran.', g.vignette, 0, 1, 0.1, (v) => `${Math.round(v * 100)}%`, (v) => {
        g.vignette = v;
        markCustom();
      }),
      choice('Images par seconde max.', 'Limiter les images par seconde réduit la chaleur et le bruit de l’ordinateur.', [
        { value: 30, label: '30' },
        { value: 60, label: '60' },
        { value: 120, label: '120' },
        { value: 144, label: '144' },
        { value: 0, label: 'Illimité' },
      ], g.fpsLimit, (v) => (g.fpsLimit = v)),
      toggle('Afficher les images par seconde', 'Compteur de performances en bas de l’écran.', g.showFps, (v) => (g.showFps = v)),
      row('Plein écran', 'Basculer en plein écran (touche F11).', button('Basculer', () => game.toggleFullscreen(), 'btn-small')),
    ];
  };

  const audio = (): HTMLElement[] => [
    slider('Volume général', 'Volume de tout le jeu.', s.masterVolume, 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`, (v) => (s.masterVolume = v)),
    slider('Musique', 'Volume de la musique.', s.musicVolume, 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`, (v) => (s.musicVolume = v)),
    slider('Effets sonores', 'Volume des bruitages.', s.sfxVolume, 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`, (v) => (s.sfxVolume = v)),
    toggle('Couper le son en arrière-plan', 'Silence quand la fenêtre du jeu n’est pas active.', s.muteUnfocused, (v) => (s.muteUnfocused = v)),
  ];

  const accessibility = (): HTMLElement[] => {
    const a = s.accessibility;
    return [
      choice<ColorblindMode>('Mode daltonien', 'Corrige les couleurs pour mieux distinguer rouges, verts et bleus selon votre type de daltonisme.', [
        { value: 'none', label: 'Aucun' },
        { value: 'protanopia', label: 'Protanopie' },
        { value: 'deuteranopia', label: 'Deutéranopie' },
        { value: 'tritanopia', label: 'Tritanopie' },
      ], a.colorblind, (v) => (a.colorblind = v)),
      h('div', { class: 'cb-preview' }, ...['#e0413c', '#f28c28', '#ffd84a', '#8fd94f', '#3f8fd8', '#b06de0'].map((c) => h('span', { style: { background: c } }))),
      toggle('Projectiles ennemis très contrastés', 'Les tirs ennemis deviennent blancs cerclés de noir : visibles quelle que soit la perception des couleurs.', a.highContrastBullets, (v) => (a.highContrastBullets = v)),
      toggle('Réduire les flashs', 'Atténue fortement les flashs plein écran (photosensibilité).', a.reduceFlashes, (v) => (a.reduceFlashes = v)),
      slider('Tremblements d’écran', 'Intensité des secousses de la caméra.', a.screenShake, 0, 1, 0.1, (v) => (v === 0 ? 'Aucun' : `${Math.round(v * 100)}%`), (v) => (a.screenShake = v)),
      slider('Taille de l’interface', 'Agrandit les menus et le HUD.', a.uiScale, 0.8, 1.4, 0.05, (v) => `${Math.round(v * 100)}%`, (v) => (a.uiScale = v)),
    ];
  };

  const gameplay = (): HTMLElement[] => {
    const gp = s.gameplay;
    const name = h('input', { nav: true, attrs: { type: 'text', maxlength: '16', value: s.playerName } });
    name.addEventListener('change', () => {
      s.playerName = name.value.trim().slice(0, 16) || 'Joueur';
      persist();
    });
    return [
      row('Pseudo', 'Votre nom en multijoueur.', name),
      toggle('Chiffres de dégâts', 'Affiche les dégâts infligés au-dessus des ennemis.', gp.damageNumbers, (v) => (gp.damageNumbers = v)),
      toggle('Pause automatique', 'Met le jeu en pause quand la fenêtre perd le focus (hors partie en ligne).', gp.autoPause, (v) => (gp.autoPause = v)),
      toggle('Indicateurs hors écran', 'Flèches vers les boss, coffres et coéquipiers hors de l’écran.', gp.offscreenIndicators, (v) => (gp.offscreenIndicators = v)),
      toggle('Pseudos des joueurs', 'Affiche le pseudo au-dessus de chaque joueur en multijoueur.', gp.nameTags, (v) => (gp.nameTags = v)),
      toggle('Vibrations de la manette', 'La manette vibre quand vous êtes touché ou qu’un boss arrive.', s.rumble, (v) => (s.rumble = v)),
    ];
  };

  const saveTab = (): HTMLElement[] => {
    const status = h('div', { class: 'controls-status' });
    const fileInput = h('input', { attrs: { type: 'file', accept: '.json,application/json' }, style: { display: 'none' } });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const ok = game.save.import(await file.text());
      status.textContent = ok ? 'Sauvegarde importée avec succès.' : 'Ce fichier n’est pas une sauvegarde valide.';
      if (ok) game.applySettings();
    });
    let armed = false;
    const reset = button('Effacer la progression', () => {
      if (!armed) {
        armed = true;
        reset.textContent = 'Confirmer l’effacement ?';
        reset.classList.add('danger');
        return;
      }
      game.save.reset();
      reset.textContent = 'Progression effacée';
      armed = false;
    });
    return [
      h('p', { class: 'muted', text: 'Votre progression (or, améliorations, succès, records) est enregistrée automatiquement sur ce PC. Exportez-la pour la copier sur un autre ordinateur.' }),
      h(
        'div',
        { class: 'screen-actions' },
        button('Exporter la sauvegarde', () => {
          const blob = new Blob([game.save.export()], { type: 'application/json' });
          h('a', { attrs: { href: URL.createObjectURL(blob), download: 'nuit-eternelle-sauvegarde.json' } }).click();
          status.textContent = 'Sauvegarde exportée.';
        }),
        button('Importer une sauvegarde', () => fileInput.click()),
        fileInput,
      ),
      status,
      h('div', { class: 'screen-actions' }, reset),
    ];
  };

  const render = () => {
    tabBar.replaceChildren(
      ...TABS.map((t) => {
        const b = h('button', { class: `tab${t.id === tab ? ' active' : ''}`, text: t.label, nav: true });
        b.type = 'button';
        b.addEventListener('click', () => {
          tab = t.id;
          render();
          (tabBar.children[TABS.indexOf(t)] as HTMLElement).focus();
        });
        return b;
      }),
    );
    desc.textContent = '';
    const content =
      tab === 'graphics' ? graphics() : tab === 'audio' ? audio() : tab === 'controls' ? [controlsPanel(game)] : tab === 'accessibility' ? accessibility() : tab === 'gameplay' ? gameplay() : saveTab();
    panel.replaceChildren(h('div', { class: 'options-list' }, ...content));
  };
  render();

  const close = () => game.ui.pop();
  const el = h(
    'div',
    { class: 'panel-screen settings' },
    h('div', { class: 'screen-header' }, h('h2', { text: 'Paramètres' })),
    tabBar,
    h('div', { class: 'settings-body' }, panel, desc),
    h('div', { class: 'screen-actions' }, button('Retour', close, 'btn-primary')),
  );
  return { el, onBack: close };
}
