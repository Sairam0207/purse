import { Suspense, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { IconList, IconOverview, IconPlus, IconSearch, IconSettings, IconTarget, PurseMark } from './Icons'
import { TransactionDialog } from './TransactionDialog'
import { CommandPalette } from './CommandPalette'
import { ErrorBoundary } from './ErrorBoundary'
import { Toaster } from './Toaster'
import { SyncButton } from './SyncButton'
import { useUI } from '../store/ui'
import { Button, ConfirmHost, IconButton, PageSkeleton } from '../ui'

const NAV = [
  { to: '/', label: 'Overview', icon: IconOverview, end: true },
  { to: '/transactions', label: 'Transactions', icon: IconList },
  { to: '/budgets', label: 'Budgets', icon: IconTarget },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

function isTyping(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Layout() {
  const openNew = useUI((s) => s.openNew)
  const setPalette = useUI((s) => s.setPalette)
  const { pathname } = useLocation()

  // Global shortcuts: N adds a transaction, Ctrl/Cmd+K opens the command menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPalette(true)
        return
      }
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault()
        openNew()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNew, setPalette])

  // Move focus to the main region on route change so screen reader users land on new content.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="sidebar">
        <div className="brand">
          <PurseMark />
          <span>Purse</span>
        </div>
        <button className="search-trigger" onClick={() => setPalette(true)}>
          <IconSearch width={18} height={18} />
          <span>Search</span>
          <kbd aria-label={isMac ? 'Command K' : 'Control K'}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <IconButton
          className="search-trigger-mobile"
          label="Search"
          icon={<IconSearch />}
          onClick={() => setPalette(true)}
        />
        <nav aria-label="Main" className="nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <SyncButton />
        <Button variant="primary" className="add-btn" icon={<IconPlus />} onClick={() => openNew()}>
          Add transaction
        </Button>
        <p className="shortcut-hint" aria-hidden="true">
          Press <kbd>N</kbd> anywhere to add
        </p>
      </header>

      <main id="main" tabIndex={-1} className="main">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <button className="fab" aria-label="Add transaction" onClick={() => openNew()}>
        <IconPlus width={26} height={26} />
      </button>

      <TransactionDialog />
      <CommandPalette />
      <ConfirmHost />
      <Toaster />
    </div>
  )
}
