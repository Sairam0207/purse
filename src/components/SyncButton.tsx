import { useState } from 'react'
import { syncLabel, useSync } from '../sync/status'
import { useSyncQueue } from '../sync/queue'
import { AccountDialog } from './AccountDialog'

/** Sidebar entry point for sign-in and sync status. Renders nothing in local-only builds. */
export function SyncButton() {
  const { configured, status, email } = useSync()
  const pending = useSyncQueue((s) => s.ops.length)
  const [open, setOpen] = useState(false)
  if (!configured) return null

  const signedIn = email !== null && status !== 'signed-out'
  return (
    <>
      <button className="sync-button" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="sync-dot" data-status={signedIn ? status : 'signed-out'} aria-hidden="true" />
        <span className="sync-text">
          <span className="sync-primary">{signedIn ? email : 'Sign in to sync'}</span>
          {signedIn && (
            <span className="sync-secondary" aria-live="polite">
              {syncLabel(status, pending)}
            </span>
          )}
        </span>
      </button>
      <AccountDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
