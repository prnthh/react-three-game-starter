import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const defaultBasePath = process.env.NODE_ENV === 'production' ? '/react-three-game-starter/' : '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  base: process.env.VITE_BASE_PATH ?? defaultBasePath,
})
