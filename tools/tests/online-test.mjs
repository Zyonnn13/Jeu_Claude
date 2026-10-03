// Test du multijoueur en ligne : deux navigateurs (hôte + invité) jouent ensemble via un serveur
// de mise en relation PeerJS local, en WebRTC réel.
// Usage : npm run build, puis node tools/tests/online-test.mjs [duo|groupe|hote]
// Le serveur de mise en relation local vient du paquet « peer » (outil du projet, installé par npm install).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser } from './browser.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 9123;

function load(ids) {
  for (const id of ids.filter(Boolean)) {
    try {
      return require(id);
    } catch {
      // module suivant
    }
  }
  throw new Error(`Module introuvable : ${ids[0]}`);
}
const { ExpressPeerServer } = load(['peer', process.env.PEER_MODULE]);
const express = load(['express', process.env.PEER_MODULE && path.join(process.env.PEER_MODULE, '../express')]);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

// Serveur de mise en relation local.
const app = express();
const server = http.createServer(app);
app.use('/', ExpressPeerServer(server, { path: '/' }));
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const page = pathToFileURL(path.join(ROOT, 'dist', 'index.html')).href;
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('Compilez d’abord le jeu : npm run build');
// Sans masquage mDNS des adresses locales, les navigateurs de la même machine se connectent directement.
const browser = await launchBrowser({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });

async function open(name, query) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && !/WebSocket|stun|ICE|GL Driver/i.test(m.text()) && errors.push(`[${name}] ${m.text()}`));
  await p.goto(`${page}?peer=127.0.0.1:${PORT}${query}`);
  await p.waitForFunction(() => !document.getElementById('loading'));
  await p.click('.press-start');
  await p.waitForSelector('.menu-tiles');
  return p;
}
const clickText = (p, text) => p.locator('#ui button', { hasText: text }).last().click();
const setName = async (p, name) => {
  const input = p.locator('.multiplayer input[type=text]:not(.code-input)');
  await input.fill(name);
  await input.dispatchEvent('change');
};
/** Attend qu'une condition évaluée dans la page devienne vraie. */
const until = (p, fn, arg, timeout = 15000) => p.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
/** État de l'interface, affiché quand une vérification échoue. */
const uiState = (p) =>
  p.evaluate(() => {
    const screens = [...document.querySelectorAll('#ui > *')].map((e) => e.className.split(' ').slice(0, 2).join('.'));
    const w = window.game.scene.world;
    return `écrans [${screens.join(', ')}] attente « ${document.querySelector('.net-wait')?.textContent ?? ''} » phase ${w?.director?.phase ?? w?.hud?.director?.timer ?? '?'}`;
  });

/** Crée un salon en ligne et renvoie son code. */
async function hostLobby(p, name) {
  await clickText(p, 'Multijoueur');
  await setName(p, name);
  await clickText(p, 'Créer une partie en ligne');
  await until(p, () => /^[A-Z0-9]{5}$/.test(document.querySelector('.lobby-code strong')?.textContent ?? ''));
  return p.textContent('.lobby-code strong');
}

/** Rejoint un salon depuis le menu principal. */
async function joinLobby(p, name, code) {
  await clickText(p, 'Multijoueur');
  await setName(p, name);
  await p.fill('.code-input', code);
  await clickText(p, 'Rejoindre');
}

/**
 * Choisit la première carte de l'écran de choix du dessus s'il est prêt. Renvoie l'identifiant du choix
 * traité (chez l'invité, le numéro de demande de l'hôte), ou null.
 */
async function pickTop(p, done) {
  const id = await p.evaluate(() => {
    const top = document.querySelector('#ui > .choice-screen:last-child');
    if (!top || top.classList.contains('locked') || !top.querySelector('.choice-card')) return null;
    if (!top.dataset.testId) top.dataset.testId = String(Math.random());
    return `${window.game.scene.choiceReq ?? ''}:${top.dataset.testId}:${top.className}`;
  });
  if (!id || done.has(id)) return null;
  done.add(id);
  await p.locator('#ui > .choice-screen:last-child .choice-card').first().click();
  return id;
}

