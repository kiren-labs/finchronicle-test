/**
 * E2E Test Helpers
 * Reusable functions for Playwright tests
 */

/**
 * Navigate to a tab using ARIA controls attribute.
 * Works for both desktop tabs and mobile bottom navigation.
 * This ensures success messages or overlays don't block tab navigation.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} tabName - Tab name: 'addTab', 'listTab', 'groupsTab', or 'settingsTab'
 */
export async function navigateToTab(page, tabName) {
  // Both desktop tabs (.tabs) and mobile bottom-nav have aria-controls attributes
  // Since .tabs is display:none and bottom-nav is display:flex, we need to click the visible one
  const tabLocator = page.locator(`[aria-controls="${tabName}"]`).locator('visible=true').first()

  // Wait for the visible tab to be ready
  await tabLocator.waitFor({ state: 'visible', timeout: 10000 })

  // Click the tab
  await tabLocator.click()

  // Wait a brief moment for tab content to render
  await page.waitForTimeout(100)
}

/**
 * Wait for success message to appear and then disappear before proceeding.
 * Useful when you need to ensure the UI is stable before navigation.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function waitForSuccessMessage(page) {
  // Wait for success message to appear
  await page.waitForSelector('.success-message.show', { state: 'visible', timeout: 5000 })

  // Wait for it to fade out (success messages auto-hide after 2 seconds)
  await page.waitForSelector('.success-message.show', { state: 'hidden', timeout: 3000 })
}

/**
 * Add a transaction using the form.
 * Fills in all fields and submits, optionally waiting for success message.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} transaction - Transaction details
 * @param {string} transaction.amount - Amount value
 * @param {string} transaction.category - Category to select
 * @param {string} transaction.date - Date in YYYY-MM-DD format
 * @param {string} [transaction.notes] - Optional notes
 * @param {string} [transaction.type='expense'] - Transaction type: 'expense' or 'income'
 * @param {boolean} [waitForSuccess=true] - Whether to wait for success message
 */
export async function addTransaction(page, transaction, waitForSuccess = true) {
  const { amount, category, date, notes, type = 'expense' } = transaction

  // Select transaction type if income
  if (type === 'income') {
    await page.click('[data-type="income"]')
  }

  // Fill form fields
  await page.fill('#amount', amount)
  await page.selectOption('#category', category)
  await page.fill('#date', date)

  if (notes) {
    await page.fill('#notes', notes)
  }

  // Submit
  await page.click('#submitBtn')

  // Wait for success message if requested
  if (waitForSuccess) {
    await page.waitForSelector('.success-message', { state: 'visible', timeout: 5000 })
  }
}
