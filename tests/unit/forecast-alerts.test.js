import { describe, it, expect } from 'vitest'
import {
  buildForecast,
  computeNextDueDate,
  getAccountBalance,
  checkInactivityAlert,
  checkBillDueAlert,
  checkSavingsRateTrendAlert,
  checkMonthlyPaceAlert,
} from '../../src/app.js'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const account = (name, openingBalance = 10000) => ({ name, openingBalance })
const expense = (id, amount, fromAccount, date = '2026-05-01') => ({
  id, type: 'expense', amount, fromAccount, toAccount: null, date, category: 'Food', notes: '', createdAt: date + 'T00:00:00.000Z',
})
const income = (id, amount, toAccount, date = '2026-05-01') => ({
  id, type: 'income', amount, toAccount, fromAccount: null, date, category: 'Salary', notes: '', createdAt: date + 'T00:00:00.000Z',
})
const template = (overrides) => ({
  enabled: true,
  type: 'expense',
  name: 'Rent',
  category: 'Housing',
  amount: 5000,
  frequency: 'monthly',
  dayOfMonth: 1,
  fromAccount: 'Checking',
  toAccount: null,
  nextDueDate: '2026-06-01',
  ...overrides,
})

// ── computeNextDueDate ────────────────────────────────────────────────────────

describe('computeNextDueDate', () => {
  it('advances monthly by one month', () => {
    expect(computeNextDueDate('monthly', 15, '2026-05-15')).toBe('2026-06-15')
  })

  it('handles year boundary (December → January)', () => {
    expect(computeNextDueDate('monthly', 1, '2026-12-01')).toBe('2027-01-01')
  })

  it('advances a mid-month date by one month correctly', () => {
    // No overflow risk — day 15 exists in every month
    expect(computeNextDueDate('monthly', 15, '2026-03-15')).toBe('2026-04-15')
  })

  it('advances weekly by 7 days', () => {
    expect(computeNextDueDate('weekly', null, '2026-05-01')).toBe('2026-05-08')
  })

  it('advances biweekly by 14 days', () => {
    expect(computeNextDueDate('biweekly', null, '2026-05-01')).toBe('2026-05-15')
  })

  it('advances daily by 1 day', () => {
    expect(computeNextDueDate('daily', null, '2026-05-01')).toBe('2026-05-02')
  })

  it('advances quarterly by 3 months', () => {
    expect(computeNextDueDate('quarterly', null, '2026-01-15')).toBe('2026-04-15')
  })

  it('advances yearly by 1 year', () => {
    expect(computeNextDueDate('yearly', null, '2026-05-01')).toBe('2027-05-01')
  })
})

// ── getAccountBalance ─────────────────────────────────────────────────────────

describe('getAccountBalance', () => {
  it('returns opening balance with no transactions', () => {
    expect(getAccountBalance('Checking', [account('Checking', 10000)], [])).toBe(10000)
  })

  it('credits income to toAccount', () => {
    const txs = [income(1, 2000, 'Checking')]
    expect(getAccountBalance('Checking', [account('Checking', 10000)], txs)).toBe(12000)
  })

  it('debits expense from fromAccount', () => {
    const txs = [expense(1, 3000, 'Checking')]
    expect(getAccountBalance('Checking', [account('Checking', 10000)], txs)).toBe(7000)
  })

  it('ignores transactions for other accounts', () => {
    const txs = [expense(1, 3000, 'Savings')]
    expect(getAccountBalance('Checking', [account('Checking', 10000)], txs)).toBe(10000)
  })

  it('returns 0 for unknown account with no transactions', () => {
    expect(getAccountBalance('Unknown', [], [])).toBe(0)
  })
})

// ── buildForecast ─────────────────────────────────────────────────────────────

