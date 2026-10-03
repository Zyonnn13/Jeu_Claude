// Icônes d'armes, d'objets passifs et de reliques (16x16).
import { sprite, recolor } from './lib.mjs';

const sword = [
  '................',
  '.............kk.',
  '............kwk.',
  '...........kwgk.',
  '..........kwgk..',
  '.........kwgk...',
  '........kwgk....',
  '..kk...kwgk.....',
  '..kYk.kwgk......',
  '...kYkwgk.......',
  '....kYgk........',
  '....kbYYk.......',
  '...kbk.kYk......',
  '..kbk...kk......',
  '.kyk............',
  '..k.............',
];

const wand = [
  '...........k....',
  '..........kyk...',
  '.......kkkkyykkk',
  '.......kyyywyyyk',
  '........kyyyyyk.',
  '.........kyykyk.',
  '........kbkk.kk.',
  '.......kbk......',
  '......kbk.......',
  '.....kbk........',
  '....kbk.........',
  '...kbk..........',
  '..kbk...........',
  '.kbk............',
  '.kk.............',
];

const garlic = [
  '................',
  '.......kk.......',
  '......kgk.......',
  '.......kgk......',
  '......kwwk......',
  '....kkwwwwkk....',
  '...kwwgwwgwwk...',
  '..kwwgwwwwgwwk..',
  '..kwgwwwwwwgwk..',
  '..kwgwwwwwwgGk..',
  '..kwgwwwwwwgGk..',
  '...kwgwwwwgGk...',
  '....kkGggGkk....',
  '.....kGkkGk.....',
  '......k..k......',
];

const lightning = [
  '..........kkkk..',
  '.........kwyyk..',
  '........kwyyk...',
  '.......kwyyk....',
  '......kwyyk.....',
  '.....kwyyykkkk..',
  '....kwyyyyyyyk..',
  '...kkkkyyyyyk...',
  '......kyyyyk....',
  '.....kyyyk......',
  '....kyyyk.......',
  '...kyyk.........',
  '...kyk..........',
  '..kyk...........',
  '..kk............',
];

const heart = [
  '................',
  '................',
  '..kkk...kkk.....',
  '.krrrk.krrrk....',
  'krwrrrkrrrrRk...',
  'krwrrrrrrrrRk...',
  'krrrrrrrrrrRk...',
  'krrrrrrrrrRRk...',
  '.krrrrrrrRRk....',
  '..krrrrrRRk.....',
  '...krrrRRk......',
  '....krRRk.......',
  '.....kRk........',
  '......k.........',
];

const shield = [
  '................',
  '...kkkkkkkkkk...',
  '...kgggggggGk...',
  '...kgwCCCCgGk...',
  '...kgCCCCCCGk...',
  '...kgCCyyCCGk...',
  '...kgCyyyyCGk...',
  '...kgCCyyCCGk...',
  '...kgCCCCCCGk...',
  '....kgCCCCGk....',
  '....kgCCCCGk....',
  '.....kgCCGk.....',
  '......kgGk......',
  '.......kk.......',
];

const boots = [
  '................',
  '.......kkkkk....',
  '..kk...kbbbk....',
  '.kwwk..kbbbk....',
  'kwwwwk.kbbbk....',
  '.kwwwwkkbbbk....',
  '..kwwwkbbbbk....',
  '...kkkbbbbbk....',
  '......kbbbbbkk..',
  '......kbbbbbbbk.',
  '......kBBBBBBBk.',
  '......kkkkkkkkk.',
];

const gauntlet = [
  '................',
  '....kkkkkkk.....',
  '...kgwgwgwgk....',
  '...kgggggggGk...',
  '...kgGgGgGgGk...',
  '..kkggggggggk...',
  '.kgkgggggggGk...',
  '.kggkggggggGk...',
  '..kggggggggk....',
  '...kGgggggGk....',
  '....kkkkkkk.....',
  '....kRrrrRk.....',
  '....kRrrrRk.....',
  '....kkkkkkk.....',
];

