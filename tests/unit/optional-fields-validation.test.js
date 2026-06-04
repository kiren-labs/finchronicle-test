import { describe, it, expect } from 'vitest'
import { validateTransaction, PAYMENT_METHODS, EXPENSE_TYPES } from '../../src/app.js'

// Base valid expense used across tests
const base = () => ({
  type: 'expense',
  amount: 100,
  category: 'Food',
  date: '2026-02-01',
  notes: '',
})

// ─── Transfer type (v3.10.x) ──────────────────────────────────────────────────

describe('validateTransaction - Transfer type', () => {
  it('should accept valid transfer with distinct accounts', () => {
    const result = validateTransaction({
      type: 'transfer',
      amount: 5000,
      category: 'Transfer',
      date: '2026-02-01',
      fromAccount: 'Cash',
      toAccount: 'Savings',
    })
    expect(result.valid).toBe(true)
    expect(result.sanitized.category).toBe('Transfer')
  })

  it('should auto-set category to Transfer', () => {
    const result = validateTransaction({
      type: 'transfer',
      amount: 1000,
      date: '2026-02-01',
      fromAccount: 'Cash',
      toAccount: 'Bank Account',
    })
    expect(result.sanitized.category).toBe('Transfer')
  })

  it('should reject transfer missing fromAccount', () => {
    const result = validateTransaction({
      type: 'transfer',
      amount: 1000,
      date: '2026-02-01',
      fromAccount: '',
      toAccount: 'Savings',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'fromAccount')).toBe(true)
  })

  it('should reject transfer missing toAccount', () => {
    const result = validateTransaction({
      type: 'transfer',
      amount: 1000,
      date: '2026-02-01',
      fromAccount: 'Cash',
      toAccount: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'toAccount')).toBe(true)
  })

  it('should reject transfer where source and destination are the same', () => {
    const result = validateTransaction({
      type: 'transfer',
      amount: 1000,
      date: '2026-02-01',
      fromAccount: 'Cash',
      toAccount: 'Cash',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      field: 'toAccount',
      message: 'Source and destination accounts cannot be the same.',
    })
  })

  it('should treat same-account comparison as case-insensitive', () => {
    const result = validateTransaction({
      type: 'transfer',
      amount: 1000,
      date: '2026-02-01',
      fromAccount: 'cash',
      toAccount: 'CASH',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message === 'Source and destination accounts cannot be the same.')).toBe(true)
  })

  it('should sanitize transferNote', () => {
    const result = validateTransaction({
      type: 'transfer',
      amount: 500,
      date: '2026-02-01',
      fromAccount: 'Cash',
      toAccount: 'Savings',
      transferNote: 'Moving <b>funds</b>',
    })
    expect(typeof result.sanitized.transferNote).toBe('string')
  })
})

// ─── Tags validation (v3.x) ──────────────────────────────────────────────────

describe('validateTransaction - Tags', () => {
  it('should accept up to 15 tags', () => {
    const tags = Array.from({ length: 15 }, (_, i) => `tag${i}`)
    const result = validateTransaction({ ...base(), tags })
    expect(result.valid).toBe(true)
    expect(result.sanitized.tags).toHaveLength(15)
  })

  it('should reject more than 15 tags', () => {
    const tags = Array.from({ length: 16 }, (_, i) => `tag${i}`)
    const result = validateTransaction({ ...base(), tags })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'tags', message: 'Maximum 15 tags allowed.' })
  })

  it('should filter out tags longer than 30 characters', () => {
    const tags = ['short', 'a'.repeat(31)]
    const result = validateTransaction({ ...base(), tags })
    expect(result.valid).toBe(true)
    expect(result.sanitized.tags).toHaveLength(1)
    expect(result.sanitized.tags[0]).toBe('short')
  })

  it('should filter out empty tags', () => {
    const result = validateTransaction({ ...base(), tags: ['', 'food', '   '] })
    expect(result.sanitized.tags).toHaveLength(1)
    expect(result.sanitized.tags[0]).toBe('food')
  })

  it('should accept empty tags array', () => {
    const result = validateTransaction({ ...base(), tags: [] })
    expect(result.valid).toBe(true)
    expect(result.sanitized.tags).toHaveLength(0)
  })

  it('should treat missing tags as empty array', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
    expect(result.sanitized.tags).toHaveLength(0)
  })

  it('should accept tags exactly 30 characters long', () => {
    const tags = ['a'.repeat(30)]
    const result = validateTransaction({ ...base(), tags })
    expect(result.sanitized.tags).toHaveLength(1)
  })
})

