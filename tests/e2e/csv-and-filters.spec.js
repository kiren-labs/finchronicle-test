import { test, expect } from '@playwright/test'

test.describe('CSV Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Wait for app to be fully loaded and interactive
    await page.waitForLoadState('networkidle')
    // Wait for the app to render (either top tabs or bottom nav)
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
  })

  test('should export transactions to CSV', async ({ page }) => {
    // Add some transactions
    await page.fill('#amount', '1000')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Dinner')
    await page.click('#submitBtn')

    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Transport')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Taxi')
    await page.click('#submitBtn')

    // Go to settings
    await page.click('#settings-tab')

    // Click export and wait for download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export CSV")')
    const download = await downloadPromise

    // Verify filename format
    expect(download.suggestedFilename()).toMatch(/finchronicle-\d{4}-\d{2}-\d{2}\.csv/)

    // Verify success message
    await expect(page.locator('.success-message')).toHaveText('Export successful!')
  })

  test('should import transactions from CSV', async ({ page }) => {
    await page.click('#settings-tab')

    // Prepare CSV content
    const csvContent = `Date,Type,Category,Amount (INR),Notes
2025-02-01,expense,Food,1000,Test import
2025-02-01,income,Salary,5000,Monthly salary
2025-01-31,expense,Transport,500,Taxi ride`

    // Upload file
    const fileInput = page.locator('#importFile')
    await fileInput.setInputFiles({
      name: 'test-transactions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Check success message
    await expect(page.locator('.success-message')).toContainText('Imported 3 transaction')

    // Verify in list
    await page.click('#list-tab')
    await expect(page.locator('.transaction-item')).toHaveCount(3)
  })

  test('should handle CSV import with various date formats', async ({ page }) => {
    await page.click('#settings-tab')

    const csvContent = `Date,Type,Category,Amount,Notes
2025-02-01,expense,Food,100,YYYY-MM-DD format
01/02/2025,expense,Transport,200,DD/MM/YYYY format
15-Jan,expense,Groceries,300,DD-MMM format`

    const fileInput = page.locator('#importFile')
    await fileInput.setInputFiles({
      name: 'mixed-dates.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // All should be imported successfully
    await expect(page.locator('.success-message')).toContainText('Imported 3 transaction')

    await page.click('#list-tab')
    await expect(page.locator('.transaction-item')).toHaveCount(3)
  })

  test('should skip invalid rows during CSV import', async ({ page }) => {
    await page.click('#settings-tab')

    const csvContent = `Date,Type,Category,Amount,Notes
2025-02-01,expense,Food,1000,Valid row
invalid-date,expense,Food,500,Invalid date
2025-02-02,expense,Food,not-a-number,Invalid amount
2025-02-03,expense,Food,300,Valid row`

    const fileInput = page.locator('#importFile')
    await fileInput.setInputFiles({
      name: 'mixed-validity.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Should import 2 valid rows and skip 2 invalid
    await expect(page.locator('.success-message')).toContainText('Imported 2 transaction')
    await expect(page.locator('.success-message')).toContainText('Skipped 2')

    await page.click('#list-tab')
    await expect(page.locator('.transaction-item')).toHaveCount(2)
  })
})

test.describe('Filters and Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Add multiple transactions across different months
    const transactions = [
      { amount: '100', category: 'Food', date: '2025-02-15', notes: 'Feb Food' },
      { amount: '200', category: 'Transport', date: '2025-02-10', notes: 'Feb Transport' },
      { amount: '300', category: 'Food', date: '2025-01-20', notes: 'Jan Food' },
      { amount: '400', category: 'Groceries', date: '2025-01-15', notes: 'Jan Groceries' },
      { amount: '500', category: 'Transport', date: '2024-12-25', notes: 'Dec Transport' },
    ]

    for (const tx of transactions) {
      await page.fill('#amount', tx.amount)
      await page.selectOption('#category', tx.category)
      await page.fill('#date', tx.date)
      await page.fill('#notes', tx.notes)
      await page.click('#submitBtn')
      await page.waitForTimeout(100) // Small delay between transactions
    }
  })

  test('should filter transactions by month', async ({ page }) => {
    await page.click('#list-tab')

    // Should show all transactions initially
    await expect(page.locator('.transaction-item')).toHaveCount(5)

    // Click February filter
    await page.click('button:has-text("February 2025")')

    // Should show only February transactions
    await expect(page.locator('.transaction-item')).toHaveCount(2)
    await expect(page.locator('.transaction-note').first()).toContainText('Feb')

    // Click January filter
    await page.click('button:has-text("January 2025")')

    // Should show only January transactions
    await expect(page.locator('.transaction-item')).toHaveCount(2)
    await expect(page.locator('.transaction-note').first()).toContainText('Jan')

    // Click "All" to reset
    await page.click('button.filter-btn:has-text("All")')

    // Should show all again
    await expect(page.locator('.transaction-item')).toHaveCount(5)
  })

  test('should filter transactions by category', async ({ page }) => {
    await page.click('#list-tab')

    // Should show all transactions
    await expect(page.locator('.transaction-item')).toHaveCount(5)

    // Filter by Food
    await page.selectOption('#categoryFilter', 'Food')

    // Should show only Food transactions
    await expect(page.locator('.transaction-item')).toHaveCount(2)
    await expect(page.locator('.transaction-category').first()).toHaveText('Food')

    // Filter by Transport
    await page.selectOption('#categoryFilter', 'Transport')

    // Should show only Transport transactions
    await expect(page.locator('.transaction-item')).toHaveCount(2)
    await expect(page.locator('.transaction-category').first()).toHaveText('Transport')

    // Reset to all
    await page.selectOption('#categoryFilter', 'all')

    // Should show all again
    await expect(page.locator('.transaction-item')).toHaveCount(5)
  })

  test('should combine month and category filters', async ({ page }) => {
    await page.click('#list-tab')

    // Filter by February
    await page.click('button:has-text("February 2025")')
    await expect(page.locator('.transaction-item')).toHaveCount(2)

    // Further filter by Food category
    await page.selectOption('#categoryFilter', 'Food')

    // Should show only February Food transactions
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-note')).toHaveText('Feb Food')
  })

  test('should show pagination controls when more than 20 items', async ({ page }) => {
    // Add 25 transactions
    for (let i = 1; i <= 25; i++) {
      await page.fill('#amount', '100')
      await page.selectOption('#category', 'Food')
      await page.fill('#date', '2025-02-01')
      await page.fill('#notes', `Transaction ${i}`)
      await page.click('#submitBtn')
    }

    await page.click('#list-tab')

    // Pagination controls should be visible
    await expect(page.locator('#paginationControls')).toBeVisible()

    // Should show "Page 1 of 2"
    await expect(page.locator('#pageInfo')).toContainText('Page 1 of 2')
    await expect(page.locator('#pageInfo')).toContainText('30 transactions') // 25 new + 5 from beforeEach

    // Should show 20 items on page 1
    await expect(page.locator('.transaction-item')).toHaveCount(20)

    // Previous button should be disabled
    await expect(page.locator('#prevBtn')).toBeDisabled()

    // Click next
    await page.click('#nextBtn')

    // Should show "Page 2 of 2"
    await expect(page.locator('#pageInfo')).toContainText('Page 2 of 2')

    // Should show remaining items (10 items)
    await expect(page.locator('.transaction-item')).toHaveCount(10)

    // Next button should be disabled
    await expect(page.locator('#nextBtn')).toBeDisabled()

    // Click previous
    await page.click('#prevBtn')

    // Back to page 1
    await expect(page.locator('#pageInfo')).toContainText('Page 1 of 2')
    await expect(page.locator('.transaction-item')).toHaveCount(20)
  })

  test('should reset to page 1 when filters change', async ({ page }) => {
    // Add 25 transactions to trigger pagination
    for (let i = 1; i <= 20; i++) {
      await page.fill('#amount', '100')
      await page.selectOption('#category', 'Food')
      await page.fill('#date', '2025-02-01')
      await page.click('#submitBtn')
    }

    await page.click('#list-tab')

    // Go to page 2
    await page.click('#nextBtn')
    await expect(page.locator('#pageInfo')).toContainText('Page 2')

    // Apply a filter
    await page.selectOption('#categoryFilter', 'Transport')

    // Should reset to page 1
    await expect(page.locator('#pageInfo')).toContainText('Page 1')
  })
})

test.describe('Groups and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Wait for app to be fully loaded and interactive
    await page.waitForLoadState('networkidle')
    // Wait for the app to render (either top tabs or bottom nav)
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
  })

  test('should show grouped view by month', async ({ page }) => {
    // Add transactions
    await page.fill('#amount', '1000')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-15')
    await page.click('#submitBtn')

    await page.fill('#amount', '2000')
    await page.click('[data-type="income"]')
    await page.selectOption('#category', 'Salary')
    await page.fill('#date', '2025-02-10')
    await page.click('#submitBtn')

    // Go to Groups tab
    await page.click('#groups-tab')

    // Should show "By Month" view by default
    await expect(page.locator('button:has-text("By Month")')).toHaveClass(/active/)

    // Should show month card
    await expect(page.locator('.group-header')).toContainText('February 2025')

    // Should show income, expenses, and net
    await expect(page.locator('.card')).toContainText('Income')
    await expect(page.locator('.card')).toContainText('2,000')
    await expect(page.locator('.card')).toContainText('Expenses')
    await expect(page.locator('.card')).toContainText('1,000')
    await expect(page.locator('.card')).toContainText('Net')
    await expect(page.locator('.card')).toContainText('1,000') // Net: 2000 - 1000
  })

  test('should show grouped view by category', async ({ page }) => {
    // Add multiple transactions in same category
    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-15')
    await page.click('#submitBtn')

    await page.fill('#amount', '300')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-10')
    await page.click('#submitBtn')

    // Go to Groups tab
    await page.click('#groups-tab')

    // Switch to "By Category"
    await page.click('button:has-text("By Category")')
    await expect(page.locator('button:has-text("By Category")')).toHaveClass(/active/)

    // Should show category card
    await expect(page.locator('.group-header')).toContainText('Food')
    await expect(page.locator('.group-header')).toContainText('2 entries')

    // Should show total
    await expect(page.locator('.card')).toContainText('800') // 500 + 300
  })
})
