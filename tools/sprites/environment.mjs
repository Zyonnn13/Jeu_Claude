// Décor des trois cartes : tuiles de sol procédurales, décalcomanies et accessoires.
import { sprite, rng, PALETTE, bottomAlign, raster, recolor } from './lib.mjs';

function noiseTile(seed, colors) {
  const rand = rng(seed);
  const pixels = [];
  for (let i = 0; i < 256; i++) {
    const r = rand();
    let acc = 0;
    let pick = colors[colors.length - 1][0];
    for (const [c, p] of colors) {
      acc += p;
      if (r < acc) {
        pick = c;
        break;
      }
    }
    pixels.push(pick);
  }
  return (x, y) => pixels[y * 16 + x];
}

/** Dallage de pierres (8x4) en quinconce, avec variations de teinte. */
function brickTile(seed, base, alt, mortar, light) {
  const rand = rng(seed);
  const shades = Array.from({ length: 16 }, () => (rand() < 0.35 ? alt : base));
  const speck = Array.from({ length: 256 }, () => rand());
  return (x, y) => {
    const row = Math.floor(y / 4);
    const offset = row % 2 ? 4 : 0;
    const bx = Math.floor((x + offset) / 8);
    if (y % 4 === 3 || (x + offset) % 8 === 7) return mortar;
    if (y % 4 === 0 && speck[y * 16 + x] < 0.5) return light;
    const c = shades[(row * 3 + bx) % 16];
    return speck[y * 16 + x] < 0.06 ? mortar : c;
  };
}

// --- Cimetière -------------------------------------------------------------

const grass = (seed, flecks) =>
  noiseTile(seed, [
    [PALETTE.T, flecks * 0.45],
    [PALETTE.q, flecks * 0.55],
    [PALETTE.t, 1],
  ]);

const flowers = ['................', '................', '...m............', '..mym.......w...', '...m.......wyw..', '...L........w...', '...L.....c..L...', '........cyc.....', '.........c......', '.........L......'];
const pebbles = ['................', '.....kk.........', '....kaaAk.......', '.....kkk....kk..', '...........kaAk.', '............kk..', '..kk............', '.kaAk...........', '..kk............'];
const tuft = ['................', '................', '................', '.....Q..Q.......', '......Qq.Q......', '...Q..qQqq..Q...', '....qqQqQqqQ....'];
const bones = ['................', '................', '...vv......vv...', '...vVv....vVv...', '.....vV..Vv.....', '......vVVv......', '......vVVv......', '.....vV..Vv.....', '...vVv....vVv...', '...vv......vv...'];
const mushroom = ['................', '.....kkkk.......', '....krwrrk......', '...krrrrwrk.....', '...kkkkkkkk.....', '.....kvvk.......', '.....kvVk.......', '.....kkkk.......'];

