import { test, expect } from '@playwright/test'

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear localStorage for fresh start
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Wait for app to be fully loaded and interactive
    await page.waitForLoadState('networkidle')
    // Wait for the app to render (either top tabs or bottom nav)
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
  })

  test('should add a new expense transaction', async ({ page }) => {
    // Add tab should be active by default
    await expect(page.locator('#add-tab')).toHaveClass(/active/)

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
    await expect(page.locator('.success-message')).toBeVisible()
    await expect(page.locator('.success-message')).toHaveText('Transaction saved!')

    // Switch to List tab
    await page.click('[aria-controls="listTab"]')

    // Verify transaction appears in list
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Food')
    await expect(page.locator('.transaction-amount')).toContainText('1,000')
    await expect(page.locator('.transaction-note')).toHaveText('Dinner with friends')
  })

  test('should add a new income transaction', async ({ page }) => {
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
    await expect(page.locator('.success-message')).toHaveText('Transaction saved!')

    // Go to list
    await page.click('[aria-controls="listTab"]')

    // Verify income transaction
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Salary')
    await expect(page.locator('.transaction-amount')).toContainText('+')
    await expect(page.locator('.transaction-amount')).toContainText('5,000')
  })

  test('should edit existing transaction', async ({ page }) => {
    // Add a transaction first
    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Transport')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Taxi to airport')
    await page.click('#submitBtn')

    // Go to list
    await page.click('[aria-controls="listTab"]')
    await expect(page.locator('.transaction-item')).toHaveCount(1)

    // Click edit button
    await page.click('.edit-btn')

    // Should be back on Add tab (now in edit mode)
    await expect(page.locator('#add-tab')).toHaveClass(/active/)
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
    await expect(page.locator('.success-message')).toHaveText('Transaction updated!')

    // Check updated values in list
    await page.click('[aria-controls="listTab"]')
    await expect(page.locator('.transaction-amount')).toContainText('600')
    await expect(page.locator('.transaction-note')).toHaveText('Taxi to airport - updated')
  })

  test('should cancel edit mode', async ({ page }) => {
    // Add a transaction
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Edit transaction
    await page.click('[aria-controls="listTab"]')
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
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Go to list
    await page.click('[aria-controls="listTab"]')
    await expect(page.locator('.transaction-item')).toHaveCount(1)

    // Click delete
    await page.click('.delete-btn')

    // Confirm modal appears
    await expect(page.locator('.modal')).toHaveClass(/show/)
    await expect(page.locator('.modal-title')).toHaveText('Delete Transaction?')
    await expect(page.locator('.modal-text')).toHaveText('This action cannot be undone.')

    // Confirm deletion
    await page.click('.modal-btn-confirm')

    // Verify empty state
    await expect(page.locator('.empty-state')).toBeVisible()
    await expect(page.locator('.empty-state')).toContainText('No transactions yet')
  })

  test('should cancel deletion', async ({ page }) => {
    // Add transaction
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Go to list and try to delete
    await page.click('[aria-controls="listTab"]')
    await page.click('.delete-btn')

    // Modal should appear
    await expect(page.locator('.modal')).toHaveClass(/show/)

    // Cancel
    await page.click('.modal-btn-cancel')

    // Modal should close
    await expect(page.locator('.modal')).not.toHaveClass(/show/)

    // Transaction should still exist
    await expect(page.locator('.transaction-item')).toHaveCount(1)
  })

  test('should update summary cards after adding transaction', async ({ page }) => {
    // Initial summary should show zero
    await expect(page.locator('#monthNet')).toContainText('0')
    await expect(page.locator('#totalEntries')).toHaveText('0')

    // Add expense
    await page.fill('#amount', '1000')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Summary should update
    await expect(page.locator('#totalEntries')).toHaveText('1')
    await expect(page.locator('#monthExpense')).toContainText('1,000')
    await expect(page.locator('#monthNet')).toContainText('-') // Negative since expense only

    // Add income
    await page.fill('#amount', '5000')
    await page.click('[data-type="income"]')
    await page.selectOption('#category', 'Salary')
    await page.fill('#date', '2025-02-01')
    await page.click('#submitBtn')

    // Summary should update again
    await expect(page.locator('#totalEntries')).toHaveText('2')
    await expect(page.locator('#monthIncome')).toContainText('5,000')
    // Net should be positive (5000 - 1000 = 4000)
    await expect(page.locator('#monthNet')).toContainText('4,000')
  })

  test('should persist data after page reload', async ({ page }) => {
    // Add transaction
    await page.fill('#amount', '1000')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2025-02-01')
    await page.fill('#notes', 'Test persistence')
    await page.click('#submitBtn')

    // Reload page
    await page.reload()

    // Go to list
    await page.click('[aria-controls="listTab"]')

    // Data should still be there
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Food')
    await expect(page.locator('.transaction-amount')).toContainText('1,000')
    await expect(page.locator('.transaction-note')).toHaveText('Test persistence')
  })

  test('should handle transactions without notes', async ({ page }) => {
    // Add transaction without notes
    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Transport')
    await page.fill('#date', '2025-02-01')
    // Don't fill notes field
    await page.click('#submitBtn')

    // Should still save successfully
    await expect(page.locator('.success-message')).toBeVisible()

    // Go to list
    await page.click('[aria-controls="listTab"]')

    // Transaction should exist
    await expect(page.locator('.transaction-item')).toHaveCount(1)
    await expect(page.locator('.transaction-category')).toHaveText('Transport')
    // No note element should be present
    await expect(page.locator('.transaction-note')).not.toBeVisible()
  })
})
