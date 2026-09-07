import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { goalSaved } from '../lib/select'
import { money, parseAmount } from '../lib/money'
import { Button, Card, Field, Input } from '../components/ui'

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

  async function contribute(goalId: string) {
    const raw = prompt('Add to this goal. Amount:')
    if (raw == null) return
    const amount = parseAmount(raw)
    if (!Number.isFinite(amount) || amount === 0) return
    await supabase.from('goal_contributions').insert({
      goal_id: goalId,
      household_id: household!.id,
      amount,
    })
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

      {active.map((g) => {
        const saved = goalSaved(g.id, contributions)
        const pct = g.target_amount > 0 ? Math.min(100, (saved / g.target_amount) * 100) : 0
        return (
          <Card key={g.id}>
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{g.name}</span>
              <span className="text-sm tabular-nums text-slate-500">
                {money(saved)} / {money(g.target_amount)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-green-600"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {g.target_date
                  ? `by ${new Date(g.target_date + 'T00:00:00').toLocaleDateString()}`
                  : 'no deadline'}
              </span>
              <button
                onClick={() => contribute(g.id)}
                className="text-xs font-semibold text-slate-900 underline dark:text-white"
              >
                Add money
              </button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
