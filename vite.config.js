import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: '.',          // raíz del proyecto
  base: '/',
  plugins: [react()],
  publicDir: 'público',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  }
});
