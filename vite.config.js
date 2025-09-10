import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  plugins: [react()],
  publicDir: 'público',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: path.resolve(process.cwd(), 'index.html'),
    },
  },
});
