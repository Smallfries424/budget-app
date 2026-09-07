import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { settleUp } from '../lib/select'
import { money } from '../lib/money'
import { Button, Card } from '../components/ui'

export default function Settle() {
  const { household, members, transactions, settlements, nameFor, refresh } = useHousehold()
  const [busy, setBusy] = useState(false)

  const memberIds = members.map((m) => m.user_id)
  const balance = settleUp(memberIds, transactions, settlements)

  async function recordSettlement() {
    if (!balance.debtor || !balance.creditor || balance.amount <= 0) return
    setBusy(true)
    await supabase.from('settlements').insert({
      household_id: household!.id,
      from_user: balance.debtor,
      to_user: balance.creditor,
      amount: Math.round(balance.amount * 100) / 100,
      note: 'Squared up',
    })
    setBusy(false)
    await refresh()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settle up</h1>

      <Card>
        {members.length < 2 ? (
          <p className="text-sm text-slate-500">
            Shared spending shows up here once both of you have joined.
          </p>
        ) : balance.amount === 0 ? (
          <p className="text-sm">You are square. Nice.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold">{nameFor(balance.debtor)}</span> owes{' '}
              <span className="font-semibold">{nameFor(balance.creditor)}</span>
            </p>
            <p className="text-3xl font-bold tabular-nums">{money(balance.amount)}</p>
            <Button onClick={recordSettlement} disabled={busy} className="w-full">
              {busy ? 'Recording...' : 'Mark as paid'}
            </Button>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500">History</h2>
        {settlements.length === 0 && (
          <p className="px-1 text-sm text-slate-400">No payments recorded yet.</p>
        )}
        {settlements.map((s) => (
          <Card key={s.id} className="!p-3">
            <div className="flex items-center justify-between text-sm">
              <span>
                {nameFor(s.from_user)} paid {nameFor(s.to_user)}
              </span>
              <span className="tabular-nums">{money(s.amount)}</span>
            </div>
            <p className="text-xs text-slate-400">
              {new Date(s.occurred_on + 'T00:00:00').toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
