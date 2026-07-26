import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// "base" doit correspondre au nom du dépôt GitHub (site de projet GitHub Pages :
// https://<utilisateur>.github.io/<nom-du-depot>/). À adapter si le dépôt est
// renommé.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/ceff-organigrammes-/' : '/',
}))
