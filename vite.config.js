import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/restaurant-finder/',  // This is crucial for GitHub Pages
  plugins: [react()],
})