import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Le build produit un unique fichier dist/index.html (scripts, styles, sprites et police inclus)
// qui se lance hors-ligne, sans serveur, par simple double-clic.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
  },
  server: {
    port: 5173,
  },
});
