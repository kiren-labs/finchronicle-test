import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getDaysSinceBackup,
  shouldShowBackupReminder,
} from '../../src/app.js'

describe('Backup Tracking Functions (v3.9.0)', () => {
  describe('getDaysSinceBackup', () => {
    let originalDateNow
    let mockLastBackupTimestamp

    beforeEach(() => {
      // Save original Date.now
      originalDateNow = Date.now

      // Mock Date.now to return a fixed timestamp
      // Mock current time: 2026-02-08 12:00:00 UTC
      const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
      Date.now = vi.fn(() => mockNow)

      // Mock global lastBackupTimestamp variable
      global.lastBackupTimestamp = null
    })

    afterEach(() => {
      // Restore original Date.now
      Date.now = originalDateNow
      global.lastBackupTimestamp = null
    })

    it('should return null when never backed up', () => {
      global.lastBackupTimestamp = null
      const result = getDaysSinceBackup()
      expect(result).toBeNull()
    })

    it('should return 0 when backed up today', () => {
      // Set backup timestamp to current time
      const now = Date.now()
      global.lastBackupTimestamp = now
      const result = getDaysSinceBackup()
      expect(result).toBe(0)
    })

    it('should return 1 when backed up yesterday', () => {
      // Set backup timestamp to 24 hours ago
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      global.lastBackupTimestamp = oneDayAgo
      const result = getDaysSinceBackup()
      expect(result).toBe(1)
    })

    it('should return 7 when backed up 7 days ago', () => {
      // Set backup timestamp to 7 days ago
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      global.lastBackupTimestamp = sevenDaysAgo
      const result = getDaysSinceBackup()
      expect(result).toBe(7)
    })

    it('should return 30 when backed up 30 days ago', () => {
      // Set backup timestamp to 30 days ago
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      global.lastBackupTimestamp = thirtyDaysAgo
      const result = getDaysSinceBackup()
      expect(result).toBe(30)
    })

    it('should return 100 when backed up 100 days ago', () => {
      // Set backup timestamp to 100 days ago
      const hundredDaysAgo = Date.now() - (100 * 24 * 60 * 60 * 1000)
      global.lastBackupTimestamp = hundredDaysAgo
      const result = getDaysSinceBackup()
      expect(result).toBe(100)
    })

    it('should round down partial days', () => {
      // Set backup timestamp to 1.5 days ago
      const oneAndHalfDaysAgo = Date.now() - (1.5 * 24 * 60 * 60 * 1000)
      global.lastBackupTimestamp = oneAndHalfDaysAgo
      const result = getDaysSinceBackup()
      expect(result).toBe(1) // Should round down to 1
    })

    it('should handle backup timestamp of 0', () => {
      // Edge case: timestamp is 0 (epoch start)
      global.lastBackupTimestamp = 0
      const result = getDaysSinceBackup()
      // Should return a very large number (days since 1970)
      expect(result).toBeGreaterThan(20000) // More than 20,000 days since 1970
    })
  })

  describe('shouldShowBackupReminder', () => {
    let originalDateNow
    let mockTransactions

    beforeEach(() => {
      // Save original Date.now
      originalDateNow = Date.now

      // Mock Date.now to return a fixed timestamp
      const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
      Date.now = vi.fn(() => mockNow)

      // Mock global variables
      global.lastBackupTimestamp = null
      global.transactions = []
    })

    afterEach(() => {
      // Restore original Date.now
      Date.now = originalDateNow
      global.lastBackupTimestamp = null
      global.transactions = []
    })

    it('should return false when never backed up and no transactions', () => {
      global.lastBackupTimestamp = null
      global.transactions = []
      const result = shouldShowBackupReminder()
      expect(result).toBe(false)
    })

    it('should return false when never backed up with transactions < 7 days old', () => {
      global.lastBackupTimestamp = null
      const now = Date.now()

      // Transaction created 3 days ago (within grace period)
      global.transactions = [
        { id: now - (3 * 24 * 60 * 60 * 1000), amount: 100 }
      ]

      const result = shouldShowBackupReminder()
      expect(result).toBe(false)
    })

    it('should return true when never backed up with transactions >= 7 days old', () => {
      global.lastBackupTimestamp = null
      const now = Date.now()

      // Transaction created 7 days ago (grace period expired)
      global.transactions = [
        { id: now - (7 * 24 * 60 * 60 * 1000), amount: 100 }
      ]

      const result = shouldShowBackupReminder()
      expect(result).toBe(true)
    })

    it('should return true when never backed up with transactions > 30 days old', () => {
      global.lastBackupTimestamp = null
      const now = Date.now()

      // Transaction created 30 days ago
      global.transactions = [
        { id: now - (30 * 24 * 60 * 60 * 1000), amount: 100 }
      ]

      const result = shouldShowBackupReminder()
      expect(result).toBe(true)
    })

    it('should return false when backed up recently (< 30 days)', () => {
      const now = Date.now()

      // Backed up 10 days ago
      global.lastBackupTimestamp = now - (10 * 24 * 60 * 60 * 1000)
      global.transactions = [{ id: now, amount: 100 }]

      const result = shouldShowBackupReminder()
      expect(result).toBe(false)
    })

    it('should return false when backed up 29 days ago', () => {
      const now = Date.now()

      // Backed up 29 days ago (just under threshold)
      global.lastBackupTimestamp = now - (29 * 24 * 60 * 60 * 1000)
      global.transactions = [{ id: now, amount: 100 }]

      const result = shouldShowBackupReminder()
      expect(result).toBe(false)
    })

    it('should return true when backed up exactly 30 days ago', () => {
      const now = Date.now()

      // Backed up 30 days ago (threshold)
      global.lastBackupTimestamp = now - (30 * 24 * 60 * 60 * 1000)
      global.transactions = [{ id: now, amount: 100 }]

      const result = shouldShowBackupReminder()
      expect(result).toBe(true)
    })

    it('should return true when backed up > 30 days ago', () => {
      const now = Date.now()

      // Backed up 45 days ago
      global.lastBackupTimestamp = now - (45 * 24 * 60 * 60 * 1000)
      global.transactions = [{ id: now, amount: 100 }]

      const result = shouldShowBackupReminder()
      expect(result).toBe(true)
    })

    it('should handle multiple transactions and use oldest', () => {
      global.lastBackupTimestamp = null
      const now = Date.now()

      // Multiple transactions, oldest is 10 days ago
      global.transactions = [
        { id: now - (10 * 24 * 60 * 60 * 1000), amount: 100 }, // 10 days ago
        { id: now - (5 * 24 * 60 * 60 * 1000), amount: 200 },   // 5 days ago
        { id: now, amount: 300 }                                // Today
      ]

      const result = shouldShowBackupReminder()
      expect(result).toBe(true) // 10 days > 7 day grace period
    })

    it('should return false when backed up today', () => {
      const now = Date.now()

      // Backed up today
      global.lastBackupTimestamp = now
      global.transactions = [{ id: now, amount: 100 }]

      const result = shouldShowBackupReminder()
      expect(result).toBe(false)
    })
  })
})

