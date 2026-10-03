// Objets ramassables : gemmes d'expérience, or, soins, coffres...
import { sprite, recolor } from './lib.mjs';

const gem = [
  '...kk...',
  '..kwck..',
  '.kwccCk.',
  'kwcccCCk',
  'kccccCnk',
  '.kcCCnk.',
  '..kCnk..',
  '...kk...',
];

const coin = [
  '..kkkk..',
  '.kyhyyk.',
  'kyhyyyYk',
  'kyhyYyYk',
  'kyyyYyYk',
  'kyyyyYYk',
  '.kYYYYk.',
  '..kkkk..',
];

const chicken = [
  '................',
  '................',
  '................',
  '.....kkkkk......',
  '....kOooooOk....',
  '...kOoyoooOOk...',
  '..kOoyooooOOOk..',
  '..kOoooooOOOOk..',
  '..kOooooOOOOOk..',
  '...kOOOOOOOOk...',
  '....kOOOOOkk....',
  '.....kkkkkvk....',
  '..........kvvk..',
  '.........kvvvvk.',
  '..........kvvk..',
  '...........kk...',
];

const magnet = [
  '................',
  '..kkkkk..kkkkk..',
  '..kgwgk..kgwgk..',
  '..kGgGk..kGgGk..',
  '..kkkkk..kkkkk..',
  '..krrRk..krrRk..',
  '..krrRk..krrRk..',
  '..krrRk..krrRk..',
  '..krrRRkkrrRRk..',
  '..krrrRRRRRRRk..',
  '...krrrrrrRRk...',
  '....kkrrrRkk....',
  '......kkkk......',
];

const bomb = [
  '...........y....',
  '.........y.oy...',
  '..........oyo...',
  '.........kb.y...',
  '........kb......',
  '.....kkkkk......',
  '....kdGddddk....',
  '...kdGgddddKk...',
  '..kdGgdddddKKk..',
  '..kdGddddddKKk..',
  '..kddddddddKKk..',
  '..kdddddddKKKk..',
  '...kddddKKKKk...',
  '....kKKKKKKk....',
  '.....kkkkkk.....',
];

const chestClosed = [
  '................',
  '................',
  '................',
  '...kkkkkkkkkk...',
  '..kbbbbbbbbbbk..',
  '..kYbbbbbbbbYk..',
  '..kYYYYYYYYYYk..',
  '..kkkkkyykkkkk..',
  '..kYBBkyykBBYk..',
  '..kYbbbkkbbbYk..',
  '..kYbbbbbbbbYk..',
  '..kYBBBBBBBBYk..',
  '..kYYYYYYYYYYk..',
  '..kkkkkkkkkkkk..',
];
const chestOpen = [
  '.....y....y.....',
  '...kkkkkkkkkk...',
  '..kbbbbbbbbbbk..',
  '..kYYYYYYYYYYk..',
  '..kkkkkkkkkkkk..',
  '..kywwyyyywwyk..',
  '..kYyyhyyhyyYk..',
  '..kkkkkyykkkkk..',
  '..kYBBkyykBBYk..',
  '..kYbbbkkbbbYk..',
  '..kYbbbbbbbbYk..',
  '..kYBBBBBBBBYk..',
  '..kYYYYYYYYYYk..',
  '..kkkkkkkkkkkk..',
];

export default [
  sprite('gem_blue', 8, 8, [gem]),
  sprite('gem_green', 8, 8, [recolor(gem, { c: 'l', C: 'L', n: 'e' })]),
  sprite('gem_red', 8, 8, [recolor(gem, { c: 'r', C: 'R', n: 'K' })]),
  sprite('gem_purple', 8, 8, [recolor(gem, { c: 'p', C: 'P', n: 'K' })]),
  sprite('coin', 8, 8, [coin]),
  sprite('chicken', 16, 16, [chicken]),
  sprite('magnet', 16, 16, [magnet]),
  sprite('bomb', 16, 16, [bomb]),
  sprite('chest', 16, 16, [chestClosed, chestOpen]),
];
