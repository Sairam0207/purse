import { useEffect } from 'react'
import { useSettings } from '../store/settings'

/** Applies the theme preference to <html data-theme> and follows the OS when set to system. */
export function useTheme() {
  const theme = useSettings((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      root.dataset.theme = resolved
      root.style.colorScheme = resolved
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
