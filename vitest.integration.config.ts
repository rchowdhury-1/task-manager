import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/integration/**/*.test.ts'],
    globalSetup: ['__tests__/integration/helpers/globalSetup.ts'],
    // Real DB I/O — don't run these files in parallel against each other
    // to avoid cross-file truncate/insert races on shared tables.
    fileParallelism: false,
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
