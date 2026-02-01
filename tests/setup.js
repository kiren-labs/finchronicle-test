import { beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
})()

global.localStorage = localStorageMock

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear()
})

// Mock Date.now() for predictable IDs (can be overridden in specific tests)
global.Date.now = vi.fn(() => 1704067200000) // Fixed timestamp: 2024-01-01 00:00:00
