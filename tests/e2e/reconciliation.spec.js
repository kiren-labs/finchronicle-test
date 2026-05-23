import { test, expect } from '@playwright/test'
import { navigateToTab, clearAllStorage, addTransaction } from './helpers.js'

test.describe('Phase 2.3 — Reconciliation Workflow', () => {

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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function createAccount(page, { name, type = 'checking', openingBalance = '0' }) {
    await navigateToTab(page, 'settingsTab')
    const addBtn = page.locator('#addAccountBtn')
    await addBtn.waitFor({ state: 'visible', timeout: 5000 })
    await addBtn.click()
    await page.waitForSelector('#accountFormModal.show', { timeout: 5000 })
    await page.fill('#accountNameInput', name)
    await page.selectOption('#accountTypeSelect', type)
    if (openingBalance !== '0') {
      await page.fill('#accountBalanceInput', openingBalance)
    }
    await page.click('#accountFormSaveBtn')
    await page.waitForTimeout(300)
  }

  async function openReconciliationModal(page, _accountName) {
    await navigateToTab(page, 'settingsTab')
    // Click the edit button for the account
    const editBtn = page.locator('.account-edit-btn').first()
    await editBtn.waitFor({ state: 'visible', timeout: 5000 })
    await editBtn.click()
    await page.waitForSelector('#accountFormModal.show', { timeout: 5000 })
    // Click reconcile button
    const reconcileBtn = page.locator('#accountReconcileBtn')
    await reconcileBtn.waitFor({ state: 'visible', timeout: 5000 })
    await reconcileBtn.click()
    await page.waitForSelector('#reconciliationModal.show', { timeout: 5000 })
  }

  async function readAllTransactionsFromIDB(page) {
    return page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readonly')
          const store = tx.objectStore('transactions')
          const getAll = store.getAll()
          getAll.onsuccess = () => resolve(getAll.result)
          getAll.onerror = () => resolve([])
        }
        req.onerror = () => resolve([])
      })
    })
  }

  // ── Modal open/close ─────────────────────────────────────────────────────────

  test('reconciliation modal opens from edit account button', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await expect(page.locator('#reconciliationModal')).toHaveClass(/show/)
    await expect(page.locator('#reconciliationAccountName')).toContainText('Checking')
  })

  test('reconciliation modal closes on X button', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.locator('.reconciliation-close').click()
    await expect(page.locator('#reconciliationModal')).not.toHaveClass(/show/)
  })

  test('reconciliation modal closes on backdrop click', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    // Click the backdrop (the modal element itself, outside modal-content)
    await page.locator('#reconciliationModal').click({ position: { x: 5, y: 5 } })
    await expect(page.locator('#reconciliationModal')).not.toHaveClass(/show/)
  })

  // ── Step 1: load transactions ────────────────────────────────────────────────

  test('step 2 starts with no loaded reconciliation data', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await expect(page.locator('#reconciliationStep2')).toBeVisible()
    await expect(page.locator('#reconciliationList .reconciliation-row')).toHaveCount(0)
  })

  test('load transactions requires statement balance', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    // Leave balance empty
    await page.locator('#reconciliationLoadBtn').click()
    await expect(page.locator('#successMessage')).toContainText('Enter a valid statement balance.')
    await expect(page.locator('#reconciliationList .reconciliation-row')).toHaveCount(0)
  })

  test('load transactions requires statement date', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '10000')
    // Leave date empty
    await page.locator('#reconciliationLoadBtn').click()
    await expect(page.locator('#successMessage')).toContainText('Enter a statement date.')
    await expect(page.locator('#reconciliationList .reconciliation-row')).toHaveCount(0)
  })

  test('step 2 appears after valid load with no transactions', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '10000')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()
    await expect(page.locator('#reconciliationStep2')).toBeVisible()
    await expect(page.locator('#reconciliationList')).toContainText('No unreconciled transactions')
  })

  // ── Difference display ───────────────────────────────────────────────────────

  test('difference shows zero and match class when balance equals statement', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '10000')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()
    const diff = page.locator('#reconciliationDifference')
    await expect(diff).toHaveClass(/reconciliation-match/)
  })

  test('difference shows mismatch class when balance does not match', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9500')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()
    const diff = page.locator('#reconciliationDifference')
    await expect(diff).toHaveClass(/reconciliation-mismatch/)
  })

  // ── Candidate list and checkbox ──────────────────────────────────────────────

  test('cleared transactions appear in candidate list', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })

    // Add a transaction linked to Checking (via fromAccount set directly in IDB for simplicity)
    // We use the form — account linking optional field path
    await navigateToTab(page, 'settingsTab')
    // Enable account linking
    const optHeader = page.locator('[data-toggle-optional-settings]')
    if (await optHeader.isVisible()) {
      const expanded = await optHeader.getAttribute('aria-expanded')
      if (expanded === 'false') await optHeader.click()
    }
    const toggleLabel = page.locator('label:has([data-field-toggle="accountLinking"])')
    await toggleLabel.waitFor({ state: 'visible', timeout: 5000 })
    const chk = page.locator('[data-field-toggle="accountLinking"]')
    if (!(await chk.isChecked({ force: true }))) await toggleLabel.click()
    await page.waitForTimeout(200)

    await navigateToTab(page, 'addTab')
    await page.waitForFunction(() => document.querySelector('#category')?.options.length > 1, { timeout: 10000 })

    // Expand optional fields
    const toggleBtn = page.locator('#optionalFieldsToggle')
    const section = page.locator('#optionalFieldsSection')
    await expect(section).toBeVisible()
    await toggleBtn.click()

    await page.fill('#amount', '500')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-05-15')
    await page.selectOption('#linkedAccount', 'Checking')
    await page.click('#submitBtn')
    await page.waitForFunction(() => document.querySelector('#amount')?.value === '', { timeout: 5000 })

    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9500')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()

    // The expense should appear in the candidate list
    const rows = page.locator('.reconciliation-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Food')
  })

  test('checking a candidate updates the difference', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })

    // Inject a cleared expense directly into IDB
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          store.add({
            id: 9001,
            type: 'expense',
            amount: 500,
            category: 'Food',
            date: '2026-05-15',
            fromAccount: 'Checking',
            toAccount: null,
            status: 'cleared',
            notes: '',
            tags: [],
            createdAt: new Date().toISOString(),
          })
          tx.oncomplete = resolve
        }
      })
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => document.querySelector('#category')?.options.length > 1, { timeout: 20000 })

    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9500')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()

    // Before checking: mismatch (10000 - 0 checked ≠ 9500)
    await expect(page.locator('#reconciliationDifference')).toHaveClass(/reconciliation-mismatch/)

    // Check the transaction
    const checkbox = page.locator('[data-recon-id]').first()
    await checkbox.check()

    // Now 10000 - 500 = 9500 = statement → match
    await expect(page.locator('#reconciliationDifference')).toHaveClass(/reconciliation-match/)
  })

  // ── Finalise ──────────────────────────────────────────────────────────────────

  test('finalise reconciliation marks checked transactions as reconciled in IDB', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })

    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          store.add({
            id: 9002,
            type: 'expense',
            amount: 500,
            category: 'Food',
            date: '2026-05-15',
            fromAccount: 'Checking',
            toAccount: null,
            status: 'cleared',
            notes: '',
            tags: [],
            createdAt: new Date().toISOString(),
          })
          tx.oncomplete = resolve
        }
      })
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => document.querySelector('#category')?.options.length > 1, { timeout: 20000 })

    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9500')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()

    const checkbox = page.locator('[data-recon-id]').first()
    await checkbox.check()
    await expect(page.locator('#reconciliationDifference')).toHaveClass(/reconciliation-match/)

    await page.locator('#reconciliationFinaliseBtn').click()

    // Modal should close
    await expect(page.locator('#reconciliationModal')).not.toHaveClass(/show/)

    // Transaction status in IDB must be 'reconciled'
    const txs = await readAllTransactionsFromIDB(page)
    const t = txs.find((t) => t.id === 9002)
    expect(t?.status).toBe('reconciled')
  })

  test('reconciled transaction shows lock icon in transaction list', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })

    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          store.add({
            id: 9003,
            type: 'expense',
            amount: 500,
            category: 'Food',
            date: '2026-05-15',
            fromAccount: 'Checking',
            toAccount: null,
            status: 'cleared',
            notes: '',
            tags: [],
            createdAt: new Date().toISOString(),
          })
          tx.oncomplete = resolve
        }
      })
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => document.querySelector('#category')?.options.length > 1, { timeout: 20000 })

    // Reconcile it
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9500')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()
    await page.locator('[data-recon-id]').first().check()
    await page.locator('#reconciliationFinaliseBtn').click()
    await expect(page.locator('#reconciliationModal')).not.toHaveClass(/show/)

    // Go to list and verify lock badge
    await navigateToTab(page, 'listTab')
    await expect(page.locator('.tx-status-reconciled').first()).toBeVisible()
  })

  test('finalise with mismatch shows force button, not close', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9000')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()

    await page.locator('#reconciliationFinaliseBtn').click()

    // Modal stays open, force button appears
    await expect(page.locator('#reconciliationModal')).toHaveClass(/show/)
    await expect(page.locator('#reconciliationForceBtn')).toBeVisible()
  })

  test('force reconcile closes modal even with mismatch', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })
    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9000')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()

    await page.locator('#reconciliationFinaliseBtn').click()
    await expect(page.locator('#reconciliationForceBtn')).toBeVisible()
    await page.locator('#reconciliationForceBtn').click()

    await expect(page.locator('#reconciliationModal')).not.toHaveClass(/show/)
  })

  // ── Already-reconciled excluded from next session ────────────────────────────

  test('reconciled transactions are excluded from the next reconciliation session', async ({ page }) => {
    await createAccount(page, { name: 'Checking', openingBalance: '10000' })

    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          store.add({
            id: 9004,
            type: 'expense',
            amount: 500,
            category: 'Food',
            date: '2026-05-15',
            fromAccount: 'Checking',
            toAccount: null,
            status: 'reconciled',
            notes: '',
            tags: [],
            createdAt: new Date().toISOString(),
          })
          tx.oncomplete = resolve
        }
      })
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => document.querySelector('#category')?.options.length > 1, { timeout: 20000 })

    await openReconciliationModal(page, 'Checking')
    await page.fill('#reconciliationStatementBalance', '9500')
    await page.fill('#reconciliationStatementDate', '2026-05-31')
    await page.locator('#reconciliationLoadBtn').click()

    await expect(page.locator('#reconciliationList')).toContainText('No unreconciled transactions')
  })

  // ── Pending transaction status badge ─────────────────────────────────────────

  test('pending transaction shows pending badge in list', async ({ page }) => {
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('FinChronicleDB')
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          store.add({
            id: 9005,
            type: 'expense',
            amount: 200,
            category: 'Food',
            date: '2026-05-10',
            fromAccount: null,
            toAccount: null,
            status: 'pending',
            notes: '',
            tags: [],
            createdAt: new Date().toISOString(),
          })
          tx.oncomplete = resolve
        }
      })
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => document.querySelector('#category')?.options.length > 1, { timeout: 20000 })

    await navigateToTab(page, 'listTab')
    await expect(page.locator('.tx-status-pending').first()).toBeVisible()
    await expect(page.locator('.tx-status-pending').first()).toContainText('pending')
  })

  test('cleared transaction shows no status badge in list', async ({ page }) => {
    await addTransaction(page, { amount: '100', category: 'Food', date: '2026-05-10' })
    await navigateToTab(page, 'listTab')
    // Cleared transactions have no badge at all
    await expect(page.locator('.tx-status-badge')).toHaveCount(0)
  })
})
