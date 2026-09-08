import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { parseAmount, money } from '../lib/money'
import { parseCsvTable, type ParsedCsv } from '../lib/csv'
import { Button, Card, Field, Select } from '../components/ui'

type AmountMode = 'single' | 'split'
type DateOrder = 'mdy' | 'dmy'

interface Mapping {
  date: number
  description: number
  amount: number
  debit: number
  credit: number
}

const NONE = -1

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** Normalize a date string to YYYY-MM-DD, or null when it cannot be read. */
export function normalizeDate(raw: string, order: DateOrder): string | null {
  const s = raw.trim()
  if (!s) return null

  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) return build(+iso[1], +iso[2], +iso[3])

  const slash = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (slash) {
    let a = +slash[1]
    let b = +slash[2]
    let year = +slash[3]
    if (year < 100) year += year < 70 ? 2000 : 1900
    // If one part cannot be a month, the order is forced.
    let month = a
    let day = b
    if (a > 12 && b <= 12) {
      month = b
      day = a
    } else if (b > 12 && a <= 12) {
      month = a
      day = b
    } else if (order === 'dmy') {
      month = b
      day = a
    }
    return build(year, month, day)
  }

  const named = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/)
  if (named) {
    const month = MONTHS[named[1].slice(0, 3).toLowerCase()]
    if (!month) return null
    return build(+named[3], month, +named[2])
  }

  return null
}

function build(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Parse an amount cell. Handles "$1,234.50" and "(12.34)" for negatives. */
function cellAmount(raw: string): number {
  const s = raw.trim()
  if (!s) return NaN
  const neg = /^\(.*\)$/.test(s)
  const n = parseAmount(s)
  if (!Number.isFinite(n)) return NaN
  return neg ? -Math.abs(n) : n
}

function guessColumn(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim())
  for (const name of names) {
    const hit = lower.findIndex((h) => h === name)
    if (hit !== NONE) return hit
  }
  for (const name of names) {
    const hit = lower.findIndex((h) => h.includes(name))
    if (hit !== NONE) return hit
  }
  return NONE
}

function guessMapping(headers: string[]): { mapping: Mapping; mode: AmountMode } {
  const date = guessColumn(headers, ['date', 'posted', 'transaction date'])
  const description = guessColumn(headers, [
    'description', 'name', 'memo', 'details', 'payee', 'narrative',
  ])
  const amount = guessColumn(headers, ['amount', 'value'])
  const debit = guessColumn(headers, ['debit', 'withdrawal', 'money out', 'paid out'])
  const credit = guessColumn(headers, ['credit', 'deposit', 'money in', 'paid in'])
  const mode: AmountMode = amount === NONE && (debit !== NONE || credit !== NONE) ? 'split' : 'single'
  return { mapping: { date, description, amount, debit, credit }, mode }
}

interface Built {
  ok: { occurred_on: string; description: string; amount: number }[]
  failed: number
  total: number
}

