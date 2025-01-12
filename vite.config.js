import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/restaurant-finder/',
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
            /__VITE_GOOGLE_MAPS_API_KEY__/g,
            process.env.VITE_GOOGLE_MAPS_API_KEY || ''
        )
      }
    }
  ]
})