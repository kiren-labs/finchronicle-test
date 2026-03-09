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

// Extract version from app.js (version constant should still be there)
const appJsContent = readFileSync(resolve(jsDir, 'app.js'), 'utf-8')
const versionMatch = appJsContent.match(/(?:const|export const) APP_VERSION = ['"]([^'"]+)['"]/)
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

`

// Extract currency data from currency.js
const currencyJsContent = moduleContents['currency.js'] || ''
const currenciesMatch = currencyJsContent.match(/const currencies = ({[\s\S]*?});/)
if (currenciesMatch) {
  moduleContent += `const currencies = ${currenciesMatch[1]};\n\n`
}

// Extract category data from state.js or app.js
const stateJsContent = readFileSync(resolve(jsDir, 'state.js'), 'utf-8')
const categoriesMatch = stateJsContent.match(/(?:export )?const categories = ({[\s\S]*?});/)
  || appJsContent.match(/(?:export )?const categories = ({[\s\S]*?});/)
if (categoriesMatch) {
  moduleContent += `const categories = ${categoriesMatch[1]};\n\n`
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

// Mock localStorage for functions that use it
moduleContent += `
// Global variables for backup functions (v3.9.0+)
let lastBackupTimestamp = null
let transactions = []

// Mock localStorage for testing environment
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => 'INR',
    setItem: () => {},
    clear: () => {},
  }
}

// Export global variable accessors for testing
export { lastBackupTimestamp, transactions }

// Test helper functions to manipulate module-level state
export function __testSetLastBackupTimestamp(timestamp) {
  lastBackupTimestamp = timestamp
}

export function __testSetTransactions(txArray) {
  transactions = txArray
}

export function __testResetBackupState() {
  lastBackupTimestamp = null
  transactions = []
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