const playerCount = (p) => p.evaluate(() => document.querySelectorAll('.lobby-player:not(.empty)').length);
const backToMenu = async (p) => {
  await clickText(p, 'Menu principal').catch(() => clickText(p, 'Retour au menu'));
  await p.waitForSelector('.menu-tiles');
};

// ---------------------------------------------------------------------------
// Scénario 1 : deux joueurs, du salon à la deuxième manche.
async function scenarioDuo() {
  console.log('\n— Scénario 1 : deux joueurs —');
  const host = await open('hôte', '&debug');
  const guest = await open('invité', '');

  // --- Salon ---------------------------------------------------------------
  await clickText(host, 'Multijoueur');
  await setName(host, 'Alice');
  await clickText(host, 'Créer une partie en ligne');
  const hosted = await until(host, () => /^[A-Z0-9]{5}$/.test(document.querySelector('.lobby-code strong')?.textContent ?? ''));
  check('L’hôte crée un salon avec un code à 5 caractères', hosted);
  const code = await host.textContent('.lobby-code strong');

  await clickText(guest, 'Multijoueur');
  await setName(guest, 'Bob');
  await guest.fill('.code-input', code.toLowerCase());
  await clickText(guest, 'Rejoindre');
  const joined = await until(guest, () => document.querySelectorAll('.lobby-player:not(.empty)').length === 2);
  check('L’invité rejoint avec le code (saisi en minuscules)', joined);
  await sleep(500);
  const hostNames = await host.$$eval('.lobby-player:not(.empty) .lp-name', (els) => els.map((e) => e.textContent));
  check('L’hôte voit exactement 2 joueurs', hostNames.length === 2 && hostNames[1] === 'Bob', hostNames.join(', '));

  await guest.fill('.lobby-chat input', 'Salut !');
  await guest.press('.lobby-chat input', 'Enter');
  await host.fill('.lobby-chat input', 'Bienvenue');
  await host.press('.lobby-chat input', 'Enter');
  const chatOk = await until(guest, () => [...document.querySelectorAll('.chat-line')].some((l) => l.textContent.includes('Bienvenue')));
  const chatOk2 = await until(host, () => [...document.querySelectorAll('.chat-line')].some((l) => l.textContent.includes('Salut !')));
  check('Discussion dans les deux sens', chatOk && chatOk2);

  await clickText(guest, 'Changer de héros');
  await guest.locator('.char-card:not(.locked)').nth(1).click();
  const heroOk = await until(host, () => document.querySelectorAll('.lobby-player')[1]?.textContent.includes('Mage') ?? false, undefined, 5000);
  check('Changement de héros de l’invité visible chez l’hôte', heroOk, (await host.locator('.lobby-player').nth(1).textContent()).slice(0, 40));

  await host.locator('.segmented button', { hasText: 'Survie 10 min' }).click();
  const modeOk = await until(guest, () => document.querySelector('.lobby-settings .seg.selected')?.textContent === 'Survie 10 min', undefined, 5000);
  check('Réglage du mode transmis à l’invité', modeOk);
  await host.locator('.segmented button', { hasText: 'Manches' }).click();

  const disabledBefore = await host.locator('#ui button', { hasText: 'En attente des joueurs prêts' }).count();
  await clickText(guest, 'Je suis prêt !');
  const readyOk = await until(host, () => [...document.querySelectorAll('#ui button')].some((b) => b.textContent === 'Lancer la partie'), undefined, 5000);
  check('« Prêt » débloque le lancement chez l’hôte', disabledBefore === 1 && readyOk);

  // --- Partie --------------------------------------------------------------
  await clickText(host, 'Lancer la partie');
  const started = await until(guest, () => (window.game.scene.world?.heroViews?.length ?? 0) === 2 && window.game.scene.world.enemies.length > 0, undefined, 20000);
  check('La partie démarre chez l’invité (2 héros, ennemis reçus)', started);

  const hx0 = await host.evaluate(() => window.game.scene.world.heroes[1].x);
  await guest.keyboard.down('KeyD');
  await sleep(1500);
  await guest.keyboard.up('KeyD');
  await sleep(300);
  const hx1 = await host.evaluate(() => window.game.scene.world.heroes[1].x);
  const h0moved = await host.evaluate(() => Math.abs(window.game.scene.world.heroes[0].entity.moving ? 1 : 0));
  check('Les commandes de l’invité déplacent son héros chez l’hôte', hx1 - hx0 > 60, `Δx = ${(hx1 - hx0).toFixed(1)}`);
  check('Le héros de l’hôte reste immobile', h0moved === 0);
  const pred = await guest.evaluate(() => {
    const w = window.game.scene.world;
    return { pred: w.predX, server: w.heroViews[w.localHeroIndex].x };
  });
  check('Prédiction locale de l’invité cohérente avec l’hôte', Math.abs(pred.pred - hx1) < 20, `prédit ${pred.pred.toFixed(1)}, hôte ${hx1.toFixed(1)}`);

  // Montée de niveau : chaque joueur choisit (l'invité sur son écran, l'hôte sur le sien).
  const before = await host.evaluate(() => {
    const h = window.game.scene.world.heroes[1];
    return h.inventory.weapons.length + h.inventory.passives.size;
  });
  await host.evaluate(() => {
    const w = window.game.scene.world;
    w.heroes[1].rerolls = 1;
    w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[0]);
  });
  const guestChoice = await until(guest, () => !!document.querySelector('.choice-screen .choice-card'), undefined, 8000);
  check('L’invité reçoit son choix de bonus', guestChoice);
  const rerollBtn = guest.locator('.choice-screen button', { hasText: 'Relancer' });
  await sleep(500);
  const namesBefore = await guest.$$eval('.choice-card .choice-name', (els) => els.map((e) => e.textContent).join('|'));
  await rerollBtn.click();
  const rerolled = await until(host, () => window.game.scene.world.heroes[1].rerolls === 0, undefined, 3000);
  await sleep(500);
  const namesAfter = await guest.$$eval('.choice-card .choice-name', (els) => els.map((e) => e.textContent).join('|'));
  const btnText = await rerollBtn.textContent();
  check('Relance du choix de l’invité', rerolled && btnText.includes('(0)'), `${namesBefore} → ${namesAfter}`);
  await sleep(400);
  await guest.locator('.choice-screen .choice-card').first().click();
  const hostChoice = await until(host, () => !!document.querySelector('.choice-screen .choice-card'), undefined, 5000);
  if (hostChoice) await host.locator('.choice-screen .choice-card').first().click();
  const applied = await until(host, (n) => {
    const h = window.game.scene.world.heroes[1];
    return h.inventory.weapons.length + h.inventory.passives.size > n || h.inventory.weapons.some((w) => w.level > 1);
  }, before, 5000);
  check('Le bonus choisi par l’invité est appliqué chez l’hôte', applied);
  const resumed = await until(guest, () => !document.querySelector('.choice-screen') && !document.querySelector('.net-wait'), undefined, 5000);
  check('La partie reprend chez l’invité après les choix', resumed, resumed ? '' : `invité : ${await uiState(guest)} · hôte : ${await uiState(host)}`);

  // Trois niveaux d'un coup : chacun reçoit ses choix un par un et la partie reprend ensuite.
  await host.evaluate(() => {
    const w = window.game.scene.world;
    for (let i = 0; i < 3; i++) w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[0]);
  });
  const doneGuest = new Set();
  const doneHost = new Set();
  let maxStack = 0;
  for (let i = 0; i < 120 && (doneGuest.size < 3 || doneHost.size < 3); i++) {
    maxStack = Math.max(maxStack, await guest.evaluate(() => document.querySelectorAll('#ui > .choice-screen').length));
    await pickTop(guest, doneGuest);
    await pickTop(host, doneHost);
    await sleep(200);
  }
  const allResolved = await until(host, () => window.game.scene.remoteChoices.size === 0 && window.game.scene.world.uiQueue.length === 0 && !document.querySelector('.choice-screen'), undefined, 5000);
  const guestFree = await until(guest, () => !document.querySelector('.choice-screen') && !document.querySelector('.net-wait'), undefined, 5000);
  check('Trois niveaux d’un coup : 3 choix chacun, un écran à la fois', doneGuest.size === 3 && doneHost.size === 3 && maxStack === 1 && allResolved && guestFree, `invité ${doneGuest.size}, hôte ${doneHost.size}, écrans empilés max ${maxStack}${allResolved && guestFree ? '' : ` · ${await uiState(guest)}`}`);

  // Charge : 500 ennemis de plus (F7 en mode ?debug) ; l'invité doit suivre.
  await host.keyboard.press('F7');
  await sleep(2500);
  const counts = await Promise.all([host.evaluate(() => window.game.scene.world.enemies.filter((e) => !e.dead).length), guest.evaluate(() => window.game.scene.world.enemies.length)]);
  const snapBytes = await host.evaluate(() => window.game.scene.world.enemies.filter((e) => !e.dead).length * 21);
  check('L’invité reçoit les centaines d’ennemis de l’hôte', counts[1] > 400 && Math.abs(counts[0] - counts[1]) < 60, `hôte ${counts[0]}, invité ${counts[1]}, ~${Math.round(snapBytes / 1024)} Ko d’ennemis par image`);

  // Pause de l'hôte.
  await host.keyboard.press('Escape');
  const pausedOk = await until(guest, () => document.querySelector('.net-wait')?.textContent.includes('pause') ?? false, undefined, 5000);
  check('La pause de l’hôte est affichée chez l’invité', pausedOk);
  const predBefore = await guest.evaluate(() => window.game.scene.world.predX);
  await guest.keyboard.down('KeyD');
  await sleep(800);
  await guest.keyboard.up('KeyD');
  const predAfter = await guest.evaluate(() => window.game.scene.world.predX);
  check('Le héros de l’invité reste immobile pendant la pause', Math.abs(predAfter - predBefore) < 1, `Δx = ${(predAfter - predBefore).toFixed(1)}`);
  await clickText(host, 'Reprendre');
  const unpaused = await until(guest, () => !document.querySelector('.net-wait'), undefined, 5000);
  check('La reprise est transmise', unpaused);

  // Fin de manche : relique pour chacun.
  await host.keyboard.press('F2');
  // Les gemmes des ennemis abattus donnent d'abord des niveaux : chacun choisit ses bonus.
  // Les gemmes des ennemis abattus donnent d'abord des niveaux : chacun choisit ses bonus, puis sa relique.
  const levelUps = { guest: new Set(), host: new Set() };
  let guestRelic = false;
  let hostRelic = false;
  for (let i = 0; i < 400 && !(guestRelic && hostRelic); i++) {
    const tops = await Promise.all([guest, host].map((p) => p.evaluate(() => document.querySelector('#ui > .choice-screen:last-child')?.className ?? '')));
    if (!guestRelic && tops[0].includes('relic') && !tops[0].includes('locked')) {
      // L'écran ignore les clics pendant ses 0,35 s de sécurité : on vérifie qu'il s'est bien fermé.
      await guest.locator('#ui > .choice-screen:last-child button', { hasText: 'Passer' }).click();
      guestRelic = await until(guest, () => !document.querySelector('#ui > .choice-screen:last-child')?.className.includes('relic'), undefined, 3000);
    } else if (tops[0].includes('levelup')) await pickTop(guest, levelUps.guest);
    if (!hostRelic && tops[1].includes('relic') && !tops[1].includes('locked')) {
      await host.locator('#ui > .choice-screen:last-child .choice-card').first().click();
      hostRelic = await until(host, () => !document.querySelector('#ui > .choice-screen:last-child')?.className.includes('relic'), undefined, 3000);
    } else if (tops[1].includes('levelup')) await pickTop(host, levelUps.host);
    await sleep(150);
  }
  console.log(`      (${levelUps.guest.size} + ${levelUps.host.size} montées de niveau choisies avant les reliques)`);
  check('Choix de relique proposé à chacun en fin de manche', guestRelic && hostRelic, guestRelic && hostRelic ? '' : `invité : ${await uiState(guest)} · hôte : ${await uiState(host)}`);
  const wave2 = await until(host, () => window.game.scene.world.director.wave === 2, undefined, 15000);
  check('Manche 2 lancée après les reliques des deux joueurs', wave2, wave2 ? '' : `invité : ${await uiState(guest)} · hôte : ${await uiState(host)}`);

  // Départ de l'invité : l'hôte continue seul.
  await guest.keyboard.press('Escape');
  await clickText(guest, 'Quitter la partie');
  const leftOk = await until(host, () => window.game.scene.world.heroes[1].left === true, undefined, 8000);
  check('L’hôte détecte le départ de l’invité', leftOk);
  await sleep(1500);
  const stillRunning = await host.evaluate(() => window.game.scene.world.state === 'playing' && !document.querySelector('.choice-screen'));
  check('La partie continue chez l’hôte', stillRunning);
  const guestMenu = await until(guest, () => !!document.querySelector('.menu-tiles'), undefined, 5000);
  check('L’invité revient au menu principal', guestMenu);
  await host.context().close();
  await guest.context().close();
}

