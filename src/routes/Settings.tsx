import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { Button, Card } from '../components/ui'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { household, members } = useHousehold()
  const [copied, setCopied] = useState(false)

  const code = household?.invite_code ?? ''
  const link = `${window.location.origin}/?invite=${code}`
  const message = `Join our budget on ${household?.name ?? 'Budget App'}: ${link}`

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Budget App invite', text: message, url: link })
        return
      } catch {
        // user cancelled the share sheet, fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card>
        <p className="text-xs font-medium text-slate-500">Budget</p>
        <p className="font-medium">{household?.name}</p>

        <p className="mt-4 text-xs font-medium text-slate-500">Invite your partner</p>
        <p className="mt-1 text-sm text-slate-500">
          Send them this link. It opens the app with the code filled in.
        </p>
        <div className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs break-all dark:bg-slate-800">
          {link}
        </div>
        <Button onClick={share} className="mt-2 w-full">
          {copied ? 'Copied' : 'Share invite link'}
        </Button>
        <p className="mt-2 text-xs text-slate-400">
          Or give them this code to enter manually:{' '}
          <span className="font-mono tracking-widest text-slate-500">{code}</span>
        </p>
      </Card>

      <Card>
        <p className="text-xs font-medium text-slate-500">Members</p>
        <ul className="mt-1 space-y-1 text-sm">
          {members.map((m) => (
            <li key={m.user_id}>
              {m.display_name}
              {m.user_id === user?.id && ' (you)'}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="text-sm text-slate-500">{user?.email}</p>
        <Button variant="ghost" onClick={signOut} className="mt-3 w-full">
          Sign out
        </Button>
      </Card>
    </div>
  )
}
