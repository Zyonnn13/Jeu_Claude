// Processus principal Electron : ouvre le jeu (dist/index.html, autonome) dans sa propre fenêtre.
// Arguments :
//   --debogage    raccourcis de test du jeu (?debug) + F12 pour les outils de développement (pas --debug, que Node intercepte) ;
//   --smoke-test  vérifie que le jeu démarre, affiche « SMOKE OK » et quitte (code 0, sinon 1),
//                 avec --screenshot=fichier.png pour enregistrer une capture de l'écran titre.
'use strict';
const { app, BrowserWindow, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const DEBUG = process.argv.includes('--debogage');
const SMOKE_TEST = process.argv.includes('--smoke-test');
const SMOKE_TIMEOUT = 30_000;
const GAME_FILE = path.join(__dirname, '..', 'dist', 'index.html');

// Même dossier de sauvegarde (localStorage) que l'on lance l'exe ou « npm run electron ».
app.setPath('userData', path.join(app.getPath('appData'), 'Nuit Eternelle'));
// PC portable à deux cartes graphiques : la carte dédiée (NVIDIA...) plutôt que la puce intégrée. Le réglage
// Windows par application ne marche pas ici : le vrai programme tourne depuis un dossier temporaire.
app.commandLine.appendSwitch('force_high_performance_gpu');

/** @type {BrowserWindow | null} */
let win = null;

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

/** Même fichier que la page actuelle (seuls ?debug et #... peuvent changer) : un rechargement est permis. */
function isGamePage(url) {
  const strip = (u) => u.replace(/[?#].*$/, '');
  return url.startsWith('file:') && win !== null && strip(url) === strip(win.webContents.getURL());
}

function toggleFullscreen() {
  if (win) win.setFullScreen(!win.isFullScreen());
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Nuit Éternelle',
    backgroundColor: '#0c100e',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
      // Une partie en ligne doit continuer quand la fenêtre n'a pas le focus.
      backgroundThrottling: false,
      devTools: DEBUG,
    },
  });
  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => (win = null));

  const contents = win.webContents;
  // F11 et Alt+Entrée : plein écran (il n'y a pas de menu, donc pas de raccourcis par défaut).
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      event.preventDefault();
      if (!input.isAutoRepeat) toggleFullscreen();
    } else if (DEBUG && input.key === 'F12') {
      event.preventDefault();
      contents.toggleDevTools();
    }
  });
  // On ne quitte jamais le jeu : les liens web s'ouvrent dans le navigateur par défaut.
  contents.on('will-navigate', (event, url) => {
    if (isGamePage(url)) return;
    event.preventDefault();
    if (isHttpUrl(url)) void shell.openExternal(url);
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (SMOKE_TEST) smokeTest(win);
  void win.loadFile(GAME_FILE, DEBUG ? { search: 'debug' } : undefined);
}

/** Attend l'écran titre (#loading retiré, bouton .press-start présent), puis quitte avec le code 0 (sinon 1). */
function smokeTest(window) {
  const contents = window.webContents;
  const fail = (reason) => {
    console.error(`SMOKE FAIL : ${reason}`);
    app.exit(1);
  };
  const timer = setTimeout(() => fail(`écran titre absent après ${SMOKE_TIMEOUT / 1000} s`), SMOKE_TIMEOUT);
  contents.on('console-message', (details) => {
    if (details.level === 'warning' || details.level === 'error') console.log(`[page:${details.level}] ${details.message}`);
  });
  contents.on('did-fail-load', (_e, code, desc, _url, isMainFrame) => {
    if (isMainFrame) fail(`chargement impossible (${code} ${desc})`);
  });
  contents.on('render-process-gone', (_e, details) => fail(`processus de rendu arrêté (${details.reason})`));

  const poll = async () => {
    if (window.isDestroyed()) return;
    const ready = await contents
      .executeJavaScript("!document.getElementById('loading') && !!document.querySelector('.press-start')")
      .catch(() => false);
    if (!ready) return void setTimeout(poll, 250);
    clearTimeout(timer);
    const shotArg = process.argv.find((a) => a.startsWith('--screenshot='));
    if (shotArg) {
      // Laisse quelques images s'afficher avant la capture.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const file = path.resolve(shotArg.slice('--screenshot='.length));
      fs.writeFileSync(file, (await contents.capturePage()).toPNG());
      console.log(`Capture : ${file}`);
    }
    console.log(`SMOKE OK (Electron ${process.versions.electron}, ${contents.getURL()})`);
    app.exit(0);
  };
  contents.once('did-finish-load', () => void poll());
}

// Le smoke test peut tourner à côté d'une partie ouverte : il ne prend pas le verrou d'instance unique.
if (!SMOKE_TEST && !app.requestSingleInstanceLock()) {
  // Le jeu est déjà ouvert : l'autre instance reprend le focus.
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  // Le bouton « Quitter » du jeu appelle window.close() : la dernière fenêtre fermée quitte l'application.
  app.on('window-all-closed', () => app.quit());
  Menu.setApplicationMenu(null);
  void app.whenReady().then(createWindow);
}
