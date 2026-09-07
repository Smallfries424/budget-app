# Budget App

A phone-first shared budget for two people. Track spending against monthly
category budgets, log every transaction, split shared costs, and save toward
goals. Built as an installable PWA on Vite, React, and Supabase.

## What is in here

- `src/routes` — the five screens (Month, Activity, Budget, Goals, Settle) plus
  Login, Onboarding, and Settings
- `src/hooks/useHousehold.tsx` — loads all household data once and refetches on
  any change from either device
- `src/lib/select.ts` — the money math: category spend vs. budget, split shares,
  who owes whom
- `supabase/schema.sql` — tables, row level security, realtime, and the two RPCs
  for creating and joining a household

## First-time setup

1. Create a project at supabase.com. From Project Settings, API, copy the
   project URL and the anon key.
2. `cp .env.example .env.local` and paste those two values in.
3. Open the Supabase SQL editor, paste in `supabase/schema.sql`, and run it.
4. In Authentication, Providers, keep Email on. Turn off "Confirm email" if you
   want to skip the confirmation step while testing.
5. `pnpm install && pnpm dev`, then open the local URL on your phone (same
   network) or in a browser.

## Using it

One of you signs up, then creates the budget and gets an invite code (shown in
Settings). The other signs up and joins with that code. From then on both phones
show the same data live.

Amounts are entered as positive numbers. "Expense" subtracts from a category
budget, "Income" adds money back. A shared expense set to "Split 50/50" shows up
on the Settle tab as a running balance between the two of you, which you clear
with "Mark as paid".

## Deploy

Push to a private GitHub repo and import it in Vercel. Add `VITE_SUPABASE_URL`
and `VITE_SUPABASE_ANON_KEY` as environment variables. `vercel.json` already
routes every path back to `index.html` so client-side routing works.

## Not built yet

- Custom split ratios (the schema supports `custom` and `payer_share`, the form
  only offers 50/50)
- CSV import from bank statements
- Editing or deleting individual goal contributions and settlements
- Multi-currency (everything is USD via `Intl.NumberFormat`)
