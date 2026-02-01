import { describe, it, expect } from 'vitest'
import { parseCSV, normalizeDate, monthNameToNumber } from '../../src/app.js'

describe('parseCSV', () => {
  it('should parse simple CSV', () => {
    const csv = 'name,age\nJohn,30\nJane,25'
    const result = parseCSV(csv)

    expect(result).toEqual([
      ['name', 'age'],
      ['John', '30'],
      ['Jane', '25'],
    ])
  })

  it('should handle quoted fields with commas', () => {
    const csv = 'name,note\n"John","Has, comma in note"\n"Jane","Normal note"'
    const result = parseCSV(csv)

    expect(result[0]).toEqual(['name', 'note'])
    expect(result[1]).toEqual(['John', 'Has, comma in note'])
    expect(result[2]).toEqual(['Jane', 'Normal note'])
  })

  it('should handle escaped quotes (double quotes)', () => {
    const csv = 'name,note\n"John","Has ""quotes"" in text"'
    const result = parseCSV(csv)

    expect(result[1][1]).toBe('Has "quotes" in text')
  })

  it('should handle empty fields', () => {
    const csv = 'a,b,c\n1,,3\n,2,'
    const result = parseCSV(csv)

    expect(result[0]).toEqual(['a', 'b', 'c'])
    expect(result[1]).toEqual(['1', '', '3'])
    expect(result[2]).toEqual(['', '2', ''])
  })

  it('should handle Windows line endings (CRLF)', () => {
    const csv = 'a,b\r\n1,2\r\n3,4'
    const result = parseCSV(csv)

    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('should handle mixed line endings', () => {
    const csv = 'a,b\r\n1,2\n3,4'
    const result = parseCSV(csv)

    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('should handle empty CSV', () => {
    const csv = ''
    const result = parseCSV(csv)

    expect(result).toEqual([['']])
  })

  it('should handle single cell', () => {
    const csv = 'single'
    const result = parseCSV(csv)

    expect(result).toEqual([['single']])
  })
})

describe('normalizeDate', () => {
  it('should accept valid YYYY-MM-DD format', () => {
    expect(normalizeDate('2025-01-15')).toBe('2025-01-15')
    expect(normalizeDate('2024-12-31')).toBe('2024-12-31')
  })

  it('should convert DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDate('15/01/2025')).toBe('2025-01-15')
    expect(normalizeDate('31/12/2024')).toBe('2024-12-31')
    expect(normalizeDate('1/1/2025')).toBe('2025-01-01')
  })

  it('should handle DD-MMM format (uses current year)', () => {
    const currentYear = new Date().getFullYear()
    expect(normalizeDate('15-Jan')).toBe(`${currentYear}-01-15`)
    expect(normalizeDate('31-Dec')).toBe(`${currentYear}-12-31`)
    expect(normalizeDate('1-Feb')).toBe(`${currentYear}-02-01`)
  })

  it('should handle various month abbreviations', () => {
    const year = new Date().getFullYear()
    expect(normalizeDate('15-Jan')).toBe(`${year}-01-15`)
    expect(normalizeDate('15-Feb')).toBe(`${year}-02-15`)
    expect(normalizeDate('15-Mar')).toBe(`${year}-03-15`)
    expect(normalizeDate('15-Apr')).toBe(`${year}-04-15`)
  })

  it('should return empty string for invalid dates', () => {
    expect(normalizeDate('invalid')).toBe('')
    expect(normalizeDate('99/99/9999')).toBe('')
    expect(normalizeDate('abc-def')).toBe('')
    expect(normalizeDate('')).toBe('')
  })

  it('should handle whitespace', () => {
    expect(normalizeDate('  2025-01-15  ')).toBe('2025-01-15')
  })

  it('should handle ISO date strings (with time)', () => {
    const result = normalizeDate('2025-01-15T10:30:00Z')
    expect(result).toMatch(/2025-01-15/)
  })
})

describe('monthNameToNumber', () => {
  it('should convert month abbreviations to numbers', () => {
    expect(monthNameToNumber('Jan')).toBe('01')
    expect(monthNameToNumber('Feb')).toBe('02')
    expect(monthNameToNumber('Mar')).toBe('03')
    expect(monthNameToNumber('Apr')).toBe('04')
    expect(monthNameToNumber('May')).toBe('05')
    expect(monthNameToNumber('Jun')).toBe('06')
    expect(monthNameToNumber('Jul')).toBe('07')
    expect(monthNameToNumber('Aug')).toBe('08')
    expect(monthNameToNumber('Sep')).toBe('09')
    expect(monthNameToNumber('Oct')).toBe('10')
    expect(monthNameToNumber('Nov')).toBe('11')
    expect(monthNameToNumber('Dec')).toBe('12')
  })

  it('should be case insensitive', () => {
    expect(monthNameToNumber('jan')).toBe('01')
    expect(monthNameToNumber('JAN')).toBe('01')
    expect(monthNameToNumber('Jan')).toBe('01')
  })

  it('should return empty string for invalid month', () => {
    expect(monthNameToNumber('Invalid')).toBe('')
    expect(monthNameToNumber('')).toBe('')
    expect(monthNameToNumber('13')).toBe('')
  })
})