// ─── Optional fields — v3.16.0 ───────────────────────────────────────────────

describe('PAYMENT_METHODS and EXPENSE_TYPES constants', () => {
  it('should export PAYMENT_METHODS as a non-empty array', () => {
    expect(Array.isArray(PAYMENT_METHODS)).toBe(true)
    expect(PAYMENT_METHODS.length).toBeGreaterThan(0)
  })

  it('should include expected payment methods', () => {
    expect(PAYMENT_METHODS).toContain('cash')
    expect(PAYMENT_METHODS).toContain('credit-card')
    expect(PAYMENT_METHODS).toContain('bank-transfer')
  })

  it('should export EXPENSE_TYPES as a non-empty array', () => {
    expect(Array.isArray(EXPENSE_TYPES)).toBe(true)
    expect(EXPENSE_TYPES.length).toBeGreaterThan(0)
  })

  it('should include expected expense types', () => {
    expect(EXPENSE_TYPES).toContain('personal')
    expect(EXPENSE_TYPES).toContain('business')
    expect(EXPENSE_TYPES).toContain('reimbursable')
  })
})

describe('validateTransaction - paymentMethod (v3.16.0)', () => {
  it('should accept a valid payment method', () => {
    PAYMENT_METHODS.forEach(method => {
      const result = validateTransaction({ ...base(), paymentMethod: method })
      expect(result.valid).toBe(true)
    })
  })

  it('should reject an invalid payment method', () => {
    const result = validateTransaction({ ...base(), paymentMethod: 'bitcoin' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'paymentMethod', message: 'Select a valid payment method.' })
  })

  it('should allow missing paymentMethod (nullable)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
  })
})

describe('validateTransaction - expenseType (v3.16.0)', () => {
  it('should accept a valid expense type', () => {
    EXPENSE_TYPES.forEach(type => {
      const result = validateTransaction({ ...base(), expenseType: type })
      expect(result.valid).toBe(true)
    })
  })

  it('should reject an invalid expense type', () => {
    const result = validateTransaction({ ...base(), expenseType: 'luxury' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'expenseType', message: 'Select a valid expense type.' })
  })

  it('should allow missing expenseType (nullable)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
  })
})

describe('validateTransaction - merchant (v3.16.0)', () => {
  it('should accept a valid merchant name', () => {
    const result = validateTransaction({ ...base(), merchant: 'Starbucks' })
    expect(result.valid).toBe(true)
  })

  it('should reject merchant name longer than 100 characters', () => {
    const result = validateTransaction({ ...base(), merchant: 'a'.repeat(101) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'merchant', message: 'Merchant name is too long (max 100 characters).' })
  })

  it('should accept merchant name exactly 100 characters', () => {
    const result = validateTransaction({ ...base(), merchant: 'a'.repeat(100) })
    expect(result.valid).toBe(true)
  })

  it('should sanitize merchant name', () => {
    const result = validateTransaction({ ...base(), merchant: 'Shop <b>Name</b>' })
    expect(typeof result.sanitized.merchant).toBe('string')
  })

  it('should allow missing merchant (nullable)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
  })
})

describe('validateTransaction - attachedTo (v3.16.0)', () => {
  it('should accept a valid person name', () => {
    const result = validateTransaction({ ...base(), attachedTo: 'John' })
    expect(result.valid).toBe(true)
  })

  it('should reject name longer than 50 characters', () => {
    const result = validateTransaction({ ...base(), attachedTo: 'a'.repeat(51) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'attachedTo', message: 'Person name is too long (max 50 characters).' })
  })

  it('should accept name exactly 50 characters', () => {
    const result = validateTransaction({ ...base(), attachedTo: 'a'.repeat(50) })
    expect(result.valid).toBe(true)
  })

  it('should allow missing attachedTo (nullable)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
  })
})

