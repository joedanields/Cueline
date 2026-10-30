import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    // Keep chunk warnings meaningful: the initial-JS budget is 150 KB gzip (ARCHITECTURE §6).
    chunkSizeWarningLimit: 400,
  },
  server: { port: 5173, strictPort: true },
});
