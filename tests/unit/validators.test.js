import { describe, it, expect } from 'vitest'
import { normalizeImportedCategory } from '../../src/app.js'

describe('normalizeImportedCategory - Expense', () => {
  it('should use provided category if valid', () => {
    expect(normalizeImportedCategory('Rent', '', 'expense')).toBe('Rent')
    expect(normalizeImportedCategory('Transport', '', 'expense')).toBe('Transport')
  })

  it('should detect Food from keywords', () => {
    expect(normalizeImportedCategory('', 'KFC dinner', 'expense')).toBe('Food')
    expect(normalizeImportedCategory('', 'McDonald lunch', 'expense')).toBe('Food')
    expect(normalizeImportedCategory('', 'Subway sandwich', 'expense')).toBe('Food')
    expect(normalizeImportedCategory('', 'Coffee shop', 'expense')).toBe('Food')
    expect(normalizeImportedCategory('', 'Restaurant dinner', 'expense')).toBe('Food')
  })

  it('should detect Groceries from keywords', () => {
    expect(normalizeImportedCategory('', 'Big C shopping', 'expense')).toBe('Groceries')
    expect(normalizeImportedCategory('', 'Grocery store', 'expense')).toBe('Groceries')
    expect(normalizeImportedCategory('', 'Market vegetables', 'expense')).toBe('Groceries')
    expect(normalizeImportedCategory('', 'Fruits from Lotus', 'expense')).toBe('Groceries')
    expect(normalizeImportedCategory('', '7-11 milk', 'expense')).toBe('Groceries')
  })

  it('should detect Transport from keywords', () => {
    expect(normalizeImportedCategory('', 'Taxi to airport', 'expense')).toBe('Transport')
    expect(normalizeImportedCategory('', 'Bus fare', 'expense')).toBe('Transport')
    expect(normalizeImportedCategory('', 'MRT ticket', 'expense')).toBe('Transport')
    expect(normalizeImportedCategory('', 'Fuel for car', 'expense')).toBe('Transport')
  })

  it('should detect Utilities/Bills from keywords', () => {
    expect(normalizeImportedCategory('', 'Electricity bill', 'expense')).toBe('Utilities/Bills')
    expect(normalizeImportedCategory('', 'Water bill', 'expense')).toBe('Utilities/Bills')
    expect(normalizeImportedCategory('', 'Phone bill', 'expense')).toBe('Utilities/Bills')
    expect(normalizeImportedCategory('', 'Internet True', 'expense')).toBe('Utilities/Bills')
  })

  it('should detect Kids/School from keywords', () => {
    expect(normalizeImportedCategory('', 'Kevin school fee', 'expense')).toBe('Kids/School')
    expect(normalizeImportedCategory('', 'Playschool tuition', 'expense')).toBe('Kids/School')
    expect(normalizeImportedCategory('', 'Kids birthday party', 'expense')).toBe('Kids/School')
  })

  it('should detect Household from keywords', () => {
    expect(normalizeImportedCategory('', 'Cleaning supplies', 'expense')).toBe('Household')
    expect(normalizeImportedCategory('', 'Mirror repair', 'expense')).toBe('Household')
  })

  it('should detect Insurance/Taxes from keywords', () => {
    expect(normalizeImportedCategory('', 'Insurance premium', 'expense')).toBe('Insurance/Taxes')
    expect(normalizeImportedCategory('', 'Tax payment', 'expense')).toBe('Insurance/Taxes')
  })

  it('should detect Savings/Investments from keywords', () => {
    expect(normalizeImportedCategory('', 'SIP investment', 'expense')).toBe('Savings/Investments')
    expect(normalizeImportedCategory('', 'Mutual fund', 'expense')).toBe('Savings/Investments')
    expect(normalizeImportedCategory('', 'Stock purchase', 'expense')).toBe('Savings/Investments')
  })

  it('should detect Charity/Gifts from keywords', () => {
    expect(normalizeImportedCategory('', 'Charity donation', 'expense')).toBe('Charity/Gifts')
    expect(normalizeImportedCategory('', 'Birthday gift', 'expense')).toBe('Charity/Gifts')
    expect(normalizeImportedCategory('', 'Event contribution', 'expense')).toBe('Charity/Gifts')
  })

  it('should return Other Expense for unknown categories', () => {
    expect(normalizeImportedCategory('', 'random stuff', 'expense')).toBe('Other Expense')
    expect(normalizeImportedCategory('Unknown', 'no keywords', 'expense')).toBe('Unknown')
  })

  it('should handle case-insensitive matching', () => {
    expect(normalizeImportedCategory('', 'KFC LUNCH', 'expense')).toBe('Food')
    expect(normalizeImportedCategory('', 'grocery SHOPPING', 'expense')).toBe('Groceries')
  })
})

