// Usage : node tools/tests/survival-sim.mjs [--character mage] [--seed 1] [--danger 0] [--minutes 13]
//         [--mode survival|waves] [--profile habile|prudent] [--endless 60] [--ui-relic] [--shot prefixe] [--json fichier.json]
//
// Banc d'essai d'équilibrage : lance le vrai jeu (dist/index.html, à compiler avant avec `npm run build`)
// dans Chromium sans fenêtre, démarre une partie par programme et la fait jouer par un robot.
// La simulation avance en accéléré avec game.step(1/60), sans requestAnimationFrame ; Math.random est
// remplacé par un générateur à graine : une même commande rejoue exactement la même partie.
//
// Le robot joue « comme au clavier » : 8 directions (ou l'immobilité), une décision toutes les 0,2 s,
// et il ne voit que ce qui est à l'écran.
//  - Il note chaque direction selon le danger prévu sur ~0,5 s : ennemis (poursuite, élan des ruées),
//    projectiles ennemis, boss ; il préfère les zones dégagées et devient prudent quand ses PV baissent.
//  - Il ramasse gemmes (par paquets), coffres, poulets (quand il est blessé), aimants.
//  - Le chevalier reste à portée de lame (zone de frappe simulée) au lieu de fuir ; dagues et hache
//    sont orientées vers l'ennemi le plus proche juste avant de partir.
//  - Il résout chaque choix (niveau, coffre, relique) avec les offres du jeu (GameScene.offersFor) :
//    évolution > arme possédée > nouvelle arme (jusqu'à 4) > passif d'évolution > passifs > reliques par rareté.
//  Profils : « habile » (par défaut) ramasse activement l'expérience ; « prudent » fuit davantage et laisse
//  plus de gemmes au sol (proche d'un joueur moyen).
//
// Options :
//  --character  knight | mage | rogue | dwarf | priestess | alchemist
//  --seed       graine de la partie (et de Math.random, pour des parties reproductibles)
//  --danger     niveau de danger (0 à 5)
//  --minutes    durée maximale de jeu simulée (temps de partie)
//  --mode       survival (par défaut) ou waves (mode Manches, pour comparer)
//  --endless N  après la victoire : « Continuer en mode infini » pendant N secondes, puis abandon
//               (0 : « Terminer et encaisser »)
//  --god        invincibilité (outil de test du jeu) : sert à vérifier le déroulé de la fin
//  --reaper-hp  multiplicateur appliqué aux PV de La Faucheuse à son apparition (test du déroulé)
//  --log        intervalle (s) entre deux lignes de journal
//  --json       écrit le résumé de la partie dans ce fichier
//  --shot       captures d'écran (Faucheuse, victoire, résultat, relique) : préfixe des fichiers .png
//  --ui-relic   les reliques passent par le vrai écran de choix (clic sur la première carte)
//  --profile    habile (par défaut) ou prudent
//  --bot JSON   poids du robot (voir BOT plus bas), --debug : position et gemmes dans le journal
//
// Exemples :
//  node tools/tests/survival-sim.mjs --character knight --seed 3
//  node tools/tests/survival-sim.mjs --character mage --profile prudent --danger 3
//  node tools/tests/survival-sim.mjs --mode waves --minutes 20 --character priestess   (comparaison avec les Manches)
//  node tools/tests/survival-sim.mjs --endless 60 --ui-relic --shot fin                  (déroulé complet de la fin)
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser } from './browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// --- Arguments ---------------------------------------------------------------
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const opts = {
  character: String(arg('character', 'mage')),
  seed: Number(arg('seed', 1)),
  danger: Number(arg('danger', 0)),
  minutes: Number(arg('minutes', 13)),
  mode: String(arg('mode', 'survival')),
  biome: String(arg('biome', 'cemetery')),
  endless: Number(arg('endless', 0)),
  god: arg('god', false) === true,
  reaperHp: Number(arg('reaper-hp', 1)),
  logEvery: Number(arg('log', 30)),
  debug: arg('debug', false) === true,
  uiRelic: arg('ui-relic', false) === true,
  profile: String(arg('profile', 'habile')),
  bot: arg('bot', null) ? JSON.parse(String(arg('bot', '{}'))) : null,
};
if (!['habile', 'prudent'].includes(opts.profile)) {
  console.error(`Profil inconnu : ${opts.profile} (habile ou prudent)`);
  process.exit(1);
}
const jsonOut = arg('json', null);
const shotPrefix = arg('shot', null);

