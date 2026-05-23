import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const jsDir = resolve(__dirname, '../../finance-tracker/js')
const outputPath = resolve(__dirname, '../src/app.js')

// Ensure src directory exists
mkdirSync(dirname(outputPath), { recursive: true })

console.log('📖 Reading modular JavaScript from:', jsDir)

// Map of functions to their source modules (after refactoring to ES modules)
const functionModuleMap = {
  // utils.js
  'formatNumber': 'utils.js',
  'formatDate': 'utils.js',
  'formatMonth': 'utils.js',
  'parseCSV': 'utils.js',
  'normalizeDate': 'utils.js',
  'normalizeImportedCategory': 'utils.js',
  'monthNameToNumber': 'utils.js',
  'findHeaderIndex': 'utils.js',
  'sanitizeHTML': 'utils.js',
  'generateId': 'utils.js',
  'getErrorLog': 'utils.js',
  'clearErrorLog': 'utils.js',
  // currency.js
  'getCurrency': 'currency.js',
  'getCurrencySymbol': 'currency.js',
  'formatCurrency': 'currency.js',
  // validation.js
  'validateTransaction': 'validation.js',
  // ui.js
  'getPreviousMonth': 'ui.js',
  'getMonthTotals': 'ui.js',
  'calculateMoMDelta': 'ui.js',
  'calculateExpensePercentage': 'ui.js',
  // settings.js
  'getDaysSinceBackup': 'settings.js',
  'shouldShowBackupReminder': 'settings.js',
  // reconciliation.js
  'computeReconciledBase': 'reconciliation.js',
  'computeCheckedBalance': 'reconciliation.js',
  'filterCandidates': 'reconciliation.js',
  // state.js helpers
  'getAllCategoryNames': 'state.js',
  'getCategoryParent': 'state.js',
  // recurring.js (v4.1.0 — needed for forecast)
  'computeNextDueDate': 'recurring.js',
}

// Read all module files
const moduleContents = {}
const moduleFiles = [...new Set(Object.values(functionModuleMap))]

moduleFiles.forEach(file => {
  const filePath = resolve(jsDir, file)
  try {
    moduleContents[file] = readFileSync(filePath, 'utf-8')
    console.log(`✅ Read ${file}`)
  } catch (err) {
    console.error(`❌ Failed to read ${file}:`, err.message)
    moduleContents[file] = ''
  }
})

// Read state.js for APP_VERSION and state object
const stateJsPath = resolve(jsDir, 'state.js')
const stateJsContent = readFileSync(stateJsPath, 'utf-8')
const versionMatch = stateJsContent.match(/export const APP_VERSION = ['"]([^'"]+)['"]/)
const appVersion = versionMatch ? versionMatch[1] : 'unknown'
console.log(`📦 App version: ${appVersion}`)

// List of functions to extract for testing (keys of functionModuleMap)
const functions = Object.keys(functionModuleMap)

// Build testable module
let moduleContent = `// Auto-generated from modular JavaScript (v3.10.4+)
// Do not edit manually - run 'npm run extract' to regenerate
// Generated at: ${new Date().toISOString()}
// App version: ${appVersion}

export const APP_VERSION = '${appVersion}';

// Mock localStorage for testing environment
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => 'INR',
    setItem: () => {},
    clear: () => {},
  }
}

`

// Extract state object structure from state.js
const stateObjectMatch = stateJsContent.match(/export const state = ({[\s\S]*?});/)
if (stateObjectMatch) {
  moduleContent += `// Application state (mocked for testing)\nexport const state = ${stateObjectMatch[1]};\n\n`
} else {
  // Fallback state object
  moduleContent += `// Application state (mocked for testing)
export const state = {
    db: null,
    transactions: [],
    lastBackupTimestamp: null,
    currentTab: 'add',
};\n\n`
}

// Extract currency data from state.js (not currency.js - it imports from state)
const currenciesMatch = stateJsContent.match(/export const currencies = ({[\s\S]*?});/)
if (currenciesMatch) {
  moduleContent += `export const currencies = ${currenciesMatch[1]};\n\n`
} else {
  console.warn('⚠️  Could not extract currencies object from state.js')
}

// Extract category data from state.js (brace-counting for nested structure)
function extractTopLevelObject(source, varName) {
  const startPattern = new RegExp(`export const ${varName} = \\{`)
  const startMatch = startPattern.exec(source)
  if (!startMatch) return null
  const startIdx = startMatch.index + startMatch[0].length - 1 // position of opening {
  let braceCount = 0, i = startIdx
  while (i < source.length) {
    if (source[i] === '{') braceCount++
    else if (source[i] === '}') { braceCount--; if (braceCount === 0) return source.substring(startIdx, i + 1) }
    i++
  }
  return null
}
const categoriesExtracted = extractTopLevelObject(stateJsContent, 'categories')
if (categoriesExtracted) {
  moduleContent += `export const categories = ${categoriesExtracted};\n\n`
} else {
  console.warn('⚠️  Could not extract categories object from state.js')
}

