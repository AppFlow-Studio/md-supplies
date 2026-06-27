import { vi } from 'vitest'

// Mock server-only for test environments
// In production, Next.js build tools intercept this, but in tests we need to mock it
vi.mock('server-only', () => ({}))
