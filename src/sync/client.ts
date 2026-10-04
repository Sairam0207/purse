import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

let clientPromise: Promise<SupabaseClient> | null = null

/**
 * The Supabase SDK is loaded on demand in its own chunk, so local-only visitors never
 * download it and it never counts against the initial bundle budget.
 */
export function getSupabase(): Promise<SupabaseClient> {
  const url = SUPABASE_URL
  const key = SUPABASE_ANON_KEY
  if (!url || !key) return Promise.reject(new Error('Supabase is not configured'))
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, {
      auth: {
        // PKCE puts ?code= in the query string. The implicit flow would put tokens in the
        // #fragment, which collides with the hash router.
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'purse:auth',
      },
    }),
  )
  return clientPromise
}
