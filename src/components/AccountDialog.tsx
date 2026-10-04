import { useState, type FormEvent } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button, Dialog, Field, TextInput } from '../ui'
import { syncLabel, useSync } from '../sync/status'
import { useSyncQueue } from '../sync/queue'
import { sendMagicLink, signOut, syncNow } from '../sync/auth'
import { toast } from '../store/toast'

export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, email } = useSync()
  const signedIn = email !== null && status !== 'signed-out'
  return (
    <Dialog open={open} onClose={onClose} title={signedIn ? 'Account' : 'Sign in to sync'} size="sm">
      {open && (signedIn ? <SignedIn onDone={onClose} /> : <SignInForm />)}
    </Dialog>
  )
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string>()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter an email address, like you@example.com.')
      return
    }
    setError(undefined)
    setState('sending')
    try {
      await sendMagicLink(email.trim())
      setState('sent')
    } catch (err) {
      setState('idle')
      setError(
        err instanceof Error && /rate/i.test(err.message)
          ? 'Too many sign-in emails. Wait a minute and try again.'
          : 'Couldn’t send the link. Check your connection and try again.',
      )
    }
  }

  if (state === 'sent') {
    return (
      <div className="account-body" role="status">
        <p>
          We sent a sign-in link to <strong>{email}</strong>. Open it in this browser to finish signing in.
        </p>
        <div className="form-actions">
          <Button variant="quiet" onClick={() => setState('idle')}>
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form className="account-body" onSubmit={submit} noValidate>
      <p className="account-intro">Keep your transactions backed up and in sync across your devices. No password needed.</p>
      <Field label="Email" error={error}>
        <TextInput type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} data-autofocus />
      </Field>
      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending link' : 'Email me a sign-in link'}
        </Button>
      </div>
    </form>
  )
}

function SignedIn({ onDone }: { onDone: () => void }) {
  const { status, email, lastSyncedAt, error } = useSync()
  const pending = useSyncQueue((s) => s.ops.length)
  return (
    <div className="account-body">
      <dl className="account-facts">
        <div>
          <dt>Signed in as</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className="sync-dot" data-status={status} aria-hidden="true" /> {syncLabel(status, pending)}
          </dd>
        </div>
        {lastSyncedAt && (
          <div>
            <dt>Last synced</dt>
            <dd>{formatDistanceToNow(lastSyncedAt, { addSuffix: true })}</dd>
          </div>
        )}
      </dl>
      {status === 'error' && error && <p className="field-error">{error}</p>}
      <div className="form-actions">
        <Button
          variant="danger"
          onClick={async () => {
            if (await signOut()) {
              onDone()
              toast('Signed out. Your data is safe in your account.')
            }
          }}
        >
          Sign out
        </Button>
        <Button variant="primary" onClick={() => void syncNow()} disabled={status === 'syncing'}>
          Sync now
        </Button>
      </div>
    </div>
  )
}
