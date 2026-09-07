import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { HouseholdProvider, useHousehold } from './hooks/useHousehold'
import AppShell from './components/AppShell'
import Login from './routes/Login'
import Onboarding from './routes/Onboarding'
import Home from './routes/Home'
import Transactions from './routes/Transactions'
import TransactionForm from './routes/TransactionForm'
import Budget from './routes/Budget'
import Goals from './routes/Goals'
import Settle from './routes/Settle'
import Settings from './routes/Settings'

function Splash({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-slate-400">
      {label}
    </div>
  )
}

function Gate() {
  const { ready, household } = useHousehold()
  if (!ready) return <Splash label="Loading..." />
  if (!household) return <Onboarding />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="budget" element={<Budget />} />
        <Route path="goals" element={<Goals />} />
        <Route path="settle" element={<Settle />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="transactions/new" element={<TransactionForm />} />
      <Route path="transactions/:id" element={<TransactionForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const { loading, session } = useAuth()
  if (loading) return <Splash label="Loading..." />
  if (!session) return <Login />
  return (
    <HouseholdProvider>
      <Gate />
    </HouseholdProvider>
  )
}
