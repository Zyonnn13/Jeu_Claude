// Boss (32x32, 2 frames) et accessoires de boss.
import { sprite, shift, recolor, patch, raster } from './lib.mjs';

const lichA = [
  '................................',
  '...........y...y...y.....kkk....',
  '...........yy.yyy.yy....kwllk...',
  '...........yyyyyyyyy....klllk...',
  '..........kYYrYYYrYYk...kLLLk...',
  '..........kvvvvvvvvvk....kkk....',
  '.........kvvvvvvvvvvvk...kbk....',
  '.........kvvvkkvvkkvvk...kbk....',
  '.........kvvvklvvklvvk...kbk....',
  '.........kVvvvvvkvvvVk...kbk....',
  '..........kVvvvvvvvVk....kbk....',
  '..........kVkvkvkvkVk....kbk....',
  '...........kVvvvvvVk.....kbk....',
  '........kPPkkkkkkkkPPk...kbk....',
  '......kPPppPPPPPPPPppPPk.kbk....',
  '.....kPPpppPPPPPPPPpppPPkvbvk...',
  '.....kPpppPPPPPPPPPPpppPkvvvk...',
  '.....kPppPPPPPPPPPPPPppPkkbk....',
  '.....kPpPPPPPPPYPPPPPPpPk.kbk...',
  '....kPpPPPPPPPPYPPPPPPPpPkkbk...',
  '....kPpPPPPPPPPYPPPPPPPpPkkbk...',
  '...kPpPPPPPPPPPYPPPPPPPPpkkbk...',
  '...kPpPPPPPPPPPYPPPPPPPPpkkbk...',
  '..kPpPPPPPPPPPPYPPPPPPPPpkkbk...',
  '..kPpPPPPPPPPPPYPPPPPPPPpkkbk...',
  '..kPpPPPPPPPPPPYPPPPPPPPpkkbk...',
  '..kPPPPPPPPPPPPYPPPPPPPPPkkbk...',
  '..kPPPPPPPPPPPPYPPPPPPPPPk.kbk..',
  '..kYyYYyYYyYYyYYyYYyYYyYk.kbk...',
  '..kPk.kPPk.kPPk.kPPk.kPk..kbk...',
  '...k...kk...kk...kk...k...kbk...',
  '..........................kkk...',
];
const lichB = recolor(shift(lichA, 0, -1, 32, 32), { l: 'c', L: 'C' });
const lichC = shift(lichA, 0, -2, 32, 32);
const vampA = [
  '................................',
  '................................',
  '............kkkkkk..............',
  '...........kKKKKKKk.............',
  '..........kKKKKKKKKk............',
  '.......k..kKKKKwwwwk..k.........',
  '.......kk.kKKKwwwwwwk.kk........',
  '.......kRkkKKwwrwwrwkRk.........',
  '.......kRRkKKgwwwwwwkRRk........',
  '......kRRRkKgwwwwwwwkRRRk.......',
  '......kRRRRkgwwwwwkkRRRRk.......',
  '.....kRRRRRRkgggggkRRRRRRk......',
  '.....kKRRRRRkkkkkkkRRRRRKk......',
  '....kKKKKKKKkRRyRRkKKKKKKKk.....',
  '...kKKKKKKKKkRRRRRkKKKKKKKKk....',
  '...kKKKKKKKkwkRyRkwkKKKKKKKk....',
  '..kKKKKKKKKkwkRRRkwkKKKKKKKKk...',
  '..kKKKKKKKKkskRyRkskKKKKKKKKk...',
  '..kKKKKKKKKKkkRRRkkKKKKKKKKKk...',
  '.kKKKKKKKKKKKkRRRkKKKKKKKKKKKk..',
  '.kKKKKKKKKKKKkKKKkKKKKKKKKKKKk..',
  '.kRKKKKKKKKKKkKKKkKKKKKKKKKKRk..',
  'kRRKKKKKKKKKKkKKKkKKKKKKKKKKRRk.',
  'kRRKKKKKKKKKKkKkKkKKKKKKKKKKRRk.',
  'kRRRKKKKKKKKKkKkKkKKKKKKKKKRRRk.',
  'kRRRKKKKKKKKKkKkKkKKKKKKKKKRRRk.',
  'kRRRRKKKKKKKKkKkKkKKKKKKKKRRRRk.',
  '.kRRRKKKKKKKKkdkdkKKKKKKKKRRRk..',
  '.kRRkKKKKKKKKkdkdkKKKKKKKKkRRk..',
  '..kk.kKKkKKkkkdkdkkKKkKKKk.kk...',
  '......kk.kk..kkkkk.kk.kk........',
  '................................',
];
const vampB = patch(vampA, {
  21: 'kRRKKKKKKKKKKkKKKkKKKKKKKKKKRRk.',
  22: 'kRRRKKKKKKKKKkKKKkKKKKKKKKKRRRk.',
  23: 'kRRRKKKKKKKKKkKkKkKKKKKKKKKRRRk.',
  24: 'kRRRRKKKKKKKKkKkKkKKKKKKKKRRRRk.',
  25: 'kRRRRKKKKKKKKkKkKkKKKKKKKKRRRRk.',
  26: 'kRRRRRKKKKKKKkKkKkKKKKKKKRRRRRk.',
  27: '.kRRRRKKKKKKKkdkdkKKKKKKKRRRRk..',
  28: '.kRRRkKKKKKKKkdkdkKKKKKKKkRRRk..',
  29: '..kkk.kKKkKKkkdkdkkKKkKKk.kkk...',
});

