import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { Button, Card } from '../components/ui'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { household, members } = useHousehold()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card>
        <p className="text-xs font-medium text-slate-500">Budget</p>
        <p className="font-medium">{household?.name}</p>
        <p className="mt-3 text-xs font-medium text-slate-500">Invite code</p>
        <p className="font-mono text-lg tracking-widest">{household?.invite_code}</p>
        <p className="mt-1 text-xs text-slate-400">
          Share this with your partner so they can join.
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