// Extract PAYMENT_METHODS from state.js
const paymentMethodsMatch = stateJsContent.match(/export const PAYMENT_METHODS = (\[[\s\S]*?\]);/)
if (paymentMethodsMatch) {
  moduleContent += `export const PAYMENT_METHODS = ${paymentMethodsMatch[1]};\n\n`
} else {
  console.warn('⚠️  Could not extract PAYMENT_METHODS from state.js')
}

// Extract EXPENSE_TYPES from state.js
const expenseTypesMatch = stateJsContent.match(/export const EXPENSE_TYPES = (\[[\s\S]*?\]);/)
if (expenseTypesMatch) {
  moduleContent += `export const EXPENSE_TYPES = ${expenseTypesMatch[1]};\n\n`
} else {
  console.warn('⚠️  Could not extract EXPENSE_TYPES from state.js')
}

// Helper function to extract complete function body including export keyword
function extractFunction(code, functionName) {
  // Try to match "export function" first, then fallback to just "function"
  const funcRegex = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`)
  const match = funcRegex.exec(code)

  if (!match) return null

  let braceCount = 1
  let i = match.index + match[0].length

  // Find matching closing brace
  while (i < code.length && braceCount > 0) {
    if (code[i] === '{') braceCount++
    if (code[i] === '}') braceCount--
    i++
  }

  if (braceCount === 0) {
    const extracted = code.substring(match.index, i)
    // Ensure it has export keyword
    return extracted.startsWith('export') ? extracted : `export ${extracted}`
  }

  return null
}

// Extract each function from its respective module
let extractedCount = 0
functions.forEach((fnName) => {
  const sourceModule = functionModuleMap[fnName]
  const sourceCode = moduleContents[sourceModule]

  if (!sourceCode) {
    console.warn(`⚠️  Module not found for function: ${fnName} (expected in ${sourceModule})`)
    return
  }

  const extracted = extractFunction(sourceCode, fnName)
  if (extracted) {
    moduleContent += `${extracted}\n\n`
    extractedCount++
  } else {
    console.warn(`⚠️  Function not found: ${fnName} in ${sourceModule}`)
  }
})

// Add test helper functions for manipulating state
moduleContent += `
// Test helper functions to manipulate module-level state
export function __testSetLastBackupTimestamp(timestamp) {
  state.lastBackupTimestamp = timestamp
}

export function __testSetTransactions(txArray) {
  state.transactions = txArray
}

export function __testResetBackupState() {
  state.lastBackupTimestamp = null
  state.transactions = []
  state.currentTab = 'add'
}

// ============================================================================
// v4.1.0 — Pure testable versions of forecast + health alert functions
// These take explicit args instead of reading from module-level state,
// making them unit-testable without DOM or IndexedDB.
// ============================================================================

export function getAccountBalance(accountName, accounts, transactions) {
  const account = accounts.find(a => a.name === accountName)
  const opening = account ? (account.openingBalance || 0) : 0
  let balance = opening
  for (const t of transactions) {
    if (t.type === 'income' && t.toAccount === accountName) balance += t.amount
    else if (t.type === 'expense' && t.fromAccount === accountName) balance -= t.amount
    else if (t.type === 'transfer') {
      if (t.fromAccount === accountName) balance -= t.amount
      if (t.toAccount === accountName) balance += t.amount
    }
  }
  return balance
}

export function buildForecast(accounts, transactions, recurringTemplates, horizonDays = 90) {
  if (!recurringTemplates || recurringTemplates.length === 0) return { accountForecasts: {}, warnings: [] }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const horizon = new Date(today); horizon.setDate(today.getDate() + horizonDays)

  const events = []
  for (const tmpl of recurringTemplates) {
    if (!tmpl.enabled) continue
    if (!tmpl.fromAccount && !tmpl.toAccount) continue
    let dateStr = tmpl.nextDueDate
    if (!dateStr) continue
    let safety = 0
    while (safety < 400) {
      safety++
      const d = new Date(dateStr + 'T00:00:00')
      if (d > horizon) break
      if (d >= today) {
        events.push({ date: dateStr, dateObj: d, label: tmpl.name || tmpl.category || 'Recurring',
          amount: tmpl.amount, type: tmpl.type, fromAccount: tmpl.fromAccount || null, toAccount: tmpl.toAccount || null })
      }
      dateStr = computeNextDueDate(tmpl.frequency, tmpl.dayOfMonth || d.getDate(), dateStr)
    }
  }
  events.sort((a, b) => a.dateObj - b.dateObj)

  const relevantAccounts = new Set()
  for (const e of events) {
    if (e.fromAccount) relevantAccounts.add(e.fromAccount)
    if (e.toAccount) relevantAccounts.add(e.toAccount)
  }
  if (relevantAccounts.size === 0) return { accountForecasts: {}, warnings: [] }

  const runningBalances = {}
  const accountForecasts = {}
  for (const name of relevantAccounts) {
    runningBalances[name] = getAccountBalance(name, accounts, transactions)
    accountForecasts[name] = { currentBalance: runningBalances[name], events: [] }
  }

  const warnings = []
  for (const e of events) {
    if (e.fromAccount && accountForecasts[e.fromAccount]) {
      runningBalances[e.fromAccount] -= e.amount
      const bal = runningBalances[e.fromAccount]
      accountForecasts[e.fromAccount].events.push({ date: e.date, label: e.label, amount: -e.amount, runningBalance: bal })
      if (bal < 0) warnings.push({ account: e.fromAccount, date: e.date, balance: bal })
    }
    if (e.toAccount && accountForecasts[e.toAccount]) {
      runningBalances[e.toAccount] += e.amount
      const bal = runningBalances[e.toAccount]
      accountForecasts[e.toAccount].events.push({ date: e.date, label: e.label, amount: e.amount, runningBalance: bal })
    }
  }
  return { accountForecasts, warnings }
}

export function checkInactivityAlert(transactions, todayStr) {
  if (!transactions || transactions.length === 0) return null
  const sorted = [...transactions].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
  const latest = new Date(sorted[0].createdAt || sorted[0].date)
  const today = new Date(todayStr)
  const diffDays = Math.floor((today - latest) / (1000 * 60 * 60 * 24))
  return diffDays >= 5 ? { type: 'inactivity', diffDays } : null
}

export function checkBillDueAlert(recurringTemplates, accounts, transactions, todayStr, windowDays = 3) {
  const alerts = []
  if (!recurringTemplates) return alerts
  const today = new Date(todayStr); today.setHours(0,0,0,0)
  for (const tmpl of recurringTemplates) {
    if (!tmpl.enabled || tmpl.type !== 'expense' || !tmpl.fromAccount || !tmpl.nextDueDate) continue
    const due = new Date(tmpl.nextDueDate); due.setHours(0,0,0,0)
    const daysUntil = Math.round((due - today) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0 || daysUntil > windowDays) continue
    const balance = getAccountBalance(tmpl.fromAccount, accounts, transactions)
    if (balance < tmpl.amount * 1.2) alerts.push({ type: 'bill-due', template: tmpl.name, daysUntil, balance, amount: tmpl.amount })
  }
  return alerts
}

export function checkSavingsRateTrendAlert(savingsRates) {
  if (!savingsRates || savingsRates.length < 3) return null
  const last3 = savingsRates.slice(-3)
  const allBelow = last3.every(r => r !== null && r < 10)
  if (!allBelow) return null
  const valid = last3.filter(r => r !== null)
  const avg = valid.reduce((s, r) => s + r, 0) / valid.length
  return { type: 'savings-rate-trend', avg: parseFloat(avg.toFixed(1)) }
}

export function checkMonthlyPaceAlert(budgets, categorySpend, dayOfMonth, daysInMonth) {
  const alerts = []
  if (!budgets || dayOfMonth < 5) return alerts
  for (const budget of budgets) {
    const spent = categorySpend[budget.category] || 0
    if (spent === 0) continue
    const projected = (spent / dayOfMonth) * daysInMonth
    if (projected > budget.monthlyLimit * 1.2) {
      alerts.push({ type: 'monthly-pace', category: budget.category, projected: Math.round(projected), limit: budget.monthlyLimit })
    }
  }
  return alerts
}
`

// Write to src/app.js
writeFileSync(outputPath, moduleContent)

// Write version metadata
const versionMetadata = {
  appVersion,
  testedAt: new Date().toISOString(),
  extractedFunctions: extractedCount,
  totalFunctions: functions.length,
  success: extractedCount === functions.length
}
const metadataPath = resolve(__dirname, '../test-metadata.json')
writeFileSync(metadataPath, JSON.stringify(versionMetadata, null, 2))

console.log(`✅ Functions extracted successfully!`)
console.log(`   App version: ${appVersion}`)
console.log(`   Output: src/app.js`)
console.log(`   Metadata: test-metadata.json`)
console.log(`   Extracted: ${extractedCount}/${functions.length} functions`)

if (extractedCount < functions.length) {
  console.warn(`\n⚠️  Warning: Only ${extractedCount} of ${functions.length} functions were extracted`)
}