const page_ = resolve(root, 'dist/index.html');
if (!existsSync(page_)) {
  console.error('dist/index.html absent : lancez d’abord `npm run build`.');
  process.exit(1);
}

const browser = await launchBrowser();

let exitCode = 0;
try {
  // 1280×720 : zoom ×2, soit 640×360 unités de monde visibles (comme en 1920×1080).
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[erreur page]', e.message));
  // Math.random déterministe (particules, IA...) pour des parties reproductibles.
  await page.addInitScript(() => {
    // La boucle requestAnimationFrame du jeu pourra être coupée (y compris l'image déjà programmée).
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => {
      if (!window.__noLoop) cb(t);
    });
    let s = 1;
    window.__seedRandom = (seed) => (s = (seed * 2654435761) >>> 0 || 1);
    Math.random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.goto(pathToFileURL(page_).href + '?debug');
  await page.waitForFunction(() => !!window.game && !document.getElementById('loading'), null, { timeout: 60000 });

  await page.evaluate(installSim, opts);
  const t0 = Date.now();
  let summary = null;
  for (;;) {
    const r = await page.evaluate(() => window.__sim.run(900));
    for (const line of r.logs) console.log(line);
    if (r.screen && shotPrefix) {
      await page.waitForTimeout(800); // fin des fondus CSS
      await page.evaluate(() => window.game.render());
      await page.screenshot({ path: `${shotPrefix}-${r.screen}.png` });
    }
    if (r.done) {
      summary = r.summary;
      break;
    }
    // Écran de choix réel : il est verrouillé 350 ms (temps réel) après son ouverture.
    if (r.wait) await page.waitForTimeout(100);
  }
  summary.realSeconds = Math.round((Date.now() - t0) / 1000);
  console.log('RESULT ' + JSON.stringify(summary));
  if (jsonOut) writeFileSync(String(jsonOut), JSON.stringify(summary, null, 2));
} catch (err) {
  console.error(err);
  exitCode = 1;
} finally {
  await browser.close();
}
process.exit(exitCode);

// ---------------------------------------------------------------------------
// Code exécuté dans la page : démarrage de la partie, robot, choix, journal.
function installSim(opts) {
  const game = window.game;
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const round = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

  // La boucle requestAnimationFrame est coupée : seul le robot fait avancer la partie.
  window.__noLoop = true;
  // Réglages sans effet sur les règles : moins de particules, pas de chiffres de dégâts.
  const s = game.save.data.settings;
  s.graphics.particles = 'low';
  s.gameplay.damageNumbers = false;
  s.gameplay.autoPause = false;
  s.graphics.corpses = false;
  // Le robot remplace le clavier.
  let botMove = { x: 0, y: 0 };
  game.input.vectorFor = () => botMove;

  // Graine fixée juste avant la partie (le menu a déjà consommé un nombre variable de tirages).
  window.__seedRandom(opts.seed);
  game.startRun({
    mode: opts.mode,
    biome: opts.biome,
    danger: opts.danger,
    mutators: [],
    players: [{ name: 'Bot', character: opts.character, control: { type: 'any' } }],
    seed: opts.seed,
  });

  const scene = game.scene;
  const world = scene.world;
  const hero = world.heroes[0];
  const dir = world.director;
  const survival = opts.mode === 'survival';
  const melee = { knight: 22 }[opts.character] ?? 0;
  if (opts.god) world.debugGodMode = true;

  const logs = [];
  const summary = {
    character: opts.character,
    profile: opts.profile,
    seed: opts.seed,
    danger: opts.danger,
    mode: opts.mode,
    death: null,
    victory: null,
    level: {},
    hp: {},
    subBoss: null,
    reaper: null,
    relics: [],
    waves: [],
    damageTaken: 0,
    healed: 0,
    waveHeal: 0,
    endless: null,
    screens: [],
    save: null,
  };
  const clock = () => (survival ? dir.elapsed : world.time);
  const log = (text) => logs.push(`[${fmt(clock())}] ${text}`);
  const weaponsText = () => hero.inventory.weapons.map((w) => `${w.def.id}${w.def.evolved ? '★' : w.level}`).join(',');
  const passivesText = () => [...hero.inventory.passives].map(([id, l]) => `${id}${l}`).join(',');
  const groundXp = () => world.pickups.reduce((n, p) => n + (p.kind === 'gem' && !p.dead ? p.value : 0), 0);
  const aliveCount = () => world.enemies.reduce((n, e) => n + (!e.dead && !e.isProp ? 1 : 0), 0);

  // --- Événements de la partie ---
  let hurtWindow = 0;
  let healWindow = 0;
  let reaperHp = null;
  const ev = world.events;
  ev.on('player:hurt', ({ amount }) => {
    hurtWindow += amount;
    if (reaperHp && !reaperHp.dead) summary.reaper.hurt += amount;
    summary.damageTaken += amount;
  });
  ev.on('boss:spawn', ({ enemy }) => {
    if (enemy.def.id === 'reaper' && opts.reaperHp !== 1) {
      enemy.hp = enemy.maxHp = Math.round(enemy.maxHp * opts.reaperHp);
    }
    const others = aliveCount() - 1;
    log(`BOSS ${enemy.def.name} apparaît (PV ${enemy.maxHp}, autres ennemis vivants : ${others}, niveau ${world.run.level}, PV héros ${Math.round(hero.entity.hp)}/${Math.round(hero.maxHp)})`);
    if (enemy.def.id === 'reaper') {
      summary.reaper = { spawn: round(clock(), 1), hp: enemy.maxHp, othersAtSpawn: others, level: world.run.level, heroHp: Math.round(hero.entity.hp), killed: null, fight: null, minHpPct: 100, hurt: 0, heroMinHp: Math.round(hero.entity.hp), heroMaxHp: Math.round(hero.maxHp) };
      reaperHp = enemy;
      reaperShotAt = clock() + 4;
    } else if (survival) {
      summary.subBoss = { id: enemy.def.id, spawn: round(clock(), 1), hp: enemy.maxHp, killed: null, fight: null };
    }
  });
  ev.on('boss:phase', ({ enemy, phase }) => log(`${enemy.def.name} : phase ${phase} (${Math.round((100 * enemy.hp) / enemy.maxHp)}% PV)`));
  ev.on('boss:defeated', ({ enemy, fightTime }) => {
    log(`BOSS ${enemy.def.name} vaincu en ${round(fightTime, 1)} s`);
    const rec = enemy.def.id === 'reaper' ? summary.reaper : survival ? summary.subBoss : null;
    if (rec) {
      rec.killed = round(clock(), 1);
      rec.fight = round(fightTime, 1);
    }
  });
  ev.on('survival:milestone', ({ text }) => log(`Étape : ${text}`));
  ev.on('weapon:evolved', ({ from, into }) => log(`Évolution : ${from} → ${into}`));
  ev.on('player:revived', () => log('Résurrection !'));
  ev.on('wave:start', ({ wave }) => {
    if (survival) return;
    const rec = { wave, time: round(world.time), level: world.run.level, hp: Math.round(hero.entity.hp), maxHp: Math.round(hero.maxHp), relics: relicCount(), waveHeal: Math.round(summary.waveHeal) };
    summary.waves.push(rec);
    log(`Manche ${wave} : niveau ${rec.level}, PV ${rec.hp}/${rec.maxHp}, reliques ${rec.relics}, soins de manche cumulés ${rec.waveHeal}`);
  });
  const relicCount = () => [...hero.relics.owned.values()].reduce((a, b) => a + b, 0);

  // Soin de fin de manche (mode Manches) : mesuré autour de relicResolved.
  const relicResolved = world.relicResolved.bind(world);
  world.relicResolved = () => {
    const before = hero.entity.hp;
    relicResolved();
    summary.waveHeal += Math.max(0, hero.entity.hp - before);
  };

  // --- Choix automatiques ---
  const PASSIVE_PREF = { heart: 30, shield: 28, ring: 27, hourglass: 25, gauntlet: 22, apple: 20, lens: 16, boots: 15, magnet: 12, book: 10, crown: 8, clover: 6 };
  const WEAPON_PREF = { garlic: 30, lightning: 28, axe: 26, wand: 25, orbs: 24, boomerang: 22, flask: 20, knives: 18, sword: 15 };
  const RARITY = { legendary: 400, epic: 300, rare: 200, common: 100 };
  const RELIC_PREF = {
    phoenixFeather: 60, divineAegis: 55, kingsCrown: 50, arcaneEcho: 50, shadowCloak: 45, quiver: 40, brokenHourglass: 35, giantPotion: 35,
    mossHeart: 40, feast: 35, vampireFang: 30, thornMail: 25, hawkEye: 20, luckyCharm: 10, griffinFeather: 10,
    vitalFlask: 30, thickHide: 28, whetstone: 25, nimbleHands: 25, prism: 15, lightBoots: 15, oldScroll: 10, lodestone: 8, goldTooth: 0,
  };
  function score(offer) {
    const inv = hero.inventory;
    const id = offer.key.slice(2);
    const hpRatio = hero.entity.hp / hero.maxHp;
    switch (offer.kind) {
      case 'evolution':
        return 1000;
      case 'weapon':
        if (inv.getWeapon(id)) return 500 + (id === hero.character.startWeapon ? 20 : 0);
        return inv.weapons.length < 4 ? 400 + (WEAPON_PREF[id] ?? 0) : 40;
      case 'passive': {
        const owned = inv.passiveLevel(id) > 0;
        const evolves = inv.weapons.some((w) => w.def.evolution?.passive === id);
        if (evolves) return owned ? 320 : 450;
        return (owned ? 250 : 200) + (PASSIVE_PREF[id] ?? 0);
      }
      case 'relic':
        return RARITY[offer.rarity] + (RELIC_PREF[id] ?? 0);
      case 'heal':
        return hpRatio < 0.5 ? 600 : 20;
      default:
        return 10;
    }
  }
  function resolveChoice(req) {
    const kind = req.type;
    // Comme GameScene.openLocalChoice : l'or du coffre, puis les offres du jeu.
    if (kind === 'chest') world.addGold(10 + world.director.wave * 4, hero);
    const offers = scene.offersFor(kind, hero);
    let best = null;
    for (const o of offers) if (!best || score(o) > score(best)) best = o;
    if (best) {
      best.apply();
      if (kind === 'relic') {
        summary.relics.push({ at: round(clock()), id: best.key.slice(2), rarity: best.rarity });
        log(`Relique : ${best.name} (${best.rarity}) parmi ${offers.map((o) => o.key.slice(2)).join(', ')}`);
      }
    } else if (kind === 'relic') {
      world.addGold(10 * world.director.wave, hero);
    }
    if (kind === 'relic') world.relicResolved();
  }

  // --- Robot de déplacement ---
  // Poids du robot (ajustables avec --bot '{"crowd":0.2}').
  // every : pas de simulation entre deux décisions (12 = 0,2 s, un temps de réaction humain) ;
  // dirs : directions possibles (8 = clavier).
  // decay : portée (px) de la peur d'un ennemi proche ; crowd : aversion pour les foules.
  const PROFILES = { habile: {}, prudent: { decay: 6, crowd: 0.3 } };
  const BOT = { every: 12, dirs: 8, crowd: 0.05, crowdR: 160, gem: 2, gemMax: 6, decay: 3, aim: 2, melee: 3, ...PROFILES[opts.profile], ...(opts.bot ?? {}) };
  const DIRS = [{ x: 0, y: 0 }];
  for (let i = 0; i < BOT.dirs; i++) DIRS.push({ x: Math.cos((i / BOT.dirs) * Math.PI * 2), y: Math.sin((i / BOT.dirs) * Math.PI * 2) });
  const TIMES = [0.1, 0.25, 0.45];
  const TW = [1, 0.8, 0.6];
  const PR = 6;
  let lastDir = DIRS[0];

  /** Vitesse et durée de la ruée d'un ennemi (0 s'il n'en fait pas). */
  function dash(e) {
    const b = e.def.behavior;
    if (b === 'charger') return { speed: e.speed * 4.5, dur: 0.45 };
    if (b === 'reaper') return { speed: e.speed * (1 + 0.15 * (e.phase - 1)) * 4, dur: 0.55 };
    if (b === 'vampire') return { speed: e.speed * (e.phase >= 2 ? 1.3 : 1) * 5, dur: 0.5 };
    if (b === 'slimeKing') return { speed: 230, dur: 0.55 };
    return null;
  }
  function k(d, contact) {
    return d < 0 ? contact : 30 * Math.exp(-d / BOT.decay);
  }

  function decide() {
    if (!hero.alive) return { x: 0, y: 0 };
    const p = hero.entity;
    const hx = p.x;
    const hy = p.y;
    const speed = 75 * hero.stats.get('moveSpeed');
    const hpRatio = p.hp / hero.maxHp;
    // Le robot ne voit, comme un joueur, que ce qui est à l'écran.
    const visible = (x, y) => Math.abs(x - world.camera.x) < world.viewW / 2 + 8 && Math.abs(y - world.camera.y) < world.viewH / 2 + 8;
    const threats = [];
    let nearest = null;
    let nearestD = Infinity;
    for (const e of world.enemies) {
      if (e.dead || e.isProp) continue;
      const dx = e.x - hx;
      const dy = e.y - hy;
      const d2 = dx * dx + dy * dy;
      if (d2 > 260 * 260 || !visible(e.x, e.y)) continue;
      threats.push(e);
      if (!e.isBoss && d2 < nearestD) {
        nearestD = d2;
        nearest = e;
      }
    }
    const shots = world.bullets.filter((b) => !b.dead && (b.x - hx) ** 2 + (b.y - hy) ** 2 < 200 * 200 && visible(b.x, b.y));

    // Objet à ramasser le plus intéressant (les gemmes comptent avec leurs voisines).
    const gems = [];
    for (const pk of world.pickups) if (pk.kind === 'gem' && !pk.dead && !pk.attracted && visible(pk.x, pk.y)) gems.push(pk);
    let target = null;
    let targetValue = 0;
    let targetScore = 0;
    for (const pk of world.pickups) {
      if (pk.dead || pk.attracted) continue;
      const d = Math.hypot(pk.x - hx, pk.y - hy);
      if (!visible(pk.x, pk.y)) continue;
      let v = 0;
      if (pk.kind === 'chest') v = 8;
      else if (pk.kind === 'chicken') v = hpRatio < 0.85 ? 3 + 10 * (1 - hpRatio) : 0;
      else if (pk.kind === 'magnet') v = 4;
      else if (pk.kind === 'gem') {
        let cluster = 0;
        for (const g of gems) if ((g.x - pk.x) ** 2 + (g.y - pk.y) ** 2 < 50 * 50) cluster += g.value;
        v = Math.min(BOT.gemMax, BOT.gem + cluster / 6);
      } else if (pk.kind === 'bomb') v = 1;
      else v = 0.5;
      const sc = v / (1 + d / 80);
      if (sc > targetScore) {
        targetScore = sc;
        target = pk;
        targetValue = v;
      }
    }
    const targetD0 = target ? Math.hypot(target.x - hx, target.y - hy) : 0;

    const risk = Math.min(1.5, Math.max(0.6, 1.6 - hpRatio));
    // Dagues (direction du mouvement), lame et hache (côté où regarde le héros).
    let aimKnives = 0;
    let aimFacing = 0;
    let sword = null;
    for (const w of hero.inventory.weapons) {
      if (w.def.kind === 'sword') sword = w;
      if (w.timer > 0.25) continue;
      if (w.def.kind === 'knives') aimKnives = BOT.aim * (w.timer < 0.12 ? 3 : 1);
      else if (w.def.kind === 'axe') aimFacing = BOT.aim * 0.75;
    }
    // Lame : ennemis proches, testés contre la zone de frappe (devant, et derrière dès 2 frappes).
    const swordStats = sword ? sword.stats(world) : null;
    const close = sword ? threats.filter((e) => (e.x - hx) ** 2 + (e.y - hy) ** 2 < 70 * 70) : null;
    const aimNear = nearest && nearestD < 150 * 150 ? { x: nearest.x - hx, y: nearest.y - hy, d: Math.sqrt(nearestD) || 1 } : null;

    let best = DIRS[0];
    let bestScore = -Infinity;
    for (const c of DIRS) {
      let danger = 0;
      for (let ti = 0; ti < TIMES.length; ti++) {
        const t = TIMES[ti];
        const px = hx + c.x * speed * t;
        const py = hy + c.y * speed * t;
        let local = 0;
        for (const e of threats) {
          let ex = e.x;
          let ey = e.y;
          const da = e.isBoss || e.def.behavior === 'charger' ? dash(e) : null;
          if (da && e.state === 2) {
            const tt = Math.min(t, Math.max(0, e.stateTimer));
            ex += e.dirX * da.speed * tt;
            ey += e.dirY * da.speed * tt;
          } else if (da && e.state === 1 && t > e.stateTimer) {
            // La ruée partira vers la position du héros à la fin de l'élan.
            const st = Math.max(0, e.stateTimer);
            const ax = hx + c.x * speed * st - ex;
            const ay = hy + c.y * speed * st - ey;
            const al = Math.hypot(ax, ay) || 1;
            const tt = Math.min(t - st, da.dur);
            ex += (ax / al) * da.speed * tt;
            ey += (ay / al) * da.speed * tt;
          } else {
            const ax = px - ex;
            const ay = py - ey;
            const al = Math.hypot(ax, ay) || 1;
            const step = Math.min(al, e.speed * t);
            ex += (ax / al) * step;
            ey += (ay / al) * step;
          }
          const d = Math.hypot(px - ex, py - ey) - (e.radius + PR - 2);
          const w = (0.5 + e.damage / 10) * (e.isBoss ? 3 : 1);
          local += w * k(d, 50);
        }
        for (const b of shots) {
          if (b.age + t >= b.life) continue;
          const d = Math.hypot(px - (b.x + b.vx * t), py - (b.y + b.vy * t)) - (b.radius + PR + 1);
          local += (1 + b.damage / 10) * k(d, 60);
        }
        danger += local * TW[ti];
      }
      // Préférence pour les zones dégagées (évite de se laisser encercler).
      const fx = hx + c.x * speed * 0.45;
      const fy = hy + c.y * speed * 0.45;
      let crowd = 0;
      for (const e of threats) {
        const d = Math.hypot(e.x - fx, e.y - fy);
        if (d < BOT.crowdR) crowd += (0.5 + e.damage / 10) * (e.isBoss ? 4 : 1) / (1 + (d / 45) ** 2);
      }
      // Prise de risque : prudence accrue quand les PV baissent.
      let sc = -(danger + crowd * BOT.crowd) * risk;
      if (target) sc += targetValue * ((targetD0 - Math.hypot(target.x - fx, target.y - fy)) / (speed * 0.45));
      // Mêlée : rester à portée de lame de l'ennemi le plus proche, tourné vers lui.
      if (melee && nearest) {
        const d = Math.hypot(nearest.x - fx, nearest.y - fy);
        sc += 2.5 * Math.exp(-((d - melee) ** 2) / (2 * 14 * 14));
      }
      if (swordStats && close.length) {
        const t = 0.2;
        const px = hx + c.x * speed * t;
        const py = hy + c.y * speed * t;
        const facing = Math.abs(c.x) > 0.15 ? Math.sign(c.x) : p.facing;
        const width = 32 * swordStats.area;
        const half = 8 * swordStats.area;
        let hits = 0;
        for (const e of close) {
          const ax = px - e.x;
          const ay = py - e.y;
          const al = Math.hypot(ax, ay) || 1;
          const step = Math.min(al, e.speed * t);
          const dx = e.x + (ax / al) * step - px;
          const dy = e.y + (ay / al) * step - py;
          for (let i = 0; i < Math.min(2, swordStats.amount); i++) {
            const side = (i === 0 ? 1 : -1) * facing;
            if (dx * side > 2 - e.radius && dx * side < width + 2 + e.radius && Math.abs(dy + 3) < half + e.radius) hits++;
          }
        }
        sc += BOT.melee * Math.min(5, hits) * (sword.timer < 0.4 ? 1 : 0.4);
      }
      // Armes orientées : se tourner vers l'ennemi le plus proche juste avant qu'elles frappent.
      if (aimNear && c !== DIRS[0]) {
        if (aimKnives) sc += aimKnives * Math.max(0, (c.x * aimNear.x + c.y * aimNear.y) / aimNear.d);
        if (aimFacing && Math.abs(c.x) > 0.15 && Math.sign(c.x) === Math.sign(aimNear.x)) sc += aimFacing;
      }
      if (c === lastDir) sc += 0.3;
      if (sc > bestScore) {
        bestScore = sc;
        best = c;
      }
    }
    lastDir = best;
    return { x: best.x, y: best.y };
  }

  // --- Boucle ---
  let steps = 0;
  let nextLog = opts.logEvery;
  let lastHp = hero.entity.hp;
  let lastMax = hero.maxHp;
  let finished = false;
  let endlessStart = null;
  let endlessPeak = 0;
  let deathLogged = false;
  let pendingShot = null;
  let uiChoice = null;
  let shotRelic = false;
  let waiting = false;
  let reaperShotAt = null;
  const marks = [180, 300, 480, 600];

  function snapshotSave() {
    const st = game.save.data.stats;
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem('nuit-eternelle-save-v1') ?? 'null')?.stats ?? null;
    } catch {
      stored = null;
    }
    return { runs: st.runs, wins: st.wins, bestSurvivalTime: round(st.bestSurvivalTime, 1), bossKills: { ...st.bossKills }, storedWins: stored?.wins, storedBest: stored ? round(stored.bestSurvivalTime, 1) : null };
  }

  function handleUi() {
    const top = game.ui.top;
    if (!top) return;
    const el = top.el;
    const click = (label) => {
      const b = [...el.querySelectorAll('button')].find((x) => x.textContent.includes(label));
      if (!b) throw new Error(`Bouton « ${label} » introuvable`);
      b.click();
    };
    if (el.classList.contains('victory-screen')) {
      if (summary.victory === null) {
        summary.victory = round(clock(), 1);
        summary.screens.push('victoire');
        log(`VICTOIRE — écran « ${el.querySelector('h2')?.textContent} » ; boutons : ${[...el.querySelectorAll('button')].map((b) => b.textContent).join(' | ')}`);
        pendingShot = 'victoire';
        return;
      }
      if (opts.endless > 0) {
        click('Continuer en mode infini');
        endlessStart = clock();
        log(`Mode infini : « ${dir.hud().hint} »`);
      } else {
        click('Terminer et encaisser');
      }
    } else if (el.classList.contains('choice-screen')) {
      if (!opts.uiRelic || !el.classList.contains('variant-relic')) throw new Error('Écran de choix inattendu (le robot résout les choix directement)');
      if (!uiChoice) {
        uiChoice = { at: Date.now(), hp: hero.entity.hp };
        const cards = [...el.querySelectorAll('.choice-card')].map((c) => c.querySelector('.choice-name')?.textContent);
        log(`Écran de relique : « ${el.querySelector('h2')?.textContent} » — « ${el.querySelector('.choice-subtitle')?.textContent} » — ${cards.join(', ')}`);
        if (!shotRelic) {
          shotRelic = true;
          pendingShot = 'relique';
        }
        return;
      }
      if (Date.now() - uiChoice.at < 450) {
        waiting = true;
        return;
      }
      el.querySelector('.choice-card').click();
      summary.relics.push({ at: round(clock()), id: 'ui', rarity: null });
      uiChoice.clicked = true;
    } else if (el.classList.contains('result')) {
      summary.screens.push('résultat');
      const rows = [...el.querySelectorAll('.result-row')].map((r) => [...r.children].map((c) => c.textContent.trim()).join(' : '));
      log(`ÉCRAN DE RÉSULTAT « ${el.querySelector('h2')?.textContent} » — ${el.querySelector('.result-sub')?.textContent} — ${rows.join(' · ')}`);
      summary.save = snapshotSave();
      log(`Sauvegarde : ${JSON.stringify(summary.save)}`);
      pendingShot = 'resultat';
      finished = true;
    } else if (el.textContent.includes('Abandonner')) {
      click('Abandonner la partie');
      click('Vraiment abandonner'); // confirmation
    }
  }

  function track() {
    const p = hero.entity;
    // Soins reçus (hors hausse de PV max).
    const max = hero.maxHp;
    const gain = p.hp - lastHp - Math.max(0, max - lastMax);
    if (gain > 0) {
      healWindow += gain;
      summary.healed += gain;
    }
    lastHp = p.hp;
    lastMax = max;
    const t = clock();
    for (const m of marks) {
      if (t >= m && summary.level[m] === undefined) {
        summary.level[m] = world.run.level;
        summary.hp[m] = `${Math.round(p.hp)}/${Math.round(max)}`;
      }
    }
    if (reaperShotAt !== null && t >= reaperShotAt) {
      reaperShotAt = null;
      pendingShot = 'faucheuse';
    }
    if (reaperHp && !reaperHp.dead) {
      summary.reaper.minHpPct = Math.min(summary.reaper.minHpPct, Math.round((100 * reaperHp.hp) / reaperHp.maxHp));
      summary.reaper.heroMinHp = Math.min(summary.reaper.heroMinHp, Math.max(0, Math.round(p.hp)));
    }
    if (world.state !== 'playing' && !deathLogged) {
      deathLogged = true;
      summary.death = round(t, 1);
      log(`MORT à ${fmt(t)} — niveau ${world.run.level}, armes ${weaponsText()}, ${aliveCount()} ennemis vivants`);
    }
    if (t >= nextLog) {
      nextLog += opts.logEvery;
      let line = `niv ${world.run.level} · PV ${Math.round(p.hp)}/${Math.round(max)} · ennemis ${aliveCount()} · kills ${world.run.kills} · gemmes au sol ${groundXp()} xp · subis ${Math.round(hurtWindow)} · soins ${Math.round(healWindow)} · difficulté ${dir.wave} · armes ${weaponsText()} · passifs ${passivesText()}`;
      if (opts.debug) {
        // Ennemi le plus proche, position, distances des gemmes au sol, direction choisie.
        const g = world.pickups.filter((q) => q.kind === 'gem' && !q.dead).map((q) => Math.round(Math.hypot(q.x - p.x, q.y - p.y)));
        g.sort((a, b) => a - b);
        const ne = world.nearestEnemy(p.x, p.y, 999);
        line += ` · proche ${ne ? `${Math.round(ne.x - p.x)},${Math.round(ne.y - p.y)}` : '-'} · facing ${p.facing} · pos ${Math.round(p.x)},${Math.round(p.y)}`;
        line += ` · gemmes ${g.slice(0, 8).join('/')} · move ${botMove.x.toFixed(2)},${botMove.y.toFixed(2)}`;
      }
      if (reaperHp && !reaperHp.dead) line += ` · Faucheuse ${Math.round((100 * reaperHp.hp) / reaperHp.maxHp)}% (phase ${reaperHp.phase})`;
      log(line);
      hurtWindow = 0;
      healWindow = 0;
    }
    if (endlessStart !== null) {
      endlessPeak = Math.max(endlessPeak, aliveCount());
      if (t - endlessStart >= opts.endless && !game.ui.isOpen && world.state === 'playing') {
        summary.endless = { duration: round(t - endlessStart, 1), peakAlive: endlessPeak, alive: aliveCount(), kills: world.run.kills, hint: dir.hud().hint };
        log(`Fin du mode infini : ${JSON.stringify(summary.endless)} → pause, abandon`);
        endlessStart = null;
        scene.openPause();
      }
    }
  }

  function tick() {
    if (game.ui.isOpen) {
      handleUi();
      if (game.ui.isOpen || finished) return;
    }
    if (uiChoice?.clicked) {
      log(`Relique choisie dans l'interface ; PV ${Math.round(uiChoice.hp)} → ${Math.round(hero.entity.hp)}/${Math.round(hero.maxHp)}`);
      uiChoice = null;
    }
    const auto = opts.uiRelic ? ['levelup', 'chest'] : ['levelup', 'chest', 'relic'];
    while (world.uiQueue.length && auto.includes(world.uiQueue[0].type)) resolveChoice(world.uiQueue.shift());
    if (steps % BOT.every === 0) botMove = decide();
    game.step(1 / 60);
    steps++;
    track();
    if (world.time > opts.minutes * 60 && !finished && !game.ui.isOpen && world.state === 'playing') {
      log(`Durée maximale atteinte (${opts.minutes} min) → abandon`);
      scene.openPause();
    }
  }

  window.__sim = {
    run(n) {
      waiting = false;
      for (let i = 0; i < n && !finished && !waiting; i++) {
        tick();
        if (pendingShot) break;
      }
      const out = { logs: logs.splice(0), done: finished, wait: waiting, screen: pendingShot, summary: finished ? summary : null };
      pendingShot = null;
      return out;
    },
  };
}
