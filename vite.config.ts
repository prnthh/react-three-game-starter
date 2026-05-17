import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const defaultBasePath = process.env.NODE_ENV === 'production' ? './' : '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? defaultBasePath,
})