const crown = [
  '................',
  '................',
  '................',
  '...y...y...y....',
  '...yy.yyy.yy....',
  '...kyyyyyyyk....',
  '...kyYrYYrYk....',
  '...kkkkkkkkk....',
];

/** La Faucheuse (méga-boss du mode Survie) : capuche, crâne, cape en lambeaux et grande faux. */
function reaper(frame) {
  const r = raster(32, 32);
  const b = [0, -1, -2, -1][frame];
  const flutter = [0, 1, 0, -1][frame];
  // Manche de la faux
  r.line(24, 4 + b, 21, 31, 'b').line(25, 4 + b, 22, 31, 'B');
  // Lame en croissant
  r.ellipse(15, 8 + b, 10.5, 5.5, 'g', (x, y) => y <= 9 + b && x <= 25 && ((x - 16) / 9.5) ** 2 + ((y - 10.5 - b) / 5) ** 2 > 1);
  r.ellipse(15, 8 + b, 10.5, 5.5, 'w', (x, y) => y <= 9 + b && x <= 25 && ((x - 15) / 10.5) ** 2 + ((y - 8 - b) / 5.5) ** 2 > 0.75 && ((x - 16) / 9.5) ** 2 + ((y - 10.5 - b) / 5) ** 2 > 1 && y < 6 + b);
  // Cape
  r.poly([[16, 9 + b], [22, 14 + b], [25 + flutter, 30], [21, 28], [18, 31], [15, 28], [11, 31], [8 - flutter, 28], [10, 14 + b]], 'K');
  for (const x of [12, 16, 20]) r.line(x, 17 + b, x + flutter * 0.5, 28, 'P');
  // Capuche, visage et crâne
  r.ellipse(16, 12 + b, 6, 6.5, 'K');
  r.ellipse(16.5, 13 + b, 3.6, 4.2, 'k');
  r.ellipse(16.5, 13 + b, 2.6, 3.2, 'v');
  r.set(15, 12 + b, 'r').set(18, 12 + b, 'r');
  r.set(16, 15 + b, 'V').set(17, 15 + b, 'V');
  // Main osseuse sur le manche
  r.rect(22, 17 + b, 23, 18 + b, 'v');
  r.outline('k');
  return r.rows();
}

export default [
  sprite('reaper', 32, 32, [0, 1, 2, 3].map(reaper)),
  sprite('lich', 32, 32, [lichA, lichB, lichC, lichB]),
  sprite('vampire', 32, 32, [vampA, shift(vampA, 0, -1, 32, 32), vampB, shift(vampB, 0, -1, 32, 32)]),
  sprite('crown_boss', 16, 8, [crown.slice(0, 8)]),
];
