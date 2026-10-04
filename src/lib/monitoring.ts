/**
 * Single place errors and performance metrics are reported. In production this is where
 * you'd forward to Sentry, Datadog or CloudWatch RUM; here it logs and keeps a small ring buffer
 * so the latest issues are visible on the Settings page.
 */
export interface ReportedError {
  message: string
  at: number
  context?: Record<string, unknown>
}

const MAX = 20
const buffer: ReportedError[] = []

export function reportError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error)
  buffer.push({ message, at: Date.now(), context })
  if (buffer.length > MAX) buffer.shift()
  if (import.meta.env.DEV) console.error('[purse]', error, context)
}

export function recentErrors(): readonly ReportedError[] {
  return buffer
}

export function installGlobalHandlers() {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, { source: 'window.onerror' }))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, { source: 'unhandledrejection' }))
}

export interface VitalSample {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

const vitals = new Map<string, VitalSample>()

/** Collect Core Web Vitals (LCP, INP, CLS) plus FCP and TTFB from real usage. */
export async function startWebVitals() {
  const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals')
  const record = (m: { name: string; value: number; rating: VitalSample['rating'] }) =>
    vitals.set(m.name, { name: m.name, value: m.value, rating: m.rating })
  onCLS(record)
  onINP(record)
  onLCP(record)
  onFCP(record)
  onTTFB(record)
}

export function currentVitals(): VitalSample[] {
  return [...vitals.values()]
}
