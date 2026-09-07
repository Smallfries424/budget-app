const fmt = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

/** Format a number as currency, e.g. 1234.5 becomes "$1,234.50". */
export function money(n: number): string {
  return fmt.format(n)
}

/** Format without the currency symbol, e.g. "1,234.50". */
export function amount(n: number): string {
  return fmt.format(n).replace(/[^\d.,-]/g, '')
}

/**
 * Parse a user-typed amount into a number. Accepts "$1,234.50", "1234.5",
 * "12.". Returns NaN when there is nothing usable.
 */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.') return NaN
  return Number(cleaned)
}

/** First day of the month for a given date, as an ISO date string. */
export function monthStart(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** First day of the next month, as an ISO date string. */
export function nextMonthStart(d = new Date()): string {
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
}

/** "September 2026" style label for a month-start date. */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}