describe('buildForecast — empty inputs', () => {
  it('returns empty forecast when no templates', () => {
    const { accountForecasts, warnings } = buildForecast([], [], [], 90)
    expect(accountForecasts).toEqual({})
    expect(warnings).toEqual([])
  })

  it('returns empty forecast when all templates are disabled', () => {
    const tmpl = template({ enabled: false })
    const { accountForecasts } = buildForecast([], [], [tmpl], 90)
    expect(accountForecasts).toEqual({})
  })

  it('returns empty forecast when templates have no account links', () => {
    const tmpl = template({ fromAccount: null, toAccount: null })
    const { accountForecasts } = buildForecast([], [], [tmpl], 90)
    expect(accountForecasts).toEqual({})
  })
})

describe('buildForecast — single monthly expense', () => {
  const accounts = [account('Checking', 20000)]
  const tmpl = template({ nextDueDate: '2026-06-01', amount: 5000, frequency: 'monthly', dayOfMonth: 1 })

  it('generates one event in a 30-day horizon from 2026-05-23', () => {
    // horizon: 2026-05-23 → 2026-06-22  →  Jun 1 is within range
    const { accountForecasts } = buildForecast(accounts, [], [tmpl], 30)
    expect(accountForecasts['Checking'].events.length).toBe(1)
  })

  it('generates two events in a 60-day horizon (Jun 1 + Jul 1)', () => {
    const { accountForecasts } = buildForecast(accounts, [], [tmpl], 60)
    expect(accountForecasts['Checking'].events.length).toBe(2)
  })

  it('debits fromAccount correctly', () => {
    const { accountForecasts } = buildForecast(accounts, [], [tmpl], 30)
    const ev = accountForecasts['Checking'].events[0]
    expect(ev.amount).toBe(-5000)
    expect(ev.runningBalance).toBe(15000)
  })

  it('sets currentBalance from account opening balance', () => {
    const { accountForecasts } = buildForecast(accounts, [], [tmpl], 30)
    expect(accountForecasts['Checking'].currentBalance).toBe(20000)
  })
})

describe('buildForecast — income template credits toAccount', () => {
  const accounts = [account('Savings', 5000)]
  const tmpl = template({ type: 'income', fromAccount: null, toAccount: 'Savings', nextDueDate: '2026-06-01', amount: 3000 })

  it('credits toAccount on income template', () => {
    const { accountForecasts } = buildForecast(accounts, [], [tmpl], 30)
    const ev = accountForecasts['Savings'].events[0]
    expect(ev.amount).toBe(3000)
    expect(ev.runningBalance).toBe(8000)
  })
})

describe('buildForecast — negative balance warning', () => {
  it('fires warning when account goes negative', () => {
    const accounts = [account('Checking', 3000)]
    const tmpl = template({ nextDueDate: '2026-06-01', amount: 5000 })
    const { warnings } = buildForecast(accounts, [], [tmpl], 30)
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0].account).toBe('Checking')
    expect(warnings[0].balance).toBeLessThan(0)
  })

  it('no warning when balance stays positive', () => {
    const accounts = [account('Checking', 20000)]
    const tmpl = template({ nextDueDate: '2026-06-01', amount: 5000 })
    const { warnings } = buildForecast(accounts, [], [tmpl], 30)
    expect(warnings).toEqual([])
  })
})

describe('buildForecast — weekly template event count', () => {
  it('generates ~13 events for weekly template over 90 days', () => {
    const accounts = [account('Checking', 100000)]
    const tmpl = template({ frequency: 'weekly', nextDueDate: '2026-05-25', amount: 100 })
    const { accountForecasts } = buildForecast(accounts, [], [tmpl], 90)
    const count = accountForecasts['Checking'].events.length
    expect(count).toBeGreaterThanOrEqual(12)
    expect(count).toBeLessThanOrEqual(14)
  })
})

