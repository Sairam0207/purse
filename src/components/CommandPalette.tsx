import { useDeferredValue, useMemo, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '../ui'
import { useUI } from '../store/ui'
import { useLedger } from '../store/ledger'
import { useSettings } from '../store/settings'
import { fuzzyFilter } from '../lib/fuzzy'
import { getCategory } from '../lib/categories'
import { sortByNewest } from '../lib/stats'
import { useMoney } from '../hooks/useMoney'

interface Command {
  id: string
  label: string
  hint?: string
  group: 'Actions' | 'Go to' | 'Transactions'
  run: () => void
}

/**
 * Ctrl/Cmd+K quick actions and search, following the WAI-ARIA combobox pattern:
 * focus stays in the input while arrow keys move aria-activedescendant through the listbox.
 */
export function CommandPalette() {
  const { paletteOpen, setPalette } = useUI()
  return (
    <Dialog open={paletteOpen} onClose={() => setPalette(false)} title="Command menu" hideTitle className="palette">
      {paletteOpen && <PaletteBody close={() => setPalette(false)} />}
    </Dialog>
  )
}

function PaletteBody({ close }: { close: () => void }) {
  const navigate = useNavigate()
  const money = useMoney()
  const { openNew, openEdit } = useUI()
  const setTheme = useSettings((s) => s.setTheme)
  const transactions = useLedger((s) => s.transactions)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [active, setActive] = useState(0)

  const staticCommands = useMemo<Command[]>(() => {
    const go = (path: string) => () => navigate(path)
    return [
      { id: 'add', label: 'Add transaction', hint: 'N', group: 'Actions', run: () => openNew() },
      { id: 'dark', label: 'Use dark theme', group: 'Actions', run: () => setTheme('dark') },
      { id: 'light', label: 'Use light theme', group: 'Actions', run: () => setTheme('light') },
      { id: 'system', label: 'Match device theme', group: 'Actions', run: () => setTheme('system') },
      { id: 'overview', label: 'Overview', group: 'Go to', run: go('/') },
      { id: 'transactions', label: 'Transactions', group: 'Go to', run: go('/transactions') },
      { id: 'expenses', label: 'Expenses only', group: 'Go to', run: go('/transactions?type=expense') },
      { id: 'budgets', label: 'Budgets', group: 'Go to', run: go('/budgets') },
      { id: 'settings', label: 'Settings', group: 'Go to', run: go('/settings') },
      { id: 'components', label: 'Component library', group: 'Go to', run: go('/components') },
    ]
  }, [navigate, openNew, setTheme])

  const results = useMemo(() => {
    const commands = fuzzyFilter(staticCommands, deferred, (c) => `${c.group} ${c.label}`, 8)
    if (deferred.trim().length < 2) return commands
    const recent = sortByNewest(transactions)
    const txMatches = fuzzyFilter(recent, deferred, (t) => `${t.note} ${getCategory(t.categoryId).name}`, 6).map(
      (t): Command => ({
        id: `tx-${t.id}`,
        label: t.note || getCategory(t.categoryId).name,
        hint: `${t.date.slice(5).split('-').reverse().join('/')}  ${money(t.amount)}`,
        group: 'Transactions',
        run: () => openEdit(t),
      }),
    )
    return [...commands, ...txMatches]
  }, [deferred, staticCommands, transactions, money, openEdit])

  const activeIndex = Math.min(active, Math.max(0, results.length - 1))

  const run = (cmd: Command) => {
    close()
    // Let the palette dialog close before opening another one.
    requestAnimationFrame(cmd.run)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActive((activeIndex + delta + results.length) % Math.max(1, results.length))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      run(results[activeIndex])
    }
  }

  return (
    <div className="palette-body">
      <input
        className="palette-input"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-activedescendant={results[activeIndex] ? `cmd-${results[activeIndex].id}` : undefined}
        aria-autocomplete="list"
        aria-label="Search commands and transactions"
        placeholder="Type a command or search transactions"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        data-autofocus
      />
      <ul id="palette-list" role="listbox" className="palette-list" aria-label="Results">
        {results.map((cmd, i) => (
          <li
            key={cmd.id}
            id={`cmd-${cmd.id}`}
            role="option"
            aria-selected={i === activeIndex}
            className="palette-option"
            onMouseMove={() => setActive(i)}
            onClick={() => run(cmd)}
          >
            <span className="palette-group">{cmd.group}</span>
            <span className="palette-label">{cmd.label}</span>
            {cmd.hint && <span className="palette-hint">{cmd.hint}</span>}
          </li>
        ))}
        {results.length === 0 && <li className="palette-empty">No results for “{query}”</li>}
      </ul>
      <p className="palette-footer" aria-hidden="true">
        <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to choose, <kbd>Esc</kbd> to close
      </p>
    </div>
  )
}
