import { test, expect, type Page, type Route } from '@playwright/test'
import { FAKE_SUPABASE } from '../playwright.config'

/**
 * Runs the cloud-enabled build against a mocked Supabase API. This verifies the real
 * supabase-js requests (auth, PostgREST filters, upsert payloads) without a live project.
 */

const USER = { id: '9b2f4c1e-0c6a-4a51-9d0e-6f1b2a3c4d5e', email: 'asha@example.com' }

function fakeSession() {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, email: USER.email, role: 'authenticated', aud: 'authenticated', exp })}.sig`
  return {
    access_token: jwt,
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: exp,
    refresh_token: 'refresh-token',
    user: {
      id: USER.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: USER.email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  }
}

const serverRows = [
  {
    id: '1d1f8a0c-6a37-4e8b-9e1a-3f0c2b4d5e61',
    type: 'expense',
    amount: 45000,
    category_id: 'groceries',
    date: '2026-03-10',
    note: 'From my other phone',
    created_at: '2026-03-10T08:00:00Z',
    updated_at: '2026-03-10T08:00:01Z',
    deleted_at: null,
  },
]

interface Server {
  upserts: Record<string, unknown>[][]
  failWrites: boolean
}

async function mockSupabase(page: Page): Promise<Server> {
  const server: Server = { upserts: [], failWrites: false }
  await page.route(`${FAKE_SUPABASE}/rest/v1/transactions**`, async (route: Route) => {
    const req = route.request()
    if (req.method() === 'GET') {
      // First pull has no cursor; later pulls use the keyset "or" filter and get nothing new.
      const url = new URL(req.url())
      const first = !url.searchParams.has('or')
      return route.fulfill({ json: first ? serverRows : [] })
    }
    if (server.failWrites) return route.abort('internetdisconnected')
    server.upserts.push(req.postDataJSON())
    return route.fulfill({ status: 201, body: '' })
  })
  await page.route(`${FAKE_SUPABASE}/rest/v1/budgets**`, (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: [] }) : route.fulfill({ status: 201, body: '' }),
  )
  return server
}

test('signing in sends a PKCE magic link', async ({ page }) => {
  let body: Record<string, unknown> | null = null
  await page.route(`${FAKE_SUPABASE}/auth/v1/otp**`, async (route) => {
    body = route.request().postDataJSON()
    await route.fulfill({ json: {} })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in to sync' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sign in to sync' })
  await expect(dialog.getByLabel('Email')).toBeFocused()
  await dialog.getByLabel('Email').fill('asha@example.com')
  await dialog.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await expect(dialog.getByRole('status')).toContainText('We sent a sign-in link to asha@example.com')

  expect(body).toMatchObject({ email: 'asha@example.com', code_challenge_method: expect.stringMatching(/s256/i) })
  expect(body!.code_challenge).toBeTruthy()
})

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    const session = fakeSession()
    await page.addInitScript((s) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('purse:auth', JSON.stringify(s))
        sessionStorage.setItem('seeded', '1')
      }
    }, session)
  })

  test('loads the account’s data and never uploads sample data', async ({ page }) => {
    const server = await mockSupabase(page)
    await page.goto('/#/transactions')
    await expect(page.getByRole('button', { name: /asha@example.com/ })).toContainText('Synced')
    await expect(page.getByRole('button', { name: /From my other phone/ })).toBeVisible()
    await expect(page.getByText(/^1 transaction/)).toBeVisible()
    expect(server.upserts).toEqual([])
  })

  test('new transactions are pushed with the right payload', async ({ page }) => {
    const server = await mockSupabase(page)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /asha@example.com/ })).toContainText('Synced')

    await page.keyboard.press('n')
    await page.getByLabel('Amount').fill('250')
    await page.getByLabel(/Note/).fill('Synced chai')
    await page.getByRole('button', { name: 'Add transaction' }).last().click()

    await expect.poll(() => server.upserts.length).toBe(1)
    const [row] = server.upserts[0]
    expect(row).toMatchObject({ amount: 25000, note: 'Synced chai', category_id: 'food', type: 'expense', deleted_at: null })
    expect(row).not.toHaveProperty('user_id') // Ownership comes from the JWT, never from the client.
    await expect(page.getByRole('button', { name: /asha@example.com/ })).toContainText('Synced')
  })

  test('changes made offline wait in the outbox and sync later', async ({ page }) => {
    const server = await mockSupabase(page)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /asha@example.com/ })).toContainText('Synced')

    server.failWrites = true
    await page.keyboard.press('n')
    await page.getByLabel('Amount').fill('99')
    await page.getByRole('button', { name: 'Add transaction' }).last().click()
    await expect(page.getByRole('button', { name: /asha@example.com/ })).toContainText('1 waiting')

    // The change survives a reload while still unsynced.
    await page.reload()
    server.failWrites = false
    await page.getByRole('button', { name: /asha@example.com/ }).click()
    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect.poll(() => server.upserts.length).toBe(1)
    await expect(page.getByRole('dialog', { name: 'Account' })).toContainText('Synced')
  })
})
