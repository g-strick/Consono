import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/*/tests/**/*.{test,spec}.ts', 'apps/*/src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
    },
  },
});
