import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Boom({ message }: { message: string }): never {
  throw new Error(message)
}

describe('ErrorBoundary', () => {
  it('shows a recovery screen instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Boom message="kaboom" /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('This screen hit a problem')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('explains failed chunk downloads after a deploy', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Boom message="Failed to fetch dynamically imported module" /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('A new version is available')
  })
})