const tombstone = ['................', '.....kkkkkk.....', '....kaaaaaAk....', '...kaaaaaaaAk...', '...kaaaGaaaAk...', '...kaaGGGaaAk...', '...kaaaGaaaAk...', '...kaaaGaaaAk...', '...kaaaaaaaAk...', '...kaaaaaaaAk...', '...kAaaaaaAAk...', '..kkkkkkkkkkkk..', '..kqqtqqtqqtqk..', '...kkkkkkkkkk...'];
const cross = ['................', '.......kk.......', '......kbbk......', '......kbBk......', '...kkkkbBkkkk...', '...kbbbbbbbBk...', '...kBBBbBBBBk...', '...kkkkbBkkkk...', '......kbBk......', '......kbBk......', '......kbBk......', '.....kqbBqk.....', '....kqqtqqqk....', '.....kkkkkk.....'];
const bush = ['................', '................', '.....kkkk.......', '...kkeLLekkk....', '..keLLlLeLLek...', '.keLlLLLLlLLek..', '.kLLLLeLLLLLek..', 'keLlLLLLLeLLLek.', 'keLLLeLLLLLLLek.', '.keLLLLLLLeLek..', '..kkeeeeeeekk...', '....kkkkkkk.....'];
const deadTree = ['................................', '......k.........k.......k.......', '......kk.......kk......kk.......', '.......kk.....kBk....kBk........', '........kBk..kBk....kBk.........', '...k.....kBk.kBk...kBk......k...', '...kk.....kBkBBk..kBk......kk...', '....kBk....kBBBkkBBk......kBk...', '.....kBBk...kBBBBBk.....kBBk....', '.......kBBk..kBBBk....kBBk......', '.........kBBkkBBBk..kBBk........', '...........kBBBBBkkBBk..........', '............kBBBBBBBk...........', '.............kBBBBBk............', '.............kBbBBBk............', '.............kBbBBBk............', '.............kBbBBBk............', '............kBBbBBBBk...........', '............kBBbBBBBk...........', '...........kBBbBBBBBBk..........', '..........kBBkBbBBkBBBk.........', '.........kBk.kBbBBk.kBk.........', '.........kk..kkkkkk..kk.........'];
const lantern = ['.......kk.......', '......kGGk......', '.....kGGGGk.....', '.....kyyyyk.....', '.....kywyyk.....', '.....kyyyyk.....', '.....kGGGGk.....', '......kGGk......', '.......kGk......', '.......kGk......', '.......kGk......', '.......kGk......', '.......kGk......', '.......kGk......', '......kGGGk.....', '.....kkkkkkk....'];

// --- Forêt maudite ---------------------------------------------------------

const FOREST = ['#1b3632', '#14282a', '#264a40', '#33604a'];
const forestTile = (seed, moss) =>
  noiseTile(seed, [
    [FOREST[1], 0.14],
    [FOREST[2], 0.16],
    [FOREST[3], moss],
    [FOREST[0], 1],
  ]);
const mud = noiseTile(77, [
  ['#2a211a', 0.15],
  ['#45372a', 0.2],
  ['#372c22', 1],
]);

const fern = ['................', '................', '.......l........', '..l...lL...l....', '...L.lLe..L.....', '....LlLe.L......', '..llLLeeLL..l...', '....lLLeL..L....', '...l..LeLLL.....', '......LeL.......', '.......e........'];
const leaves = ['................', '...o............', '..oOo.......b...', '...o.......bBb..', '............b...', '.....y..........', '....yOy.....o...', '.....y.....oOo..', '............o...'];
const roots = ['................', '................', '.....B..........', '......BB...B....', '.......BBBB.....', '..BB....BB......', '....BBBBBBBB....', '.........B.BB...', '..........B.....'];
const glowshroom = ['................', '................', '................', '................', '................', '................', '.........kkk....', '........kcwck...', '........kkkkk...', '.........kuk....', '...kk....kuk....', '..kcck...kkk....', '..kkkk..........', '...ku...........', '...kk...........'];
const glowshrooms = ['................', '................', '................', '.....kkkk.......', '....kcwccck.....', '...kcccccCck....', '...kkkkkkkkk....', '......kuuk..kkk.', '..kkk.kuuk.kcwck', '.kcwck.kuk.kkkkk', '.kkkkk.kuk..kuk.', '..kuk..kuk..kuk.', '..kuk..kuk..kkk.', '..kuuk.kuuk.....', '.keeeekeeeek....'];
const stump = ['................', '................', '................', '................', '................', '................', '................', '....kkkkkkk.....', '...kbYbYbYbk....', '...kbbYbbYbk....', '...kBbbbbbBk....', '...kBbBbBbBk....', '...kBbBbBbBk....', '..kBBbBbBbBBk...', '.kBk.kBBBk.kBk..', '.kk...kkk...kk..'];
const rock = ['................', '................', '................', '................', '................', '................', '................', '......kkkkk.....', '....kkaaaaAk....', '...kaaLaaaAAk...', '..kaAaaaaAAAAk..', '..kaaaaAAAAAAk..', '.kaaaAAAAAAAAAk.', '.kAAAAAAAAAAAAk.', '..kkkkkkkkkkkk..'];
const pine = ['.......k........', '......kek.......', '......keLk......', '.....keeLk......', '.....keLLek.....', '....keeeLLk.....', '....keLeeLek....', '...keeeeLLLk....', '....kkeLLekk....', '...keeeeLLek....', '..keeLeeeLLLk...', '..keeeeLeeLLk...', '.keeeeeeeLLLLk..', '..kkkeeLLLkkk...', '...keeeeeeLLk...', '..keeLeeeeLLLk..', '.keeeeeLeeeLLLk.', 'keeeeeeeeeeLLLLk', '.kkkkkeeeLkkkkk.', '......kBBk......', '......kbBk......', '......kbBk......', '.....kkbBkk.....'];

