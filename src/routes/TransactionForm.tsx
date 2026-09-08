import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { money, parseAmount } from '../lib/money'
import type { SplitType } from '../lib/types'
import { Button, Card, Field, Input, Select } from '../components/ui'

export default function TransactionForm() {
  const { id } = useParams()
  const editing = id && id !== 'new'
  const navigate = useNavigate()
  const { user } = useAuth()
  const { household, categories, members, transactions, refresh } = useHousehold()

  const [amountText, setAmountText] = useState('')
  const [isIncome, setIsIncome] = useState(false)
  const [description, setDescription] = useState('')
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState('')
  const [paidBy, setPaidBy] = useState(user?.id ?? '')
  const [splitType, setSplitType] = useState<SplitType>('none')
  const [payerPercent, setPayerPercent] = useState('50')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) return
    const t = transactions.find((x) => x.id === id)
    if (!t) return
    setIsIncome(t.amount < 0)
    setAmountText(String(Math.abs(t.amount)))
    setDescription(t.description)
    setOccurredOn(t.occurred_on)
    setCategoryId(t.category_id ?? '')
    setPaidBy(t.paid_by ?? '')
    setSplitType(t.split_type)
    setPayerPercent(
      t.split_type === 'custom' && t.payer_share != null
        ? String(Number((t.payer_share * 100).toFixed(2)))
        : '50',
    )
  }, [editing, id, transactions])

  const payerPercentValue = Math.min(100, Math.max(0, Number(payerPercent) || 0))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const magnitude = parseAmount(amountText)
    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setBusy(true)
    setError(null)
    const row = {
      household_id: household!.id,
      amount: isIncome ? -Math.abs(magnitude) : Math.abs(magnitude),
      description: description.trim(),
      occurred_on: occurredOn,
      category_id: categoryId || null,
      paid_by: paidBy || null,
      split_type: isIncome ? ('none' as SplitType) : splitType,
      payer_share:
        !isIncome && splitType === 'custom'
          ? payerPercentValue / 100
          : (null as number | null),
    }
    const res = editing
      ? await supabase.from('transactions').update(row).eq('id', id)
      : await supabase.from('transactions').insert(row)
    setBusy(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    await refresh()
    navigate(-1)
  }

  async function remove() {
    if (!editing || !confirm('Delete this transaction?')) return
    setBusy(true)
    await supabase.from('transactions').delete().eq('id', id)
    await refresh()
    navigate('/transactions')
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500">
          Cancel
        </button>
        <h1 className="text-base font-semibold">
          {editing ? 'Edit' : 'New'} transaction
        </h1>
        <span className="w-12" />
      </header>

      <Card>
        <form onSubmit={save} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isIncome ? 'ghost' : 'primary'}
              onClick={() => setIsIncome(false)}
              className="flex-1"
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={isIncome ? 'primary' : 'ghost'}
              onClick={() => setIsIncome(true)}
              className="flex-1"
            >
              Income
            </Button>
          </div>

          <Field label="Amount">
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              autoFocus={!editing}
            />
          </Field>

          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Groceries"
            />
          </Field>

          <Field label="Date">
            <Input
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
            />
          </Field>

          {!isIncome && (
            <Field label="Category">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categories
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}

          <Field label={isIncome ? 'Received by' : 'Paid by'}>
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              <option value="">Not set</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </Select>
          </Field>

          {!isIncome && (
            <Field label="Split">
              <Select
                value={splitType}
                onChange={(e) => {
                  const next = e.target.value as SplitType
                  setSplitType(next)
                  if (next === 'custom') setPayerPercent('50')
                }}
              >
                <option value="none">Not shared</option>
                <option value="even">Split 50/50</option>
                <option value="custom">Custom split</option>
              </Select>
            </Field>
          )}

          {!isIncome && splitType === 'custom' && (
            <div className="space-y-2">
              <Field label="Payer's share (%)">
                <Input
                  inputMode="numeric"
                  value={payerPercent}
                  onChange={(e) => setPayerPercent(e.target.value)}
                  placeholder="50"
                />
              </Field>
              {(() => {
                const total = parseAmount(amountText)
                if (!Number.isFinite(total) || total <= 0) return null
                const payerAmount = (total * payerPercentValue) / 100
                const payerName =
                  members.find((m) => m.user_id === paidBy)?.display_name ?? 'Payer'
                const otherName =
                  members.find((m) => m.user_id !== paidBy)?.display_name ?? 'Them'
                return (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {payerName}: {money(payerAmount)}, {otherName}:{' '}
                    {money(total - payerAmount)}
                  </p>
                )
              })()}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Saving...' : 'Save'}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="danger"
              onClick={remove}
              disabled={busy}
              className="w-full"
            >
              Delete
            </Button>
          )}
        </form>
      </Card>
    </div>
  )
}
