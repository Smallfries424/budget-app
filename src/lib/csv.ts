/**
 * Small dependency-free CSV parser. Handles quoted fields, embedded commas,
 * embedded newlines, escaped quotes ("") and both \n and \r\n line endings.
 */

/** Parse CSV text into an array of rows, each row an array of string cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length

  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < n) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }

    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      endField()
      i++
      continue
    }
    if (c === '\r') {
      // Swallow \r, and the \n that usually follows.
      if (text[i + 1] === '\n') i++
      endRow()
      i++
      continue
    }
    if (c === '\n') {
      endRow()
      i++
      continue
    }
    field += c
    i++
  }

  // Flush the trailing field or row unless the text ended on a clean newline.
  if (field !== '' || row.length > 0) endRow()

  // Drop fully empty rows (a blank line between records).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

/**
 * Parse CSV and split the header row from the data rows. Returns null when
 * there is nothing usable.
 */
export function parseCsvTable(text: string): ParsedCsv | null {
  const all = parseCsv(text)
  if (all.length === 0) return null
  const [headers, ...rows] = all
  return { headers: headers.map((h) => h.trim()), rows }
}
