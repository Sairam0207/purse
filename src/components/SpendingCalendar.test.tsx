import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpendingCalendar } from './SpendingCalendar'
import { intensityLevels } from '../lib/heatmap'

describe('intensityLevels', () => {
  it('gives empty days level 0 and caps outliers at 4', () => {
    const levels = intensityLevels([0, 100, 200, 300, 400, 100000])
    expect(levels[0]).toBe(0)
    expect(levels[5]).toBe(4)
    expect(levels.slice(1, 5).every((l) => l >= 1 && l <= 4)).toBe(true)
  })
})

describe('SpendingCalendar', () => {
  const totals = Array.from({ length: 30 }, (_, i) => (i === 4 ? 25000 : 0))
  const counts = totals.map((t) => (t ? 2 : 0))

  it('labels days for screen readers and reports selection', async () => {
    const onSelect = vi.fn()
    render(
      <SpendingCalendar month="2026-04" totals={totals} counts={counts} today={null} selectedDay={null} onSelect={onSelect} />,
    )
    const day5 = screen.getByRole('button', { name: /Sunday 5 April: ₹250 spent, 2 expenses/ })
    await userEvent.click(day5)
    expect(onSelect).toHaveBeenCalledWith(5)
  })

  it('supports arrow-key navigation between days', async () => {
    render(
      <SpendingCalendar month="2026-04" totals={totals} counts={counts} today={null} selectedDay={1} onSelect={() => {}} />,
    )
    const first = screen.getByRole('button', { name: /\s1 April:/ })
    first.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /\s8 April:/ })).toHaveFocus()
  })
})
