// Personnages jouables (16x16, cycle de marche en 4 images, orientés vers la droite).
import { sprite, walk4 } from './lib.mjs';

const knight = walk4(
  [
    '................',
    '......rr........',
    '.....rRrr.......',
    '.....kkkkkk.....',
    '....kggggwgk....',
    '....kgggggwk....',
    '....kGgkkkkk....',
    '....kGgggggk....',
    '.....kkkkkk.....',
    '....kgCCCCgk....',
    '...kgkCyyCkgk...',
    '...kGkCCCCkGk...',
    '....kkCnnCkk....',
    '.....kGkkGk.....',
    '.....kdk.kdk....',
    '.....kk..kk.....',
  ],
  ['.....kGkkGk.....', '....kdk..kdk....', '....kk....kk....'],
  ['.....kGkkGk.....', '.....kdkkdk.....', '.....kdkkdk.....', '.....kkkkkk.....'],
);

const mage = walk4(
  [
    '......kk........',
    '.....kpPk.......',
    '.....kppPk......',
    '....kpppPPk.....',
    '....kpyyyPk.....',
    '..kkkkkkkkkkk...',
    '....kBBssssk....',
    '....kBsssksk....',
    '....kBBssssk....',
    '.....kPpppk.....',
    '....kPppspk.....',
    '....kPpppPk.....',
    '...kPPppppPk....',
    '...kPpppppPPk...',
    '...kyyyyyyyyk...',
    '....kk...kk.....',
  ],
  ['...kPpppppPPk...', '..kyyyyyyyyk....', '...kk....kk.....'],
  ['...kPpppppPk....', '...kPpppppPPk...', '...kyyyyyyyyk...', '.....kk.kk......'],
);

const rogue = walk4(
  [
    '................',
    '......kkkkk.....',
    '.....kLLLLLk....',
    '....kLLLLLLLk...',
    '....kLLssssLk...',
    '....kLLssksk....',
    '....kLLsssssk...',
    '.....kLLLLLk....',
    '....keLLLLek....',
    '...keLsBBsLek...',
    '...keLLyLLLek...',
    '....keLLLLek....',
    '....kBBBBBBk....',
    '.....kBkkBk.....',
    '.....kBk.kBk....',
    '.....kk..kk.....',
  ],
  ['.....kBkkBk.....', '....kBk..kBk....', '....kk....kk....'],
  ['.....kBkkBk.....', '.....kBkkBk.....', '.....kBkkBk.....', '.....kkkkkk.....'],
);

const dwarf = walk4(
  [
    '................',
    '................',
    '..v..kkkkkk..v..',
    '..vkkggggggkkv..',
    '...kggggggggk...',
    '...kkkkkkkkkk...',
    '....kssssksk....',
    '...koSssssSok...',
    '...kooooooook...',
    '..kgkoooOoookgk.',
    '..kgkooOooOokgk.',
    '...kkbbbbbbkk...',
    '...kBbbYYbbBk...',
    '....kBBkkBBk....',
    '....kdk..kdk....',
    '....kk....kk....',
  ],
  ['....kBBkkBBk....', '...kdk....kdk...', '...kk......kk...'],
  ['....kBBkkBBk....', '.....kdkkdk.....', '.....kdkkdk.....', '.....kkkkkk.....'],
);

const priestess = walk4(
  [
    '....yyyyyy......',
    '...y......y.....',
    '....yyyyyy......',
    '.....kkkkk......',
    '....kyyyyyk.....',
    '....kyysssk.....',
    '...kyysssksk....',
    '...kyyssssk.....',
    '....kyyssk......',
    '....kwwwwwk.....',
    '...kwwgYgwwk....',
    '...kwsgYgwsk....',
    '...kwwgYgwwk....',
    '...kwwwYwwwk....',
    '..kwwwwYwwwwk...',
    '..kkkkkkkkkkk...',
  ],
  ['...kwwwYwwwk....', '...kwwwwYwwwwk..', '...kkkkkkkkkkk..'],
  ['...kwwgYgwwk....', '...kwwwYwwwk....', '...kwwwYwwwk....', '...kkkkkkkkk....'],
);

const alchemist = walk4(
  [
    '................',
    '....w..w.w......',
    '...wgwwgwww.....',
    '...kwwwwwwwk....',
    '...kSsssssk.....',
    '...kGGcGGcGk....',
    '...kSssssssk....',
    '....kSsskssk....',
    '.....kkkkkk.....',
    '....kbbBlbbk....',
    '...kbbbBbbbbk...',
    '...ksbbBlbbsk...',
    '....kbbBbbbk....',
    '.....kBkkBk.....',
    '.....kBk.kBk....',
    '.....kk..kk.....',
  ],
  ['.....kBkkBk.....', '....kBk..kBk....', '....kk....kk....'],
  ['.....kBkkBk.....', '.....kBkkBk.....', '.....kBkkBk.....', '.....kkkkkk.....'],
);

export default [
  sprite('knight', 16, 16, knight),
  sprite('mage', 16, 16, mage),
  sprite('rogue', 16, 16, rogue),
  sprite('dwarf', 16, 16, dwarf),
  sprite('priestess', 16, 16, priestess),
  sprite('alchemist', 16, 16, alchemist),
];
