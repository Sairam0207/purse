import { create } from 'zustand'
import { isCloudConfigured } from './config'

export type SyncStatus = 'local' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

interface SyncState {
  configured: boolean
  status: SyncStatus
  userId: string | null
  email: string | null
  lastSyncedAt: number | null
  error: string | null
  set: (patch: Partial<Omit<SyncState, 'set'>>) => void
}

export const useSync = create<SyncState>()((set) => ({
  configured: isCloudConfigured,
  status: isCloudConfigured ? 'signed-out' : 'local',
  userId: null,
  email: null,
  lastSyncedAt: null,
  error: null,
  set: (patch) => set(patch),
}))

/** True while a signed-in sync session is running; ledger writes are queued only then. */
export const isSyncing = () => useSync.getState().userId !== null

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: 'Saved on this device',
  'signed-out': 'Not signed in',
  syncing: 'Syncing',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync paused',
}

export function syncLabel(status: SyncStatus, pending: number): string {
  if (status === 'offline' && pending > 0) return `Offline, ${pending} ${pending === 1 ? 'change' : 'changes'} waiting`
  if (status === 'error' && pending > 0) return `Sync paused, ${pending} waiting`
  return STATUS_TEXT[status]
}