// ---------------------------------------------------------------------------
// Scénario 2 : salon complet, exclusion, mode Survie, coéquipier à terre, défaite de l'équipe.
async function scenarioGroupe() {
  console.log('\n— Scénario 2 : quatre joueurs —');
  const host = await open('hôte', '&debug');
  const guests = [];
  for (const name of ['Bob', 'Chloé', 'David', 'Eve']) guests.push(await open(name, ''));
  const [g1, g2, g3, g4] = guests;
  const code = await hostLobby(host, 'Alice');

  await joinLobby(g4, 'Eve', 'ZZZZZ');
  const notFound = await until(g4, () => document.querySelector('.net-status.error')?.textContent.includes('Aucune partie') ?? false, undefined, 20000);
  check('Code inconnu : message « Aucune partie trouvée »', notFound, await g4.textContent('.net-status').catch(() => ''));
  await clickText(g4, 'Retour');

  for (const [p, name] of [[g1, 'Bob'], [g2, 'Chloé'], [g3, 'David']]) {
    await joinLobby(p, name, code);
    await until(p, () => !!document.querySelector('.lobby'), undefined, 20000);
  }
  await until(host, () => document.querySelectorAll('.lobby-player:not(.empty)').length === 4, undefined, 10000);
  check('Salon à 4 joueurs', (await playerCount(host)) === 4, `${await playerCount(host)} joueurs chez l’hôte`);

  await joinLobby(g4, 'Eve', code);
  const full = await until(g4, () => document.querySelector('.result-sub')?.textContent.includes('complète') ?? false, undefined, 20000);
  check('Un 5e joueur est refusé (partie complète)', full);
  await backToMenu(g4);

  await host.locator('.lobby-player', { hasText: 'David' }).locator('button', { hasText: 'Exclure' }).click();
  const kicked = await until(g3, () => document.querySelector('.result-sub')?.textContent.includes('exclu') ?? false, undefined, 10000);
  await sleep(300);
  check('Exclusion d’un joueur par l’hôte', kicked && (await playerCount(host)) === 3);
  await backToMenu(g3);

  await host.locator('.segmented button', { hasText: 'Survie 10 min' }).click();
  for (const p of [g1, g2]) await clickText(p, 'Je suis prêt !');
  await until(host, () => [...document.querySelectorAll('#ui button')].some((b) => b.textContent === 'Lancer la partie'), undefined, 5000);
  await clickText(host, 'Lancer la partie');
  const started = await until(g2, () => (window.game.scene.world?.heroViews?.length ?? 0) === 3 && (window.game.scene.world.hud?.director.title ?? '').startsWith('Survie'), undefined, 20000);
  check('Partie Survie à 3 joueurs lancée chez les invités', started);
  await sleep(3000);
  // Capture d'écran d'un invité en partie, seulement si un dossier est indiqué (SCREENSHOTS=dossier).
  if (process.env.SCREENSHOTS) await g1.screenshot({ path: path.join(process.env.SCREENSHOTS, 'online-invite.png') }).catch(() => undefined);

  // Bob tombe à terre, Alice vient le relever.
  await host.evaluate(() => {
    const w = window.game.scene.world;
    w.debugGodMode = true;
    w.handleHeroDeath(w.heroes[1]);
  });
  const downed = await until(g1, () => window.game.scene.world.heroViews[1]?.downed === true, undefined, 5000);
  check('Coéquipier à terre visible chez l’invité', downed);
  await host.evaluate(() => {
    const w = window.game.scene.world;
    w.heroes[0].entity.x = w.heroes[1].entity.x + 6;
    w.heroes[0].entity.y = w.heroes[1].entity.y;
  });
  const revived = await until(g1, () => window.game.scene.world.heroViews[1]?.downed === false && window.game.scene.world.heroViews[1].hp > 0, undefined, 8000);
  check('Coéquipier relevé en restant près de lui', revived);

  // Toute l'équipe tombe : écran de défaite chez chacun, or crédité aux invités.
  const goldBefore = await g1.evaluate(() => window.game.save.data.gold);
  await host.evaluate(() => {
    const w = window.game.scene.world;
    w.debugGodMode = false;
    w.run.gold += 40;
    for (const h of w.heroes) if (h.alive) w.handleHeroDeath(h);
  });
  const defeat = await Promise.all([g1, g2].map((p) => until(p, () => !!document.querySelector('.result.defeat'), undefined, 10000)));
  const hostResult = await until(host, () => !!document.querySelector('.result'), undefined, 5000);
  check('Défaite : écran de résultat chez l’hôte et les 2 invités', defeat.every(Boolean) && hostResult);
  const goldAfter = await g1.evaluate(() => window.game.save.data.gold);
  check('L’or de la partie est crédité à l’invité', goldAfter > goldBefore, `${goldBefore} → ${goldAfter}`);
  for (const p of [host, ...guests]) await p.context().close();
}

