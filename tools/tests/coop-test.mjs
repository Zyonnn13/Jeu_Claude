// Test de bout en bout de la coopération locale : clavier + manettes simulées dans Chromium sans écran.
// Usage : npm run build && node tools/tests/coop-test.mjs [chemin/vers/dist/index.html] [--headed]
//
// Les manettes sont simulées en remplaçant navigator.getGamepads() (disposition standard, comme une
// manette Xbox) ; le clavier est piloté par Playwright. La simulation est accélérée avec game.step(dt).
// Affiche une liste PASS/FAIL et se termine avec le code 1 si un contrôle échoue.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const headed = args.includes('--headed');
const file = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(here, '../../dist/index.html'));
const url = `${pathToFileURL(file).href}?debug`;

// Boutons de la disposition standard.
const A = 0;
const Y = 3;
const START = 9;
const DOWN = 13;
const RIGHT = 15;
const COLORS = ['#ffd84a', '#6fe3f0', '#f070b0', '#8fd94f'];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

/** Script injecté avant le jeu : manettes simulées que le test peut brancher et manipuler. */
function fakeGamepads() {
  const pads = [null, null, null, null];
  const make = (index) => ({
    id: `Manette simulée ${index + 1} (STANDARD GAMEPAD Vendor: 045e Product: 02ea)`,
    index,
    connected: true,
    mapping: 'standard',
    timestamp: performance.now(),
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    axes: [0, 0, 0, 0],
  });
  window.__rumbles = [];
  window.__pads = {
    connect(i) {
      pads[i] = make(i);
    },
    disconnect(i) {
      pads[i] = null;
    },
    button(i, b, down) {
      pads[i].buttons[b] = { pressed: down, touched: down, value: down ? 1 : 0 };
      pads[i].timestamp = performance.now();
    },
    axes(i, x, y) {
      pads[i].axes = [x, y, 0, 0];
      pads[i].timestamp = performance.now();
    },
  };
  // Comme Chrome, getGamepads() renvoie des instantanés (4 emplacements, null si débranchée).
  const snapshot = (p) =>
    p && {
      ...p,
      buttons: p.buttons.map((b) => ({ ...b })),
      axes: [...p.axes],
      vibrationActuator: {
        type: 'dual-rumble',
        playEffect: (type, params) => {
          window.__rumbles.push({ index: p.index, type, ...params });
          return Promise.resolve('complete');
        },
      },
    };
  Object.defineProperty(Navigator.prototype, 'getGamepads', { configurable: true, value: () => pads.map(snapshot) });
}

