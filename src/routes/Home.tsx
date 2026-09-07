import { Link } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { categoryLines, inMonth, monthTotals } from '../lib/select'
import { money, monthLabel, monthStart } from '../lib/money'
import { Card } from '../components/ui'

export default function Home() {
  const { household, categories, transactions } = useHousehold()
  const monthTxns = inMonth(transactions)
  const lines = categoryLines(categories, monthTxns)
  const totals = monthTotals(lines, monthTxns)

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">{household?.name}</h1>
        <span className="text-sm text-slate-500">{monthLabel(monthStart())}</span>
      </header>

      <Card>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Left to spend</p>
            <p
              className={`text-3xl font-bold tabular-nums ${
                totals.remaining < 0 ? 'text-red-600' : ''
              }`}
            >
              {money(totals.remaining)}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{money(totals.spent)} spent</p>
            <p>of {money(totals.budgeted)} budgeted</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${
              totals.remaining < 0 ? 'bg-red-500' : 'bg-slate-900 dark:bg-white'
            }`}
            style={{
              width: `${
                totals.budgeted > 0
                  ? Math.min(100, (totals.spent / totals.budgeted) * 100)
                  : 0
              }%`,
            }}
          />
        </div>
        {totals.income > 0 && (
          <p className="mt-2 text-xs text-green-700">{money(totals.income)} came in this month</p>
        )}
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">Categories</h2>
          <Link to="/budget" className="text-xs text-slate-500 underline">
            Edit
          </Link>
        </div>
        {lines.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">
              No categories yet.{' '}
              <Link to="/budget" className="underline">
                Add some
              </Link>{' '}
              to start tracking.
            </p>
          </Card>
        )}
        {lines.map((l) => {
          const pct =
            l.budget > 0 ? Math.min(100, (l.spent / l.budget) * 100) : l.spent > 0 ? 100 : 0
          const over = l.remaining < 0
          return (
            <Card key={l.category.id} className="!p-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{l.category.name}</span>
                <span className={`tabular-nums ${over ? 'text-red-600' : 'text-slate-500'}`}>
                  {money(l.spent)} / {money(l.budget)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-slate-400 dark:bg-slate-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <Link
        to="/transactions/new"
        className="pb-safe fixed inset-x-0 bottom-14 z-20 mx-auto block max-w-md px-4"
      >
        <span className="block rounded-xl bg-slate-900 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900">
          Add transaction
        </span>
      </Link>
    </div>
  )
}
