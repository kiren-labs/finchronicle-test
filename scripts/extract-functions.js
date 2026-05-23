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
