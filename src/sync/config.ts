/**
 * Cloud sync is optional. Without these env vars the app runs exactly as before in
 * local-only mode, which is what the public demo and the E2E suite use.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
