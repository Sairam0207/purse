import { useState } from 'react'

/** The current date, captured once per mount so renders stay pure and consistent. */
export function useToday(): Date {
  const [today] = useState(() => new Date())
  return today
}