export default function Import() {
  const navigate = useNavigate()
  const { household, categories, refresh } = useHousehold()

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [mapping, setMapping] = useState<Mapping>({
    date: NONE, description: NONE, amount: NONE, debit: NONE, credit: NONE,
  })
  const [mode, setMode] = useState<AmountMode>('single')
  const [dateOrder, setDateOrder] = useState<DateOrder>('mdy')
  const [flip, setFlip] = useState(true)
  const [categoryId, setCategoryId] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function runParse(input: string) {
    setError(null)
    const table = parseCsvTable(input)
    if (!table || table.headers.length === 0) {
      setParsed(null)
      setParseError('No rows found. Paste CSV text or pick a .csv file.')
      return
    }
    if (table.rows.length === 0) {
      setParsed(null)
      setParseError('Found a header row but no data rows.')
      return
    }
    setParseError(null)
    setParsed(table)
    const guess = guessMapping(table.headers)
    setMapping(guess.mapping)
    setMode(guess.mode)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const content = await file.text()
    setText(content)
    runParse(content)
  }

  const built: Built | null = useMemo(() => {
    if (!parsed) return null
    const dateSet = mapping.date !== NONE
    const amountSet =
      mode === 'single' ? mapping.amount !== NONE : mapping.debit !== NONE || mapping.credit !== NONE
    if (!dateSet || !amountSet) return null

    const ok: Built['ok'] = []
    let failed = 0
    for (const row of parsed.rows) {
      const occurred_on = normalizeDate(row[mapping.date] ?? '', dateOrder)
      if (!occurred_on) {
        failed++
        continue
      }
      const description =
        mapping.description !== NONE ? (row[mapping.description] ?? '').trim() : ''

      let bankAmount: number
      if (mode === 'single') {
        const n = cellAmount(row[mapping.amount] ?? '')
        if (!Number.isFinite(n)) {
          failed++
          continue
        }
        bankAmount = flip ? -n : n
      } else {
        const debit = mapping.debit !== NONE ? cellAmount(row[mapping.debit] ?? '') : NaN
        const credit = mapping.credit !== NONE ? cellAmount(row[mapping.credit] ?? '') : NaN
        const hasDebit = Number.isFinite(debit) && debit !== 0
        const hasCredit = Number.isFinite(credit) && credit !== 0
        if (!hasDebit && !hasCredit) {
          failed++
          continue
        }
        // Debit is money out (an expense, positive in our data).
        // Credit is money in (income, negative in our data).
        bankAmount = (hasDebit ? Math.abs(debit) : 0) - (hasCredit ? Math.abs(credit) : 0)
      }

      if (!Number.isFinite(bankAmount)) {
        failed++
        continue
      }
      ok.push({ occurred_on, description, amount: Math.round(bankAmount * 100) / 100 })
    }
    return { ok, failed, total: parsed.rows.length }
  }, [parsed, mapping, mode, dateOrder, flip])

  async function doImport() {
    if (!built || !household || built.ok.length === 0) return
    setBusy(true)
    setError(null)
    const rows = built.ok.map((r) => ({
      household_id: household.id,
      occurred_on: r.occurred_on,
      amount: r.amount,
      description: r.description,
      category_id: categoryId || null,
    }))
    const res = await supabase.from('transactions').insert(rows)
    setBusy(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    await refresh()
    navigate('/transactions')
  }

  const activeCategories = categories.filter((c) => !c.archived)

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500">
          Cancel
        </button>
        <h1 className="text-base font-semibold">Import CSV</h1>
        <span className="w-12" />
      </header>

      <Card>
        <div className="space-y-3">
          <Field label="Paste CSV">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Date,Description,Amount&#10;2026-01-04,Groceries,52.10"
              className="w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 font-mono text-xs text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
            />
          </Field>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Or pick a file
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-800 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-100"
            />
            {fileName && (
              <span className="mt-1 block text-xs text-slate-400">{fileName}</span>
            )}
          </label>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => runParse(text)}
            disabled={!text.trim()}
          >
            Parse
          </Button>

          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
        </div>
      </Card>

      {parsed && (
        <Card>
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Columns ({parsed.rows.length} data rows)
            </p>

            <Field label="Date column">
              <ColumnSelect
                headers={parsed.headers}
                value={mapping.date}
                onChange={(v) => setMapping((m) => ({ ...m, date: v }))}
              />
            </Field>

            <Field label="Description column">
              <ColumnSelect
                headers={parsed.headers}
                value={mapping.description}
                onChange={(v) => setMapping((m) => ({ ...m, description: v }))}
              />
            </Field>

            <Field label="Amount columns">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'single' ? 'primary' : 'ghost'}
                  className="flex-1"
                  onClick={() => setMode('single')}
                >
                  One column
                </Button>
                <Button
                  type="button"
                  variant={mode === 'split' ? 'primary' : 'ghost'}
                  className="flex-1"
                  onClick={() => setMode('split')}
                >
                  Debit / Credit
                </Button>
              </div>
            </Field>

            {mode === 'single' ? (
              <>
                <Field label="Amount column">
                  <ColumnSelect
                    headers={parsed.headers}
                    value={mapping.amount}
                    onChange={(v) => setMapping((m) => ({ ...m, amount: v }))}
                  />
                </Field>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={flip}
                    onChange={(e) => setFlip(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Flip signs (bank shows spending as negative)</span>
                </label>
              </>
            ) : (
              <>
                <Field label="Debit column (money out)">
                  <ColumnSelect
                    headers={parsed.headers}
                    value={mapping.debit}
                    onChange={(v) => setMapping((m) => ({ ...m, debit: v }))}
                  />
                </Field>
                <Field label="Credit column (money in)">
                  <ColumnSelect
                    headers={parsed.headers}
                    value={mapping.credit}
                    onChange={(v) => setMapping((m) => ({ ...m, credit: v }))}
                  />
                </Field>
              </>
            )}

            <Field label="Date format">
              <Select
                value={dateOrder}
                onChange={(e) => setDateOrder(e.target.value as DateOrder)}
              >
                <option value="mdy">Month first (MM/DD/YYYY)</option>
                <option value="dmy">Day first (DD/MM/YYYY)</option>
              </Select>
            </Field>

            <Field label="Default category">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      )}

      {parsed && !built && (
        <Card>
          <p className="text-sm text-slate-500">
            Pick a Date column and an Amount column to see a preview.
          </p>
        </Card>
      )}

      {built && (
        <Card>
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {built.ok.length} of {built.total} rows ready
              {built.failed > 0 ? `, ${built.failed} skipped` : ''}
            </p>

            {built.ok.length === 0 ? (
              <p className="text-sm text-red-600">
                No rows could be parsed. Check the column and date format picks.
              </p>
            ) : (
              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="py-1 pr-3 font-medium">Date</th>
                      <th className="py-1 pr-3 font-medium">Description</th>
                      <th className="py-1 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {built.ok.slice(0, 10).map((r, i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-1.5 pr-3 tabular-nums whitespace-nowrap">
                          {r.occurred_on}
                        </td>
                        <td className="max-w-[160px] truncate py-1.5 pr-3">
                          {r.description || '(no description)'}
                        </td>
                        <td
                          className={`py-1.5 text-right tabular-nums whitespace-nowrap ${
                            r.amount < 0 ? 'text-green-700' : ''
                          }`}
                        >
                          {r.amount < 0 ? '+' : ''}
                          {money(Math.abs(r.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {built.ok.length > 10 && (
                  <p className="pt-2 text-xs text-slate-400">
                    and {built.ok.length - 10} more
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="button"
              className="w-full"
              onClick={doImport}
              disabled={busy || built.ok.length === 0 || !household}
            >
              {busy ? 'Importing...' : `Import ${built.ok.length} transactions`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ColumnSelect({
  headers,
  value,
  onChange,
}: {
  headers: string[]
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Select value={String(value)} onChange={(e) => onChange(Number(e.target.value))}>
      <option value={String(NONE)}>Not used</option>
      {headers.map((h, i) => (
        <option key={i} value={String(i)}>
          {h || `Column ${i + 1}`}
        </option>
      ))}
    </Select>
  )
}
