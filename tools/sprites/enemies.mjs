// Ennemis (16x16, 4 images d'animation, orientés vers la droite).
import { sprite, patch, shift, recolor, bob4 } from './lib.mjs';

const batUp = [
  '................',
  '................',
  '................',
  'kk............kk',
  'kPk..k....k..kPk',
  'kPPk.kk..kk.kPPk',
  'kPPPkPPkkPPkPPPk',
  '.kPPPPPPPPPPPPk.',
  '..kkPPrPPrPPkk..',
  '....kPPPPPPk....',
  '.....kwkkwk.....',
  '......k..k......',
];
const batMid = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....k....k.....',
  '.....kk..kk.....',
  'kkk.kPPkkPPk.kkk',
  'kPPkPPPPPPPPkPPk',
  '.kPPPPrPPrPPPPk.',
  '..kkkPPPPPPkkk..',
  '.....kwkkwk.....',
  '......k..k......',
];
const batDown = [
  '................',
  '................',
  '................',
  '................',
  '.....k....k.....',
  '.....kk..kk.....',
  '....kPPkkPPk....',
  '..kkPPPPPPPPkk..',
  '.kPPPPrPPrPPPPk.',
  'kPPPkPPPPPPkPPPk',
  'kPPk.kwkkwk.kPPk',
  'kPk...k..k...kPk',
  'kk............kk',
];

const slimeA = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '......kkkk......',
  '....kkllllkk....',
  '...kllwwlllLk...',
  '..klwlllllllLk..',
  '..klllkllkllLk..',
  '.kllllkllklllLk.',
  '.kllllllllllLLk.',
  '.kLlllllllllLLk.',
  '..kLLLLLLLLLLk..',
  '...kkkkkkkkkk...',
];
const slimeSquash = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......kkkk......',
  '...kkkllllkkk...',
  '..klwwlllllLLk..',
  '.klwllllllllLLk.',
  '.kllllkllklllLk.',
  'kllllllllllllLLk',
  'kLllllllllllLLLk',
  '.kLLLLLLLLLLLLk.',
  '..kkkkkkkkkkkk..',
];
const slimeStretch = [
  '................',
  '................',
  '................',
  '......kkkk......',
  '.....kllllk.....',
  '....klwwllLk....',
  '....klwlllLk....',
  '...klllllllLk...',
  '...kllkllklLk...',
  '...kllkllklLk...',
  '...klllllllLk...',
  '...kLllllllLk...',
  '...kLlllllLLk...',
  '....kLLLLLLk....',
  '.....kkkkkk.....',
];

const zombieA = [
  '................',
  '.....kkkkk......',
  '....kzzzzzk.....',
  '....kzzzzzzk....',
  '....kZzzkzzk....',
  '....kZzzzzRk....',
  '.....kZZzzk.....',
  '....kBnnnnkkkk..',
  '...kBnnnnnzzzzk.',
  '...kBnnnnnkkkk..',
  '...kBnnnnnk.....',
  '....kbbbbk......',
  '....kBkkBk......',
  '....kZk.kZk.....',
  '....kk..kk......',
];
const zombieB = patch(zombieA, {
  7: '....kBnnnnk.....',
  8: '...kBnnnnnkkkk..',
  9: '...kBnnnnnzzzzk.',
  10: '...kBnnnnnkkkk..',
  13: '...kZk..kZk.....',
  14: '...kk....kk.....',
});

const skeletonA = [
  '................',
  '................',
  '.....kkkkk......',
  '....kvvvvvk.....',
  '....kvvvvvvk....',
  '....kvvkvvkk....',
  '....kVvvvvvk....',
  '.....kvkvkk.....',
  '....kkvvvkk.....',
  '...kv.kvk.vk....',
  '...kv.kvk.vk....',
  '...kk.kvk.kk....',
  '.....kVvVk......',
  '.....kvkvk......',
  '.....kvkvk......',
  '.....kkkkk......',
];
const skeletonB = patch(skeletonA, {
  9: '....kvkvkvk.....',
  10: '...kv.kvk.vk....',
  13: '....kvk.kvk.....',
  14: '....kvk.kvk.....',
  15: '....kk...kk.....',
});

