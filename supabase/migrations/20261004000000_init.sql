-- Purse schema: per-user transactions and budgets, protected by Row Level Security.
--
-- Design notes
-- * Client-generated UUID primary keys make every write an idempotent upsert, so the
--   offline outbox can safely retry without creating duplicates.
-- * Deletes are soft (deleted_at) so other devices learn about them on incremental sync.
-- * updated_at is always set by the server, so sync cursors never depend on device clocks.
-- * Constraints mirror the client validation in src/lib/validate.ts: the database is the
--   last line of defence even if a client is modified.

create table public.transactions (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('expense', 'income')),
  amount      bigint not null check (amount > 0 and amount <= 100000000000),
  category_id text not null check (
    (type = 'expense' and category_id in ('food','groceries','transport','rent','bills','shopping','health','fun','other'))
    or (type = 'income' and category_id in ('salary','freelance','other-income'))
  ),
  date        date not null,
  note        text not null default '' check (char_length(note) <= 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

comment on column public.transactions.amount is 'Minor units (paise, cents). Integer to avoid float rounding.';

-- Incremental sync reads "everything of mine changed since X", so index exactly that.
create index transactions_user_updated_idx on public.transactions (user_id, updated_at);
create index transactions_user_date_idx on public.transactions (user_id, date desc) where deleted_at is null;

create table public.budgets (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id text not null check (category_id in ('food','groceries','transport','rent','bills','shopping','health','fun','other')),
  amount      bigint check (amount is null or amount > 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, category_id)
);

comment on column public.budgets.amount is 'Monthly limit in minor units. NULL means the limit was removed (kept so removals sync).';

create index budgets_user_updated_idx on public.budgets (user_id, updated_at);

-- Server-owned timestamps -------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- Ownership can never be changed by an update.
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create trigger transactions_set_updated_at
  before insert or update on public.transactions
  for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
  before insert or update on public.budgets
  for each row execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------------
-- Every row is visible and writable only by its owner. "(select auth.uid())" is
-- evaluated once per query rather than once per row, as Supabase recommends.

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy "Users read their own transactions"
  on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users add their own transactions"
  on public.transactions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own transactions"
  on public.transactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No delete policy: clients soft-delete via deleted_at. Hard deletes happen only through
-- account deletion (on delete cascade) or the purge job below.

create policy "Users read their own budgets"
  on public.budgets for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users add their own budgets"
  on public.budgets for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own budgets"
  on public.budgets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Anonymous visitors get nothing.
revoke all on public.transactions, public.budgets from anon;
grant select, insert, update on public.transactions, public.budgets to authenticated;

-- Housekeeping -------------------------------------------------------------------

-- Soft-deleted rows only need to live long enough for every device to sync the delete.
create function public.purge_deleted_transactions(older_than interval default interval '90 days')
returns bigint
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.transactions
    where deleted_at is not null and deleted_at < now() - older_than
    returning 1
  )
  select count(*) from gone;
$$;

revoke execute on function public.purge_deleted_transactions(interval) from public, anon, authenticated;

-- Realtime: push changes to the user's other open devices. RLS applies to realtime too.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.transactions, public.budgets;
  end if;
end;
$$;