describe('buildForecast — existing transactions affect opening balance', () => {
  it('uses current running balance (opening + past transactions) as baseline', () => {
    const accounts = [account('Checking', 10000)]
    const txs = [expense(1, 2000, 'Checking')]  // balance now 8000
    const tmpl = template({ nextDueDate: '2026-06-01', amount: 1000 })
    const { accountForecasts } = buildForecast(accounts, txs, [tmpl], 30)
    expect(accountForecasts['Checking'].currentBalance).toBe(8000)
    expect(accountForecasts['Checking'].events[0].runningBalance).toBe(7000)
  })
})

// ── checkInactivityAlert ──────────────────────────────────────────────────────

describe('checkInactivityAlert', () => {
  it('returns null when last transaction is within 4 days', () => {
    const txs = [{ date: '2026-05-20', createdAt: '2026-05-20T10:00:00.000Z' }]
    expect(checkInactivityAlert(txs, '2026-05-23')).toBeNull()
  })

  it('fires when last transaction is exactly 5 days ago', () => {
    // Use midnight UTC so Math.floor gives exactly 5 full days
    const txs = [{ date: '2026-05-18', createdAt: '2026-05-18T00:00:00.000Z' }]
    const result = checkInactivityAlert(txs, '2026-05-23')
    expect(result).not.toBeNull()
    expect(result.type).toBe('inactivity')
    expect(result.diffDays).toBe(5)
  })

  it('fires when last transaction is 10 days ago', () => {
    const txs = [{ date: '2026-05-13', createdAt: '2026-05-13T00:00:00.000Z' }]
    const result = checkInactivityAlert(txs, '2026-05-23')
    expect(result.diffDays).toBe(10)
  })

  it('returns null when transactions array is empty', () => {
    expect(checkInactivityAlert([], '2026-05-23')).toBeNull()
  })

  it('picks most recent transaction when multiple exist', () => {
    const txs = [
      { date: '2026-05-10', createdAt: '2026-05-10T00:00:00.000Z' },
      { date: '2026-05-22', createdAt: '2026-05-22T00:00:00.000Z' },
    ]
    // Latest is May 22, today May 23 → 1 day → no alert
    expect(checkInactivityAlert(txs, '2026-05-23')).toBeNull()
  })
})

// ── checkBillDueAlert ─────────────────────────────────────────────────────────

describe('checkBillDueAlert', () => {
  const accounts = [account('Checking', 3000)]

  it('fires when bill is due in 2 days and balance is low', () => {
    const tmpl = template({ nextDueDate: '2026-05-25', amount: 5000 })  // balance 3000 < 5000*1.2=6000
    const alerts = checkBillDueAlert([tmpl], accounts, [], '2026-05-23')
    expect(alerts.length).toBe(1)
    expect(alerts[0].type).toBe('bill-due')
    expect(alerts[0].daysUntil).toBe(2)
  })

  it('does not fire when balance is sufficient (≥ 1.2× amount)', () => {
    const accounts2 = [account('Checking', 7000)]  // 7000 ≥ 5000*1.2=6000
    const tmpl = template({ nextDueDate: '2026-05-25', amount: 5000 })
    expect(checkBillDueAlert([tmpl], accounts2, [], '2026-05-23')).toEqual([])
  })

  it('does not fire when bill is more than 3 days away', () => {
    const tmpl = template({ nextDueDate: '2026-05-30', amount: 5000 })
    expect(checkBillDueAlert([tmpl], accounts, [], '2026-05-23')).toEqual([])
  })

  it('does not fire when template is disabled', () => {
    const tmpl = template({ nextDueDate: '2026-05-25', amount: 5000, enabled: false })
    expect(checkBillDueAlert([tmpl], accounts, [], '2026-05-23')).toEqual([])
  })

  it('does not fire for income templates', () => {
    const tmpl = template({ type: 'income', nextDueDate: '2026-05-25', amount: 5000 })
    expect(checkBillDueAlert([tmpl], accounts, [], '2026-05-23')).toEqual([])
  })

  it('does not fire when template has no fromAccount', () => {
    const tmpl = template({ nextDueDate: '2026-05-25', amount: 5000, fromAccount: null })
    expect(checkBillDueAlert([tmpl], accounts, [], '2026-05-23')).toEqual([])
  })

  it('fires on same-day bill (daysUntil = 0)', () => {
    const tmpl = template({ nextDueDate: '2026-05-23', amount: 5000 })
    const alerts = checkBillDueAlert([tmpl], accounts, [], '2026-05-23')
    expect(alerts.length).toBe(1)
    expect(alerts[0].daysUntil).toBe(0)
  })
})

