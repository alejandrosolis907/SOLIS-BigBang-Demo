import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',            // la raíz del repo (donde está index.html)
  base: '/',            // app servida en /
  publicDir: 'público', // tu carpeta de estáticos
  build: {
    outDir: 'dist',
    rollupOptions: {
      // entrada explícita para evitar "Could not resolve entry module index.html"
      input: path.resolve(__dirname, 'index.html')
    }
  }
});
