import { describe, it, expect } from 'vitest'
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

describe('getPreviousMonth', () => {
  it('should return previous month for mid-year months', () => {
    expect(getPreviousMonth('2025-06')).toBe('2025-05')
    expect(getPreviousMonth('2025-03')).toBe('2025-02')
  })

  it('should handle year transitions', () => {
    expect(getPreviousMonth('2025-01')).toBe('2024-12')
    expect(getPreviousMonth('2024-01')).toBe('2023-12')
  })

  it('should handle December going to November', () => {
    expect(getPreviousMonth('2025-12')).toBe('2025-11')
  })

  it('should handle February to January', () => {
    expect(getPreviousMonth('2025-02')).toBe('2025-01')
  })

  it('should return correct format YYYY-MM', () => {
    const result = getPreviousMonth('2025-05')
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })
})

describe('getMonthTotals', () => {
  it('should return zero totals for empty transactions', () => {
    const totals = getMonthTotals('2025-01')
    
    expect(totals).toEqual({
      income: 0,
      expense: 0,
      net: 0,
      count: 0
    })
  })

  it('should return correct structure for any month', () => {
    const totals = getMonthTotals('2024-12')
    
    expect(totals).toHaveProperty('income')
    expect(totals).toHaveProperty('expense')
    expect(totals).toHaveProperty('net')
    expect(totals).toHaveProperty('count')
    expect(typeof totals.income).toBe('number')
    expect(typeof totals.expense).toBe('number')
    expect(typeof totals.net).toBe('number')
    expect(typeof totals.count).toBe('number')
  })

  it('should handle different month formats', () => {
    // Should work with YYYY-MM format
    expect(() => getMonthTotals('2025-06')).not.toThrow()
    expect(() => getMonthTotals('2024-01')).not.toThrow()
    expect(() => getMonthTotals('2026-12')).not.toThrow()
  })

  it('should calculate net as income minus expense', () => {
    const totals = getMonthTotals('2025-02')
    expect(totals.net).toBe(totals.income - totals.expense)
  })
})

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
