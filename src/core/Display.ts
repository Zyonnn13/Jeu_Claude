// Options d'affichage appliquées à la page : correction des couleurs pour le daltonisme et taille de l'interface.
import type { ColorblindMode, Settings } from './SaveManager';

type M3 = number[][];

// Simulation des déficiences (approximation de Viénot, espace RGB).
const SIMULATION: Record<Exclude<ColorblindMode, 'none'>, M3> = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
};

/**
 * Matrice de « daltonisation » : l'information de couleur perdue est redistribuée
 * vers les canaux encore perçus (correction = I + E·(I − S)).
 */
function correction(mode: Exclude<ColorblindMode, 'none'>): M3 {
  const S = SIMULATION[mode];
  const E: M3 =
    mode === 'tritanopia'
      ? [
          [1, 0, 0.7],
          [0, 1, 0.7],
          [0, 0, 0],
        ]
      : [
          [0, 0, 0],
          [0.7, 1, 0],
          [0.7, 0, 1],
        ];
  const D = S.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) - v));
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) + E[i][0] * D[0][j] + E[i][1] * D[1][j] + E[i][2] * D[2][j]));
}

function ensureFilters(): void {
  if (document.getElementById('cb-filters')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.id = 'cb-filters';
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  for (const mode of Object.keys(SIMULATION) as Exclude<ColorblindMode, 'none'>[]) {
    const filter = document.createElementNS(ns, 'filter');
    filter.id = `cb-${mode}`;
    filter.setAttribute('color-interpolation-filters', 'linearRGB');
    const matrix = document.createElementNS(ns, 'feColorMatrix');
    matrix.setAttribute('type', 'matrix');
    const m = correction(mode);
    matrix.setAttribute('values', [...m.map((row) => [...row.map((v) => v.toFixed(4)), '0', '0'].join(' ')), '0 0 0 1 0'].join(' '));
    filter.append(matrix);
    svg.append(filter);
  }
  document.body.append(svg);
}

export function applyDisplaySettings(settings: Settings): void {
  ensureFilters();
  const app = document.getElementById('app');
  if (!app) return;
  const mode = settings.accessibility.colorblind;
  app.style.filter = mode === 'none' ? '' : `url(#cb-${mode})`;
  document.documentElement.style.setProperty('--ui-scale', String(settings.accessibility.uiScale));
}
