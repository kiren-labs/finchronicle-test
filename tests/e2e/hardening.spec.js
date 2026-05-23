import { test, expect } from '@playwright/test'
import { navigateToTab, clearAllStorage } from './helpers.js'

test.describe('Phase 1 Hardening — v3.29.0', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.summary-section, #add-tab', { state: 'visible' })
  })

  test.describe('1.2 Content Security Policy', () => {
    test('should have CSP meta tag in document', async ({ page }) => {
      const csp = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
        return meta ? meta.getAttribute('content') : null
      })
      expect(csp).not.toBeNull()
      expect(csp).toContain("script-src 'self'")
      expect(csp).toContain("default-src 'self'")
    })

    test('should not have CSP violations on load', async ({ page }) => {
      const violations = []
      page.on('console', msg => {
        if (msg.text().includes('[Report Only]') || msg.text().includes('Refused to')) {
          violations.push(msg.text())
        }
      })
      await page.reload()
      await page.waitForLoadState('networkidle')
      expect(violations).toHaveLength(0)
    })

    test('Remix Icons should still load', async ({ page }) => {
      // Check that at least one icon renders with content (not empty box)
      const iconVisible = await page.evaluate(() => {
        const icon = document.querySelector('.ri-add-line, .ri-settings-3-line, [class*="ri-"]')
        if (!icon) return false
        const style = window.getComputedStyle(icon, '::before')
        return style.content !== 'none' && style.content !== ''
      })
      expect(iconVisible).toBe(true)
    })
  })

  test.describe('1.3 UUID IDs', () => {
    test('new transaction should have UUID id', async ({ page }) => {
      // Wait for category dropdown
      await page.waitForFunction(() => {
        const sel = document.querySelector('#category')
        return sel && sel.options.length > 1
      }, { timeout: 20000 })

      await page.fill('#amount', '500')
      await page.selectOption('#category', 'Food')
      await page.fill('#date', '2026-05-20')
      await page.click('#submitBtn')

      await page.waitForSelector('.success-message.show')

      // Check IDB for UUID
      const id = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const req = indexedDB.open('FinChronicleDB')
          req.onsuccess = () => {
            const db = req.result
            const tx = db.transaction('transactions', 'readonly')
            const store = tx.objectStore('transactions')
            const getAll = store.getAll()
            getAll.onsuccess = () => {
              const last = getAll.result[getAll.result.length - 1]
              resolve(last ? last.id : null)
            }
          }
        })
      })

      expect(typeof id).toBe('string')
      // UUID v4 format
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })
  })

  test.describe('1.4 XSS Prevention', () => {
    test('script tag in notes should not execute', async ({ page }) => {
      await page.waitForFunction(() => {
        const sel = document.querySelector('#category')
        return sel && sel.options.length > 1
      }, { timeout: 20000 })

      const xssPayload = '<script>window.__xss=true</script>'
      await page.fill('#amount', '100')
      await page.selectOption('#category', 'Food')
      await page.fill('#date', '2026-05-20')
      await page.fill('#notes', xssPayload)
      await page.click('#submitBtn')

      await page.waitForSelector('.success-message.show')
      await navigateToTab(page, 'listTab')
      await page.waitForSelector('.transaction-item')

      const xssTriggered = await page.evaluate(() => window.__xss)
      expect(xssTriggered).toBeFalsy()
    })

    test('img onerror in notes should not execute', async ({ page }) => {
      await page.waitForFunction(() => {
        const sel = document.querySelector('#category')
        return sel && sel.options.length > 1
      }, { timeout: 20000 })

      const xssPayload = '<img src=x onerror="window.__xss2=true">'
      await page.fill('#amount', '100')
      await page.selectOption('#category', 'Food')
      await page.fill('#date', '2026-05-20')
      await page.fill('#notes', xssPayload)
      await page.click('#submitBtn')

      await page.waitForSelector('.success-message.show')
      await navigateToTab(page, 'listTab')
      await page.waitForSelector('.transaction-item')

      const xssTriggered = await page.evaluate(() => window.__xss2)
      expect(xssTriggered).toBeFalsy()
    })
  })

  test.describe('1.5 Error Log', () => {
    test('should capture unhandled errors in localStorage', async ({ page }) => {
      // Use setTimeout to throw inside the page context (not Playwright's evaluate context)
      await page.evaluate(() => {
        setTimeout(() => { throw new Error('Test error for error log') }, 0)
      })

      // Give the handler time to fire and write
      await page.waitForTimeout(500)

      const errorLog = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('errorLog') || '[]')
      })

      expect(errorLog.length).toBeGreaterThan(0)
      const lastError = errorLog[errorLog.length - 1]
      expect(lastError.message).toContain('Test error for error log')
      expect(lastError.timestamp).toBeTruthy()
    })

    test('should capture unhandled promise rejections', async ({ page }) => {
      await page.evaluate(() => {
        // Create a rejection that won't be caught
        const p = new Promise((_, reject) => { setTimeout(() => reject(new Error('Async failure test')), 0) })
        // Intentionally not awaiting p
        void p
      })

      await page.waitForTimeout(500)

      const errorLog = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('errorLog') || '[]')
      })

      const asyncError = errorLog.find(e => e.message.includes('Async failure test'))
      expect(asyncError).toBeTruthy()
    })

    test('error log container should exist in DOM', async ({ page }) => {
      // Verify the error log container div is in the page
      const container = page.locator('#errorLogContainer')
      await expect(container).toBeAttached()
    })
  })

  test.describe('1.7 SW visibilitychange', () => {
    test('should not have setInterval for SW update', async ({ page }) => {
      // Check that the app.js source doesn't poll with setInterval for registration.update
      const hasPolling = await page.evaluate(async () => {
        const resp = await fetch('/js/app.js')
        const text = await resp.text()
        return text.includes('setInterval') && text.includes('registration.update')
      })
      expect(hasPolling).toBe(false)
    })

    test('should have visibilitychange listener', async ({ page }) => {
      const hasVisibility = await page.evaluate(async () => {
        const resp = await fetch('/js/app.js')
        const text = await resp.text()
        return text.includes('visibilitychange')
      })
      expect(hasVisibility).toBe(true)
    })
  })
})