describe('Backup Integration Scenarios', () => {
  let originalDateNow

  beforeEach(() => {
    originalDateNow = Date.now
    const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
    Date.now = vi.fn(() => mockNow)
    global.lastBackupTimestamp = null
    global.transactions = []
  })

  afterEach(() => {
    Date.now = originalDateNow
    global.lastBackupTimestamp = null
    global.transactions = []
  })

  it('Scenario: New user, no backup, no transactions', () => {
    // User just installed app
    global.lastBackupTimestamp = null
    global.transactions = []

    expect(getDaysSinceBackup()).toBeNull()
    expect(shouldShowBackupReminder()).toBe(false)
  })

  it('Scenario: New user, added first transaction today', () => {
    // User added transaction today
    const now = Date.now()
    global.lastBackupTimestamp = null
    global.transactions = [{ id: now, amount: 100 }]

    expect(getDaysSinceBackup()).toBeNull()
    expect(shouldShowBackupReminder()).toBe(false) // Grace period active
  })

  it('Scenario: User has 1 week old transactions, never backed up', () => {
    // User has been using app for 7 days without backup
    const now = Date.now()
    global.lastBackupTimestamp = null
    global.transactions = [{ id: now - (7 * 24 * 60 * 60 * 1000), amount: 100 }]

    expect(getDaysSinceBackup()).toBeNull()
    expect(shouldShowBackupReminder()).toBe(true) // Should remind now
  })

  it('Scenario: User backed up once, 2 weeks ago', () => {
    // User backed up 14 days ago
    const now = Date.now()
    global.lastBackupTimestamp = now - (14 * 24 * 60 * 60 * 1000)
    global.transactions = [{ id: now - (20 * 24 * 60 * 60 * 1000), amount: 100 }]

    expect(getDaysSinceBackup()).toBe(14)
    expect(shouldShowBackupReminder()).toBe(false) // < 30 days, no reminder
  })

  it('Scenario: User backed up 31 days ago - needs reminder', () => {
    // User backed up 31 days ago (outdated)
    const now = Date.now()
    global.lastBackupTimestamp = now - (31 * 24 * 60 * 60 * 1000)
    global.transactions = [{ id: now - (40 * 24 * 60 * 60 * 1000), amount: 100 }]

    expect(getDaysSinceBackup()).toBe(31)
    expect(shouldShowBackupReminder()).toBe(true) // > 30 days, show reminder
  })

  it('Scenario: Regular user, backs up monthly', () => {
    // User backed up 25 days ago (good practice)
    const now = Date.now()
    global.lastBackupTimestamp = now - (25 * 24 * 60 * 60 * 1000)
    global.transactions = [{ id: now - (30 * 24 * 60 * 60 * 1000), amount: 100 }]

    expect(getDaysSinceBackup()).toBe(25)
    expect(shouldShowBackupReminder()).toBe(false) // Well maintained
  })

  it('Scenario: User ignored reminders for 100 days', () => {
    // User has not backed up for 100 days
    const now = Date.now()
    global.lastBackupTimestamp = now - (100 * 24 * 60 * 60 * 1000)
    global.transactions = [{ id: now - (120 * 24 * 60 * 60 * 1000), amount: 100 }]

    expect(getDaysSinceBackup()).toBe(100)
    expect(shouldShowBackupReminder()).toBe(true) // Definitely needs backup
  })
})
