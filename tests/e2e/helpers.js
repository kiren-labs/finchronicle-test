/**
 * E2E Test Helpers
 * Reusable functions for Playwright tests
 */

/**
 * Clear all browser storage (localStorage, sessionStorage, IndexedDB caches).
 * Use in beforeEach to guarantee a clean slate across all browsers.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function clearAllStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    // Unregister service workers so stale cached app versions don't serve on reload
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    }
    // Clear service worker Cache Storage (prevents stale app shell from being served)
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
    // Clear all IndexedDB databases (catches stale app version data in Firefox)
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases()
      await Promise.all(dbs.map(db => new Promise((res, rej) => {
        const req = indexedDB.deleteDatabase(db.name)
        req.onsuccess = res
        req.onerror = rej
        req.onblocked = res
      })))
    }
  })
}

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
  const tabButtons = await page.locator(`[aria-controls="${tabName}"]`).all()
  
  // Find the first visible button
  for (const button of tabButtons) {
    if (await button.isVisible()) {
      await button.click()
      // Wait a brief moment for tab content to render
      await page.waitForTimeout(100)
      return
    }
  }
  
  throw new Error(`No visible tab button found for ${tabName}`)
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
    await page.waitForTimeout(100) // Wait for category dropdown to update
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

  // Wait for form to process
  if (waitForSuccess) {
    // Wait for the form to reset (amount field clears after successful save)
    await page.waitForFunction(() => {
      const amountField = document.querySelector('#amount')
      return amountField && amountField.value === ''
    }, { timeout: 5000 }).catch(async () => {
      // If form doesn't reset, wait for success/error message
      await page.waitForSelector('.success-message.show', { state: 'visible', timeout: 2000 }).catch(() => {})
    })
    // Brief additional wait to ensure localStorage save completes
    await page.waitForTimeout(200)
  }
}
