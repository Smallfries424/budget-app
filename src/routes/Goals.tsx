import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { goalSaved } from '../lib/select'
import { money, parseAmount } from '../lib/money'
import { Button, Card, Field, Input } from '../components/ui'
import type { Goal, GoalContribution } from '../lib/types'

export default function Goals() {
  const { household, goals, contributions, refresh } = useHousehold()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [busy, setBusy] = useState(false)

  const active = goals.filter((g) => !g.archived)

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseAmount(target)
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) return
    setBusy(true)
    await supabase.from('goals').insert({
      household_id: household!.id,
      name: name.trim(),
      target_amount: amount,
      target_date: targetDate || null,
    })
    setName('')
    setTarget('')
    setTargetDate('')
    setAdding(false)
    setBusy(false)
    await refresh()
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Goals</h1>
        <Button variant="ghost" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Close' : 'New goal'}
        </Button>
      </header>

      {adding && (
        <Card>
          <form onSubmit={addGoal} className="space-y-3">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip to Portugal" />
            </Field>
            <Field label="Target amount">
              <Input
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="3000"
              />
            </Field>
            <Field label="Target date (optional)">
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              Add goal
            </Button>
          </form>
        </Card>
      )}

      {active.length === 0 && !adding && (
        <Card>
          <p className="text-sm text-slate-500">
            Set aside money over time for trips, gifts, or a rainy day.
          </p>
        </Card>
      )}

      {active.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          contributions={contributions.filter((c) => c.goal_id === g.id)}
          householdId={household!.id}
          refresh={refresh}
        />
      ))}
    </div>
  )
}

function GoalCard({
  goal,
  contributions,
  householdId,
  refresh,
}: {
  goal: Goal
  contributions: GoalContribution[]
  householdId: string
  refresh: () => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const saved = goalSaved(goal.id, contributions)
  const pct = goal.target_amount > 0 ? Math.min(100, (saved / goal.target_amount) * 100) : 0
  const rows = [...contributions].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))

  async function addMoney(e: React.FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!Number.isFinite(n) || n === 0) return
    setBusy(true)
    await supabase.from('goal_contributions').insert({
      goal_id: goal.id,
      household_id: householdId,
      amount: n,
      note: note.trim(),
    })
    setAmount('')
    setNote('')
    setBusy(false)
    await refresh()
  }

  async function updateAmount(id: string, value: string) {
    const n = parseAmount(value)
    if (!Number.isFinite(n) || n === 0) return
    await supabase.from('goal_contributions').update({ amount: n }).eq('id', id)
    await refresh()
  }

  async function remove(id: string) {
    if (!confirm('Delete this contribution?')) return
    setBusy(true)
    await supabase.from('goal_contributions').delete().eq('id', id)
    setBusy(false)
    await refresh()
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{goal.name}</span>
        <span className="text-sm tabular-nums text-slate-500">
          {money(saved)} / {money(goal.target_amount)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-green-600" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {goal.target_date
            ? `by ${new Date(goal.target_date + 'T00:00:00').toLocaleDateString()}`
            : 'no deadline'}
        </span>
        {rows.length > 0 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-slate-900 underline dark:text-white"
          >
            {rows.length} contribution{rows.length === 1 ? '' : 's'}
          </button>
        )}
      </div>

      <form onSubmit={addMoney} className="mt-3 flex gap-2">
        <Input
          inputMode="decimal"
          placeholder="Amount"
          className="!w-24"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit" disabled={busy}>
          Add
        </Button>
      </form>

      {open && rows.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-slate-400">
                {new Date(c.occurred_on + 'T00:00:00').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <ContributionAmount initial={c.amount} onCommit={(v) => updateAmount(c.id, v)} />
              <span className="flex-1 truncate text-xs text-slate-400">{c.note}</span>
              <button
                onClick={() => remove(c.id)}
                disabled={busy}
                className="text-xs text-slate-400 underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function ContributionAmount({
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
      className="w-20 rounded-lg bg-slate-100 px-2 py-1 text-right text-sm tabular-nums outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-slate-500 dark:bg-slate-800 dark:ring-slate-700"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== String(initial)) onCommit(value)
      }}
    />
  )
}
