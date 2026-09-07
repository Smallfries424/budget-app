import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { Button, Card, Field, Input } from '../components/ui'

export default function Onboarding() {
  const { refresh } = useHousehold()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const call =
      tab === 'create'
        ? supabase.rpc('create_household', {
            household_name: householdName,
            member_name: name,
          })
        : supabase.rpc('join_household', { code, member_name: name })
    const { error } = await call
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">Get set up</h1>
      <p className="mb-6 text-sm text-slate-500">
        One of you creates the budget, the other joins with the invite code.
      </p>

      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === 'create' ? 'primary' : 'ghost'}
          onClick={() => setTab('create')}
          type="button"
          className="flex-1"
        >
          Create
        </Button>
        <Button
          variant={tab === 'join' ? 'primary' : 'ghost'}
          onClick={() => setTab('join')}
          type="button"
          className="flex-1"
        >
          Join
        </Button>
      </div>

      <Card>
        <form onSubmit={run} className="space-y-4">
          <Field label="Your name">
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
            />
          </Field>
          {tab === 'create' ? (
            <Field label="Budget name">
              <Input
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Our budget"
              />
            </Field>
          ) : (
            <Field label="Invite code">
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="a1b2c3d4"
                autoCapitalize="none"
              />
            </Field>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Working...' : tab === 'create' ? 'Create budget' : 'Join budget'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
