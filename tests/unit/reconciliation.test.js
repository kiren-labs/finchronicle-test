import { describe, it, expect } from 'vitest'
import {
  computeReconciledBase,
  computeCheckedBalance,
  filterCandidates,
} from '../../src/app.js'

// ── Fixtures ────────────────────────────────────────────────────────────────

const account = { name: 'Checking', openingBalance: 10000 }
const accounts = [account]

// Helpers to build minimal transaction objects
const expense = (id, amount, fromAccount, status = 'cleared', date = '2026-05-01') => ({
  id, type: 'expense', amount, fromAccount, toAccount: null, status, date, category: 'Food', notes: '',
})
const income = (id, amount, toAccount, status = 'cleared', date = '2026-05-01') => ({
  id, type: 'income', amount, toAccount, fromAccount: null, status, date, category: 'Salary', notes: '',
})
const transfer = (id, amount, fromAccount, toAccount, status = 'cleared') => ({
  id, type: 'transfer', amount, fromAccount, toAccount, status, date: '2026-05-01', category: 'Transfer', notes: '',
})

// ── computeReconciledBase ────────────────────────────────────────────────────

describe('computeReconciledBase', () => {
  it('returns openingBalance when no reconciled transactions', () => {
    const txs = [expense(1, 500, 'Checking', 'cleared')]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(10000)
  })

  it('adds reconciled income (toAccount) to opening balance', () => {
    const txs = [income(1, 2000, 'Checking', 'reconciled')]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(12000)
  })

  it('subtracts reconciled expense (fromAccount) from opening balance', () => {
    const txs = [expense(1, 1000, 'Checking', 'reconciled')]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(9000)
  })

  it('ignores cleared transactions (not yet reconciled)', () => {
    const txs = [
      expense(1, 500, 'Checking', 'cleared'),
      income(2, 300, 'Checking', 'pending'),
    ]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(10000)
  })

  it('ignores reconciled transfers', () => {
    const txs = [transfer(1, 5000, 'Checking', 'Savings', 'reconciled')]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(10000)
  })

  it('ignores transactions for a different account', () => {
    const txs = [
      income(1, 500, 'Savings', 'reconciled'),
      expense(2, 200, 'Savings', 'reconciled'),
    ]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(10000)
  })

  it('accumulates multiple reconciled transactions correctly', () => {
    const txs = [
      income(1, 5000, 'Checking', 'reconciled'),
      expense(2, 1500, 'Checking', 'reconciled'),
      expense(3, 800, 'Checking', 'reconciled'),
      income(4, 200, 'Checking', 'reconciled'),
    ]
    // 10000 + 5000 - 1500 - 800 + 200 = 12900
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(12900)
  })

  it('returns openingBalance for account with no transactions', () => {
    expect(computeReconciledBase('Checking', accounts, [])).toBe(10000)
  })

  it('returns 0 when account not found', () => {
    expect(computeReconciledBase('Unknown', accounts, [])).toBe(0)
  })

  it('handles missing openingBalance (defaults to 0)', () => {
    const accountNoBalance = [{ name: 'Cash' }]
    const txs = [income(1, 1000, 'Cash', 'reconciled')]
    expect(computeReconciledBase('Cash', accountNoBalance, txs)).toBe(1000)
  })

  it('does not double-count income if fromAccount matches (wrong side)', () => {
    // income.fromAccount should not count — only toAccount counts
    const txs = [{ id: 1, type: 'income', amount: 500, fromAccount: 'Checking', toAccount: 'Savings', status: 'reconciled', date: '2026-05-01' }]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(10000)
  })

  it('does not double-count expense if toAccount matches (wrong side)', () => {
    // expense.toAccount should not count — only fromAccount counts
    const txs = [{ id: 1, type: 'expense', amount: 500, fromAccount: 'Savings', toAccount: 'Checking', status: 'reconciled', date: '2026-05-01' }]
    expect(computeReconciledBase('Checking', accounts, txs)).toBe(10000)
  })
})