const lens = [
  '................',
  '.....kkkkk......',
  '....kcwcccGk....',
  '...kcwcccccGk...',
  '...kwcccccccGk..',
  '...kccccccccGk..',
  '...kccccccCCGk..',
  '...kGcccccCCGk..',
  '....kGccCCCGk...',
  '.....kGGGGGkbk..',
  '......kkkkkkbk..',
  '...........kbbk.',
  '............kbbk',
  '.............kk.',
];

const hourglass = [
  '................',
  '...kkkkkkkkk....',
  '...kbbbbbbbk....',
  '....kuyyyyk.....',
  '....kuyyyyk.....',
  '.....kuyyk......',
  '......kyk.......',
  '......kyk.......',
  '.....kuuyk......',
  '....kuuuyyk.....',
  '....kuyyyyk.....',
  '...kbbbbbbbk....',
  '...kkkkkkkkk....',
];

const ring = [
  '................',
  '......kkk.......',
  '.....kcwck......',
  '.....kcCck......',
  '....kkkCkkk.....',
  '...kyyykyyyk....',
  '..kyyk...kyYk...',
  '..kyk.....kYk...',
  '..kyk.....kYk...',
  '..kyk.....kYk...',
  '..kyyk...kYYk...',
  '...kyyykYYYk....',
  '....kkkkkkk.....',
];

const book = [
  '................',
  '..kkkkkkkkkk....',
  '..kPPPPPPPPPk...',
  '..kPpppppppPk...',
  '..kPpyyyyypPk...',
  '..kPpykkkypPk...',
  '..kPpyyyyypPk...',
  '..kPpppppppPk...',
  '..kPPPPPPPPPk...',
  '..kwwwwwwwwwk...',
  '..kkkkkkkkkkk...',
];

const clover = [
  '................',
  '...kkk..kkk.....',
  '..kllLkkLllk....',
  '..klllLLlllk....',
  '..kLllLLllLk....',
  '...kLLLLLLk.....',
  '..kLllLLllLk....',
  '..klllLLlllk....',
  '..kllLkkLllk....',
  '...kkk.kkkbk....',
  '..........kbk...',
  '...........kbk..',
  '............kk..',
];

const crown = [
  '................',
  '................',
  '...k...k...k....',
  '..kyk.kyk.kyk...',
  '..kyykyyykyyk...',
  '..kyyyyyyyyyk...',
  '..kyryycyyryk...',
  '..kYYYYYYYYYk...',
  '..kkkkkkkkkkk...',
];

const apple = [
  '................',
  '.......k.kk.....',
  '.......kkLLk....',
  '......kbkLk.....',
  '...kkkkbkkkk....',
  '..krrwrrrrrrk...',
  '.krwrrrrrrrrRk..',
  '.krwrrrrrrrrRk..',
  '.krrrrrrrrrRRk..',
  '.krrrrrrrrRRRk..',
  '..krrrrrrRRRk...',
  '...krrRkRRRk....',
  '....kkk.kkk.....',
];

const potion = [
  '................',
  '......kkkk......',
  '......kbbk......',
  '.......kk.......',
  '......kwgk......',
  '.....kwgggk.....',
  '....kwrrrrRk....',
  '...kwrrrrrrRk...',
  '...krwrrrrrRk...',
  '...krrrrrrRRk...',
  '....krrrrRRk....',
  '.....kkkkkk.....',
];

const stone = [
  '................',
  '.............w..',
  '............wyw.',
  '.............w..',
  '...kkkkkkkk.....',
  '..kggwggggGk....',
  '.kgwgggggGGGk...',
  '.kgggggGGGGdk...',
  '..kGGGGGddddk...',
  '...kkkkkkkkk....',
];

const feather = [
  '................',
  '...........kk...',
  '.........kkwwk..',
  '........kwwggk..',
  '.......kwwggk...',
  '......kwwggk....',
  '.....kwwggk.....',
  '....kwwggk......',
  '...kwwggk.......',
  '...kwggk........',
  '..kbkkk.........',
  '.kbk............',
  '.kk.............',
];

