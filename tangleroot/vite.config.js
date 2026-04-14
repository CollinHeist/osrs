import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Production builds use a relative base so script/link URLs work from any path
// (e.g. /repo/tangleroot/ on GitHub Pages, or file opened from dist/). Dev keeps "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
}))
