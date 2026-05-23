import { test, expect } from '@playwright/test'
import { navigateToTab, clearAllStorage } from './helpers.js'

test.describe('Phase 2.2 — Transaction ↔ Account Linking', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
    await page.waitForFunction(() => {
      const sel = document.querySelector('#category')
      return sel && sel.options.length > 1
    }, { timeout: 20000 })
  })

  // ── Helper: enable Account Linking toggle in Settings ──────────────────────
  async function enableAccountLinking(page) {
    await navigateToTab(page, 'settingsTab')
    // Open optional fields settings panel
    const optionalHeader = page.locator('[data-toggle-optional-settings]')
    if (await optionalHeader.isVisible()) {
      const isExpanded = await optionalHeader.getAttribute('aria-expanded')
      if (isExpanded === 'false') await optionalHeader.click()
    }
    // The checkbox is CSS-hidden (opacity:0, 0x0); click the wrapping label instead
    const toggle = page.locator('label:has([data-field-toggle="accountLinking"])')
    await toggle.waitFor({ state: 'visible', timeout: 5000 })
    const checkbox = page.locator('[data-field-toggle="accountLinking"]')
    const checked = await checkbox.isChecked({ force: true })
    if (!checked) await toggle.click()
    await page.waitForTimeout(200)
    // Return to add tab
    await navigateToTab(page, 'addTab')
    await page.waitForFunction(() => {
      const sel = document.querySelector('#category')
      return sel && sel.options.length > 1
    }, { timeout: 10000 })
  }

  // ── Helper: create an account via Accounts tab ──────────────────────────────
  async function createAccount(page, { name, type = 'checking', openingBalance = '0' }) {
    await navigateToTab(page, 'settingsTab')
    const addBtn = page.locator('#addAccountBtn')
    await addBtn.waitFor({ state: 'visible', timeout: 5000 })
    await addBtn.click()
    // Wait for modal to open (modal gains .show class)
    await page.waitForSelector('#accountFormModal.show', { timeout: 5000 })
    await page.fill('#accountNameInput', name)
    await page.selectOption('#accountTypeSelect', type)
    if (openingBalance !== '0') {
      await page.fill('#accountBalanceInput', openingBalance)
    }
    await page.click('#accountFormSaveBtn')
    await page.waitForTimeout(300)
    await navigateToTab(page, 'addTab')
    await page.waitForFunction(() => {
      const sel = document.querySelector('#category')
      return sel && sel.options.length > 1
    }, { timeout: 10000 })
  }

  // ── Toggle visibility ───────────────────────────────────────────────────────

  test('account linking field is hidden by default', async ({ page }) => {
    const field = page.locator('[data-optional-field="accountLinking"]')
    await expect(field).toBeHidden()
  })

  test('account linking toggle exists in Settings optional fields', async ({ page }) => {
    await navigateToTab(page, 'settingsTab')
    // The checkbox itself is CSS-hidden; assert the visible label row exists
    const toggleRow = page.locator('label:has([data-field-toggle="accountLinking"])')
    await expect(toggleRow).toBeVisible()
  })

  test('enabling account linking shows field on income/expense form', async ({ page }) => {
    await enableAccountLinking(page)
    // Expand optional fields section
    const toggleBtn = page.locator('#optionalFieldsToggle')
    const section = page.locator('#optionalFieldsSection')
    await expect(section).toBeVisible()
    await toggleBtn.click()
    const field = page.locator('[data-optional-field="accountLinking"]')
    await expect(field).toBeVisible()
    await expect(page.locator('#linkedAccount')).toBeVisible()
  })

  test('account linking field hides when type switches to transfer', async ({ page }) => {
    await enableAccountLinking(page)
    const toggleBtn = page.locator('#optionalFieldsToggle')
    const section = page.locator('#optionalFieldsSection')
    await expect(section).toBeVisible()
    await toggleBtn.click()

    // Visible on expense
    await expect(page.locator('[data-optional-field="accountLinking"]')).toBeVisible()

    // Switch to transfer — field must hide
    await page.click('[data-type="transfer"]')
    await expect(page.locator('[data-optional-field="accountLinking"]')).toBeHidden()

    // Switch back to income — field reappears
    await page.click('[data-type="income"]')
    await expect(page.locator('[data-optional-field="accountLinking"]')).toBeVisible()
  })

  // ── Account dropdown population ─────────────────────────────────────────────

  test('linked account select shows None option when no accounts exist', async ({ page }) => {
    await enableAccountLinking(page)
    const toggleBtn = page.locator('#optionalFieldsToggle')
    await toggleBtn.click()
    const select = page.locator('#linkedAccount')
    await expect(select).toBeVisible()
    const options = await select.locator('option').allTextContents()
    expect(options).toContain('None')
    expect(options).toHaveLength(1)
  })

  // ── fromAccount / toAccount stored on transaction ───────────────────────────

  test('expense with linked account stores fromAccount in IndexedDB', async ({ page }) => {
    await createAccount(page, { name: 'Checking', type: 'checking', openingBalance: '10000' })
    await enableAccountLinking(page)

    const toggleBtn = page.locator('#optionalFieldsToggle')
    const section = page.locator('#optionalFieldsSection')
    await expect(section).toBeVisible()
    await toggleBtn.click()

    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-05-20')
    await page.selectOption('#linkedAccount', 'Checking')
    await page.click('#submitBtn')

    await page.waitForFunction(() => {
      const amount = document.querySelector('#amount')
      return amount && amount.value === ''
    }, { timeout: 5000 })

    // Read from IndexedDB
    const fromAccount = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readonly')
          const store = tx.objectStore('transactions')
          const getAll = store.getAll()
          getAll.onsuccess = () => {
            const t = getAll.result[0]
            resolve(t ? t.fromAccount : null)
          }
        }
        req.onerror = () => resolve(null)
      })
    })
    expect(fromAccount).toBe('Checking')
  })

  test('income with linked account stores toAccount in IndexedDB', async ({ page }) => {
    await createAccount(page, { name: 'Savings', type: 'savings', openingBalance: '5000' })
    await enableAccountLinking(page)

    await page.click('[data-type="income"]')
    await page.waitForTimeout(100)

    const toggleBtn = page.locator('#optionalFieldsToggle')
    const section = page.locator('#optionalFieldsSection')
    await expect(section).toBeVisible()
    await toggleBtn.click()

    await page.fill('#amount', '3000')
    await page.selectOption('#category', 'Salary')
    await page.fill('#date', '2026-05-20')
    await page.selectOption('#linkedAccount', 'Savings')
    await page.click('#submitBtn')

    await page.waitForFunction(() => {
      const amount = document.querySelector('#amount')
      return amount && amount.value === ''
    }, { timeout: 5000 })

    const toAccount = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readonly')
          const store = tx.objectStore('transactions')
          const getAll = store.getAll()
          getAll.onsuccess = () => {
            const t = getAll.result[0]
            resolve(t ? t.toAccount : null)
          }
        }
        req.onerror = () => resolve(null)
      })
    })
    expect(toAccount).toBe('Savings')
  })

  test('expense with Account = None does not set fromAccount', async ({ page }) => {
    await createAccount(page, { name: 'Checking', type: 'checking' })
    await enableAccountLinking(page)

    const toggleBtn = page.locator('#optionalFieldsToggle')
    await toggleBtn.click()

    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-05-20')
    // Leave linked account as None (default)
    await page.click('#submitBtn')

    await page.waitForFunction(() => {
      const amount = document.querySelector('#amount')
      return amount && amount.value === ''
    }, { timeout: 5000 })

    const fromAccount = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readonly')
          const store = tx.objectStore('transactions')
          const getAll = store.getAll()
          getAll.onsuccess = () => {
            const t = getAll.result[0]
            resolve(t ? t.fromAccount : undefined)
          }
        }
        req.onerror = () => resolve(undefined)
      })
    })
    expect(fromAccount).toBeFalsy()
  })

  // ── Transfer unaffected ─────────────────────────────────────────────────────

  test('transfer still works normally when accountLinking is enabled', async ({ page }) => {
    await createAccount(page, { name: 'Cash', type: 'cash' })
    await createAccount(page, { name: 'Bank', type: 'checking' })
    await enableAccountLinking(page)

    await page.click('[data-type="transfer"]')
    await page.waitForTimeout(100)

    await page.fill('#amount', '1000')
    await page.fill('#date', '2026-05-20')
    await page.fill('#fromAccount', 'Cash')
    await page.fill('#toAccount', 'Bank')
    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  // ── Edit pre-population ─────────────────────────────────────────────────────

  test('editing a linked expense pre-populates the account dropdown', async ({ page }) => {
    await createAccount(page, { name: 'Wallet', type: 'cash' })
    await enableAccountLinking(page)

    const toggleBtn = page.locator('#optionalFieldsToggle')
    await toggleBtn.click()

    // Save linked expense
    await page.fill('#amount', '200')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-05-20')
    await page.selectOption('#linkedAccount', 'Wallet')
    await page.click('#submitBtn')

    await page.waitForFunction(() => {
      const amount = document.querySelector('#amount')
      return amount && amount.value === ''
    }, { timeout: 5000 })

    // Edit it
    await navigateToTab(page, 'listTab')
    await page.click('.edit-btn')
    await expect(page.locator('#formTitle')).toHaveText('Edit Transaction')

    // Expand optional fields
    const editSection = page.locator('#optionalFieldsSection')
    if (await editSection.isVisible()) {
      const editToggle = page.locator('#optionalFieldsToggle')
      const container = page.locator('#optionalFieldsContainer')
      const isHidden = await container.getAttribute('hidden')
      if (isHidden !== null) await editToggle.click()
    }

    // Linked account should be pre-selected
    await expect(page.locator('#linkedAccount')).toHaveValue('Wallet')
  })
})
