import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { money } from '../lib/money'
import { Card, Select } from '../components/ui'

export default function Transactions() {
  const { transactions, categories, members, nameFor } = useHousehold()
  const [categoryId, setCategoryId] = useState('')
  const [personId, setPersonId] = useState('')

  const catName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  )

  const filtered = transactions.filter((t) => {
    if (categoryId && t.category_id !== categoryId) return false
    if (personId && t.paid_by !== personId) return false
    return true
  })

  const groups = useMemo(() => {
    const byDate = new Map<string, typeof filtered>()
    for (const t of filtered) {
      const list = byDate.get(t.occurred_on) ?? []
      list.push(t)
      byDate.set(t.occurred_on, list)
    }
    return [...byDate.entries()]
  }, [filtered])

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Activity</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/import"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 dark:text-slate-200 dark:ring-slate-700"
          >
            Import
          </Link>
          <Link
            to="/transactions/new"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            Add
          </Link>
        </div>
      </header>

      <div className="flex gap-2">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">Anyone</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.display_name}
            </option>
          ))}
        </Select>
      </div>

      {groups.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nothing here yet.</p>
        </Card>
      )}

      {groups.map(([date, list]) => (
        <div key={date} className="space-y-1">
          <p className="px-1 text-xs font-medium text-slate-400">
            {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <Card className="!p-0">
            {list.map((t, i) => (
              <Link
                key={t.id}
                to={`/transactions/${t.id}`}
                className={`flex items-center justify-between px-4 py-3 ${
                  i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t.description || 'Untitled'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {t.category_id ? catName[t.category_id] ?? 'Uncategorized' : 'Uncategorized'}
                    {t.paid_by ? ` · ${nameFor(t.paid_by)}` : ''}
                    {t.split_type !== 'none' ? ' · shared' : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 pl-3 text-sm tabular-nums ${
                    t.amount < 0 ? 'text-green-700' : ''
                  }`}
                >
                  {t.amount < 0 ? '+' : ''}
                  {money(Math.abs(t.amount))}
                </span>
              </Link>
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}
