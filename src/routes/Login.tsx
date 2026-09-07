import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const fn =
      mode === 'in'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })
    const { data, error } = await fn
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    if (mode === 'up' && !data.session) {
      setNotice('Check your email to confirm, then sign in.')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">Budget App</h1>
      <p className="mb-6 text-sm text-slate-500">
        {mode === 'in' ? 'Sign in to your shared budget.' : 'Create your account.'}
      </p>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Working...' : mode === 'in' ? 'Sign in' : 'Sign up'}
          </Button>
        </form>
      </Card>
      <button
        className="mt-4 text-center text-sm text-slate-500 underline"
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in')
          setError(null)
          setNotice(null)
        }}
      >
        {mode === 'in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </div>
  )
}
