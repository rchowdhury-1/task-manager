import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Next.js tsconfig sets jsx: preserve; vitest needs the transform applied
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    // Integration tests hit a real Postgres DB and run under a separate
    // config (vitest.integration.config.ts / `npm run test:integration`)
    // with their own DATABASE_URL and safety checks. Excluded here so
    // `npm test` never accidentally opens a DB connection.
    exclude: ['**/node_modules/**', '__tests__/integration/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
