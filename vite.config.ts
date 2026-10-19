import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Root-relative asset paths must work on client-side routes like
  // /secure/activate, not resolve beneath /secure/.
  base: '/',
})
