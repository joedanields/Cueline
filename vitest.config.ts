import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.ts', 'tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'functions/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', 'src/main.tsx', 'src/**/index.ts', '**/*.d.ts'],
      reporter: ['text-summary', 'text'],
      // Thresholds from docs/TESTING.md.
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        'src/engine/**': { lines: 95, statements: 95 },
      },
    },
  },
});
