import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useLedger } from '../store/ledger'
import { useSettings } from '../store/settings'
import { toast } from '../store/toast'
import { parseCSV, toCSV } from '../lib/csv'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Currency, ThemePreference } from '../types'
import { Button, Field, SegmentedControl, Select, confirm } from '../ui'
import { currentVitals, recentErrors } from '../lib/monitoring'
import { useSync } from '../sync/status'

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'INR', label: 'Indian rupee (₹)' },
  { value: 'USD', label: 'US dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British pound (£)' },
]

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Match device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function Settings() {
  useDocumentTitle('Settings')
  const { currency, theme, setCurrency, setTheme } = useSettings()
  const { transactions, importMany, loadDemo, loadLarge, clearAll } = useLedger()
  const [vitals, setVitals] = useState(currentVitals)
  const { configured, userId } = useSync()
  const signedIn = userId !== null
  const fileRef = useRef<HTMLInputElement>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const exportCSV = () => {
    const blob = new Blob([toCSV(transactions)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `purse-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${transactions.length} transactions`)
  }

  const importCSV = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { transactions: rows, errors } = parseCSV(await file.text())
    setImportErrors(errors.slice(0, 8).concat(errors.length > 8 ? [`…and ${errors.length - 8} more`] : []))
    if (rows.length) toast(`Imported ${importMany(rows)} transactions`)
    else if (!errors.length) toast('No transactions found in that file')
  }

  return (
    <div className="page settings">
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <section className="settings-section" aria-labelledby="pref-h">
        <h2 id="pref-h">Preferences</h2>
        <Field label="Currency" help="Changes how amounts are shown. Stored amounts aren't converted.">
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            options={CURRENCIES}
          />
        </Field>
        <SegmentedControl
          legend="Appearance"
          hideLegend={false}
          className="segmented-wide"
          value={theme}
          options={THEMES}
          onChange={setTheme}
        />
      </section>

      <section className="settings-section" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <p className="page-sub">
          {signedIn
            ? 'Your data is saved in your account and synced across devices. You can still export a CSV copy.'
            : configured
              ? 'Your data is stored in this browser. Sign in to back it up and sync it across devices, or export a CSV.'
              : 'Everything is stored in this browser. Nothing is sent to a server. Export a CSV to back it up or move it to another device.'}
        </p>
        <div className="button-row">
          <Button onClick={exportCSV} disabled={!transactions.length}>Export CSV</Button>
          <Button onClick={() => fileRef.current?.click()}>Import CSV</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importCSV} />
        </div>
        <p className="field-help">
          Columns: date (yyyy-mm-dd), type (expense or income), category, amount, note.
        </p>
        {importErrors.length > 0 && (
          <div className="import-errors" role="alert">
            <p>Some rows were skipped:</p>
            <ul>{importErrors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="settings-section" aria-labelledby="perf-h">
        <h2 id="perf-h">Performance</h2>
        <p className="page-sub">
          Load a large ledger to see the virtualized list stay smooth. Only the rows on screen are rendered.
        </p>
        <div className="button-row">
          <Button
            disabled={signedIn}
            onClick={async () => {
              const ok = await confirm({
                title: 'Load 10,000 transactions?',
                message: 'This replaces your current transactions with generated test data. Budgets are kept.',
                confirmLabel: 'Load test data',
              })
              if (ok) {
                const start = performance.now()
                loadLarge(10_000)
                toast(`Loaded 10,000 transactions in ${Math.round(performance.now() - start)} ms`)
              }
            }}
          >
            Load 10,000 transactions
          </Button>
          <Button variant="quiet" onClick={() => setVitals(currentVitals())}>
            Refresh metrics
          </Button>
        </div>
        {vitals.length > 0 && (
          <table className="vitals">
            <caption className="sr-only">Web vitals measured in this session</caption>
            <thead>
              <tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Rating</th></tr>
            </thead>
            <tbody>
              {vitals.map((v) => (
                <tr key={v.name}>
                  <th scope="row">{v.name}</th>
                  <td>{v.name === 'CLS' ? v.value.toFixed(3) : `${Math.round(v.value)} ms`}</td>
                  <td data-rating={v.rating}>{v.rating.replace('-', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {recentErrors().length > 0 && (
          <p className="field-help">{recentErrors().length} error(s) captured this session.</p>
        )}
      </section>

      <section className="settings-section" aria-labelledby="reset-h">
        <h2 id="reset-h">Start over</h2>
        {signedIn && <p className="field-help">Sample and test data are only available when signed out, so they never mix with your real data.</p>}
        <div className="button-row">
          <Button
            disabled={signedIn}
            onClick={async () => {
              const ok = await confirm({
                title: 'Load sample data?',
                message: 'This replaces all your transactions and budgets with sample data.',
                confirmLabel: 'Load sample data',
              })
              if (ok) {
                loadDemo()
                toast('Sample data loaded')
              }
            }}
          >
            Load sample data
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete all data?',
                message: signedIn
                  ? "Every transaction and budget will be removed from your account on all your devices. This can't be undone."
                  : "Every transaction and budget will be removed from this browser. This can't be undone.",
                confirmLabel: 'Delete all data',
                tone: 'danger',
              })
              if (ok) {
                clearAll()
                toast('All data deleted')
              }
            }}
          >
            Delete all data
          </Button>
        </div>
      </section>

      <p className="settings-footer">
        Built with a small in-house component library. <Link to="/components">Browse the components</Link>.
      </p>
    </div>
  )
}