// ── checkSavingsRateTrendAlert ────────────────────────────────────────────────

describe('checkSavingsRateTrendAlert', () => {
  it('fires when all 3 months are below 10%', () => {
    const result = checkSavingsRateTrendAlert([5, 4, 3])
    expect(result).not.toBeNull()
    expect(result.type).toBe('savings-rate-trend')
    expect(result.avg).toBe(4)
  })

  it('does not fire when any month is above 10%', () => {
    expect(checkSavingsRateTrendAlert([5, 12, 3])).toBeNull()
  })

  it('does not fire when exactly at 10%', () => {
    expect(checkSavingsRateTrendAlert([10, 9, 8])).toBeNull()
  })

  it('returns null with fewer than 3 months', () => {
    expect(checkSavingsRateTrendAlert([5, 4])).toBeNull()
  })

  it('computes average correctly', () => {
    const result = checkSavingsRateTrendAlert([6, 8, 4])
    expect(result.avg).toBe(6)
  })

  it('uses last 3 when given more than 3 months', () => {
    // First month (20%) should be ignored — only last 3 matter
    const result = checkSavingsRateTrendAlert([20, 5, 4, 3])
    expect(result).not.toBeNull()
  })

  it('handles null rates gracefully', () => {
    // null means no income that month — treat as not below threshold
    expect(checkSavingsRateTrendAlert([null, 5, 4])).toBeNull()
  })
})

// ── checkMonthlyPaceAlert ─────────────────────────────────────────────────────

describe('checkMonthlyPaceAlert', () => {
  const budgets = [{ category: 'Food', monthlyLimit: 5000 }]

  it('fires when projected spend exceeds limit by more than 20%', () => {
    // spent 4000 by day 10 of 30 → projected = 12000 > 5000*1.2=6000
    const alerts = checkMonthlyPaceAlert(budgets, { Food: 4000 }, 10, 30)
    expect(alerts.length).toBe(1)
    expect(alerts[0].type).toBe('monthly-pace')
    expect(alerts[0].category).toBe('Food')
    expect(alerts[0].projected).toBe(12000)
    expect(alerts[0].limit).toBe(5000)
  })

  it('does not fire when pace is within 20% of limit', () => {
    // spent 1500 by day 10 → projected 4500 < 6000 (120% of 5000)
    expect(checkMonthlyPaceAlert(budgets, { Food: 1500 }, 10, 30)).toEqual([])
  })

  it('does not fire before day 5 (insufficient data)', () => {
    const alerts = checkMonthlyPaceAlert(budgets, { Food: 4000 }, 4, 30)
    expect(alerts).toEqual([])
  })

  it('does not fire when spending is 0 in that category', () => {
    expect(checkMonthlyPaceAlert(budgets, { Food: 0 }, 10, 30)).toEqual([])
  })

  it('does not fire when no budgets set', () => {
    expect(checkMonthlyPaceAlert([], { Food: 4000 }, 10, 30)).toEqual([])
  })

  it('fires multiple alerts for multiple over-budget categories', () => {
    const multi = [
      { category: 'Food', monthlyLimit: 5000 },
      { category: 'Transport', monthlyLimit: 2000 },
    ]
    const alerts = checkMonthlyPaceAlert(multi, { Food: 4000, Transport: 2000 }, 10, 30)
    expect(alerts.length).toBe(2)
  })
})
