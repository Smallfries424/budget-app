import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface MonthState {
  /** First day of the selected month, local time. Pass to `inMonth`. */
  ref: Date
  /** "September 2026" */
  label: string
  isCurrent: boolean
  prev: () => void
  next: () => void
  goCurrent: () => void
}

const Ctx = createContext<MonthState | undefined>(undefined)

function firstOfThisMonth(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), 1)
}

export function MonthProvider({ children }: { children: ReactNode }) {
  const [ref, setRef] = useState(firstOfThisMonth)

  const value = useMemo<MonthState>(
    () => ({
      ref,
      label: ref.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      isCurrent: ref.getTime() === firstOfThisMonth().getTime(),
      prev: () => setRef((r) => new Date(r.getFullYear(), r.getMonth() - 1, 1)),
      next: () => setRef((r) => new Date(r.getFullYear(), r.getMonth() + 1, 1)),
      goCurrent: () => setRef(firstOfThisMonth()),
    }),
    [ref],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMonth(): MonthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMonth must be used inside MonthProvider')
  return ctx
}
