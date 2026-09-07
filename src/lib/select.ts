import type {
  Category,
  GoalContribution,
  Settlement,
  Transaction,
} from './types'
import { monthStart, nextMonthStart } from './money'

/** Transactions whose date falls in the given month (defaults to this month). */
export function inMonth(txns: Transaction[], ref = new Date()): Transaction[] {
  const start = monthStart(ref)
  const end = nextMonthStart(ref)
  return txns.filter((t) => t.occurred_on >= start && t.occurred_on < end)
}

export interface CategoryLine {
  category: Category
  spent: number
  budget: number
  remaining: number
}

/** Per-category spend vs. budget for a set of transactions. */
export function categoryLines(
  categories: Category[],
  txns: Transaction[],
): CategoryLine[] {
  return categories
    .filter((c) => !c.archived)
    .map((category) => {
      const spent = txns
        .filter((t) => t.category_id === category.id)
        .reduce((sum, t) => sum + t.amount, 0)
      const budget = category.monthly_budget
      return { category, spent, budget, remaining: budget - spent }
    })
}

export interface MonthTotals {
  budgeted: number
  spent: number
  remaining: number
  income: number
}

export function monthTotals(lines: CategoryLine[], txns: Transaction[]): MonthTotals {
  const budgeted = lines.reduce((s, l) => s + l.budget, 0)
  const spent = lines.reduce((s, l) => s + Math.max(l.spent, 0), 0)
  const income = txns
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + -t.amount, 0)
  return { budgeted, spent, remaining: budgeted - spent, income }
}

/** The payer's own share of a shared transaction. */
export function payerShare(t: Transaction): number {
  if (t.split_type === 'none') return t.amount
  if (t.split_type === 'even') return t.amount / 2
  return t.amount * (t.payer_share ?? 0.5)
}

/**
 * Net balance between exactly two members. Returns { creditor, debtor, amount }
 * where debtor owes creditor `amount`. amount is 0 when square.
 */
export function settleUp(
  memberIds: string[],
  txns: Transaction[],
  settlements: Settlement[],
): { creditor: string | null; debtor: string | null; amount: number } {
  const owed: Record<string, number> = {}
  for (const id of memberIds) owed[id] = 0

  for (const t of txns) {
    if (t.split_type === 'none' || !t.paid_by) continue
    const nonPayer = memberIds.find((id) => id !== t.paid_by)
    if (!nonPayer) continue
    const share = t.amount - payerShare(t)
    owed[t.paid_by] += share
    owed[nonPayer] -= share
  }

  for (const s of settlements) {
    // from_user pays to_user: the debtor's balance moves back toward zero.
    if (owed[s.from_user] !== undefined) owed[s.from_user] += s.amount
    if (owed[s.to_user] !== undefined) owed[s.to_user] -= s.amount
  }

  const [a, b] = memberIds
  if (!a || !b) return { creditor: null, debtor: null, amount: 0 }
  const net = owed[a]
  if (Math.abs(net) < 0.005) return { creditor: null, debtor: null, amount: 0 }
  return net > 0
    ? { creditor: a, debtor: b, amount: net }
    : { creditor: b, debtor: a, amount: -net }
}

export function goalSaved(goalId: string, contributions: GoalContribution[]): number {
  return contributions
    .filter((c) => c.goal_id === goalId)
    .reduce((s, c) => s + c.amount, 0)
}
