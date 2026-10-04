import type { Transaction, TxType } from '../types'
import { getCategory, isCategoryId } from './categories'
import { minorToInput, parseAmount } from './format'

const HEADER = ['date', 'type', 'category', 'amount', 'note']

function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCSV(txs: Transaction[]): string {
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) =>
      [t.date, t.type, t.categoryId, minorToInput(t.amount), t.note].map(escape).join(','),
    )
  return [HEADER.join(','), ...rows].join('\n')
}

/** RFC 4180-style parser: understands quoted fields containing commas, quotes and newlines. */
function parseRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

export interface ImportResult {
  transactions: Omit<Transaction, 'id' | 'createdAt'>[]
  errors: string[]
}

export function parseCSV(text: string): ImportResult {
  const rows = parseRows(text.trim())
  const errors: string[] = []
  const transactions: ImportResult['transactions'] = []
  if (!rows.length) return { transactions, errors: ['The file is empty.'] }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = Object.fromEntries(HEADER.map((h) => [h, header.indexOf(h)]))
  const missing = HEADER.filter((h) => h !== 'note' && idx[h] === -1)
  if (missing.length) {
    return { transactions, errors: [`Missing column: ${missing.join(', ')}.`] }
  }

  rows.slice(1).forEach((r, i) => {
    const line = i + 2
    const date = r[idx.date]?.trim() ?? ''
    const type = r[idx.type]?.trim().toLowerCase() as TxType
    const categoryId = r[idx.category]?.trim() ?? ''
    const amount = parseAmount(r[idx.amount] ?? '')
    const note = idx.note >= 0 ? (r[idx.note] ?? '').trim() : ''

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return errors.push(`Row ${line}: date must be yyyy-mm-dd.`)
    if (type !== 'expense' && type !== 'income')
      return errors.push(`Row ${line}: type must be expense or income.`)
    if (!isCategoryId(categoryId) || getCategory(categoryId).type !== type)
      return errors.push(`Row ${line}: "${categoryId}" isn't a valid ${type} category.`)
    if (amount === null) return errors.push(`Row ${line}: amount must be a positive number.`)

    transactions.push({ date, type, categoryId, amount, note })
  })

  return { transactions, errors }
}
