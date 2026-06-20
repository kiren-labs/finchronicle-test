import { test, expect } from '@playwright/test'
import { navigateToTab, clearAllStorage } from './helpers.js'

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
    await page.waitForFunction(() => {
      const categorySelect = document.querySelector('#category')
      return categorySelect && categorySelect.options.length > 1
    }, { timeout: 20000 })
  })

  test('should add a new expense transaction', async ({ page }) => {
    // Home tab is active by default; navigate to Add
    await expect(page.locator('#home-nav')).toHaveClass(/active/)
    await page.click('#add-nav')

    // Expense should be selected by default
    await expect(page.locator('[data-type="expense"]')).toHaveClass(/active/)

    // Fill form
    await page.fill('#amount', '1000')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Dinner with friends')

    // Submit
    await page.click('#submitBtn')

    // Check success message appears
    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Transaction saved.')

    // Switch to List tab
    await navigateToTab(page, 'listTab')

    // Verify transaction appears in list
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Food')
    await expect(page.locator('.transaction-amount')).toContainText('1,000')
    await expect(page.locator('.transaction-note')).toHaveText('Dinner with friends')
  })

  test('should add a new income transaction', async ({ page }) => {
    await navigateToTab(page, 'addTab')
    // Switch to income type
    await page.click('[data-type="income"]')
    await expect(page.locator('[data-type="income"]')).toHaveClass(/active/)

    // Fill form
    await page.fill('#amount', '5000')
    await page.selectOption('#category', 'Salary')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Monthly salary')

    // Submit
    await page.click('#submitBtn')

    // Check success message
    await expect(page.locator('.success-message')).toContainText('Transaction saved.')

    // Go to list
    await navigateToTab(page, 'listTab')

    // Verify income transaction
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Salary')
    await expect(page.locator('.transaction-amount')).toContainText('+')
    await expect(page.locator('.transaction-amount')).toContainText('5,000')
  })

  test('should edit existing transaction', async ({ page }) => {
    // Add a transaction first
    await navigateToTab(page, 'addTab')
    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Transport')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Taxi to airport')
    await page.click('#submitBtn')

    // Wait for success message
    await expect(page.locator('.success-message.show')).toBeVisible()

    // Go to list
    await navigateToTab(page, 'listTab')
    await expect(page.locator('.transaction-item')).toHaveCount(1)

    // Click edit button
    await page.click('.edit-btn')

    // Should be back on Add tab (now in edit mode) - check mobile nav
    await expect(page.locator('#add-nav')).toHaveClass(/active/)
    await expect(page.locator('#formTitle')).toHaveText('Edit Transaction')

    // Form should be populated
    await expect(page.locator('#amount')).toHaveValue('500')
    await expect(page.locator('#category')).toHaveValue('Transport')
    await expect(page.locator('#notes')).toHaveValue('Taxi to airport')

    // Change amount and notes
    await page.fill('#amount', '600')
    await page.fill('#notes', 'Taxi to airport - updated')

    // Submit update
    await page.click('#submitBtn')

    // Verify update message
    await expect(page.locator('.success-message')).toContainText('Transaction updated.')

    // Check updated values in list
    await navigateToTab(page, 'listTab')
    await expect(page.locator('.transaction-amount')).toContainText('600')
    await expect(page.locator('.transaction-note')).toHaveText('Taxi to airport - updated')
  })

  test('should cancel edit mode', async ({ page }) => {
    // Add a transaction
    await navigateToTab(page, 'addTab')
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Wait for success message
    await expect(page.locator('.success-message.show')).toBeVisible()

    // Edit transaction
    await navigateToTab(page, 'listTab')
    await page.click('.edit-btn')

    // Verify we're in edit mode
    await expect(page.locator('#formTitle')).toHaveText('Edit Transaction')
    await expect(page.locator('#cancelEditBtn')).toBeVisible()

    // Cancel edit
    await page.click('#cancelEditBtn')

    // Should be back in add mode
    await expect(page.locator('#formTitle')).toHaveText('Add Transaction')
    await expect(page.locator('#cancelEditBtn')).not.toBeVisible()
    await expect(page.locator('#amount')).toHaveValue('')
  })

  test('should delete transaction with confirmation', async ({ page }) => {
    // Add transaction
    await navigateToTab(page, 'addTab')
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Wait for success message
    await expect(page.locator('.success-message.show')).toBeVisible()

    // Go to list
    await navigateToTab(page, 'listTab')
    await expect(page.locator('.transaction-item')).toHaveCount(1)

    // Click delete
    await page.click('.delete-btn')

    // Confirm modal appears
    await expect(page.locator('#deleteModal')).toHaveClass(/show/)
    await expect(page.locator('#deleteModal .modal-title')).toHaveText('Delete Transaction?')
    await expect(page.locator('#deleteModal .modal-text')).toHaveText("You can't undo this.")

    // Confirm deletion
    await page.click('.modal-btn-confirm')

    // Verify empty state in list tab (use more specific selector)
    await expect(page.locator('#listTab .empty-state')).toBeVisible()
    await expect(page.locator('#listTab .empty-state')).toContainText('No transactions yet')
  })

  test('should cancel deletion', async ({ page }) => {
    // Add transaction
    await navigateToTab(page, 'addTab')
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Wait for success message
    await expect(page.locator('.success-message.show')).toBeVisible()

    // Go to list and try to delete
    await navigateToTab(page, 'listTab')
    await page.click('.delete-btn')

    // Modal should appear
    await expect(page.locator('#deleteModal')).toHaveClass(/show/)

    // Cancel
    await page.click('.modal-btn-cancel')

    // Modal should close
    await expect(page.locator('#deleteModal')).not.toHaveClass(/show/)

    // Transaction should still exist
    await expect(page.locator('.transaction-item')).toHaveCount(1)
  })

  test('should update summary cards after adding transaction', async ({ page }) => {
    // Initial summary should show zero
    await expect(page.locator('#monthNet')).toContainText('0')
    await expect(page.locator('#totalEntries')).toHaveText('0')

    // Get today's date in YYYY-MM-DD format for the current month's summary
    const today = new Date().toISOString().split('T')[0]

    // Add expense
    await navigateToTab(page, 'addTab')
    await page.fill('#amount', '1000')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', today)
    await page.click('#submitBtn')

    // Wait for success message to ensure transaction is saved and UI updated
    await expect(page.locator('.success-message.show')).toBeVisible()

    // Summary should update
    await expect(page.locator('#totalEntries')).toHaveText('1')
    await expect(page.locator('#monthExpense')).toContainText('1,000')
    await expect(page.locator('#monthNet')).toContainText('1,000') // Net shows expense amount (no income yet)

    // Add income
    await page.fill('#amount', '5000')
    await page.click('[data-type="income"]')
    await page.selectOption('#category', 'Salary')
    await page.fill('#date', today)
    await page.click('#submitBtn')

    // Wait for success message
    await expect(page.locator('.success-message.show')).toBeVisible()

    // Summary should update again
    await expect(page.locator('#totalEntries')).toHaveText('2')
    await expect(page.locator('#monthIncome')).toContainText('5,000')
    // Net should be positive (5000 - 1000 = 4000)
    await expect(page.locator('#monthNet')).toContainText('4,000')
  })

  test('should persist data after page reload', async ({ page }) => {
    // Add transaction
    await navigateToTab(page, 'addTab')
    await page.fill('#amount', '1000')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Test persistence')
    await page.click('#submitBtn')

    // Wait for success message and form reset — confirms IndexedDB write committed
    await expect(page.locator('.success-message.show')).toBeVisible()
    await page.waitForFunction(() => {
      const amount = document.querySelector('#amount')
      return amount && amount.value === ''
    }, { timeout: 5000 })

    // Reload and wait for app to re-initialize and load transactions from IndexedDB
    await page.reload()
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
    await page.waitForFunction(() => {
      const categorySelect = document.querySelector('#category')
      return categorySelect && categorySelect.options.length > 1
    }, { timeout: 20000 })

    // Go to list and wait for it to render (transaction-item or empty-state)
    await navigateToTab(page, 'listTab')
    await page.waitForSelector('.transaction-item, .empty-state', { state: 'visible', timeout: 10000 })

    // Data should still be there
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Food')
    await expect(page.locator('.transaction-amount')).toContainText('1,000')
    await expect(page.locator('.transaction-note')).toHaveText('Test persistence')
  })

  test('should handle transactions without notes', async ({ page }) => {
    // Add transaction without notes
    await navigateToTab(page, 'addTab')
    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Transport')
    await page.fill('#date', '2025-02-01')
    // Don't fill notes field
    await page.click('#submitBtn')

    // Should still save successfully
    await expect(page.locator('.success-message.show')).toBeVisible()

    // Go to list
    await navigateToTab(page, 'listTab')

    // Transaction should exist
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Transport')
    // No note element should be present
    await expect(page.locator('.transaction-note')).not.toBeVisible()
  })
})
