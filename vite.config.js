import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    base: '/soma-os/' // <-- Agrega esta línea (debe coincidir con el nombre de tu repo en GitHub)
})
