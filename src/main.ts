import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './styles/main.css';
import './styles/menus.css';
import { Game } from './core/Game';

async function start(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ui = document.getElementById('ui') as HTMLElement;
  const hud = document.getElementById('hud') as HTMLElement;
  const toasts = document.getElementById('toasts') as HTMLElement;
  const loading = document.getElementById('loading') as HTMLElement;

  let game: Game;
  try {
    game = new Game(canvas, ui, hud, toasts);
  } catch (err) {
    loading.textContent = (err as Error).message;
    throw err;
  }
  try {
    await game.boot((ratio) => (loading.textContent = `Chargement… ${Math.round(ratio * 100)}%`));
    loading.remove();
  } catch (err) {
    loading.textContent = `Erreur au chargement : ${(err as Error).message}`;
    throw err;
  }
  // Accès console pratique pour le débogage.
  (window as unknown as { game: Game }).game = game;
}

void start();
