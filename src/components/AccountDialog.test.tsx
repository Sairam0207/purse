import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountDialog } from './AccountDialog'
import { syncLabel, useSync } from '../sync/status'
import { useSyncQueue } from '../sync/queue'

const auth = vi.hoisted(() => ({
  sendMagicLink: vi.fn(),
  signOut: vi.fn(),
  syncNow: vi.fn(),
}))
vi.mock('../sync/auth', () => auth)

beforeEach(() => {
  vi.clearAllMocks()
  useSyncQueue.getState().reset()
  useSync.getState().set({ configured: true, status: 'signed-out', email: null, userId: null, error: null })
})

describe('AccountDialog', () => {
  it('validates the email before sending', async () => {
    render(<AccountDialog open onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    expect(auth.sendMagicLink).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/Enter an email address/)
  })

  it('sends a magic link and confirms where it went', async () => {
    auth.sendMagicLink.mockResolvedValue(undefined)
    render(<AccountDialog open onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    expect(auth.sendMagicLink).toHaveBeenCalledWith('asha@example.com')
    expect(await screen.findByRole('status')).toHaveTextContent('We sent a sign-in link to asha@example.com')
  })

  it('explains rate limiting in plain language', async () => {
    auth.sendMagicLink.mockRejectedValue(new Error('Email rate limit exceeded'))
    render(<AccountDialog open onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))
    expect(await screen.findByText(/Too many sign-in emails/)).toBeInTheDocument()
  })

  it('shows account status and lets the user sync or sign out', async () => {
    useSync.getState().set({ status: 'synced', email: 'asha@example.com', userId: 'u1', lastSyncedAt: Date.now() })
    auth.signOut.mockResolvedValue(true)
    const onClose = vi.fn()
    render(<AccountDialog open onClose={onClose} />)
    expect(screen.getByText('asha@example.com')).toBeInTheDocument()
    expect(screen.getByText('Synced')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(auth.syncNow).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(auth.signOut).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('syncLabel', () => {
  it('mentions waiting changes when offline or paused', () => {
    expect(syncLabel('offline', 3)).toBe('Offline, 3 changes waiting')
    expect(syncLabel('offline', 1)).toBe('Offline, 1 change waiting')
    expect(syncLabel('error', 2)).toBe('Sync paused, 2 waiting')
    expect(syncLabel('synced', 0)).toBe('Synced')
  })
})
