import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatMonth,
  getCurrency,
  getCurrencySymbol,
} from '../../src/app.js'

describe('formatNumber', () => {
  it('should format number with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(123456789)).toBe('123,456,789')
  })

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('should handle small numbers', () => {
    expect(formatNumber(1)).toBe('1')
    expect(formatNumber(99)).toBe('99')
    expect(formatNumber(999)).toBe('999')
  })

  it('should handle negative numbers with absolute value', () => {
    expect(formatNumber(-1000)).toBe('1,000')
    expect(formatNumber(-500)).toBe('500')
  })

  it('should remove decimals (rounds to 0)', () => {
    expect(formatNumber(1234.56)).toBe('1,235')
    expect(formatNumber(999.99)).toBe('1,000')
  })
})

describe('formatCurrency', () => {
  it('should format amount with currency symbol', () => {
    const result = formatCurrency(1000)
    // Default currency is INR (₹)
    expect(result).toMatch(/[₹$€£¥]1,000/)
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/[₹$€£¥]0/)
  })

  it('should handle large amounts', () => {
    const result = formatCurrency(1000000)
    expect(result).toMatch(/[₹$€£¥]1,000,000/)
  })

  it('should handle decimal amounts (rounds)', () => {
    const result = formatCurrency(1234.56)
    expect(result).toMatch(/[₹$€£¥]1,235/)
  })
})

describe('formatDate', () => {
  it('should format ISO date to readable format', () => {
    const result = formatDate('2025-01-15')
    // Expected format: "15 Jan, 2025" or "15 Jan 2025"
    expect(result).toMatch(/15.*Jan.*2025/)
  })

  it('should handle different months', () => {
    expect(formatDate('2025-02-01')).toMatch(/1.*Feb.*2025/)
    expect(formatDate('2025-12-31')).toMatch(/31.*Dec.*2025/)
  })

  it('should handle year transitions', () => {
    expect(formatDate('2024-01-01')).toMatch(/1.*Jan.*2024/)
  })
})

describe('formatMonth', () => {
  it('should format YYYY-MM to readable format', () => {
    const result = formatMonth('2025-01')
    // Expected format: "January 2025"
    expect(result).toMatch(/January 2025/)
  })

  it('should handle different months', () => {
    expect(formatMonth('2025-02')).toMatch(/February 2025/)
    expect(formatMonth('2025-12')).toMatch(/December 2025/)
  })

  it('should handle different years', () => {
    expect(formatMonth('2024-06')).toMatch(/June 2024/)
  })
})

describe('getCurrency', () => {
  let originalGetItem

  beforeEach(() => {
    // Save original localStorage.getItem
    originalGetItem = global.localStorage.getItem
  })

  afterEach(() => {
    // Restore original localStorage.getItem
    global.localStorage.getItem = originalGetItem
  })

  it('should return default currency INR when nothing is saved', () => {
    global.localStorage.getItem = vi.fn(() => null)
    expect(getCurrency()).toBe('INR')
  })

  it('should return saved currency from localStorage', () => {
    global.localStorage.getItem = vi.fn(() => 'USD')
    expect(getCurrency()).toBe('USD')
  })

  it('should return saved currency for EUR', () => {
    global.localStorage.getItem = vi.fn(() => 'EUR')
    expect(getCurrency()).toBe('EUR')
  })

  it('should return INR for invalid currency code', () => {
    global.localStorage.getItem = vi.fn(() => 'INVALID')
    expect(getCurrency()).toBe('INR')
  })

  it('should handle empty string from localStorage', () => {
    global.localStorage.getItem = vi.fn(() => '')
    expect(getCurrency()).toBe('INR')
  })
})

describe('getCurrencySymbol', () => {
  let originalGetItem

  beforeEach(() => {
    originalGetItem = global.localStorage.getItem
  })

  afterEach(() => {
    global.localStorage.getItem = originalGetItem
  })

  it('should return correct symbol for INR', () => {
    global.localStorage.getItem = vi.fn(() => 'INR')
    expect(getCurrencySymbol()).toBe('₹')
  })

  it('should return correct symbol for USD', () => {
    global.localStorage.getItem = vi.fn(() => 'USD')
    expect(getCurrencySymbol()).toBe('$')
  })

  it('should return correct symbol for EUR', () => {
    global.localStorage.getItem = vi.fn(() => 'EUR')
    expect(getCurrencySymbol()).toBe('€')
  })

  it('should return correct symbol for GBP', () => {
    global.localStorage.getItem = vi.fn(() => 'GBP')
    expect(getCurrencySymbol()).toBe('£')
  })

  it('should return INR symbol when no currency saved', () => {
    global.localStorage.getItem = vi.fn(() => null)
    expect(getCurrencySymbol()).toBe('₹')
  })
})
