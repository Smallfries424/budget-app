-- Run this in the Supabase SQL editor if your database was created before
-- monthly_income existed. It is safe to run more than once.
alter table households
  add column if not exists monthly_income numeric(12,2) not null default 0;
