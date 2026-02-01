import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const indexPath = resolve(__dirname, '../../finance-tracker/index.html')
const outputPath = resolve(__dirname, '../src/app.js')

console.log('📖 Reading index.html from:', indexPath)

const indexHtml = readFileSync(indexPath, 'utf-8')

// Extract JavaScript between <script> tags
const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>/)
if (!scriptMatch) {
  throw new Error('❌ No script found in index.html')
}

const scriptContent = scriptMatch[1]

// List of functions to extract for testing
const functions = [
  'formatCurrency',
  'formatNumber',
  'formatDate',
  'formatMonth',
  'parseCSV',
  'normalizeDate',
  'normalizeImportedCategory',
  'monthNameToNumber',
  'findHeaderIndex',
  'getCurrencySymbol',
  'getCurrency',
]

// Build testable module
let moduleContent = `// Auto-generated from index.html
// Do not edit manually - run 'npm run extract' to regenerate
// Generated at: ${new Date().toISOString()}

`

// Extract currency data
const currenciesMatch = scriptContent.match(/const currencies = ({[\s\S]*?});/)
if (currenciesMatch) {
  moduleContent += `const currencies = ${currenciesMatch[1]};\n\n`
}

// Extract category data
const categoriesMatch = scriptContent.match(/const categories = ({[\s\S]*?});/)
if (categoriesMatch) {
  moduleContent += `const categories = ${categoriesMatch[1]};\n\n`
}

// Helper function to extract complete function body
function extractFunction(code, functionName) {
  const funcRegex = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`)
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
    return code.substring(match.index, i)
  }

  return null
}

// Extract each function
let extractedCount = 0
functions.forEach((fnName) => {
  const extracted = extractFunction(scriptContent, fnName)
  if (extracted) {
    moduleContent += `export ${extracted}\n\n`
    extractedCount++
  } else {
    console.warn(`⚠️  Function not found: ${fnName}`)
  }
})

// Mock localStorage for functions that use it
moduleContent += `
// Mock localStorage for testing environment
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => 'INR',
    setItem: () => {},
    clear: () => {},
  }
}
`

// Write to src/app.js
writeFileSync(outputPath, moduleContent)

console.log(`✅ Functions extracted successfully!`)
console.log(`   Output: src/app.js`)
console.log(`   Extracted: ${extractedCount}/${functions.length} functions`)

if (extractedCount < functions.length) {
  console.warn(`\n⚠️  Warning: Only ${extractedCount} of ${functions.length} functions were extracted`)
}