const scroll = [
  '................',
  '..kkkkkkkkkk....',
  '.kvVkvvvvvvvk...',
  '.kVkvvvvvvvvk...',
  '..kkvGGGGGvvk...',
  '...kvvvvvvvvk...',
  '...kvGGGGvvvk...',
  '...kvvvvvvvvk...',
  '...kvGGGGGvvk...',
  '...kvvvvvvvkkk..',
  '...kvvvvvvvkVvk.',
  '....kkkkkkkkkk..',
];

const fang = [
  '................',
  '.....kkkkkk.....',
  '....kwwwwwgk....',
  '....kwwwwwgk....',
  '....kwwwwggk....',
  '.....kwwwgk.....',
  '.....kwwggk.....',
  '......kwgk......',
  '......kwgk......',
  '.......kgk......',
  '.......kk.......',
  '........r.......',
  '........r.......',
  '.......rRr......',
  '........R.......',
];

const spikes = [
  '................',
  '.......k........',
  '......kgk.......',
  '..k..kgggk..k...',
  '..kk.kgwgk.kk...',
  '...kkgwgggkk....',
  '..kggwgggggGk...',
  'kkgggggggggGGkk.',
  '..kgggggggGGk...',
  '...kkgggGGkk....',
  '..kk.kgGGk.kk...',
  '..k..kgGGk..k...',
  '......kGk.......',
  '.......k........',
];

const amulet = [
  '................',
  '...k.......k....',
  '....k.....k.....',
  '.....k...k......',
  '......kkk.......',
  '.....kyyyk......',
  '....kywwwyk.....',
  '...kywcCcwyk....',
  '...kywCkCwyk....',
  '...kywcCcwyk....',
  '....kywwwyk.....',
  '.....kyyyk......',
  '......kkk.......',
];

const skull = [
  '................',
  '....kkkkkkk.....',
  '...kvvvvvvvk....',
  '..kvvvvvvvvvk...',
  '..kvkkvvvkkvk...',
  '..kvkkvvvkkvk...',
  '..kvvvvkvvvvk...',
  '...kvvvvvvvk....',
  '....kvkvkvk.....',
  '....kkkkkkk.....',
];

const cloak = [
  '................',
  '......kkkk......',
  '.....kKKKKk.....',
  '....kKKKKKKk....',
  '....kKkkkkKk....',
  '...kKKkkkkKKk...',
  '...kKKKkkKKKk...',
  '..kKKKKKKKKKKk..',
  '..kKPKKKKKKPKk..',
  '.kKKPKKKKKKPKKk.',
  '.kKKPKKKKKKPKKk.',
  '.kKKKKKKKKKKKKk.',
  '.kkKkKKkkKKkKkk.',
  '..k.k..kk..k.k..',
];

const star = [
  '.......k........',
  '......kyk.......',
  '......kyk.......',
  '.....kyyyk......',
  'kkkkkyywyykkkkk.',
  '.kyyyyywyyyyyk..',
  '..kyyyyyyyyyk...',
  '...kyyyyyyyk....',
  '...kyyyyyyyk....',
  '..kyyyykyyyyk...',
  '..kyyk...kyyk...',
  '.kyk.......kyk..',
  '.kk.........kk..',
];

const leaf = [
  '................',
  '..........kkkk..',
  '........kkLLLk..',
  '......kkLllLLk..',
  '.....kLlllLLk...',
  '....kLlllLLLk...',
  '...kLllLLLLk....',
  '...kLlLLLLk.....',
  '..kLLLLLkk......',
  '..kLLkkk........',
  '.kbk............',
  '.kk.............',
];

const icons = {
  sword, wand, garlic, lightning, heart, shield, boots, gauntlet, lens, hourglass,
  ring, book, clover, crown, apple, potion, stone, feather, scroll, fang, spikes,
  amulet, skull, cloak, star, leaf,
};

export default [
  ...Object.entries(icons).map(([name, rows]) => sprite(`icon_${name}`, 16, 16, [rows])),
  sprite('icon_phoenix', 16, 16, [recolor(feather, { w: 'y', g: 'o', b: 'R' })]),
];