const ghostA = [
  '................',
  '................',
  '......kkkk......',
  '....kkuuuukk....',
  '...kuuuuuuuuk...',
  '..kuuhuuuuuuUk..',
  '..kuhuukuukuUk..',
  '..kuuuukuukuUk..',
  '..kuuuuuuuuuUk..',
  '..kuuuuukkuuUk..',
  '..kuuuuuuuuuUk..',
  '..kUuuuuuuuUUk..',
  '..kUUuUUuUUuUk..',
  '..kUk.kUk.kUk...',
  '...k...k...k....',
];
const ghostB = patch(shift(ghostA, 0, -1), {
  12: '..kUUUuUUuUUUk..',
  13: '...kUk.kUk.kUk..',
  14: '....k...k...k...',
});
const ghostC = patch(shift(ghostA, 0, -2), {
  11: '..kUUuUUuUUuUk..',
  12: '..kUk.kUk.kUk...',
  13: '...k...k...k....',
});

const eyeA = [
  '................',
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkwwwwwwkk...',
  '..kwwwwwRwwwgk..',
  '..kwwwrrrrwwgk..',
  '.kwwwrrkkrrwwgk.',
  '.kwRwrrkkrrwwgk.',
  '..kwwwrrrrwwgk..',
  '..kwwwwwwwRwgk..',
  '...kkgwwwwgkk...',
  '.....kkkkkk.....',
  '......R..R......',
  '.....R....R.....',
];
const eyeB = patch(eyeA, {
  6: '..kwwwwrrrrwgk..',
  7: '.kwwwwrrkkrrwgk.',
  8: '.kwRwwrrkkrrwgk.',
  9: '..kwwwwrrrrwgk..',
  13: '.....R....R.....',
  14: '......R..R......',
});

const cultistA = [
  '................',
  '......kkk.......',
  '.....kRRRk......',
  '....kRRRRRk.....',
  '....kRkkkRRk....',
  '....kRkykyRk....',
  '....kRkkkkRk....',
  '...kRRRRRRRRk...',
  '...kRrRRRRrRk...',
  '..kRRrRRRRrRRk..',
  '..kRRrRyyRrRRk..',
  '..kRRRRRRRRRRk..',
  '..kRRRRRRRRRRk..',
  '...kRRRRRRRRk...',
  '...kkkkkkkkkk...',
];
const cultistB = recolor(patch(cultistA, { 10: '..kRRrRooRrRRk..', 13: '..kRRRRRRRRRk...', 14: '..kkkkkkkkkkk...' }), { y: 'o' });

const golemA = [
  '................',
  '.....kkkkkk.....',
  '....kgggggGk....',
  '....kgcggcGk....',
  '....kGggggGk....',
  '..kkkkgggGkkkk..',
  '.kgggkGgggkgggk.',
  '.kgGgkggLLkgGgk.',
  '.kGGgkgLggkgGGk.',
  '.kkkkkGgggkkkkk.',
  '..kGk.kGGk.kGk..',
  '....kGggggGk....',
  '....kGgkkgGk....',
  '....kggk.kggk...',
  '...kGGGk.kGGGk..',
  '...kkkkk.kkkkk..',
];
const golemB = patch(golemA, {
  13: '....kggk..kggk..',
  14: '...kGGGk..kGGk..',
  15: '...kkkkk..kkkk..',
});

const spiderA = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.k...kkkkk...k..',
  '..k.kdddddk.k...',
  '...kdGdddddk....',
  'kkkkddddddddkkkk',
  '...kdrdddrdk....',
  '..k.kdddddk.k...',
  '.k...kkkkk...k..',
  'k.............k.',
];
const spiderB = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '..k..kkkkk..k...',
  '...kkdddddkk....',
  '...kdGdddddk....',
  '.kkkddddddddkkk.',
  'k..kdrdddrdk..k.',
  '...kkdddddkk....',
  '..k..kkkkk..k...',
  '.k..........k...',
];

