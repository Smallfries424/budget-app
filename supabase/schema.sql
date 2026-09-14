-- Budget app schema. Run this once in the Supabase SQL editor.
-- Re-running is safe: it drops and recreates everything in this file's scope.

-- ---------------------------------------------------------------------------
-- Reset (dev convenience). Comment this block out once you have real data.
-- ---------------------------------------------------------------------------
drop table if exists settlements cascade;
drop table if exists goal_contributions cascade;
drop table if exists goals cascade;
drop table if exists transactions cascade;
drop table if exists categories cascade;
drop table if exists household_members cascade;
drop table if exists households cascade;
drop function if exists is_household_member(uuid) cascade;
drop function if exists create_household(text, text) cascade;
drop function if exists join_household(text, text) cascade;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table households (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  invite_code    text not null unique default substr(md5(random()::text), 1, 8),
  monthly_income numeric(12,2) not null default 0,
  created_at     timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table categories (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  monthly_budget numeric(12,2) not null default 0,
  sort_order     int not null default 0,
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- amount: positive is money out (an expense), negative is money in (income, refund).
create table transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  occurred_on  date not null default current_date,
  amount       numeric(12,2) not null,
  description  text not null default '',
  category_id  uuid references categories(id) on delete set null,
  paid_by      uuid references auth.users(id),
  -- Splitting between the two members. 'none' is not shared.
  -- 'even' splits 50/50. 'custom' uses payer_share (payer's fraction, 0..1).
  split_type   text not null default 'none' check (split_type in ('none', 'even', 'custom')),
  payer_share  numeric(5,4),
  created_by   uuid not null default auth.uid() references auth.users(id),
  created_at   timestamptz not null default now()
);
create index on transactions (household_id, occurred_on desc);

create table goals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  target_amount numeric(12,2) not null,
  target_date   date,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table goal_contributions (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references goals(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  occurred_on  date not null default current_date,
  amount       numeric(12,2) not null,
  note         text not null default '',
  created_by   uuid not null default auth.uid() references auth.users(id),
  created_at   timestamptz not null default now()
);

-- A payment from one member to the other to square up shared spending.
create table settlements (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  occurred_on  date not null default current_date,
  from_user    uuid not null references auth.users(id),
  to_user      uuid not null references auth.users(id),
  amount       numeric(12,2) not null check (amount > 0),
  note         text not null default '',
  created_by   uuid not null default auth.uid() references auth.users(id),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Membership check. security definer so it can read household_members
-- without tripping that table's own row-level policies (avoids recursion).
-- ---------------------------------------------------------------------------
create function is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs for the chicken-and-egg cases (creating or joining a household).
-- ---------------------------------------------------------------------------
create function create_household(household_name text, member_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  h households;
  default_categories text[] := array[
    'Rent/Mortgage', 'Groceries', 'Bars & Restaurants', 'Entertainment',
    'Utilities', 'Transportation', 'Subscriptions', 'Shopping',
    'Health & Fitness', 'Personal Care', 'Travel', 'Gifts & Donations',
    'Pets', 'Miscellaneous'
  ];
begin
  insert into households (name) values (household_name) returning * into h;
  insert into household_members (household_id, user_id, display_name)
    values (h.id, auth.uid(), member_name);
  insert into categories (household_id, name, sort_order)
    select h.id, c, ord - 1
    from unnest(default_categories) with ordinality as t(c, ord);
  return h;
end;
$$;

create function join_household(code text, member_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  h households;
begin
  select * into h from households where invite_code = lower(trim(code));
  if h.id is null then
    raise exception 'No household with that invite code';
  end if;
  insert into household_members (household_id, user_id, display_name)
    values (h.id, auth.uid(), member_name)
    on conflict (household_id, user_id) do update set display_name = excluded.display_name;
  return h;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security. Every table is member-scoped.
-- ---------------------------------------------------------------------------
alter table households          enable row level security;
alter table household_members   enable row level security;
alter table categories          enable row level security;
alter table transactions        enable row level security;
alter table goals               enable row level security;
alter table goal_contributions  enable row level security;
alter table settlements         enable row level security;

create policy "members read household" on households
  for select using (is_household_member(id));
create policy "members update household" on households
  for update using (is_household_member(id));

create policy "members read roster" on household_members
  for select using (is_household_member(household_id));
create policy "member updates own name" on household_members
  for update using (user_id = auth.uid());
create policy "member leaves" on household_members
  for delete using (user_id = auth.uid());

-- The remaining tables all share the same member-scoped shape.
create policy "member rw categories" on categories
  for all using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "member rw transactions" on transactions
  for all using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "member rw goals" on goals
  for all using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "member rw goal_contributions" on goal_contributions
  for all using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "member rw settlements" on settlements
  for all using (is_household_member(household_id)) with check (is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- Realtime: push row changes to connected clients.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table goals;
alter publication supabase_realtime add table goal_contributions;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table household_members;
