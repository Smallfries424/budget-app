import { NavLink, Outlet } from 'react-router-dom'
import { MonthProvider } from '../hooks/useMonth'

const tabs = [
  { to: '/', label: 'Month', end: true },
  { to: '/transactions', label: 'Activity' },
  { to: '/budget', label: 'Budget' },
  { to: '/goals', label: 'Goals' },
  { to: '/settle', label: 'Settle' },
]

export default function AppShell() {
  return (
    <MonthProvider>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <div className="flex items-center justify-end px-4 pt-3">
          <NavLink
            to="/settings"
            className="text-xs font-medium text-slate-400 dark:text-slate-500"
          >
            Settings
          </NavLink>
        </div>
        <main className="flex-1 px-4 pt-2 pb-28">
          <Outlet />
        </main>
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex-1 py-3 text-center text-xs font-medium ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </MonthProvider>
  )
}
