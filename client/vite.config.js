import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false, // if 5174 is taken, Vite will try the next free port
    open: true,        // auto-open the browser when the dev server starts
  },
});