// ── computeCheckedBalance ────────────────────────────────────────────────────

describe('computeCheckedBalance', () => {
  it('returns reconciledBase when no candidates are checked', () => {
    const candidates = [expense(1, 500, 'Checking')]
    expect(computeCheckedBalance(10000, 'Checking', candidates, new Set())).toBe(10000)
  })

  it('subtracts checked expense from base', () => {
    const candidates = [expense(1, 500, 'Checking')]
    expect(computeCheckedBalance(10000, 'Checking', candidates, new Set([1]))).toBe(9500)
  })

  it('adds checked income to base', () => {
    const candidates = [income(1, 3000, 'Checking')]
    expect(computeCheckedBalance(10000, 'Checking', candidates, new Set([1]))).toBe(13000)
  })

  it('only includes checked items, not unchecked', () => {
    const candidates = [
      expense(1, 500, 'Checking'),
      expense(2, 200, 'Checking'),
      income(3, 1000, 'Checking'),
    ]
    // check only 1 and 3
    const result = computeCheckedBalance(10000, 'Checking', candidates, new Set([1, 3]))
    expect(result).toBe(10000 - 500 + 1000) // 10500
  })

  it('handles empty candidates', () => {
    expect(computeCheckedBalance(10000, 'Checking', [], new Set())).toBe(10000)
  })

  it('handles all candidates checked', () => {
    const candidates = [
      expense(1, 300, 'Checking'),
      expense(2, 200, 'Checking'),
      income(3, 1500, 'Checking'),
    ]
    const result = computeCheckedBalance(10000, 'Checking', candidates, new Set([1, 2, 3]))
    expect(result).toBe(10000 - 300 - 200 + 1500) // 11000
  })

  it('ignores candidates belonging to a different account', () => {
    const candidates = [income(1, 2000, 'Savings')]
    expect(computeCheckedBalance(10000, 'Checking', candidates, new Set([1]))).toBe(10000)
  })

  it('floating-point amounts accumulate without drift', () => {
    const candidates = [
      expense(1, 10.10, 'Checking'),
      expense(2, 5.05, 'Checking'),
    ]
    const result = computeCheckedBalance(100, 'Checking', candidates, new Set([1, 2]))
    // 100 - 10.10 - 5.05 = 84.85
    expect(Math.round(result * 100) / 100).toBe(84.85)
  })
})

// ── filterCandidates ─────────────────────────────────────────────────────────

