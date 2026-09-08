import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { useMonth } from '../hooks/useMonth'
import { categoryLines, inMonth } from '../lib/select'
import { money, parseAmount } from '../lib/money'
import { Button, Card, Input } from '../components/ui'
import MonthSwitcher from '../components/MonthSwitcher'

export default function Budget() {
  const { household, categories, transactions, refresh } = useHousehold()
  const { ref } = useMonth()
  const lines = categoryLines(categories, inMonth(transactions, ref))
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [busy, setBusy] = useState(false)

  const totalBudget = lines.reduce((s, l) => s + l.budget, 0)
  const income = household?.monthly_income ?? 0
  const leftToBudget = income - totalBudget

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    await supabase.from('categories').insert({
      household_id: household!.id,
      name: newName.trim(),
      monthly_budget: parseAmount(newBudget) || 0,
      sort_order: categories.length,
    })
    setNewName('')
    setNewBudget('')
    setBusy(false)
    await refresh()
  }

  async function updateIncome(value: string) {
    const n = parseAmount(value)
    await supabase
      .from('households')
      .update({ monthly_income: Number.isFinite(n) ? n : 0 })
      .eq('id', household!.id)
    await refresh()
  }

  async function updateBudget(id: string, value: string) {
    const n = parseAmount(value)
    await supabase
      .from('categories')
      .update({ monthly_budget: Number.isFinite(n) ? n : 0 })
      .eq('id', id)
    await refresh()
  }

  async function archive(id: string) {
    await supabase.from('categories').update({ archived: true }).eq('id', id)
    await refresh()
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Budget</h1>
        <MonthSwitcher />
      </header>

      <Card>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-sm font-medium">Monthly income</span>
          <AmountInput key={income} initial={income} onCommit={updateIncome} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {money(totalBudget)} budgeted
          {income > 0 && (
            <span className={leftToBudget < 0 ? 'text-red-600' : ''}>
              {' '}
              · {money(Math.abs(leftToBudget))} {leftToBudget < 0 ? 'over budget' : 'left to budget'}
            </span>
          )}
        </p>
      </Card>

      <Card>
        <form onSubmit={add} className="flex gap-2">
          <Input
            placeholder="New category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            inputMode="decimal"
            placeholder="0"
            className="!w-24"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            Add
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {lines.map((l) => (
          <Card key={l.category.id} className="!p-3">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium">{l.category.name}</span>
              <AmountInput
                key={l.budget}
                initial={l.budget}
                onCommit={(v) => updateBudget(l.category.id, v)}
              />
              <button
                onClick={() => archive(l.category.id)}
                className="text-xs text-slate-400 underline"
              >
                Remove
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {money(l.spent)} spent this month
              {l.remaining < 0 && (
                <span className="text-red-600"> · {money(-l.remaining)} over</span>
              )}
            </p>
          </Card>
        ))}
        {lines.length === 0 && (
          <p className="px-1 text-sm text-slate-500">
            Add a few categories: Rent, Groceries, Eating out, Fun.
          </p>
        )}
      </div>
    </div>
  )
}

function AmountInput({
  initial,
  onCommit,
}: {
  initial: number
  onCommit: (value: string) => void
}) {
  const [value, setValue] = useState(String(initial))
  return (
    <input
      inputMode="decimal"
      className="w-24 rounded-lg bg-slate-100 px-2 py-1.5 text-right text-sm tabular-nums outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-slate-500 dark:bg-slate-800 dark:ring-slate-700"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== String(initial)) onCommit(value)
      }}
    />
  )
}
