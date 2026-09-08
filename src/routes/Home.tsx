import { Link } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { useMonth } from '../hooks/useMonth'
import { categoryLines, inMonth, monthTotals } from '../lib/select'
import { money } from '../lib/money'
import { Card } from '../components/ui'
import MonthSwitcher from '../components/MonthSwitcher'

export default function Home() {
  const { household, categories, transactions } = useHousehold()
  const { ref } = useMonth()
  const monthTxns = inMonth(transactions, ref)
  const lines = categoryLines(categories, monthTxns)
  const totals = monthTotals(lines, monthTxns, household?.monthly_income ?? 0)

  const hasIncome = totals.plannedIncome > 0
  const base = hasIncome ? totals.plannedIncome : totals.budgeted
  const pct = base > 0 ? Math.min(100, (totals.spent / base) * 100) : 0
  const over = totals.leftToSpend < 0

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{household?.name}</h1>
        <MonthSwitcher />
      </header>

      <Card>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Left to spend</p>
            <p className={`text-3xl font-bold tabular-nums ${over ? 'text-red-600' : ''}`}>
              {money(totals.leftToSpend)}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{money(totals.spent)} spent</p>
            <p>of {money(base)} {hasIncome ? 'income' : 'budgeted'}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-slate-900 dark:bg-white'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {hasIncome ? (
          <p className="mt-2 text-xs text-slate-500">
            {money(totals.budgeted)} budgeted
            {totals.actualIncome > 0 && ` · ${money(totals.actualIncome)} income logged`}
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            <Link to="/budget" className="underline">
              Set your monthly income
            </Link>{' '}
            to track spending against it.
          </p>
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
          const catPct =
            l.budget > 0 ? Math.min(100, (l.spent / l.budget) * 100) : l.spent > 0 ? 100 : 0
          const catOver = l.remaining < 0
          return (
            <Card key={l.category.id} className="!p-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{l.category.name}</span>
                <span className={`tabular-nums ${catOver ? 'text-red-600' : 'text-slate-500'}`}>
                  {money(l.spent)} / {money(l.budget)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${catOver ? 'bg-red-500' : 'bg-slate-400 dark:bg-slate-500'}`}
                  style={{ width: `${catPct}%` }}
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