describe('filterCandidates', () => {
  it('includes cleared expenses from this account up to statementDate', () => {
    const txs = [expense(1, 500, 'Checking', 'cleared', '2026-05-01')]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(1)
  })

  it('includes pending expenses', () => {
    const txs = [expense(1, 500, 'Checking', 'pending', '2026-05-01')]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(1)
  })

  it('includes cleared income (toAccount) from this account', () => {
    const txs = [income(1, 1000, 'Checking', 'cleared', '2026-05-01')]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(1)
  })

  it('excludes already-reconciled transactions', () => {
    const txs = [
      expense(1, 500, 'Checking', 'reconciled', '2026-05-01'),
      income(2, 1000, 'Checking', 'reconciled', '2026-05-01'),
    ]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(0)
  })

  it('excludes transactions after statementDate', () => {
    const txs = [
      expense(1, 500, 'Checking', 'cleared', '2026-05-01'),
      expense(2, 200, 'Checking', 'cleared', '2026-06-01'),
    ]
    const result = filterCandidates('Checking', '2026-05-31', txs)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('includes transaction exactly on statementDate', () => {
    const txs = [expense(1, 500, 'Checking', 'cleared', '2026-05-31')]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(1)
  })

  it('excludes transfers', () => {
    const txs = [transfer(1, 1000, 'Checking', 'Savings', 'cleared')]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(0)
  })

  it('excludes transactions for a different account', () => {
    const txs = [
      expense(1, 500, 'Savings', 'cleared', '2026-05-01'),
      income(2, 1000, 'Savings', 'cleared', '2026-05-01'),
    ]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(0)
  })

  it('excludes income where fromAccount matches but toAccount does not', () => {
    // income.fromAccount === 'Checking' should NOT be included — wrong direction
    const txs = [{ id: 1, type: 'income', amount: 500, fromAccount: 'Checking', toAccount: 'Savings', status: 'cleared', date: '2026-05-01' }]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(0)
  })

  it('excludes expense where toAccount matches but fromAccount does not', () => {
    // expense.toAccount === 'Checking' should NOT be included — wrong direction
    const txs = [{ id: 1, type: 'expense', amount: 500, fromAccount: 'Savings', toAccount: 'Checking', status: 'cleared', date: '2026-05-01' }]
    expect(filterCandidates('Checking', '2026-05-31', txs)).toHaveLength(0)
  })

  it('returns candidates sorted ascending by date', () => {
    const txs = [
      expense(1, 100, 'Checking', 'cleared', '2026-05-10'),
      expense(2, 200, 'Checking', 'cleared', '2026-05-01'),
      expense(3, 300, 'Checking', 'cleared', '2026-05-05'),
    ]
    const result = filterCandidates('Checking', '2026-05-31', txs)
    expect(result.map(t => t.id)).toEqual([2, 3, 1])
  })

  it('handles empty transaction list', () => {
    expect(filterCandidates('Checking', '2026-05-31', [])).toEqual([])
  })

  it('handles mix of all types and statuses correctly', () => {
    const txs = [
      expense(1, 100, 'Checking', 'cleared', '2026-05-01'),    // ✓ include
      expense(2, 200, 'Checking', 'reconciled', '2026-05-01'), // ✗ already reconciled
      income(3, 300, 'Checking', 'pending', '2026-05-01'),     // ✓ include
      income(4, 400, 'Savings', 'cleared', '2026-05-01'),      // ✗ wrong account
      transfer(5, 500, 'Checking', 'Savings', 'cleared'),      // ✗ transfer
      expense(6, 600, 'Checking', 'cleared', '2026-06-01'),    // ✗ after date
    ]
    const result = filterCandidates('Checking', '2026-05-31', txs)
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id).sort()).toEqual([1, 3])
  })
})

// ── Integration: base + checked = statement ──────────────────────────────────

describe('reconciliation math — end-to-end', () => {
  it('checks all candidates gives correct statement balance', () => {
    const txs = [
      income(1, 5000, 'Checking', 'reconciled'),  // already reconciled
      expense(2, 1000, 'Checking', 'cleared'),     // candidate
      expense(3, 500, 'Checking', 'cleared'),      // candidate
      income(4, 2000, 'Checking', 'cleared'),      // candidate
    ]
    // reconciledBase = 10000 + 5000 = 15000
    const base = computeReconciledBase('Checking', accounts, txs)
    expect(base).toBe(15000)

    const candidates = filterCandidates('Checking', '2026-12-31', txs)
    expect(candidates).toHaveLength(3)

    // check all
    const checkedIds = new Set(candidates.map(t => t.id))
    const final = computeCheckedBalance(base, 'Checking', candidates, checkedIds)
    // 15000 - 1000 - 500 + 2000 = 15500
    expect(final).toBe(15500)
  })

  it('partial check produces expected partial balance', () => {
    const txs = [
      expense(1, 400, 'Checking', 'cleared'),
      expense(2, 600, 'Checking', 'cleared'),
      income(3, 1000, 'Checking', 'cleared'),
    ]
    const base = computeReconciledBase('Checking', accounts, txs)
    expect(base).toBe(10000) // no reconciled txs yet

    const candidates = filterCandidates('Checking', '2026-12-31', txs)
    // only check expense 1 and income 3
    const final = computeCheckedBalance(base, 'Checking', candidates, new Set([1, 3]))
    expect(final).toBe(10000 - 400 + 1000) // 10600
  })
})