const werewolfA = [
  '................',
  '.........k.k....',
  '........kBkBk...',
  '.......kbbbbbk..',
  '......kbbbrbbbk.',
  '......kbbbbbwwk.',
  '.....kkbbbkkwk..',
  '...kkbbbbbbkk...',
  '..kbbbbbbbbbk...',
  '..kbBbbbbbbbbk..',
  '..kbBbbbbbbkwk..',
  '...kbbbbbbk.....',
  '...kBbbbBk......',
  '...kbk.kbk......',
  '..kbk..kbk......',
  '..kk...kk.......',
];
const werewolfB = patch(werewolfA, {
  13: '...kbk..kbk.....',
  14: '...kbk..kbk.....',
  15: '...kk...kk......',
});

const armorA = [
  '................',
  '.....kkkkk......',
  '....kGGGGGk.....',
  '....kGdddGk.....',
  '....kGrdrGk.....',
  '....kGGGGGk.....',
  '.....kkkkk......',
  '...kGGgGGGGk.k..',
  '..kGGkgggkGGkYk.',
  '..kGkGgggGkGkgk.',
  '..kGkGgggGkGkgk.',
  '...kkGGGGGkkkgk.',
  '....kGGkGGk..gk.',
  '....kGk.kGk..k..',
  '....kdk.kdk.....',
  '....kk..kk......',
];
const armorB = patch(armorA, {
  13: '...kGk..kGk..k..',
  14: '...kdk..kdk.....',
  15: '...kk...kk......',
});

const brazierA = [
  '................',
  '........o.......',
  '.......oyo.o....',
  '......oyyyoyo...',
  '......oywyyo....',
  '.....kOyyyOk....',
  '....kGGGGGGGk...',
  '....kgGGGGGdk...',
  '.....kgGGGdk....',
  '......kGGdk.....',
  '.......kGk......',
  '.......kGk......',
  '.......kGk......',
  '.....kkGGGkk....',
  '....kGGGGGGdk...',
  '....kkkkkkkkk...',
];
const brazierB = patch(brazierA, { 1: '.......o........', 2: '....o.oyo.......', 3: '...oyoyyyo......', 4: '.....oyywyo.....' });
const brazierC = patch(brazierA, { 1: '.........o......', 2: '......oyoo......', 3: '.....oyyyyo.....', 4: '......oywyo.....' });
const brazierD = patch(brazierA, { 1: '......o.........', 2: '......oyo..o....', 3: '.....oyyyyoo....', 4: '.....oyywyyo....' });

const STONE = { P: 'G', r: 'y', w: 'g' };

export default [
  sprite('bat', 16, 16, [batUp, batMid, batDown, batMid]),
  sprite('slime', 16, 16, [slimeA, slimeSquash, slimeA, slimeStretch]),
  sprite('zombie', 16, 16, bob4(zombieA, zombieB)),
  sprite('skeleton', 16, 16, bob4(skeletonA, skeletonB)),
  sprite('ghost', 16, 16, [ghostA, ghostB, ghostC, ghostB]),
  sprite('eye', 16, 16, [eyeA, shift(eyeA, 0, -1), eyeB, shift(eyeB, 0, -1)]),
  sprite('cultist', 16, 16, bob4(cultistA, cultistB)),
  sprite('golem', 16, 16, bob4(golemA, golemB)),
  sprite('spider', 16, 16, [spiderA, shift(spiderB, 0, -1), spiderA, spiderB]),
  sprite('werewolf', 16, 16, bob4(werewolfA, werewolfB)),
  sprite('armorKnight', 16, 16, bob4(armorA, armorB)),
  sprite('gargoyle', 16, 16, [recolor(batUp, STONE), recolor(batMid, STONE), recolor(batDown, STONE), recolor(batMid, STONE)]),
  sprite('brazier', 16, 16, [brazierA, brazierB, brazierC, brazierD]),
];
