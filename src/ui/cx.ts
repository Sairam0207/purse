/** Join class names, skipping falsy values. A tiny stand-in for the `clsx` package. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
