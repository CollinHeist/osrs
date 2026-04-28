import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the app works from /calculators/ on GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
});
