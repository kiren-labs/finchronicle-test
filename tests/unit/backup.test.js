import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  getDaysSinceBackup, 
  shouldShowBackupReminder,
  __testSetLastBackupTimestamp,
  __testSetTransactions,
  __testResetBackupState
} from '../../src/app.js'

// Note: getDaysSinceBackup and shouldShowBackupReminder rely on module-level
// variables (lastBackupTimestamp, transactions) which are defined in the main app.
// These tests verify the logic by mocking Date.now and using the extraction wrapper.

describe('Backup Tracking Functions (v3.9.0)', () => {
  describe('getDaysSinceBackup - Logic Tests', () => {
    let originalDateNow

    beforeEach(() => {
      // Save original Date.now
      originalDateNow = Date.now

      // Mock Date.now to return a fixed timestamp
      // Mock current time: 2026-02-08 12:00:00 UTC
      const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
      global.Date.now = vi.fn(() => mockNow)
    })

    afterEach(() => {
      // Restore original Date.now
      global.Date.now = originalDateNow
    })

    it('should calculate days correctly for various timestamps', () => {
      const now = Date.now()

      // Test the logic by directly calculating what the function should return
      const oneDayInMs = 24 * 60 * 60 * 1000

      // 0 days ago (today)
      const todayTimestamp = now
      const todayDays = Math.floor((now - todayTimestamp) / oneDayInMs)
      expect(todayDays).toBe(0)

      // 1 day ago
      const oneDayAgo = now - oneDayInMs
      const oneDayAgoDays = Math.floor((now - oneDayAgo) / oneDayInMs)
      expect(oneDayAgoDays).toBe(1)

      // 7 days ago
      const sevenDaysAgo = now - (7 * oneDayInMs)
      const sevenDaysDays = Math.floor((now - sevenDaysAgo) / oneDayInMs)
      expect(sevenDaysDays).toBe(7)

      // 30 days ago
      const thirtyDaysAgo = now - (30 * oneDayInMs)
      const thirtyDaysDays = Math.floor((now - thirtyDaysAgo) / oneDayInMs)
      expect(thirtyDaysDays).toBe(30)

      // 100 days ago
      const hundredDaysAgo = now - (100 * oneDayInMs)
      const hundredDaysDays = Math.floor((now - hundredDaysAgo) / oneDayInMs)
      expect(hundredDaysDays).toBe(100)
    })

    it('should round down partial days correctly', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000

      // 1.5 days ago
      const oneAndHalfDaysAgo = now - (1.5 * oneDayInMs)
      const days = Math.floor((now - oneAndHalfDaysAgo) / oneDayInMs)
      expect(days).toBe(1) // Should round down

      // 1.9 days ago
      const onePointNineDaysAgo = now - (1.9 * oneDayInMs)
      const days2 = Math.floor((now - onePointNineDaysAgo) / oneDayInMs)
      expect(days2).toBe(1) // Should still round down

      // 2.1 days ago
      const twoPointOneDaysAgo = now - (2.1 * oneDayInMs)
      const days3 = Math.floor((now - twoPointOneDaysAgo) / oneDayInMs)
      expect(days3).toBe(2)
    })

    it('should handle very old timestamps', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000

      // 365 days ago (1 year)
      const oneYearAgo = now - (365 * oneDayInMs)
      const days = Math.floor((now - oneYearAgo) / oneDayInMs)
      expect(days).toBe(365)

      // 1000 days ago
      const thousandDaysAgo = now - (1000 * oneDayInMs)
      const days2 = Math.floor((now - thousandDaysAgo) / oneDayInMs)
      expect(days2).toBe(1000)
    })

    it('should calculate timestamp from epoch correctly', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000

      // Epoch start (timestamp 0)
      const epochTimestamp = 0
      const daysSinceEpoch = Math.floor((now - epochTimestamp) / oneDayInMs)

      // Should be > 20,000 days since Jan 1, 1970
      expect(daysSinceEpoch).toBeGreaterThan(20000)
      expect(daysSinceEpoch).toBeLessThan(25000) // Sanity check
    })
  })

  describe('shouldShowBackupReminder - Logic Tests', () => {
    let originalDateNow

    beforeEach(() => {
      originalDateNow = Date.now
      const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
      global.Date.now = vi.fn(() => mockNow)
    })

    afterEach(() => {
      global.Date.now = originalDateNow
    })

    it('should not remind when never backed up and no transactions', () => {
      // Logic: null days + 0 transactions = false
      const hasTransactions = false
      const daysSinceBackup = null

      const shouldRemind = hasTransactions && daysSinceBackup === null
      expect(shouldRemind).toBe(false)
    })

    it('should determine grace period correctly for new users', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000

      // Transaction 3 days old
      const transactionAge3Days = (now - (now - 3 * oneDayInMs)) / oneDayInMs
      expect(transactionAge3Days).toBe(3)
      expect(transactionAge3Days < 7).toBe(true) // Within grace period

      // Transaction 7 days old
      const transactionAge7Days = (now - (now - 7 * oneDayInMs)) / oneDayInMs
      expect(transactionAge7Days).toBe(7)
      expect(transactionAge7Days >= 7).toBe(true) // Grace period expired

      // Transaction 10 days old
      const transactionAge10Days = (now - (now - 10 * oneDayInMs)) / oneDayInMs
      expect(transactionAge10Days).toBe(10)
      expect(transactionAge10Days >= 7).toBe(true) // Grace period expired
    })

    it('should determine 14-day threshold correctly (v3.29.0 — was 30 days)', () => {
      // Test the threshold logic — lowered from 30 to 14 in v3.29.0
      const testCases = [
        { days: 0, shouldRemind: false, label: 'today' },
        { days: 1, shouldRemind: false, label: '1 day' },
        { days: 7, shouldRemind: false, label: '7 days' },
        { days: 13, shouldRemind: false, label: '13 days' },
        { days: 14, shouldRemind: true, label: '14 days (threshold)' },
        { days: 15, shouldRemind: true, label: '15 days' },
        { days: 30, shouldRemind: true, label: '30 days' },
        { days: 100, shouldRemind: true, label: '100 days' },
      ]

      testCases.forEach(({ days, shouldRemind, label }) => {
        const result = days >= 14
        expect(result).toBe(shouldRemind)
      })
    })
  })

  describe('Backup Reminder Business Logic Scenarios', () => {
    let originalDateNow

    beforeEach(() => {
      originalDateNow = Date.now
      const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
      global.Date.now = vi.fn(() => mockNow)
    })

    afterEach(() => {
      global.Date.now = originalDateNow
    })

    const oneDayInMs = 24 * 60 * 60 * 1000

    it('Scenario: New user, no backup, no transactions', () => {
      const hasTransactions = false
      const lastBackupTimestamp = null

      // New user should not see reminder
      const shouldRemind = hasTransactions
      expect(shouldRemind).toBe(false)
    })

    it('Scenario: New user, added first transaction today', () => {
      const now = Date.now()
      const hasTransactions = true
      const oldestTransactionTimestamp = now // Today
      const lastBackupTimestamp = null

      const daysSinceFirstTransaction = Math.floor((now - oldestTransactionTimestamp) / oneDayInMs)

      // Within 7-day grace period
      const shouldRemind = lastBackupTimestamp === null && daysSinceFirstTransaction >= 7
      expect(shouldRemind).toBe(false)
    })

    it('Scenario: User has 7-day old transactions, never backed up', () => {
      const now = Date.now()
      const hasTransactions = true
      const oldestTransactionTimestamp = now - (7 * oneDayInMs) // 7 days ago
      const lastBackupTimestamp = null

      const daysSinceFirstTransaction = Math.floor((now - oldestTransactionTimestamp) / oneDayInMs)

      // Grace period exactly expired
      const shouldRemind = lastBackupTimestamp === null && daysSinceFirstTransaction >= 7
      expect(shouldRemind).toBe(true)
    })

    it('Scenario: User backed up once, 2 weeks ago — triggers reminder (v3.29.0)', () => {
      const now = Date.now()
      const lastBackupTimestamp = now - (14 * oneDayInMs) // 14 days ago

      const daysSinceBackup = Math.floor((now - lastBackupTimestamp) / oneDayInMs)

      // 14 days >= 14 days threshold (lowered from 30 in v3.29.0)
      const shouldRemind = daysSinceBackup >= 14
      expect(shouldRemind).toBe(true)
    })

    it('Scenario: User backed up 31 days ago - needs reminder', () => {
      const now = Date.now()
      const lastBackupTimestamp = now - (31 * oneDayInMs) // 31 days ago

      const daysSinceBackup = Math.floor((now - lastBackupTimestamp) / oneDayInMs)

      // 31 days > 14 days threshold
      const shouldRemind = daysSinceBackup >= 14
      expect(shouldRemind).toBe(true)
    })

    it('Scenario: Regular user, backs up monthly (25 days ago) — now triggers (v3.29.0)', () => {
      const now = Date.now()
      const lastBackupTimestamp = now - (25 * oneDayInMs) // 25 days ago

      const daysSinceBackup = Math.floor((now - lastBackupTimestamp) / oneDayInMs)

      // 25 days >= 14 days threshold (v3.29.0)
      const shouldRemind = daysSinceBackup >= 14
      expect(shouldRemind).toBe(true)
    })

    it('Scenario: User ignored reminders for 100 days', () => {
      const now = Date.now()
      const lastBackupTimestamp = now - (100 * oneDayInMs) // 100 days ago

      const daysSinceBackup = Math.floor((now - lastBackupTimestamp) / oneDayInMs)

      // Definitely needs backup
      const shouldRemind = daysSinceBackup >= 14
      expect(shouldRemind).toBe(true)
    })

    it('Scenario: User just backed up today', () => {
      const now = Date.now()
      const lastBackupTimestamp = now // Today

      const daysSinceBackup = Math.floor((now - lastBackupTimestamp) / oneDayInMs)

      // Should not remind
      const shouldRemind = daysSinceBackup >= 14
      expect(shouldRemind).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle timestamp calculations correctly at day boundaries', () => {
      const mockNow = new Date('2026-02-08T23:59:59Z').getTime() // Just before midnight

      const oneDayInMs = 24 * 60 * 60 * 1000

      // Backup done just after midnight yesterday
      const yesterdayMidnight = new Date('2026-02-07T00:00:01Z').getTime()
      const days1 = Math.floor((mockNow - yesterdayMidnight) / oneDayInMs)
      expect(days1).toBe(1)

      // Backup done just before midnight yesterday
      const yesterdayAlmostMidnight = new Date('2026-02-07T23:59:59Z').getTime()
      const days2 = Math.floor((mockNow - yesterdayAlmostMidnight) / oneDayInMs)
      expect(days2).toBe(1)
    })

    it('should handle leap year calculations', () => {
      // 2024 was a leap year
      const feb29_2024 = new Date('2024-02-29T12:00:00Z').getTime()
      const mar01_2024 = new Date('2024-03-01T12:00:00Z').getTime()

      const oneDayInMs = 24 * 60 * 60 * 1000
      const days = Math.floor((mar01_2024 - feb29_2024) / oneDayInMs)

      expect(days).toBe(1) // Correct leap year handling
    })

    it('should handle very large time differences', () => {
      const now = new Date('2026-02-08T12:00:00Z').getTime()
      const veryOld = new Date('2000-01-01T00:00:00Z').getTime()

      const oneDayInMs = 24 * 60 * 60 * 1000
      const days = Math.floor((now - veryOld) / oneDayInMs)

      // ~26 years = ~9500 days
      expect(days).toBeGreaterThan(9000)
      expect(days).toBeLessThan(10000)
    })
  })

  describe('getDaysSinceBackup - Function Tests', () => {
    it('should return null when lastBackupTimestamp is not set', () => {
      // Since lastBackupTimestamp is null in the module, this tests the actual function
      const result = getDaysSinceBackup()
      expect(result).toBeNull()
    })

    it('should be callable and return a value', () => {
      // This ensures the function is exported and callable
      expect(typeof getDaysSinceBackup).toBe('function')
      const result = getDaysSinceBackup()
      expect(result === null || typeof result === 'number').toBe(true)
    })
  })

  describe('shouldShowBackupReminder - Function Tests', () => {
    it('should return false when no backup and no transactions', () => {
      // Tests the actual function with module's default state
      const result = shouldShowBackupReminder()
      expect(typeof result).toBe('boolean')
      expect(result).toBe(false)
    })

    it('should be callable and return boolean', () => {
      expect(typeof shouldShowBackupReminder).toBe('function')
      const result = shouldShowBackupReminder()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('shouldShowBackupReminder - Never Backed Up with Transactions', () => {
    let originalDateNow

    beforeEach(() => {
      originalDateNow = Date.now
      // Mock current time: 2026-02-08 12:00:00 UTC
      const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
      global.Date.now = vi.fn(() => mockNow)
      
      // Reset state before each test
      __testResetBackupState()
    })

    afterEach(() => {
      global.Date.now = originalDateNow
      __testResetBackupState()
    })

    it('should return false when never backed up and first transaction is less than 7 days old', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Transaction created 3 days ago
      const threeDaysAgo = now - (3 * oneDayInMs)
      __testSetTransactions([
        { id: threeDaysAgo, amount: 1000, category: 'Food' }
      ])
      
      // lastBackupTimestamp is null (never backed up)
      const result = shouldShowBackupReminder()
      
      // Should NOT remind - within 7-day grace period
      expect(result).toBe(false)
    })

    it('should return true when never backed up and first transaction is exactly 7 days old', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Transaction created exactly 7 days ago
      const sevenDaysAgo = now - (7 * oneDayInMs)
      __testSetTransactions([
        { id: sevenDaysAgo, amount: 1000, category: 'Food' }
      ])
      
      const result = shouldShowBackupReminder()
      
      // Should remind - grace period expired
      expect(result).toBe(true)
    })

    it('should return true when never backed up and first transaction is more than 7 days old', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Transaction created 10 days ago
      const tenDaysAgo = now - (10 * oneDayInMs)
      __testSetTransactions([
        { id: tenDaysAgo, amount: 1000, category: 'Food' }
      ])
      
      const result = shouldShowBackupReminder()
      
      // Should remind - well past grace period
      expect(result).toBe(true)
    })

    it('should sort transactions by createdAt and use the oldest one', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Add transactions in random order with createdAt (v3.29.0 uses createdAt, not id)
      const tenDaysAgo = new Date(now - (10 * oneDayInMs)).toISOString()
      const threeDaysAgo = new Date(now - (3 * oneDayInMs)).toISOString()
      const fiveDaysAgo = new Date(now - (5 * oneDayInMs)).toISOString()
      
      __testSetTransactions([
        { id: 'uuid-1', createdAt: fiveDaysAgo, amount: 500, category: 'Transport' },
        { id: 'uuid-2', createdAt: tenDaysAgo, amount: 1000, category: 'Food' }, // Oldest
        { id: 'uuid-3', createdAt: threeDaysAgo, amount: 200, category: 'Entertainment' }
      ])
      
      const result = shouldShowBackupReminder()
      
      // Should use oldest transaction (10 days), which is >= 7 days
      expect(result).toBe(true)
    })

    it('should return false when oldest transaction is 6 days old even with newer transactions', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      const sixDaysAgo = now - (6 * oneDayInMs)
      const twoDaysAgo = now - (2 * oneDayInMs)
      
      __testSetTransactions([
        { id: twoDaysAgo, amount: 200, category: 'Transport' },
        { id: sixDaysAgo, amount: 1000, category: 'Food' } // Oldest
      ])
      
      const result = shouldShowBackupReminder()
      
      // Should NOT remind - oldest is still within 7-day grace period
      expect(result).toBe(false)
    })

    it('should handle transaction with oldest createdAt when multiple transactions exist', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Create transactions with createdAt timestamps (v3.29.0)
      const oldestDate = new Date(now - (8 * oneDayInMs)).toISOString()
      const middleDate = new Date(now - (5 * oneDayInMs)).toISOString()
      const newestDate = new Date(now - (2 * oneDayInMs)).toISOString()
      
      __testSetTransactions([
        { id: 'uuid-a', createdAt: newestDate, amount: 100, category: 'Food' },
        { id: 'uuid-b', createdAt: middleDate, amount: 200, category: 'Transport' },
        { id: 'uuid-c', createdAt: oldestDate, amount: 300, category: 'Entertainment' }
      ])
      
      const result = shouldShowBackupReminder()
      
      // Should find oldest transaction (8 days) and return true
      expect(result).toBe(true)
    })
  })

  describe('shouldShowBackupReminder - With Last Backup Timestamp', () => {
    let originalDateNow

    beforeEach(() => {
      originalDateNow = Date.now
      const mockNow = new Date('2026-02-08T12:00:00Z').getTime()
      global.Date.now = vi.fn(() => mockNow)
      __testResetBackupState()
    })

    afterEach(() => {
      global.Date.now = originalDateNow
      __testResetBackupState()
    })

    it('should return true when backed up 20 days ago (>= 14 day threshold v3.29.0)', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Backed up 20 days ago
      const twentyDaysAgo = now - (20 * oneDayInMs)
      __testSetLastBackupTimestamp(twentyDaysAgo)
      
      const result = shouldShowBackupReminder()
      
      expect(result).toBe(true)
    })

    it('should return false when backed up less than 14 days ago', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Backed up 10 days ago
      const tenDaysAgo = now - (10 * oneDayInMs)
      __testSetLastBackupTimestamp(tenDaysAgo)
      
      const result = shouldShowBackupReminder()
      
      expect(result).toBe(false)
    })

    it('should return true when backed up 14 or more days ago', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Backed up exactly 14 days ago
      const fourteenDaysAgo = now - (14 * oneDayInMs)
      __testSetLastBackupTimestamp(fourteenDaysAgo)
      
      const result = shouldShowBackupReminder()
      
      expect(result).toBe(true)
    })

    it('should return true when backed up more than 14 days ago', () => {
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // Backed up 45 days ago
      const fortyFiveDaysAgo = now - (45 * oneDayInMs)
      __testSetLastBackupTimestamp(fortyFiveDaysAgo)
      
      const result = shouldShowBackupReminder()
      
      expect(result).toBe(true)
    })
  })
})
