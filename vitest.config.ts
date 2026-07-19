import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // `.only`/focused tests are forbidden everywhere, not just in CI, so a
    // stray focus can never slip through a local run that "looked green".
    allowOnly: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          setupFiles: ['./vitest.setup.node.ts'],
          include: [
            '__tests__/**/*.test.ts',
            'lib/**/*.test.ts',
            'lib/**/__tests__/**/*.test.ts',
            'app/**/__tests__/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: [
            'components/**/*.test.tsx',
            'components/**/__tests__/**/*.test.tsx',
            'app/**/__tests__/**/*.test.tsx',
          ],
        },
      },
    ],
  },
})
