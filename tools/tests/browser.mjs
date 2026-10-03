// Navigateur commun aux tests automatisés : Playwright avec Microsoft Edge sous Windows (rien à télécharger),
// Chromium ailleurs (npx playwright-core install chromium). TEST_BROWSER=chrome|msedge|chromium force un choix.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  for (const id of ['playwright-core', 'playwright', '/opt/node-tools/node_modules/playwright']) {
    try {
      return require(id);
    } catch {
      // module suivant
    }
  }
  throw new Error('Playwright introuvable : lancez « npm install » (playwright-core fait partie des outils du projet).');
}

/** Lance le navigateur. WebGL2 passe par le rendu logiciel (SwiftShader) : identique avec ou sans carte graphique. */
export function launchBrowser({ headless = true, args = [] } = {}) {
  const { chromium } = loadPlaywright();
  const channel = process.env.TEST_BROWSER ?? (process.platform === 'win32' ? 'msedge' : undefined);
  return chromium.launch({
    headless,
    channel: channel === 'chromium' ? undefined : channel,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', ...args],
  });
}