describe('normalizeImportedCategory - Income', () => {
  it('should use provided income category if valid', () => {
    expect(normalizeImportedCategory('Salary', '', 'income')).toBe('Salary')
    expect(normalizeImportedCategory('Business', '', 'income')).toBe('Business')
  })

  it('should detect Salary from keywords', () => {
    expect(normalizeImportedCategory('', 'Salary payment', 'income')).toBe('Salary')
    expect(normalizeImportedCategory('', 'Monthly payroll', 'income')).toBe('Salary')
    expect(normalizeImportedCategory('', 'Paycheck received', 'income')).toBe('Salary')
  })

  it('should detect Bonus from keywords', () => {
    expect(normalizeImportedCategory('', 'Year-end bonus', 'income')).toBe('Bonus')
    expect(normalizeImportedCategory('', 'Performance bonus', 'income')).toBe('Bonus')
  })

  it('should detect Freelance from keywords', () => {
    expect(normalizeImportedCategory('', 'Freelance project', 'income')).toBe('Freelance')
    expect(normalizeImportedCategory('', 'Contract work', 'income')).toBe('Freelance')
  })

  it('should detect Business from keywords', () => {
    expect(normalizeImportedCategory('', 'Business sale', 'income')).toBe('Business')
    expect(normalizeImportedCategory('', 'Revenue from shop', 'income')).toBe('Business')
  })

  it('should detect Investment from keywords', () => {
    expect(normalizeImportedCategory('', 'Investment returns', 'income')).toBe('Investment')
    expect(normalizeImportedCategory('', 'Dividend payment', 'income')).toBe('Investment')
    expect(normalizeImportedCategory('', 'Interest earned', 'income')).toBe('Investment')
    expect(normalizeImportedCategory('', 'Capital gain', 'income')).toBe('Investment')
  })

  it('should detect Rental Income from keywords', () => {
    expect(normalizeImportedCategory('', 'Rental payment', 'income')).toBe('Rental Income')
    expect(normalizeImportedCategory('', 'Rent received', 'income')).toBe('Rental Income')
  })

  it('should detect Gifts/Refunds from keywords', () => {
    expect(normalizeImportedCategory('', 'Gift money', 'income')).toBe('Gifts/Refunds')
    expect(normalizeImportedCategory('', 'Refund received', 'income')).toBe('Gifts/Refunds')
    expect(normalizeImportedCategory('', 'Cashback', 'income')).toBe('Gifts/Refunds')
    expect(normalizeImportedCategory('', 'Reimbursement', 'income')).toBe('Gifts/Refunds')
  })

  it('should return Other Income for unknown categories', () => {
    expect(normalizeImportedCategory('', 'random income', 'income')).toBe('Other Income')
    expect(normalizeImportedCategory('', '', 'income')).toBe('Other Income')
  })
})

describe('normalizeImportedCategory - Edge Cases', () => {
  it('should handle empty strings', () => {
    expect(normalizeImportedCategory('', '', 'expense')).toBe('Other Expense')
    expect(normalizeImportedCategory('', '', 'income')).toBe('Other Income')
  })

  it('should handle whitespace', () => {
    expect(normalizeImportedCategory('  Food  ', '  ', 'expense')).toMatch(/Food/)
  })

  it('should prioritize keywords over empty base category', () => {
    expect(normalizeImportedCategory('', 'KFC lunch', 'expense')).toBe('Food')
  })

  it('should use base category if no keywords match', () => {
    expect(normalizeImportedCategory('Custom Category', 'no matching keywords', 'expense')).toBe('Custom Category')
  })
})