/** Grand chêne feuillu dessiné à partir de formes. */
function oak() {
  const r = raster(32, 32);
  const rand = rng(9);
  r.rect(14, 20, 17, 30, 'B').rect(15, 20, 15, 30, 'b');
  r.line(13, 30, 11, 31, 'B').line(18, 30, 20, 31, 'B');
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    r.ellipse(16 + Math.cos(a) * 7, 12 + Math.sin(a) * 5, 6, 5, 'e');
  }
  r.ellipse(16, 12, 10, 8, 'e');
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * 32);
    const y = Math.floor(rand() * 24);
    if (r.get(x, y) === 'e') r.set(x, y, rand() < 0.5 ? 'L' : 'e');
  }
  r.ellipse(12, 8, 5, 3, 'L', (x, y) => r.get(x, y) !== '.');
  r.ellipse(11, 7, 2.5, 1.5, 'l', (x, y) => r.get(x, y) !== '.');
  r.outline('k');
  return r.rows();
}

// --- Château du Comte ------------------------------------------------------

const castleTile = (seed) => brickTile(seed, '#4b4559', '#554e64', '#29242f', '#625b74');
const castleDark = brickTile(91, '#37313f', '#3e3747', '#1f1b24', '#48405a');

const crack = ['................', '...K............', '....K...........', '....KK..........', '.....K.KK.......', '......K..K......', '......K...KK....', '.......K........'];
const rubble = ['................', '................', '....kk..........', '...kaAk....k....', '....kk....kak...', '...........k....', '.....k..........', '....kak...kk....', '.....k...kAAk...', '..........kk....'];
const blood = ['................', '................', '.....R..........', '....RrR..R......', '...RrrrRR.......', '....RrrrR..R....', '.....RRr........', '..R....R........'];

const pillar = (() => {
  const rows = ['...kkkkkkkkkk...', '...kgggggggGk...', '..kgggggggggGk..', '..kkkkkkkkkkkk..'];
  for (let i = 0; i < 22; i++) rows.push(i % 6 === 5 ? '....kgGgGgGk....' : '....kgGgGgGk....');
  rows.push('..kkkkkkkkkkkk..', '..kgggggggggGk..', '.kgggggggggggGk.', '.kGGGGGGGGGGGGk.', '.kkkkkkkkkkkkkk.');
  return rows;
})();
const candelabra = ['...o....o....o..', '..oyo..oyo..oyo.', '..kwk..kwk..kwk.', '..kwk..kwk..kwk.', '..kwk..kwk..kwk.', '.kYYYk.kYk.kYYYk', '..kYk..kYk..kYk.', '..kYkkkkYkkkkYk.', '...kYYYYYYYYYk..', '....kkkkYkkkk...', '.......kYk......', '.......kYk......', '.......kYk......', '.......kYk......', '.......kYk......', '.......kYk......', '......kYYYk.....', '.....kYYYYYk....', '....kkkkkkkkk...'];
const statueBody = ['................', '......kk........', '.....kgkk.......', '.....kkkkkk.....', '....kggggggk....', '....kgggggGk....', '....kGgkkkkk....', '....kGgggggk....', '.....kkkkkk.....', '....kgGGGGgk....', '...kgkGggGkgk...', '...kGkGGGGkGk...', '....kkGddGkk....', '.....kGkkGk.....', '.....kdk.kdk....', '.....kk..kk.....'];
const statue = [...statueBody.slice(1), '..kkkkkkkkkkkk..', '..kgggggggggGk..', '..kgGGGGGGGGGk..', '..kgGGGGGGGGGk..', '..kGGGGGGGGGGk..', '..kkkkkkkkkkkk..'];
const brokenCol = ['................', '................', '................', '................', '................', '......k.k.......', '.....kgkgk......', '....kgggggk.....', '....kgGgGgk.....', '....kgGgGgk.....', '....kgGgGgk.....', '....kgGgGgk..k..', '...kkkkkkkkkkgk.', '..kgggggggggGgk.', '..kGGGGGGGGGGGk.', '..kkkkkkkkkkkkk.'];

