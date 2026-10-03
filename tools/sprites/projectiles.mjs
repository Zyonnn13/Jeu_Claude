// Projectiles et effets (orientés vers la droite, rotation appliquée en jeu).
import { sprite, recolor, patch, hexToRgba, mix } from './lib.mjs';

const knife = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....k..........',
  '.....kk.kkkkk...',
  'kkkkkkGkgwwwwkk.',
  'kBbBbkGkggggggwk',
  'kkkkkkGkGGGGGkk.',
  '.....kk.kkkkk...',
  '.....k..........',
];

const axe = [
  '.........kkk....',
  '.......kkwwgk...',
  '......kwwgggGk..',
  '.....kwwggggGk..',
  '......kwgggGkbBk',
  '.......kgGGkbBk.',
  '........kkkbBk..',
  '.........kbBk...',
  '........kbBk....',
  '.......kbBk.....',
  '......kbBk......',
  '.....kbBk.......',
  '....kbBk........',
  '...kbBk.........',
  '..kbBk..........',
  '..kkk...........',
];

const boomerang = [
  '................',
  '................',
  '..kkkk..........',
  '..kobbkk........',
  '..kbObbbkk......',
  '...kbObbbbkk....',
  '....kkObbbbbk...',
  '......kkObbbOk..',
  '......kkObbbOk..',
  '....kkObbbbbk...',
  '...kbObbbbkk....',
  '..kbObbbkk......',
  '..kobbkk........',
  '..kkkk..........',
];

const flask = [
  '................',
  '......kkkk......',
  '......kbbk......',
  '......kwgk......',
  '......kwgk......',
  '.....kwggGk.....',
  '....kwgggggk....',
  '...kgoooooooGk..',
  '...kwoyyoooOk...',
  '...koyyoooooOk..',
  '...kooooooOOOk..',
  '....kOooooOOk...',
  '.....kkkkkkk....',
];

const flameA = [
  '................',
  '.......o........',
  '......oo........',
  '......oyo...o...',
  '.....oyyo..oo...',
  '....oyyyyo.oyo..',
  '...ooywyyoooyo..',
  '...oyywwyyoyyo..',
  '..ooyywwwyyyyoo.',
  '..oyyywwwwyyyyo.',
  '..oyywwwwwwyyyo.',
  '..ooyyywwwyyyoo.',
  '...ooyyyyyyyoo..',
  '....OoooooooO...',
  '.....OOOOOOO....',
];
const flameB = patch(flameA, {
  1: '........o.......',
  2: '........oo......',
  3: '...o...oyo......',
  4: '...oo..oyyo.....',
  5: '..oyo.oyyyyo....',
  6: '..oyooooyyyoo...',
});
const flameC = patch(flameA, {
  1: '................',
  2: '.......o........',
  3: '......ooo..o....',
  4: '.....oyyo.oo....',
  5: '....oyyyyooyo...',
});
const flameD = patch(flameA, {
  1: '......o.........',
  2: '.....oo...o.....',
  3: '.....oyo.oo.....',
  4: '....oyyooyo.....',
});

// Projectiles procéduraux : orbes lumineuses à dégradé radial.
function glowOrb(size, inner, mid, outer, radius = size / 2 - 0.5, core = 0.35) {
  return (x, y) => {
    const cx = size / 2 - 0.5;
    const cy = size / 2 - 0.5;
    const d = Math.hypot(x - cx, y - cy) / radius;
    if (d > 1) return null;
    if (d < core) return inner;
    if (d < 0.7) return mix(inner, mid, (d - core) / (0.7 - core));
    return mix(mid, outer, (d - 0.7) / 0.3);
  };
}

// Arc de lame (32x16) : croissant procédural.
function slashArc(x, y) {
  // Croissant : intérieur de l'ellipse extérieure mais hors de l'ellipse intérieure.
  const outer = ((x - 15.5) / 15.5) ** 2 + ((y - 14) / 12.5) ** 2;
  const inner = ((x - 15.5) / 15.5) ** 2 + ((y - 18.5) / 12.5) ** 2;
  if (outer > 1 || inner < 1) return null;
  if (outer > 0.9 || inner < 1.06) return '#3f8fd8';
  if (outer > 0.78 || inner < 1.16) return '#6fe3f0';
  return '#ffffff';
}

export default [
  sprite('knife', 16, 16, [knife]),
  sprite('axe', 16, 16, [axe]),
  sprite('boomerang', 16, 16, [boomerang]),
  sprite('flask', 16, 16, [flask]),
  sprite('flame', 16, 16, [flameA, flameB, flameC, flameD]),
  sprite('bolt', 12, 12, [
    glowOrb(12, '#ffffff', '#e8a2ff', '#7a3ad8', 5.5, 0.3),
    glowOrb(12, '#ffffff', '#f0c2ff', '#9a4fe8', 5.2, 0.38),
    glowOrb(12, '#ffffff', '#f0c2ff', '#9a4fe8', 5, 0.45),
    glowOrb(12, '#ffffff', '#e8a2ff', '#7a3ad8', 5.3, 0.35),
  ]),
  sprite('orb', 14, 14, [
    glowOrb(14, '#ffffff', '#fff1a0', '#e8a12e', 6.5, 0.35),
    glowOrb(14, '#ffffff', '#ffe680', '#d8902a', 6.2, 0.42),
    glowOrb(14, '#ffffff', '#ffe680', '#d8902a', 6, 0.5),
    glowOrb(14, '#ffffff', '#fff1a0', '#e8a12e', 6.3, 0.4),
  ]),
  sprite('enemy_bullet', 10, 10, [
    glowOrb(10, '#ffe0f0', '#f0408a', '#7a1440', 4.5, 0.3),
    glowOrb(10, '#ffffff', '#ff60a0', '#901850', 4.2, 0.4),
  ]),
  sprite('slash', 32, 16, [slashArc]),
];

export { hexToRgba, recolor };
