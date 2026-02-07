import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPreviousMonth,
  getMonthTotals,
  calculateMoMDelta,
  calculateExpensePercentage,
  APP_VERSION
} from '../../src/app.js'

describe('Version Tracking (v3.7.0+)', () => {
  it('should export APP_VERSION from main app', () => {
    expect(APP_VERSION).toBeDefined()
    expect(typeof APP_VERSION).toBe('string')
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/) // Semver format
  })

  it('should be testing version 3.7.1 or higher', () => {
    const [major, minor] = APP_VERSION.split('.').map(Number)
    expect(major).toBeGreaterThanOrEqual(3)
    if (major === 3) {
      expect(minor).toBeGreaterThanOrEqual(7)
    }
  })
})

// Note: getPreviousMonth relies on Date timezone conversion (local -> UTC)
// which makes unit testing unreliable across different timezones
// This function is tested via E2E tests in the actual app environment

// Note: getMonthTotals relies on global transactions array from main app
// It's tested via E2E tests instead of unit tests

describe('calculateMoMDelta', () => {
  it('should calculate positive month-over-month change', () => {
    const delta = calculateMoMDelta(5000, 4000)

    expect(delta.abs).toBe(1000)
    expect(delta.pct).toBe(25) // 1000/4000 * 100
    expect(delta.direction).toBe('up')
  })

  it('should calculate negative month-over-month change', () => {
    const delta = calculateMoMDelta(3000, 4000)

    expect(delta.abs).toBe(-1000)
    expect(delta.pct).toBe(-25) // -1000/4000 * 100
    expect(delta.direction).toBe('down')
  })

  it('should handle no change', () => {
    const delta = calculateMoMDelta(5000, 5000)

    expect(delta.abs).toBe(0)
    expect(delta.pct).toBe(0)
    expect(delta.direction).toBe('neutral')
  })

  it('should handle zero previous month (first month)', () => {
    const delta = calculateMoMDelta(5000, 0)

    expect(delta.abs).toBe(5000)
    expect(delta.pct).toBe(null) // Cannot calculate % from 0
    expect(delta.direction).toBe('up')
  })

  it('should handle both months being zero', () => {
    const delta = calculateMoMDelta(0, 0)

    expect(delta.abs).toBe(0)
    expect(delta.pct).toBe(0)
    expect(delta.direction).toBe('neutral')
  })

  it('should handle current month being zero', () => {
    const delta = calculateMoMDelta(0, 5000)

    expect(delta.abs).toBe(-5000)
    expect(delta.pct).toBe(-100)
    expect(delta.direction).toBe('down')
  })

  it('should handle null or undefined previous month', () => {
    expect(calculateMoMDelta(5000, null)).toBe(null)
    expect(calculateMoMDelta(5000, undefined)).toBe(null)
  })

  it('should handle negative values correctly', () => {
    // Net can be negative (more expenses than income)
    const delta = calculateMoMDelta(-1000, -500)

    expect(delta.abs).toBe(-500)
    expect(delta.pct).toBe(-100) // Getting worse
    expect(delta.direction).toBe('down')
  })
})

describe('calculateExpensePercentage', () => {
  it('should calculate expense as percentage of income', () => {
    const percentage = calculateExpensePercentage(3000, 5000)
    expect(percentage).toBe(60) // 3000/5000 * 100
  })

  it('should handle expenses greater than income (>100%)', () => {
    const percentage = calculateExpensePercentage(6000, 5000)
    expect(percentage).toBe(120) // Overspending
  })

  it('should return 0 when expenses are 0', () => {
    const percentage = calculateExpensePercentage(0, 5000)
    expect(percentage).toBe(0)
  })

  it('should return null when income is 0', () => {
    const percentage = calculateExpensePercentage(1000, 0)
    expect(percentage).toBe(null) // Cannot divide by 0
  })

  it('should return null when income is undefined', () => {
    const percentage = calculateExpensePercentage(1000, undefined)
    expect(percentage).toBe(null)
  })

  it('should handle exact percentages', () => {
    const percentage = calculateExpensePercentage(1000000, 2000000)
    expect(percentage).toBe(50)
  })

  it('should return decimal values (not rounded)', () => {
    const percentage = calculateExpensePercentage(3333, 5000)
    expect(percentage).toBeCloseTo(66.66, 2) // Allow floating point precision
  })

  it('should handle small amounts correctly', () => {
    const percentage = calculateExpensePercentage(1, 3)
    expect(percentage).toBeCloseTo(33.33, 2)
  })
})