export default [
  // Cimetière
  sprite('grass_0', 16, 16, [grass(11, 0.18)]),
  sprite('grass_1', 16, 16, [grass(23, 0.26)]),
  sprite('grass_2', 16, 16, [grass(37, 0.1)]),
  sprite('dirt', 16, 16, [noiseTile(5, [['#3a3226', 0.12], ['#54473a', 0.18], ['#473c30', 1]])]),
  sprite('deco_flowers', 16, 16, [flowers]),
  sprite('deco_pebbles', 16, 16, [pebbles]),
  sprite('deco_tuft', 16, 16, [tuft]),
  sprite('deco_bones', 16, 16, [bones]),
  sprite('deco_mushroom', 16, 16, [mushroom]),
  sprite('prop_tombstone', 16, 16, [tombstone]),
  sprite('prop_cross', 16, 16, [cross]),
  sprite('prop_bush', 16, 16, [bush]),
  sprite('prop_tree', 32, 32, [deadTree]),
  sprite('prop_lantern', 16, 16, [lantern]),
  // Forêt maudite
  sprite('forest_0', 16, 16, [forestTile(101, 0.03)]),
  sprite('forest_1', 16, 16, [forestTile(113, 0.1)]),
  sprite('forest_2', 16, 16, [forestTile(127, 0.2)]),
  sprite('mud', 16, 16, [mud]),
  sprite('deco_fern', 16, 16, [fern]),
  sprite('deco_leaves', 16, 16, [leaves]),
  sprite('deco_roots', 16, 16, [roots]),
  sprite('deco_glowshroom', 16, 16, [glowshroom]),
  sprite('prop_glowshrooms', 16, 16, [glowshrooms]),
  sprite('prop_stump', 16, 16, [stump]),
  sprite('prop_rock', 16, 16, [rock]),
  sprite('prop_pine', 16, 32, [bottomAlign(pine, 32)]),
  sprite('prop_oak', 32, 32, [oak()]),
  // Château du Comte
  sprite('castle_0', 16, 16, [castleTile(201)]),
  sprite('castle_1', 16, 16, [castleTile(211)]),
  sprite('castle_2', 16, 16, [castleTile(223)]),
  sprite('castle_dark', 16, 16, [castleDark]),
  sprite('deco_crack', 16, 16, [crack]),
  sprite('deco_rubble', 16, 16, [rubble]),
  sprite('deco_blood', 16, 16, [blood]),
  sprite('prop_pillar', 16, 32, [bottomAlign(pillar, 32)]),
  sprite('prop_candelabra', 16, 32, [bottomAlign(candelabra, 32)]),
  sprite('prop_statue', 16, 32, [bottomAlign(statue, 32)]),
  sprite('prop_brokencol', 16, 16, [brokenCol]),
];

export { recolor };
