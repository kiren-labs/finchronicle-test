import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.js'],
      exclude: ['tests/**', 'scripts/**'],
    },
  },
  resolve: {
    alias: {
      '@app': resolve(process.cwd(), '../finance-tracker'),
    },
  },
})
