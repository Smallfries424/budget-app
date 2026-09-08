export type SplitType = 'none' | 'even' | 'custom'

export interface Household {
  id: string
  name: string
  invite_code: string
  monthly_income: number
  created_at: string
}

export interface Member {
  household_id: string
  user_id: string
  display_name: string
  joined_at: string
}

export interface Category {
  id: string
  household_id: string
  name: string
  monthly_budget: number
  sort_order: number
  archived: boolean
  created_at: string
}

export interface Transaction {
  id: string
  household_id: string
  occurred_on: string
  amount: number
  description: string
  category_id: string | null
  paid_by: string | null
  split_type: SplitType
  payer_share: number | null
  created_by: string
  created_at: string
}

export interface Goal {
  id: string
  household_id: string
  name: string
  target_amount: number
  target_date: string | null
  archived: boolean
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  household_id: string
  occurred_on: string
  amount: number
  note: string
  created_by: string
  created_at: string
}

export interface Settlement {
  id: string
  household_id: string
  occurred_on: string
  from_user: string
  to_user: string
  amount: number
  note: string
  created_by: string
  created_at: string
}
