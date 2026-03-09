# FinChronicle Testing Suite

Comprehensive testing suite for the [FinChronicle PWA](https://github.com/kiren-labs/finance-tracker) - a privacy-first, offline-first finance tracking application.

## 🎯 Overview

This is a **separate testing project** that keeps the main FinChronicle app clean and dependency-free. The testing suite includes:

- ✅ **Unit Tests** - Pure function testing (formatters, parsers, validators)
- ✅ **Integration Tests** - Business logic and localStorage interactions
- ✅ **E2E Tests** - Full browser automation testing across multiple browsers

## 📁 Project Structure

```
finance-tracker-tests/
├── package.json              # Dev dependencies only
├── vitest.config.js          # Unit/integration test config
├── playwright.config.js      # E2E test config
├── scripts/
│   └── extract-functions.js  # Extracts testable functions from main app (app.js)
├── src/
│   └── app.js               # Auto-generated testable functions
└── tests/
    ├── setup.js             # Test environment setup
    ├── unit/
    │   ├── formatters.test.js      # Format functions
    │   ├── parsers.test.js         # CSV parsing & date normalization
    │   └── validators.test.js      # Category detection
    ├── integration/
    │   └── [future tests]
    └── e2e/
        ├── transactions.spec.js     # Add/edit/delete flows
        └── csv-and-filters.spec.js  # Import/export & filtering
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Main FinChronicle app located at `../finance-tracker`

### Installation

```bash
# Clone this repository
git clone https://github.com/kiren-labs/finance-tracker-tests
cd finance-tracker-tests

# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

## 🧪 Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### E2E Tests Only

```bash
npm run test:e2e
```

### Watch Mode (Unit + Integration)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Interactive UI

```bash
# Vitest UI (unit/integration tests)
npm run test:ui

# Playwright UI (E2E tests)
npm run playwright:ui
```

### Debug Mode

```bash
# Debug Playwright tests
npm run playwright:debug

# View last test report
npm run playwright:report
```

## 📊 Test Coverage

### Current Test Coverage

**✅ 201 unit tests passing (v3.10.4 - modular architecture)**

**Unit Tests (Pure Functions):**
- ✅ `formatNumber()` - Number formatting with thousand separators
- ✅ `formatCurrency()` - Currency symbol + formatting
- ✅ `formatDate()` - Date formatting
- ✅ `formatMonth()` - Month formatting
- ✅ `parseCSV()` - CSV parsing with quoted fields
- ✅ `normalizeDate()` - Multiple date format support
- ✅ `monthNameToNumber()` - Month abbreviation conversion
- ✅ `normalizeImportedCategory()` - Smart category detection

**E2E Tests (User Flows):**
- ✅ Add expense transaction
- ✅ Add income transaction
- ✅ Edit transaction
- ✅ Delete transaction (with confirmation)
- ✅ Cancel edit mode
- ✅ Summary cards update
- ✅ Data persistence (localStorage)
- ✅ CSV export
- ✅ CSV import (multiple date formats)
- ✅ Invalid CSV row handling
- ✅ Month filtering
- ✅ Category filtering
- ✅ Combined filters
- ✅ Pagination (20 items per page)
- ✅ Grouped analytics (by month)
- ✅ Grouped analytics (by category)

### Browsers Tested

- ✅ Chrome (Desktop)
- ✅ Firefox (Desktop)
- ✅ Safari (Desktop)
- ✅ Chrome (Mobile - Pixel 5)
- ✅ Safari (Mobile - iPhone 12)

## 🔧 How It Works

### Unit & Integration Tests (Modular Architecture v3.10.4+)

1. **Extract Functions:** `npm run extract` extracts testable functions from modular JavaScript files in `../finance-tracker/js/`
2. **Module Mapping:** The extraction script knows which functions come from which modules (utils.js, currency.js, validation.js, etc.)
3. **Generate Module:** Creates `src/app.js` with all exported functions and required dependencies
4. **Run Tests:** Vitest runs tests against extracted functions
5. **Mock Environment:** localStorage, state, and currencies are mocked for consistency

### E2E Tests

1. **Start Server:** Playwright automatically starts Python HTTP server from `../finance-tracker`
2. **Run Tests:** Tests run in real browsers with full DOM interaction
3. **No Extraction:** E2E tests work directly with the production app
4. **Clean State:** Each test starts with cleared localStorage

## 🏗️ Modular Architecture (v3.10.4+)

### Module Structure

The main app is now split into ES modules for better maintainability:

```
finance-tracker/js/
├── app.js              # Main entry point & initialization
├── state.js            # Shared state, constants, currencies, categories
├── utils.js            # Utility functions (formatters, parsers)
├── currency.js         # Currency operations
├── validation.js       # Transaction validation
├── ui.js               # UI rendering & trend calculations
├── settings.js         # Settings & backup functionality
├── db.js               # IndexedDB operations
├── import-export.js    # CSV import/export
└── faq.js              # FAQ functionality (lazy loaded)
```

### Function-to-Module Mapping

The extraction script uses this mapping to find functions:

| Module | Functions |
|--------|-----------|
| **utils.js** | `formatNumber`, `formatDate`, `formatMonth`, `parseCSV`, `normalizeDate`, `normalizeImportedCategory`, `monthNameToNumber`, `findHeaderIndex`, `sanitizeHTML` |
| **currency.js** | `getCurrency`, `getCurrencySymbol`, `formatCurrency` |
| **validation.js** | `validateTransaction` |
| **ui.js** | `getPreviousMonth`, `getMonthTotals`, `calculateMoMDelta`, `calculateExpensePercentage` |
| **settings.js** | `getDaysSinceBackup`, `shouldShowBackupReminder` |

### Adding New Functions to Tests

**Step 1: Add function to source module**

```javascript
// In finance-tracker/js/utils.js
export function myNewFunction(input) {
  // Your logic here
  return result;
}
```

**Step 2: Update extraction script mapping**

```javascript
// In finance-tracker-tests/scripts/extract-functions.js
const functionModuleMap = {
  // ... existing functions ...
  'myNewFunction': 'utils.js',  // Add this line
}
```

**Step 3: Write unit tests**

```javascript
// In finance-tracker-tests/tests/unit/my-feature.test.js
import { describe, it, expect } from 'vitest'
import { myNewFunction } from '../../src/app.js'

describe('myNewFunction', () => {
  it('should process input correctly', () => {
    const result = myNewFunction('test')
    expect(result).toBe('expected')
  })
})
```

**Step 4: Run tests**

```bash
npm run test:unit  # Automatically extracts and tests
```

### Adding New Modules

If you create a new module (e.g., `analytics.js`):

**Step 1: Create the module**

```javascript
// finance-tracker/js/analytics.js
export function calculateAverage(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

**Step 2: Add module to extraction script**

```javascript
// In finance-tracker-tests/scripts/extract-functions.js

// 1. Add to functionModuleMap
const functionModuleMap = {
  // ... existing functions ...
  'calculateAverage': 'analytics.js',
}

// 2. Module will be auto-read from moduleFiles array
```

**Step 3: Extract and test**

```bash
npm run extract  # Should show "✅ Read analytics.js"
npm run test:unit
```

### Troubleshooting Module Extraction

**Issue: Function not found during extraction**

```
⚠️  Function not found: myFunction in utils.js
```

**Solution:** Ensure the function is exported in the source module:
```javascript
export function myFunction() { ... }  // ✅ Correct
function myFunction() { ... }         // ❌ Wrong - not exported
```

**Issue: Dependencies not available**

```
ReferenceError: currencies is not defined
```

**Solution:** Check if the dependency is extracted in the script:
- `currencies` → from `state.js` (should auto-extract)
- `categories` → from `state.js` (should auto-extract)
- `state` → from `state.js` (should auto-extract)

**Issue: Test helpers not available**

Use the provided test helper functions:
```javascript
import { __testSetLastBackupTimestamp, __testSetTransactions, __testResetBackupState } from '../../src/app.js'

// Reset state before each test
beforeEach(() => {
  __testResetBackupState()
})
```

## 📝 Writing New Tests

### Unit Test Example

```javascript
// tests/unit/my-feature.test.js
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../src/app.js'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### E2E Test Example

```javascript
// tests/e2e/my-feature.spec.js
import { test, expect } from '@playwright/test'

test('should perform user action', async ({ page }) => {
  await page.goto('/')

  // Interact with page
  await page.fill('#amount', '1000')
  await page.click('#submitBtn')

  // Assert result
  await expect(page.locator('.success-message')).toBeVisible()
})
```

## 🐛 Debugging Tips

### Failed E2E Tests

1. **View Report:** `npm run playwright:report`
2. **Debug Mode:** `npm run playwright:debug`
3. **Screenshots:** Check `test-results/` directory
4. **Traces:** Available in HTML report for failed tests

### Failed Unit Tests

1. **Watch Mode:** `npm run test:watch` - Auto-reruns on file changes
2. **UI Mode:** `npm run test:ui` - Interactive test browser
3. **Coverage:** `npm run test:coverage` - See what's not tested

### Common Issues

**Issue: Functions not found during extraction**
- Solution: Update `scripts/extract-functions.js` to include new function names

**Issue: E2E tests can't connect to server**
- Solution: Ensure `../finance-tracker` exists and contains `app.js`
- Solution: Check that port 8000 is not already in use

**Issue: localStorage not persisting**
- Solution: E2E tests clear localStorage in `beforeEach` - this is expected

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test FinChronicle

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout main app
        uses: actions/checkout@v3
        with:
          repository: kiren-labs/finance-tracker
          path: finance-tracker

      - name: Checkout tests
        uses: actions/checkout@v3
        with:
          path: finance-tracker-tests

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd finance-tracker-tests
          npm install

      - name: Install Playwright browsers
        run: |
          cd finance-tracker-tests
          npx playwright install --with-deps

      - name: Run all tests
        run: |
          cd finance-tracker-tests
          npm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: finance-tracker-tests/test-results/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./finance-tracker-tests/coverage/coverage-final.json
```

## 📦 Dependencies

### Test Frameworks

- **vitest** - Fast unit/integration testing (Jest-compatible)
- **@vitest/ui** - Interactive test UI
- **@vitest/coverage-v8** - Code coverage reporting
- **happy-dom** - Lightweight DOM implementation for tests
- **@playwright/test** - E2E testing across browsers

### Zero Production Dependencies

The main FinChronicle app has **zero dependencies**. All testing dependencies are isolated in this project.

## 🤝 Contributing

1. Fork this repository
2. Create your feature branch: `git checkout -b feature/my-test`
3. Write tests following existing patterns
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add tests for feature X'`
6. Push to the branch: `git push origin feature/my-test`
7. Open a Pull Request

## 📄 License

MIT License - Same as FinChronicle

## 🔗 Links

- **Main App:** [kiren-labs/finance-tracker](https://github.com/kiren-labs/finance-tracker)
- **Live Demo:** [https://kiren-labs.github.io/finchronicle/](https://kiren-labs.github.io/finchronicle/)
- **Issues:** [Report bugs](https://github.com/kiren-labs/finance-tracker/issues)

---

**Made with ❤️ by Kiren Labs**

Last Updated: 2026-03-09
