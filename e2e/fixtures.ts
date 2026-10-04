import { test as base, expect, type Page } from '@playwright/test'

/** Pin the clock so sample data and "today" are the same on every run. */
export const FIXED_NOW = new Date('2026-03-18T10:00:00')

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, provide) => {
    await page.clock.setFixedTime(FIXED_NOW)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('March')
    await provide(page)
  },
})

export { expect }

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 760

/** Opens the add dialog the way a user on this device would. */
export async function openAddDialog(page: Page) {
  await page.getByRole('button', { name: 'Add transaction' }).filter({ visible: true }).first().click()
  await expect(page.getByRole('dialog', { name: 'New transaction' })).toBeVisible()
}
