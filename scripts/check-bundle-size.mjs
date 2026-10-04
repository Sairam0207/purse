// Fails the build if the JavaScript users download grows past its budget.
// Budgets are gzip sizes: what actually crosses the network.
import { readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const BUDGETS_KB = {
  // Everything needed to show the first screen: index.html's entry script plus its static imports.
  initial: 140,
  // All JS across every route.
  total: 320,
}

const dist = 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const assets = readdirSync(join(dist, 'assets'))
const kb = (file) => gzipSync(readFileSync(join(dist, 'assets', file))).length / 1024

const entry = html.match(/assets\/(index-[\w-]+\.js)/)?.[1]
const preloads = [...html.matchAll(/modulepreload" [^>]*href="\.?\/?assets\/([\w-]+\.js)"/g)].map((m) => m[1])
const initialFiles = [entry, ...preloads].filter(Boolean)
const initial = initialFiles.reduce((sum, f) => sum + kb(f), 0)
const total = assets.filter((f) => f.endsWith('.js')).reduce((sum, f) => sum + kb(f), 0)

const rows = [
  ['initial JS', initial, BUDGETS_KB.initial],
  ['total JS', total, BUDGETS_KB.total],
]
let failed = false
for (const [name, size, budget] of rows) {
  const ok = size <= budget
  failed ||= !ok
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(11)} ${size.toFixed(1).padStart(7)} kB gzip  (budget ${budget} kB)`)
}
if (failed) {
  console.error('\nBundle budget exceeded. Lazy-load the new code or raise the budget with a reason in the PR.')
  process.exit(1)
}
