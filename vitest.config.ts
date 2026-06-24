import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            '__tests__/**/*.test.ts',
            'lib/**/*.test.ts',
            'lib/**/__tests__/**/*.test.ts',
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
          ],
        },
      },
    ],
  },
})