describe('validateTransaction - referenceId (v3.16.0)', () => {
  it('should accept a valid reference ID', () => {
    const result = validateTransaction({ ...base(), referenceId: 'TXN-001' })
    expect(result.valid).toBe(true)
  })

  it('should reject reference ID longer than 100 characters', () => {
    const result = validateTransaction({ ...base(), referenceId: 'a'.repeat(101) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'referenceId', message: 'Reference ID is too long (max 100 characters).' })
  })

  it('should accept reference ID exactly 100 characters', () => {
    const result = validateTransaction({ ...base(), referenceId: 'a'.repeat(100) })
    expect(result.valid).toBe(true)
  })

  it('should allow missing referenceId (nullable)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
  })
})

describe('validateTransaction - location (v3.16.0)', () => {
  it('should accept a valid location', () => {
    const result = validateTransaction({ ...base(), location: 'Bangkok' })
    expect(result.valid).toBe(true)
  })

  it('should reject location longer than 100 characters', () => {
    const result = validateTransaction({ ...base(), location: 'a'.repeat(101) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'location', message: 'Location is too long (max 100 characters).' })
  })

  it('should accept location exactly 100 characters', () => {
    const result = validateTransaction({ ...base(), location: 'a'.repeat(100) })
    expect(result.valid).toBe(true)
  })

  it('should allow missing location (nullable)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
  })
})

// ─── Account Linking — v4.0.0 ────────────────────────────────────────────────

describe('validateTransaction - account linking (v4.0.0)', () => {
  it('should accept expense with fromAccount set', () => {
    const result = validateTransaction({ ...base(), fromAccount: 'Checking' })
    expect(result.valid).toBe(true)
  })

  it('should accept income with toAccount set', () => {
    const result = validateTransaction({ type: 'income', amount: 5000, category: 'Salary', date: '2026-05-20', notes: '', toAccount: 'Savings' })
    expect(result.valid).toBe(true)
  })

  it('should accept expense without fromAccount (optional)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
    expect(result.sanitized.fromAccount).toBeUndefined()
  })

  it('should not set fromAccount on income type', () => {
    // income with toAccount should not gain an unexpected fromAccount
    const result = validateTransaction({ type: 'income', amount: 1000, category: 'Salary', date: '2026-05-20', notes: '', toAccount: 'Bank' })
    expect(result.valid).toBe(true)
    expect(result.sanitized.toAccount).toBeDefined()
  })

  it('should not confuse account linking with transfer validation', () => {
    // expense with fromAccount should NOT trigger transfer-only validation errors
    const result = validateTransaction({ ...base(), fromAccount: 'Cash' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

// ─── Multi-currency — v3.24.0 ────────────────────────────────────────────────

describe('validateTransaction - multi-currency (v3.24.0)', () => {
  it('should accept same currency as home currency (USD fallback) with no exchange rate', () => {
    // When localStorage has no "currency" key, homeCurrency falls back to "USD"
    const result = validateTransaction({ ...base(), transactionCurrency: 'USD' })
    expect(result.valid).toBe(true)
  })

  it('should reject an unrecognised transaction currency', () => {
    const result = validateTransaction({ ...base(), transactionCurrency: 'XYZ' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'transactionCurrency', message: 'Invalid transaction currency' })
  })

  it('should require exchange rate when currency differs from home currency', () => {
    // Home is USD (fallback), so EUR is a foreign currency
    const result = validateTransaction({ ...base(), transactionCurrency: 'EUR' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      field: 'exchangeRate',
      message: 'Enter the conversion rate for this foreign currency.',
    })
  })

  it('should accept foreign currency with a positive exchange rate', () => {
    const result = validateTransaction({ ...base(), transactionCurrency: 'EUR', exchangeRate: 90.5 })
    expect(result.valid).toBe(true)
  })

  it('should reject foreign currency with zero exchange rate', () => {
    const result = validateTransaction({ ...base(), transactionCurrency: 'EUR', exchangeRate: 0 })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'exchangeRate')).toBe(true)
  })

  it('should reject foreign currency with negative exchange rate', () => {
    const result = validateTransaction({ ...base(), transactionCurrency: 'EUR', exchangeRate: -1 })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'exchangeRate')).toBe(true)
  })

  it('should reject foreign currency with NaN exchange rate', () => {
    const result = validateTransaction({ ...base(), transactionCurrency: 'EUR', exchangeRate: NaN })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'exchangeRate')).toBe(true)
  })

  it('should allow missing transactionCurrency (nullable)', () => {
    const result = validateTransaction(base())
    expect(result.valid).toBe(true)
  })
})
