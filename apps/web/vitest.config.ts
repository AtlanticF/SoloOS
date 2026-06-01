import { defineConfig } from 'vitest/config'

// Minimal test runner for the web package. Pure logic only (node env, no DOM);
// React components are verified via the end-to-end smoke.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
