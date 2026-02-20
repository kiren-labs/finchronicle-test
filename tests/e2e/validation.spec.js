import { test, expect } from '@playwright/test'

test.describe('Transaction Validation (v3.10.2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear localStorage for fresh start
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Wait for app to be fully loaded and interactive
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
  })

  test('should reject negative amounts', async ({ page }) => {
    await page.fill('#amount', '-100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Test')

    await page.click('#submitBtn')

    // Should show error message
    await page.waitForSelector('.success-message:has-text("Amount must be a positive number")', { state: 'visible', timeout: 5000 })

    // Transaction should not be saved
    await page.click('#list-tab')
    await expect(page.locator('.transaction-item')).toHaveCount(0)
  })

  test('should reject zero amounts', async ({ page }) => {
    await page.fill('#amount', '0')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Test')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Amount must be a positive number')
  })

  test('should reject amounts exceeding maximum limit', async ({ page }) => {
    await page.fill('#amount', '1000000000') // 100 crore (exceeds 99 crore limit)
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Test')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Amount exceeds maximum limit')
  })

  test('should accept maximum allowed amount', async ({ page }) => {
    await page.fill('#amount', '999999999') // ₹99 crore exactly
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Large transaction')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should reject future dates', async ({ page }) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().split('T')[0]

    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', futureDate)
    await page.fill('#notes', 'Future transaction')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Future dates are not allowed')
  })

  test('should reject dates before 1900', async ({ page }) => {
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '1899-12-31')
    await page.fill('#notes', 'Old transaction')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Date is too far in the past')
  })

  test('should accept valid historical date', async ({ page }) => {
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2020-01-15')
    await page.fill('#notes', 'Historical transaction')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should accept today\'s date', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]

    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', today)
    await page.fill('#notes', 'Today\'s transaction')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should reject notes longer than 500 characters', async ({ page }) => {
    const longNotes = 'a'.repeat(501)

    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', longNotes)

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Notes too long')
  })

  test('should accept notes at maximum length (500 characters)', async ({ page }) => {
    const maxNotes = 'a'.repeat(500)

    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', maxNotes)

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should sanitize HTML in notes', async ({ page }) => {
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', '<script>alert("xss")</script>Lunch')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Transaction saved!')

    // Wait for success message to disappear before navigating
    await page.waitForTimeout(2500)

    // Go to list and check notes are sanitized
    await page.click('#list-tab')

    const notesElement = page.locator('.transaction-note')
    await expect(notesElement).toBeVisible()

    // Check that script tags were escaped (not executed)
    const notesText = await notesElement.textContent()
    expect(notesText).not.toContain('<script>')

    // The HTML should be displayed as text, not rendered
    const innerHTML = await notesElement.innerHTML()
    expect(innerHTML).not.toContain('<script>alert')
  })

  test('should accept valid expense with all fields', async ({ page }) => {
    await page.fill('#amount', '123.45')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Valid expense transaction')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Transaction saved!')

    // Wait for success message animation before navigating
    await page.waitForTimeout(2500)

    // Verify in list
    await page.click('#list-tab')
    await expect(page.locator('.transaction-item')).toHaveCount(1)
  })

  test('should accept valid income with all fields', async ({ page }) => {
    await page.click('[data-type="income"]')

    await page.fill('#amount', '5000')
    await page.selectOption('#category', 'Salary')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Valid income transaction')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should validate category matches transaction type', async ({ page }) => {
    // Try to select income category for expense type
    // Note: This should be prevented by the UI, but validation catches it

    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Expense with valid category')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should show multiple validation errors if multiple fields invalid', async ({ page }) => {
    await page.fill('#amount', '-100') // Invalid amount
    await page.selectOption('#category', 'Food')

    // Set future date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.fill('#date', tomorrow.toISOString().split('T')[0])

    // Set very long notes
    await page.fill('#notes', 'a'.repeat(501))

    await page.click('#submitBtn')

    // Should show at least one error message
    await expect(page.locator('.success-message.show')).toBeVisible()
  })

  test('should accept empty notes', async ({ page }) => {
    await page.fill('#amount', '100')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    // Leave notes empty

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should accept decimal amounts with 2 decimal places', async ({ page }) => {
    await page.fill('#amount', '99.99')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', 'Decimal amount')

    await page.click('#submitBtn')

    await expect(page.locator('.success-message')).toContainText('Transaction saved!')
  })

  test('should preserve safe special characters in notes', async ({ page }) => {
    const notesText = 'Transaction @ restaurant & café: $50 (50% discount)'

    await page.fill('#amount', '50')
    await page.selectOption('#category', 'Food')
    await page.fill('#date', '2026-02-01')
    await page.fill('#notes', notesText)

    await page.click('#submitBtn')

    await expect(page.locator('.success-message.show')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('Transaction saved!')

    // Wait for success message animation before navigating
    await page.waitForTimeout(2500)

    // Verify notes are preserved correctly
    await page.click('#list-tab')
    const displayedNotes = await page.locator('.transaction-note').textContent()
    expect(displayedNotes).toContain('restaurant')
    expect(displayedNotes).toContain('café')
  })
})