const browser = await launchBrowser({ headless: !headed });
const errors = [];
let exitCode = 1;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  await page.addInitScript(fakeGamepads);
  await page.goto(url);
  await page.waitForFunction(() => window.game && document.querySelector('#ui .press-start'), null, { timeout: 30000 });

  // --- Outils -----------------------------------------------------------------

  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  /** Appui bref sur un bouton de manette (lu par Input.poll comme dans la boucle du jeu). */
  const tap = (pad, b) =>
    ev(({ pad, b }) => {
      window.__pads.button(pad, b, true);
      window.game.input.poll(1 / 60);
      window.__pads.button(pad, b, false);
      window.game.input.poll(1 / 60);
    }, { pad, b });
  const stick = (pad, x, y) =>
    ev(({ pad, x, y }) => {
      window.__pads.axes(pad, x, y);
      window.game.input.poll(1 / 60);
    }, { pad, x, y });
  /** Avance la simulation (entrées lues à chaque pas), par lots pour ne pas bloquer la page. */
  const sim = async (seconds) => {
    let left = Math.round(seconds * 60);
    while (left > 0) {
      const n = Math.min(600, left);
      left -= n;
      await ev((n) => {
        const g = window.game;
        for (let i = 0; i < n; i++) {
          g.input.poll(1 / 60);
          g.step(1 / 60);
        }
      }, n);
    }
  };
  const top = () =>
    ev(() => {
      const s = [...document.querySelectorAll('#ui > .screen')].pop();
      if (!s) return null;
      const cards = [...s.querySelectorAll('.choice-card')];
      return {
        cls: s.className,
        h2: s.querySelector('h2')?.textContent ?? '',
        accent: s.style.getPropertyValue('--accent').trim(),
        focus: cards.indexOf(document.activeElement),
        focusText: document.activeElement?.textContent ?? '',
        hints: [...s.querySelectorAll('.choice-hint')].filter((e) => e.offsetParent !== null).map((e) => e.textContent).join(' | '),
      };
    });
  const clickText = async (text, selector = 'button') => {
    const loc = page.locator(`#ui > .screen:not(.covered) ${selector}`, { hasText: text }).first();
    await loc.click();
    await wait(50);
  };
  const slots = () => ev(() => [...document.querySelectorAll('#ui .coop-slot:not(.empty)')].map((s) => ({ device: s.querySelector('.coop-device')?.textContent, hero: s.querySelector('.coop-buttons .btn')?.textContent, num: s.querySelector('.coop-num')?.textContent })));
  const heroes = () =>
    ev(() =>
      window.game.scene.world.heroes.map((h) => ({
        name: h.name,
        color: h.color,
        charName: h.character.name,
        x: h.x,
        y: h.y,
        hp: h.entity.hp,
        maxHp: h.maxHp,
        downed: h.downed,
        dead: h.entity.dead,
        alive: h.alive,
        progress: h.reviveProgress,
        sig: JSON.stringify({ w: h.inventory.weapons.map((w) => `${w.def.id}:${w.level}`), p: [...h.inventory.passives], r: h.relics.list().map((r) => `${r.def.id}x${r.count}`) }),
        relics: h.relics.list().reduce((n, r) => n + r.count, 0),
      })),
    );
  const world = (fn, arg) =>
    ev(
      ({ src, arg, argFn }) => new Function('w', 'g', 'arg', `return (${src})(w, g, arg);`)(window.game.scene.world, window.game, argFn ? new Function(`return (${argFn});`)() : arg),
      typeof arg === 'function' ? { src: fn.toString(), argFn: arg.toString() } : { src: fn.toString(), arg },
    );
  /**
   * Plus d'apparitions d'ennemis (ni dégâts, ni gemmes, ni coffres imprévus pendant les contrôles) ;
   * en mode Manches, la manche en cours ne se termine plus d'elle-même (seulement avec F2).
   */
  const calm = () =>
    world((w) => {
      w.director.updateSpawns = () => undefined;
      if (w.director.mode === 'waves') w.director.def = { ...w.director.def, duration: 1e6 };
    });
  /** Place les héros en ligne au centre de la caméra, sans ennemis ni objets au sol. */
  const regroup = () =>
    world((w) => {
      for (const e of w.enemies) if (!e.isProp) e.dead = true;
      for (const p of w.pickups) p.dead = true;
      w.bullets.length = 0;
      w.heroes.forEach((h, i) => {
        h.entity.x = w.camera.x + (i - (w.heroes.length - 1) / 2) * 30;
        h.entity.y = w.camera.y;
      });
    });
  /** Ennemi increvable et sans recul posé sur un héros (ses armes ne l'éloignent pas avant le contact). */
  const attacker = (w, h) => {
    const e = w.spawnEnemyById('zombie', h.x, h.y);
    e.hp = e.maxHp = 1e9;
    e.def = { ...e.def, knockbackResist: 1 };
    e.testTarget = h.index;
  };
  /** Avance de 0,1 s en gardant chaque attaquant collé à sa cible. */
  const fight = async () => {
    await world((w) => {
      for (const e of w.enemies) {
        if (e.testTarget === undefined) continue;
        e.x = w.heroes[e.testTarget].x;
        e.y = w.heroes[e.testTarget].y;
      }
    });
    await sim(0.1);
  };
  /** Laisse s'ouvrir l'écran de choix suivant et attend la fin du verrou anti-appui involontaire. */
  const nextChoice = async () => {
    await sim(2 / 60);
    await wait(400);
    return top();
  };
  const heroOfChoice = (t) => {
    const m = /Joueur (\d)/.exec(t?.h2 ?? '');
    return m ? Number(m[1]) - 1 : -1;
  };
  /** Choisit la première carte avec le périphérique du joueur concerné. */
  const pickWith = async (device) => {
    if (device === 'kb') await page.keyboard.press('Enter');
    else await tap(device, A);
    await wait(30);
  };
  /** Règle tous les choix en attente (chaque joueur avec son propre périphérique). */
  const resolveAll = async (devices, max = 12) => {
    let n = 0;
    for (; n < max; n++) {
      const t = await nextChoice();
      if (!t || !t.cls.includes('choice-screen')) break;
      await pickWith(devices[heroOfChoice(t)] ?? 'kb');
    }
    return n;
  };

  // --- 1. Menus jusqu'à l'écran de coopération -----------------------------------

  await page.keyboard.press('Enter');
  await wait(100);
  const afterTitle = await ev(() => document.querySelectorAll('#ui > .screen').length);
  check('Entrée sur l’écran-titre ouvre le menu principal (sans valider « Solo » au passage)', afterTitle === 1, `${afterTitle} écran(s)`);
  if (afterTitle > 1) await page.keyboard.press('Escape');
  await clickText('Multijoueur', '.menu-tile');
  await clickText('Coopération locale');
  check('Menu → Multijoueur → Coopération locale', (await top())?.h2 === 'Coopération locale');

  // --- 2. Rejoindre / changer de héros / retirer ---------------------------------

  await ev(() => [0, 1, 2, 3].forEach((i) => window.__pads.connect(i)));
  await clickText('Rejoindre au clavier');
  let s = await slots();
  check('Clavier rejoint via « Rejoindre au clavier »', s.length === 1 && s[0].device === 'Clavier', JSON.stringify(s));
  const kbBtnDisabled = await ev(() => [...document.querySelectorAll('#ui .screen-actions .btn')].find((b) => b.textContent === 'Rejoindre au clavier')?.classList.contains('is-disabled'));
  await clickText('Rejoindre au clavier');
  s = await slots();
  check('Le clavier ne peut pas rejoindre deux fois', kbBtnDisabled && s.length === 1);

  await tap(0, Y);
  s = await slots();
  check('Manette 1 rejoint avec Y → 2 joueurs', s.length === 2 && s[1].device === 'Manette 1', JSON.stringify(s));
  await tap(0, Y);
  check('Y à nouveau sur la manette 1 : pas de doublon', (await slots()).length === 2);
  await tap(1, Y);
  await tap(2, Y);
  s = await slots();
  check('Manettes 2 et 3 rejoignent → 4 joueurs', s.length === 4 && s[2].device === 'Manette 2' && s[3].device === 'Manette 3', JSON.stringify(s.map((x) => x.device)));
  await tap(3, Y);
  check('5e joueur refusé (4 maximum)', (await slots()).length === 4);
  await tap(1, START);
  check('Start d’une manette ne quitte pas le salon (les joueurs gardent leur place)', (await top())?.h2 === 'Coopération locale' && (await slots()).length === 4);
  const accents = await ev(() => [...document.querySelectorAll('#ui .coop-slot:not(.empty)')].map((el) => el.style.getPropertyValue('--accent')));
  check('Couleurs distinctes par emplacement', new Set(accents).size === 4 && accents.every((c, i) => c === COLORS[i]), accents.join(' '));

  // Changer de héros (emplacement 2) : la manette appuie deux fois sur A sur son bouton de héros.
  const before = (await slots()).map((x) => x.hero);
  await ev(() => document.querySelectorAll('#ui .coop-slot:not(.empty)')[1].querySelector('.coop-buttons .btn').focus());
  await tap(0, A);
  const once = (await slots()).map((x) => x.hero);
  await tap(0, A);
  const twice = (await slots()).map((x) => x.hero);
  check('Changer de héros d’un emplacement (A sur le bouton du héros)', once[1] !== before[1] && once[0] === before[0] && once[2] === before[2], `${before[1]} → ${once[1]}`);
  check('Le focus reste sur le bouton après le changement (2e appui = héros suivant)', twice[1] !== once[1] && twice[0] === before[0], `${once[1]} → ${twice[1]} ; J1 ${twice[0]}`);

  // Retirer l'emplacement 4.
  await page.locator('#ui .coop-slot:not(.empty)').nth(3).locator('.btn', { hasText: 'Retirer' }).click();
  s = await slots();
  check('Retirer un emplacement → 3 joueurs', s.length === 3 && s.map((x) => x.device).join() === 'Clavier,Manette 1,Manette 2', JSON.stringify(s.map((x) => x.device)));
  const chosen = (await slots()).map((x) => x.hero.replace(' ▸', ''));

  // --- 3. Lancer une partie en mode Manches ---------------------------------------

  await clickText('Choisir la carte et jouer');
  let t = await top();
  check('Écran de carte en mode Manches', t?.h2 === 'Choisissez la carte' && (await page.locator('#ui > .screen:not(.covered) .gold-display').textContent()) === 'Mode Manches');
  await tap(3, Y); // manette 4 : Y sur l'écran de carte ne doit pas ajouter de joueur caché
  await clickText('Commencer');
  await wait(100);
  let hs = await heroes();
  check('Partie lancée avec 3 héros', hs.length === 3, hs.map((h) => h.name).join(', '));
  check('Y sur l’écran de carte n’ajoute pas de joueur', hs.length === 3);
  check('Noms et couleurs distincts', hs.map((h) => h.name).join() === 'Joueur 1,Joueur 2,Joueur 3' && hs.every((h, i) => h.color === COLORS[i]));
  check('Héros choisis dans le salon', hs.map((h) => h.charName).join() === chosen.join(), `${hs.map((h) => h.charName).join(', ')} / ${chosen.join(', ')}`);
  check('Caméra partagée activée', await world((w) => w.setup.sharedCamera === true && w.director.mode === 'waves'));
  // Relèvements : PV au moment même (ensuite, soins et bonus peuvent les modifier).
  await world((w) => {
    window.__revives = [];
    w.events.on('player:revived', ({ hero, byTeammate }) => window.__revives.push({ index: hero.index, ratio: hero.entity.hp / hero.maxHp, byTeammate }));
  });
  const revives = () => ev(() => window.__revives.splice(0));
  const party = await ev(() => [...document.querySelectorAll('#hud .party-member')].map((p) => ({ name: p.querySelector('.party-name')?.textContent, accent: p.style.getPropertyValue('--accent') })));
  check('HUD : panneau d’équipe avec 3 membres colorés', party.length === 3 && party.every((p, i) => p.name === `Joueur ${i + 1}` && p.accent === COLORS[i]), JSON.stringify(party));
  await world((w) => {
    w.debugGodMode = true;
  });

  // --- 3 bis. 20 s de jeu réel (ennemis, gemmes) ; les choix éventuels sont réglés -----

  await page.keyboard.down('KeyD');
  await stick(0, -0.7, 0.7);
  await stick(1, 0, -1);
  for (let i = 0; i < 20; i++) {
    await sim(1);
    if ((await top())?.cls.includes('choice-screen')) {
      await ev(() => window.__pads.axes(0, 0, 0) || window.__pads.axes(1, 0, 0));
      await resolveAll(['kb', 0, 1]);
      await stick(0, -0.7, 0.7);
      await stick(1, 0, -1);
    }
  }
  await page.keyboard.up('KeyD');
  await stick(0, 0, 0);
  await stick(1, 0, 0);
  await resolveAll(['kb', 0, 1]);
  const real = await world((w) => ({ kills: w.run.kills, enemies: w.enemies.filter((e) => !e.isProp).length, time: w.time }));
  check('20 s de jeu à 3 : ennemis apparus et vaincus', real.kills > 0 && real.time > 15, JSON.stringify(real));
  await calm();

  // --- 4. Chaque périphérique déplace son propre héros ------------------------------

  const moved = async (label, start, stop, expect) => {
    await regroup();
    const a = await heroes();
    await start();
    await sim(0.5);
    await stop();
    await sim(2 / 60);
    const b = await heroes();
    const d = b.map((h, i) => ({ x: h.x - a[i].x, y: h.y - a[i].y }));
    const ok = d.every((v, i) => (i === expect.hero ? expect.test(v) : Math.hypot(v.x, v.y) < 0.5));
    check(label, ok, d.map((v) => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`).join(' '));
  };
  await moved('Clavier (D) → seul le héros 1 va à droite', () => page.keyboard.down('KeyD'), () => page.keyboard.up('KeyD'), { hero: 0, test: (v) => v.x > 20 && Math.abs(v.y) < 1 });
  await moved('Manette 1 (stick gauche) → seul le héros 2 va à gauche', () => stick(0, -1, 0), () => stick(0, 0, 0), { hero: 1, test: (v) => v.x < -20 && Math.abs(v.y) < 1 });
  await moved('Manette 2 (croix bas) → seul le héros 3 descend', () => ev(() => window.__pads.button(1, 13, true)), () => ev(() => window.__pads.button(1, 13, false)), { hero: 2, test: (v) => v.y > 20 && Math.abs(v.x) < 1 });
  // Petite dérive du stick de la manette 1 : sans effet sur le héros (zone morte).
  await moved('Dérive de stick (0.1) ignorée', () => stick(0, 0.1, 0.1), () => stick(0, 0, 0), { hero: -1, test: () => true });

  // --- 5. Caméra partagée : tout le monde reste à l'écran ---------------------------

  await regroup();
  await page.keyboard.down('KeyD');
  await stick(0, -1, 0);
  await sim(4);
  await page.keyboard.up('KeyD');
  await stick(0, 0, 0);
  const cam = await world((w) => ({ cx: w.camera.x, cy: w.camera.y, vw: w.viewW, vh: w.viewH, xs: w.heroes.map((h) => h.x), ys: w.heroes.map((h) => h.y) }));
  const inView = cam.xs.every((x, i) => Math.abs(x - cam.cx) <= cam.vw / 2 && Math.abs(cam.ys[i] - cam.cy) <= cam.vh / 2);
  const spread = cam.xs[0] - cam.xs[1];
  check('Caméra partagée : héros écartés retenus au bord de l’écran', inView && spread > cam.vw * 0.6 && spread <= cam.vw, `écart ${spread.toFixed(0)} / largeur ${cam.vw.toFixed(0)}`);

  // --- 6. Montée de niveau : chacun choisit avec son périphérique --------------------

  await regroup();
  await world((w) => w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[0]));
  const sig0 = (await heroes()).map((h) => h.sig);
  t = await nextChoice();
  check('Niveau : choix du joueur 1 en premier, à sa couleur', t?.cls.includes('choice-screen') && t.h2.startsWith('Joueur 1') && t.accent === COLORS[0], `${t?.h2} ${t?.accent}`);
  check('Indications du clavier pour le joueur 1', t?.hints.startsWith('Touches 1 à 4'), t?.hints);
  await tap(0, RIGHT);
  await tap(0, A);
  t = await top();
  check('Choix du joueur 1 : la manette 1 ne peut ni naviguer ni choisir', t?.h2.startsWith('Joueur 1') && t.focus === 0, `${t?.h2} focus=${t?.focus}`);
  await page.keyboard.press('ArrowRight');
  t = await top();
  const kbFocus = t?.focus;
  await page.keyboard.press('Enter');
  await wait(30);
  let h1 = await heroes();
  check('Choix du joueur 1 au clavier (flèche + Entrée)', kbFocus === 1 && h1[0].sig !== sig0[0] && h1[1].sig === sig0[1] && h1[2].sig === sig0[2], `focus=${kbFocus}`);

  t = await nextChoice();
  check('Niveau : puis le joueur 2, à sa couleur', t?.h2.startsWith('Joueur 2') && t.accent === COLORS[1], `${t?.h2} ${t?.accent}`);
  check('Indications de manette pour le joueur 2', t?.hints === 'Ⓐ choisir · Ⓨ relancer', t?.hints);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Digit2');
  await page.keyboard.press('Enter');
  await tap(1, A);
  await wait(30);
  t = await top();
  check('Choix du joueur 2 : ni le clavier ni la manette 2 ne choisissent à sa place', t?.h2.startsWith('Joueur 2') && t.focus === 0 && (await heroes())[1].sig === sig0[1], `${t?.h2} focus=${t?.focus}`);
  await tap(0, RIGHT);
  t = await top();
  const padFocus = t?.focus;
  await tap(0, A);
  await wait(30);
  h1 = await heroes();
  check('Choix du joueur 2 avec SA manette (croix + A)', padFocus === 1 && h1[1].sig !== sig0[1] && h1[2].sig === sig0[2], `focus=${padFocus}`);

  t = await nextChoice();
  check('Niveau : puis le joueur 3, à sa couleur', t?.h2.startsWith('Joueur 3') && t.accent === COLORS[2], `${t?.h2} ${t?.accent}`);
  // Le joueur 2 garde le stick incliné pendant que le joueur 3 choisit au stick.
  await stick(0, 1, 0);
  await stick(1, 1, 0);
  await stick(1, 0, 0);
  t = await top();
  const stickFocus = t?.focus;
  await stick(0, 0, 0);
  await tap(1, A);
  await wait(30);
  h1 = await heroes();
  check('Choix du joueur 3 au stick de SA manette (même si une autre manette est inclinée)', stickFocus === 1 && h1[2].sig !== sig0[2], `focus=${stickFocus}`);
  await sim(2 / 60);
  t = await top();
  const time0 = await world((w) => w.time);
  await sim(0.5);
  check('Après les 3 choix, la partie reprend', !t && (await world((w) => w.time)) > time0 + 0.4);

  // --- 7. Coffre ramassé par le joueur 2 ---------------------------------------------

  await regroup();
  await world((w, g) => {
    g.scene.debugKey({ code: 'F4' }); // coffre près du héros 1 (touche F4 du mode ?debug)
    const chest = w.pickups.find((p) => p.kind === 'chest');
    w.heroes[1].entity.x = chest.x;
    w.heroes[1].entity.y = chest.y;
  });
  t = await nextChoice();
  check('Coffre : choix du joueur 2, à sa couleur', t?.h2.startsWith('Joueur 2') && t.h2.includes('Coffre') && t.accent === COLORS[1], `${t?.h2} ${t?.accent}`);
  const sigC = (await heroes())[1].sig;
  await page.keyboard.press('Enter');
  await wait(30);
  const kbBlocked = (await top())?.h2.startsWith('Joueur 2');
  await tap(0, A);
  await wait(30);
  check('Coffre : seul le joueur 2 (manette 1) choisit', kbBlocked && (await heroes())[1].sig !== sigC);
  await resolveAll(['kb', 0, 1]);

  // --- 7 bis. Manette débranchée pendant le choix de son joueur : pas de blocage --------

  await world((w) => w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[0]));
  t = await nextChoice();
  await pickWith('kb');
  t = await nextChoice();
  const sigU = (await heroes())[1].sig;
  await ev(() => {
    window.__pads.disconnect(0);
    window.game.input.poll(1 / 60);
  });
  await page.keyboard.press('Enter');
  await wait(30);
  check('Manette 1 débranchée pendant son choix : le clavier peut choisir à sa place', t?.h2.startsWith('Joueur 2') && (await heroes())[1].sig !== sigU, t?.h2);
  await ev(() => {
    window.__pads.connect(0);
    window.game.input.poll(1 / 60);
  });
  await resolveAll(['kb', 0, 1]);
  await moved('Manette 1 rebranchée : elle déplace de nouveau le héros 2', () => stick(0, 1, 0), () => stick(0, 0, 0), { hero: 1, test: (v) => v.x > 20 });

  // --- 8. À terre et relevé -----------------------------------------------------------

  await regroup();
  await world((w, g) => {
    // Une annonce finit de s'effacer quand le joueur tombe : la nouvelle doit quand même s'afficher.
    g.hud.showBanner('Annonce précédente');
    document.querySelector('#hud .banner').getAnimations()[0].currentTime = 2050;
    w.debugGodMode = false;
    w.heroes.forEach((h, i) => (h.entity.invulnerable = i === 1 ? 0 : 999));
    w.heroes[1].entity.hp = 1;
    arg(w, w.heroes[1]);
  }, attacker);
  await ev(() => (window.__rumbles.length = 0));
  for (let i = 0; i < 20 && !(await heroes())[1].downed; i++) await fight();
  hs = await heroes();
  // Opacité maximale de l'annonce pendant 2 s (les images sont lentes sans carte graphique).
  let banner = { text: '', opacity: 0 };
  for (let k = 0; k < 20 && banner.opacity <= 0.9; k++) {
    await wait(100);
    const b = await ev(() => ({ text: document.querySelector('#hud .banner.show .banner-title')?.textContent ?? '', opacity: Number(getComputedStyle(document.querySelector('#hud .banner')).opacity) }));
    if (b.text === 'Joueur 2 est à terre !') banner = { text: b.text, opacity: Math.max(banner.opacity, b.opacity) };
  }
  check('Joueur 2 à terre (PV à 0) : bannière « à terre » visible', hs[1].downed && !hs[1].dead && hs[0].alive && hs[2].alive && banner.text === 'Joueur 2 est à terre !' && banner.opacity > 0.9, `« ${banner.text} », opacité max ${banner.opacity.toFixed(2)}`);
  const rumbles = await ev(() => window.__rumbles.map((r) => r.index));
  check('Vibration seulement sur la manette du joueur touché', rumbles.length > 0 && rumbles.every((i) => i === 0), JSON.stringify(rumbles));
  check('HUD : membre à terre signalé', (await ev(() => [...document.querySelectorAll('#hud .party-member')].map((p) => p.classList.contains('downed')))).join() === 'false,true,false');
  await world((w) => {
    for (const e of w.enemies) if (!e.isProp) e.dead = true;
  });
  // Un héros à terre ne bouge pas.
  const xDown = (await heroes())[1].x;
  await stick(0, 1, 0);
  await sim(0.5);
  await stick(0, 0, 0);
  check('Un héros à terre ne se déplace pas', Math.abs((await heroes())[1].x - xDown) < 0.01);
  // Le joueur 1 se tient à côté de lui : 2,5 s pour le relever.
  await world((w) => {
    w.heroes[0].entity.x = w.heroes[1].x + 10;
    w.heroes[0].entity.y = w.heroes[1].y;
  });
  await sim(1.5);
  const mid = (await heroes())[1];
  await sim(1.2);
  hs = await heroes();
  check('Relevé après ~2,5 s près de lui', mid.downed && mid.progress > 0.5 && hs[1].alive && !hs[1].downed, `progression à 1,5 s : ${mid.progress.toFixed(2)}`);
  const rv = await revives();
  check('Relevé par un coéquipier avec 35 % de ses PV', rv.length === 1 && rv[0].index === 1 && rv[0].byTeammate && Math.abs(rv[0].ratio - 0.35) < 0.01, JSON.stringify(rv));

  // --- 9. Pause (Start / Échap) ------------------------------------------------------

  await regroup();
  await world((w) => w.heroes.forEach((h) => (h.entity.invulnerable = 999)));
  await tap(1, START);
  t = await top();
  const tp = await world((w) => w.time);
  await sim(0.5);
  check('Start (manette 2) ouvre la pause et fige la partie', t?.cls.includes('pause') && (await world((w) => w.time)) === tp, t?.h2);
  await tap(1, START);
  check('Start à nouveau : reprise', !(await top()));
  await page.keyboard.press('Escape');
  t = await top();
  check('Échap ouvre la pause', t?.cls.includes('pause'));
  await page.keyboard.press('Escape');
  check('Échap à nouveau : reprise', !(await top()));
  await tap(0, START);
  await tap(0, A); // « Reprendre » a le focus
  check('Pause ouverte et reprise avec la manette 1 (A sur « Reprendre »)', !(await top()));

  // --- 10. Fin de manche : une relique chacun ; les héros à terre sont relevés --------

  await sim(2.5); // fin de l'introduction de la manche
  await world((w) => {
    w.heroes[2].entity.invulnerable = 0;
    w.heroes[2].entity.hp = 0;
    w.handleHeroDeath(w.heroes[2]);
  });
  check('Joueur 3 à terre avant la fin de manche', (await heroes())[2].downed);
  await revives();
  await page.keyboard.press('F2'); // fin de manche (mode ?debug)
  const relicsBefore = (await heroes()).map((h) => h.relics);
  const relicTitles = [];
  for (let i = 0; i < 20; i++) {
    t = await top();
    if (!t) {
      await sim(0.2);
      continue;
    }
    if (!t.cls.includes('choice-screen')) break;
    t = await nextChoice();
    const who = heroOfChoice(t);
    if (t.cls.includes('variant-relic')) relicTitles.push(`${who}:${t.accent}`);
    if (t.cls.includes('variant-relic') && who === 1) {
      // Le joueur 2 passe avec sa manette : croix jusqu'au bouton « Passer », puis A.
      await tap(0, DOWN);
      for (let k = 0; k < 3 && !(await top()).focusText.startsWith('Passer'); k++) await tap(0, RIGHT);
      const f = (await top()).focusText;
      await tap(0, A);
      relicTitles.push(`passe:${f}`);
    } else {
      await pickWith(['kb', 0, 1][who] ?? 'kb');
    }
    await sim(2 / 60);
    if (relicTitles.filter((r) => !r.startsWith('passe')).length >= 3 && !(await top())) break;
  }
  hs = await heroes();
  const relicOrder = relicTitles.filter((r) => !r.startsWith('passe'));
  check('Reliques : un choix par joueur, dans l’ordre, à sa couleur', relicOrder.join() === `0:${COLORS[0]},1:${COLORS[1]},2:${COLORS[2]}`, relicTitles.join(' '));
  check('Reliques obtenues (le joueur 2 a passé)', hs[0].relics === relicsBefore[0] + 1 && hs[1].relics === relicsBefore[1] && hs[2].relics === relicsBefore[2] + 1, `${relicsBefore} → ${hs.map((h) => h.relics)}`);
  const rv2 = await revives();
  check('Héros à terre relevé après les reliques (30 % PV)', hs[2].alive && rv2.length === 1 && rv2[0].index === 2 && !rv2[0].byTeammate && Math.abs(rv2[0].ratio - 0.3) < 0.01, JSON.stringify(rv2));
  check('Manche 2 commencée', (await world((w) => w.director.wave)) === 2);

  // --- 11. Tout le monde à terre → fin de partie → écran de résultat ------------------

  // Le joueur 1 tombe ; les deux autres s'éloignent : une flèche doit indiquer où il est.
  await regroup();
  await world((w) => {
    w.heroes.forEach((h) => (h.entity.invulnerable = 999));
    w.heroes[0].entity.invulnerable = 0;
    w.heroes[0].entity.hp = 0;
    w.handleHeroDeath(w.heroes[0]);
  });
  await stick(0, 1, 0);
  await stick(1, 1, 0);
  await sim(5);
  await stick(0, 0, 0);
  await stick(1, 0, 0);
  const arrows = await world((w, g) => {
    const r = g.scene.view.r;
    const draw = r.draw;
    let n = 0;
    r.draw = function (tex, ...rest) {
      if (tex === r.arrow) n++;
      return draw.call(this, tex, ...rest);
    };
    g.render();
    r.draw = draw;
    return { n, off: !w.isInView(w.heroes[0].x, w.heroes[0].y, -10) };
  });
  check('Joueur 1 à terre hors de l’écran : flèche vers lui', arrows.off && arrows.n === 1, JSON.stringify(arrows));

  await regroup();
  await world((w) => {
    w.heroes.forEach((h) => {
      h.entity.invulnerable = 0;
      h.entity.hp = 1;
      arg(w, h);
    });
  }, attacker);
  let state = '';
  for (let i = 0; i < 40; i++) {
    await fight();
    state = await world((w) => w.state);
    if (state !== 'playing') break;
  }
  hs = await heroes();
  check('Dernier héros tombé : fin de partie', state === 'dying' && hs.every((h) => !h.alive), `état ${state}`);
  await sim(2);
  t = await top();
  check('Écran de résultat « Vous avez succombé… »', t?.cls.includes('result') && t.h2 === 'Vous avez succombé…', t?.h2);
  await clickText('Rejouer');
  await wait(100);
  hs = await heroes();
  check('« Rejouer » relance la coop avec les mêmes joueurs', hs.length === 3 && (await world((w) => w.setup.sharedCamera && w.director.mode === 'waves')), hs.map((h) => h.name).join(', '));
  await calm();
  await moved('Nouvelle partie : la manette 2 déplace toujours le héros 3', () => stick(1, -1, 0), () => stick(1, 0, 0), { hero: 2, test: (v) => v.x < -20 });
  await page.keyboard.press('Escape');
  await clickText('Abandonner');
  await clickText('Vraiment abandonner');
  check('Abandon depuis la pause (clavier/souris) → résultat', (await top())?.h2 === 'Partie abandonnée');
  await clickText('Menu principal');

  // --- 12. Mode Survie à 4 joueurs (une manette en joueur 1) -------------------------

  await clickText('Multijoueur', '.menu-tile');
  await clickText('Coopération locale');
  await tap(2, Y);
  await clickText('Rejoindre au clavier');
  await tap(0, Y);
  await tap(1, Y);
  s = await slots();
  check('Nouveau salon : manette 3 en joueur 1, puis clavier, manettes 1 et 2', s.map((x) => x.device).join() === 'Manette 3,Clavier,Manette 1,Manette 2', s.map((x) => x.device).join());
  await clickText('Mode : Manches');
  await clickText('Choisir la carte et jouer');
  check('Écran de carte en mode Survie', (await page.locator('#ui > .screen:not(.covered) .gold-display').textContent()) === 'Mode Survie');
  await clickText('Commencer');
  await wait(100);
  hs = await heroes();
  check('Partie Survie lancée avec 4 héros', hs.length === 4 && (await world((w) => w.director.mode)) === 'survival');
  await calm();
  const devices = [2, 'kb', 0, 1];
  await world((w) => {
    w.debugGodMode = true;
  });
  await moved('Survie : la manette 3 déplace le joueur 1', () => stick(2, 0, 1), () => stick(2, 0, 0), { hero: 0, test: (v) => v.y > 20 });
  await moved('Survie : le clavier déplace le joueur 2', () => page.keyboard.down('KeyA'), () => page.keyboard.up('KeyA'), { hero: 1, test: (v) => v.x < -20 });
  await moved('Survie : la manette 2 déplace le joueur 4', () => stick(1, 0, -1), () => stick(1, 0, 0), { hero: 3, test: (v) => v.y < -20 });
  check('HUD : 4 membres', (await ev(() => document.querySelectorAll('#hud .party-member').length)) === 4);
  await world((w) => w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[1]));
  t = await nextChoice();
  check('Survie : choix du joueur 1 (manette 3)', t?.h2.startsWith('Joueur 1') && t.accent === COLORS[0]);
  await page.keyboard.press('Enter');
  await tap(0, A);
  await wait(30);
  check('Survie : le clavier et la manette 1 ne choisissent pas pour la manette 3', (await top())?.h2.startsWith('Joueur 1'));
  await tap(2, A);
  const n = await resolveAll(devices);
  check('Survie : les joueurs 2 à 4 choisissent chacun avec leur périphérique', n === 3 && !(await top()), `${n} choix`);
  await sim(3);
  await world((w) => w.grantRelicChoice());
  const nr = await resolveAll(devices);
  check('Survie : relique pour chacun', nr === 4 && (await heroes()).every((h) => h.relics === 1), `${nr} choix`);

  // Pause avec la manette 3, puis « Abandonner » confirmé (2 appuis sur A) avec la même manette.
  await tap(2, START);
  await page.locator('#ui > .screen:not(.covered) .btn', { hasText: 'Abandonner' }).focus();
  await tap(2, A);
  await tap(2, A);
  await wait(50);
  t = await top();
  check('Survie : abandon depuis la pause → résultat', t?.h2 === 'Partie abandonnée', t?.h2);
  await clickText('Menu principal');

  // --- 13. Non-régression solo : clavier ET manettes commandent le seul héros ----------

  await clickText('Solo', '.menu-tile');
  await clickText('Manches', '.mode-card');
  await clickText('Aldric', '.char-card');
  await clickText('Commencer');
  await wait(100);
  check('Solo : partie à 1 héros, sans panneau d’équipe', (await heroes()).length === 1 && (await ev(() => document.querySelectorAll('#hud .party-member').length)) === 0);
  await calm();
  await world((w) => {
    w.debugGodMode = true;
  });
  await moved('Solo : le clavier déplace le héros', () => page.keyboard.down('KeyD'), () => page.keyboard.up('KeyD'), { hero: 0, test: (v) => v.x > 20 });
  await moved('Solo : n’importe quelle manette déplace le héros', () => stick(2, 0, 1), () => stick(2, 0, 0), { hero: 0, test: (v) => v.y > 20 });
  const sigS = (await heroes())[0].sig;
  await world((w) => w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[0]));
  t = await nextChoice();
  check('Solo : titre du choix sans nom de joueur, indications selon le dernier périphérique', t?.h2 === 'Niveau supérieur !' && !t.accent, `${t?.h2} | ${t?.hints}`);
  await tap(3, A);
  await wait(30);
  const sigS2 = (await heroes())[0].sig;
  await world((w) => w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[0]));
  await nextChoice();
  await page.keyboard.press('Digit2');
  await wait(30);
  check('Solo : choix à la manette puis au clavier (touche 2)', sigS2 !== sigS && (await heroes())[0].sig !== sigS2 && !(await top()));
  await tap(0, START);
  check('Solo : Start ouvre la pause', (await top())?.cls.includes('pause'));
  await page.keyboard.press('Escape');
  check('Solo : Échap reprend', !(await top()));

  check('Aucune erreur de console ni de page', errors.length === 0, errors.slice(0, 5).join(' | '));
  exitCode = results.every((r) => r.ok) ? 0 : 1;
} catch (err) {
  console.error(err);
  check('Le test s’est déroulé jusqu’au bout', false, String(err?.message ?? err).split('\n')[0]);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} contrôles réussis${failed.length ? ` — échecs : ${failed.map((r) => r.name).join(' ; ')}` : ''}`);
process.exit(exitCode);
