import type { Session } from '@supabase/supabase-js'
import { confirm } from '../ui'
import { useLedger } from '../store/ledger'
import { reportError } from '../lib/monitoring'
import { isCloudConfigured } from './config'
import { getSupabase } from './client'
import { SyncEngine } from './engine'
import { SupabaseApi } from './supabaseApi'
import { useSync } from './status'
import { useSyncQueue } from './queue'

let engine: SyncEngine | null = null
let currentUser: string | null = null

const askToUpload = (count: number) =>
  confirm({
    title: 'Add this device’s data to your account?',
    message: `You have ${count.toLocaleString()} ${count === 1 ? 'transaction' : 'transactions'} on this device from before you signed in. Sample data is never uploaded.`,
    confirmLabel: 'Add to my account',
  })

async function onSession(session: Session | null) {
  const user = session?.user ?? null
  if (user?.id === currentUser) return
  currentUser = user?.id ?? null
  if (!user) {
    engine?.stop()
    useSync.getState().set({ status: 'signed-out', email: null, lastSyncedAt: null })
    return
  }
  const db = await getSupabase()
  engine ??= new SyncEngine(new SupabaseApi(db))
  await engine.start(user.id, user.email ?? null, { confirmUpload: askToUpload })
}

/** Restore any existing session and react to sign-in and sign-out. Call once at startup. */
export async function initAuth() {
  if (!isCloudConfigured) return
  try {
    const db = await getSupabase()
    db.auth.onAuthStateChange((_event, session) => {
      // Defer: Supabase recommends not awaiting other calls inside this callback.
      setTimeout(() => void onSession(session).catch((e) => reportError(e, { source: 'auth' })), 0)
    })
    const { data } = await db.auth.getSession()
    // Remove ?code= left by the magic-link redirect so a refresh doesn't retry it.
    const url = new URL(window.location.href)
    if (url.searchParams.has('code')) {
      url.searchParams.delete('code')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    await onSession(data.session)
  } catch (e) {
    reportError(e, { source: 'auth' })
    useSync.getState().set({ status: 'error', error: 'Couldn’t reach the sync service.' })
  }
}

/** Email a sign-in link. Opening it in this browser signs the user in. */
export async function sendMagicLink(email: string) {
  const db = await getSupabase()
  const redirect = window.location.origin + window.location.pathname
  const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
  if (error) throw error
}

export async function syncNow() {
  await engine?.syncNow()
}

/**
 * Sign out and remove the local copy, so the next person on a shared device can't see it.
 * Warns first if some changes haven't reached the server yet.
 */
export async function signOut(): Promise<boolean> {
  const pending = useSyncQueue.getState().ops.length
  if (pending > 0) {
    const ok = await confirm({
      title: 'Sign out with unsynced changes?',
      message: `${pending} ${pending === 1 ? 'change hasn’t' : 'changes haven’t'} reached your account yet and will be lost.`,
      confirmLabel: 'Sign out anyway',
      tone: 'danger',
    })
    if (!ok) return false
  }
  const db = await getSupabase()
  engine?.stop()
  await db.auth.signOut()
  useSyncQueue.getState().reset()
  useLedger.getState().replaceAll([], {}, null)
  return true
}
