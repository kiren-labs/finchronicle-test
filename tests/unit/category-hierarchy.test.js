import { describe, it, expect } from 'vitest'
import { getAllCategoryNames, getCategoryParent, categories } from '../../src/app.js'

// ── getAllCategoryNames ───────────────────────────────────────────────────────

describe('getAllCategoryNames', () => {
  it('returns parent names for a type', () => {
    const names = getAllCategoryNames('expense')
    expect(names).toContain('Food')
    expect(names).toContain('Transport')
    expect(names).toContain('Healthcare')
  })

  it('returns child names for a type', () => {
    const names = getAllCategoryNames('expense')
    expect(names).toContain('Groceries')
    expect(names).toContain('Restaurants')
    expect(names).toContain('Fuel')
    expect(names).toContain('Rent')   // child of Housing
    expect(names).toContain('Doctor') // child of Healthcare
  })

  it('returns income parent and child names', () => {
    const names = getAllCategoryNames('income')
    expect(names).toContain('Salary')
    expect(names).toContain('Business')
    expect(names).toContain('Consulting') // child of Business
    expect(names).toContain('Dividends')  // child of Investment
    expect(names).toContain('Refund')     // child of Gifts/Refunds
  })

  it('returns Transfer for transfer type', () => {
    const names = getAllCategoryNames('transfer')
    expect(names).toEqual(['Transfer'])
  })

  it('returns empty array for unknown type', () => {
    expect(getAllCategoryNames('unknown')).toEqual([])
  })

  it('does not contain duplicates', () => {
    const names = getAllCategoryNames('expense')
    expect(names.length).toBe(new Set(names).size)
  })

  it('includes all parent keys', () => {
    const names = getAllCategoryNames('expense')
    for (const parent of Object.keys(categories.expense)) {
      expect(names).toContain(parent)
    }
  })

  it('includes all children', () => {
    const names = getAllCategoryNames('expense')
    for (const children of Object.values(categories.expense)) {
      for (const child of children) {
        expect(names).toContain(child)
      }
    }
  })
})

// ── getCategoryParent ─────────────────────────────────────────────────────────

describe('getCategoryParent', () => {
  it('returns the name itself when it is a parent', () => {
    expect(getCategoryParent('Food', 'expense')).toBe('Food')
    expect(getCategoryParent('Transport', 'expense')).toBe('Transport')
    expect(getCategoryParent('Salary', 'income')).toBe('Salary')
  })

  it('returns the parent when given a child category', () => {
    expect(getCategoryParent('Groceries', 'expense')).toBe('Food')
    expect(getCategoryParent('Restaurants', 'expense')).toBe('Food')
    expect(getCategoryParent('Fuel', 'expense')).toBe('Transport')
    expect(getCategoryParent('Rent', 'expense')).toBe('Housing')
    expect(getCategoryParent('Doctor', 'expense')).toBe('Healthcare')
    expect(getCategoryParent('EMI', 'expense')).toBe('Debt/Loans')
    expect(getCategoryParent('Consulting', 'income')).toBe('Business')
    expect(getCategoryParent('Dividends', 'income')).toBe('Investment')
    expect(getCategoryParent('Refund', 'income')).toBe('Gifts/Refunds')
  })

  it('returns null for category not in tree', () => {
    expect(getCategoryParent('Unknown', 'expense')).toBeNull()
    expect(getCategoryParent('Food', 'income')).toBeNull()  // Food is expense, not income
  })

  it('returns null for unknown type', () => {
    expect(getCategoryParent('Food', 'unknown')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getCategoryParent('', 'expense')).toBeNull()
  })

  it('returns Transfer as its own parent', () => {
    expect(getCategoryParent('Transfer', 'transfer')).toBe('Transfer')
  })
})

// ── categories structure ──────────────────────────────────────────────────────

describe('categories structure', () => {
  it('has income, expense, and transfer keys', () => {
    expect(categories).toHaveProperty('income')
    expect(categories).toHaveProperty('expense')
    expect(categories).toHaveProperty('transfer')
  })

  it('income and expense are objects (not arrays)', () => {
    expect(typeof categories.income).toBe('object')
    expect(Array.isArray(categories.income)).toBe(false)
    expect(typeof categories.expense).toBe('object')
    expect(Array.isArray(categories.expense)).toBe(false)
  })

  it('each category entry has an array of children', () => {
    for (const children of Object.values(categories.expense)) {
      expect(Array.isArray(children)).toBe(true)
    }
    for (const children of Object.values(categories.income)) {
      expect(Array.isArray(children)).toBe(true)
    }
  })

  it('leaf nodes have empty children arrays', () => {
    expect(categories.expense['Fees/Docs']).toEqual([])
    expect(categories.expense['Household']).toEqual([])
    expect(categories.income['Salary']).toEqual([])
  })

  it('parent nodes have non-empty children arrays', () => {
    expect(categories.expense['Food'].length).toBeGreaterThan(0)
    expect(categories.expense['Transport'].length).toBeGreaterThan(0)
    expect(categories.income['Business'].length).toBeGreaterThan(0)
  })

  it('no child appears as a parent in the same type', () => {
    // Children should not be top-level keys (no ambiguity)
    const expenseParents = new Set(Object.keys(categories.expense))
    for (const children of Object.values(categories.expense)) {
      for (const child of children) {
        expect(expenseParents.has(child)).toBe(false)
      }
    }
  })
})