// ---------------------------------------------------------------------------
// Scénario 3 : l'hôte se fige puis ferme le jeu (ou plante) en pleine partie.
async function startDuo() {
  const host = await open('hôte', '');
  const guest = await open('invité', '');
  const code = await hostLobby(host, 'Alice');
  await joinLobby(guest, 'Bob', code);
  await until(guest, () => !!document.querySelector('.lobby'), undefined, 20000);
  await clickText(guest, 'Je suis prêt !');
  await until(host, () => [...document.querySelectorAll('#ui button')].some((b) => b.textContent === 'Lancer la partie'), undefined, 5000);
  await clickText(host, 'Lancer la partie');
  await until(guest, () => (window.game.scene.world?.enemies?.length ?? 0) > 0, undefined, 20000);
  return { host, guest };
}

const interrupted = () => document.querySelector('.screen-header h2')?.textContent === 'Partie interrompue';

async function scenarioHoteParti() {
  console.log('\n— Scénario 3 : hôte figé, puis départ de l’hôte —');
  let { host, guest } = await startDuo();
  // Fenêtre de l'hôte cachée (réduite ou couverte) : plus de requestAnimationFrame, mais la partie continue.
  await host.evaluate(() => {
    window.__raf = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const t1 = await guest.evaluate(() => window.game.scene.world.time);
  await sleep(4000);
  const t2 = await guest.evaluate(() => window.game.scene.world.time);
  const warned = await guest.evaluate(() => !!document.querySelector('.net-wait'));
  check('La partie continue quand la fenêtre de l’hôte est cachée', t2 - t1 > 2.5 && !warned, `${(t2 - t1).toFixed(1)} s de jeu en 4 s`);
  await host.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
    window.requestAnimationFrame = window.__raf;
    window.requestAnimationFrame(window.game.frame);
  });
  const t3 = await guest.evaluate(() => window.game.scene.world.time);
  await sleep(1500);
  const t4 = await guest.evaluate(() => window.game.scene.world.time);
  check('La boucle normale reprend quand la fenêtre réapparaît', t4 - t3 > 0.8 && (await host.evaluate(() => window.game.backgroundClock === null)));

  // Boucle de l'hôte arrêtée (plantage partiel, onglet gelé) : l'invité est prévenu, puis tout reprend.
  await host.evaluate(() => {
    window.__raf = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
  });
  const frozen = await until(guest, () => document.querySelector('.net-wait')?.textContent.includes('ne répond plus') ?? false, undefined, 10000);
  check('« L’hôte ne répond plus » quand l’hôte est figé', frozen);
  await host.evaluate(() => {
    window.requestAnimationFrame = window.__raf;
    window.requestAnimationFrame(window.game.frame);
  });
  const back = await until(guest, () => !document.querySelector('.net-wait'), undefined, 10000);
  check('Le message disparaît quand l’hôte reprend', back);

  let t0 = Date.now();
  // Fermeture comme par un joueur : les événements de fermeture de la page sont déclenchés.
  await host.close({ runBeforeUnload: true });
  const lost = await until(guest, interrupted, undefined, 30000);
  check('L’invité est prévenu quand l’hôte ferme le jeu', lost, lost ? `${((Date.now() - t0) / 1000).toFixed(1)} s` : await uiState(guest));
  await guest.context().close();

  // Plantage de l'hôte (aucun événement de fermeture) : détection par WebRTC.
  ({ host, guest } = await startDuo());
  const cdp = await host.context().newCDPSession(host);
  t0 = Date.now();
  // La page meurt avant de répondre : on n'attend pas la réponse.
  cdp.send('Page.crash').catch(() => undefined);
  const crashed = await until(guest, interrupted, undefined, 90000);
  check('L’invité est prévenu si l’hôte plante', crashed, crashed ? `${((Date.now() - t0) / 1000).toFixed(1)} s` : `rien après 90 s : ${await uiState(guest)}`);
  await host.context().close().catch(() => undefined);
  await guest.context().close();

  // Plantage d'un invité : l'hôte le retire et la partie ne l'attend pas pour les choix de bonus.
  ({ host, guest } = await startDuo());
  const cdp2 = await guest.context().newCDPSession(guest);
  t0 = Date.now();
  cdp2.send('Page.crash').catch(() => undefined);
  const dropped = await until(host, () => window.game.scene.world.heroes[1].left === true, undefined, 90000);
  check('L’hôte retire un invité qui a planté', dropped, dropped ? `${((Date.now() - t0) / 1000).toFixed(1)} s` : await uiState(host));
  await host.evaluate(() => {
    const w = window.game.scene.world;
    w.addXp(w.run.xpNext - w.run.xp + 0.01, w.heroes[0]);
  });
  const ownChoice = await until(host, () => !!document.querySelector('.choice-screen .choice-card') && !document.querySelector('.net-wait'), undefined, 5000);
  check('Montée de niveau ensuite : seul l’hôte choisit, sans attente', ownChoice, ownChoice ? '' : await uiState(host));
  await host.context().close();
  await guest.context().close().catch(() => undefined);
}

const only = process.argv[2];
try {
  if (!only || only === 'duo') await scenarioDuo();
  if (!only || only === 'groupe') await scenarioGroupe();
  if (!only || only === 'hote') await scenarioHoteParti();
} catch (err) {
  check('Déroulement du test', false, err.message.split('\n')[0]);
} finally {
  check('Aucune erreur JavaScript', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} vérification(s) en échec sur ${results.length}.` : `\nTout est OK (${results.length} vérifications).`);
process.exit(failed ? 1 : 0);
