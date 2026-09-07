import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type {
  Category,
  Goal,
  GoalContribution,
  Household,
  Member,
  Settlement,
  Transaction,
} from '../lib/types'

interface HouseholdData {
  ready: boolean
  household: Household | null
  members: Member[]
  categories: Category[]
  transactions: Transaction[]
  goals: Goal[]
  contributions: GoalContribution[]
  settlements: Settlement[]
  /** Display name for a user id, falling back to "Unknown". */
  nameFor: (userId: string | null) => string
  refresh: () => Promise<void>
}

const Ctx = createContext<HouseholdData | undefined>(undefined)

const EMPTY: Omit<HouseholdData, 'ready' | 'nameFor' | 'refresh'> = {
  household: null,
  members: [],
  categories: [],
  transactions: [],
  goals: [],
  contributions: [],
  settlements: [],
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [data, setData] = useState(EMPTY)
  const householdIdRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setData(EMPTY)
      householdIdRef.current = null
      setReady(true)
      return
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      setData(EMPTY)
      householdIdRef.current = null
      setReady(true)
      return
    }

    const hid = membership.household_id
    householdIdRef.current = hid

    const [household, members, categories, transactions, goals, contributions, settlements] =
      await Promise.all([
        supabase.from('households').select('*').eq('id', hid).single(),
        supabase.from('household_members').select('*').eq('household_id', hid),
        supabase
          .from('categories')
          .select('*')
          .eq('household_id', hid)
          .order('sort_order')
          .order('name'),
        supabase
          .from('transactions')
          .select('*')
          .eq('household_id', hid)
          .order('occurred_on', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('goals').select('*').eq('household_id', hid).order('created_at'),
        supabase.from('goal_contributions').select('*').eq('household_id', hid),
        supabase
          .from('settlements')
          .select('*')
          .eq('household_id', hid)
          .order('occurred_on', { ascending: false }),
      ])

    setData({
      household: household.data ?? null,
      members: members.data ?? [],
      categories: categories.data ?? [],
      transactions: transactions.data ?? [],
      goals: goals.data ?? [],
      contributions: contributions.data ?? [],
      settlements: settlements.data ?? [],
    })
    setReady(true)
  }, [user])

  useEffect(() => {
    setReady(false)
    refresh()
  }, [refresh])

  // Any write from either device refetches. Cheap at this data size, and it
  // keeps the two phones in sync without hand-merging row events.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('household-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () =>
        refresh(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () =>
        refresh(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => refresh())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goal_contributions' },
        () => refresh(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () =>
        refresh(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members' }, () =>
        refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, refresh])

  const nameFor = useCallback(
    (userId: string | null) => {
      if (!userId) return 'Unknown'
      return data.members.find((m) => m.user_id === userId)?.display_name ?? 'Unknown'
    },
    [data.members],
  )

  return (
    <Ctx.Provider value={{ ready, ...data, nameFor, refresh }}>{children}</Ctx.Provider>
  )
}

export function useHousehold(): HouseholdData {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useHousehold must be used inside HouseholdProvider')
  return ctx
}
