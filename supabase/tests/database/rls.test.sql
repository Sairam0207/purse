-- pgTAP tests for Row Level Security. Run with:  supabase test db
begin;
select plan(19);

-- Two users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'asha@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'ravi@example.com');

-- Act as Asha
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ insert into public.transactions (id, type, amount, category_id, date, note)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'expense', 25000, 'food', '2026-03-01', 'Lunch') $$,
  'a user can add a transaction; user_id defaults to auth.uid()'
);

select is(
  (select user_id::text from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111',
  'ownership is taken from the JWT'
);

select throws_ok(
  $$ insert into public.transactions (id, user_id, type, amount, category_id, date)
     values ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'expense', 100, 'food', '2026-03-01') $$,
  '42501', null,
  'a user cannot create rows for someone else'
);

select throws_ok(
  $$ insert into public.transactions (id, type, amount, category_id, date)
     values ('aaaaaaaa-0000-0000-0000-000000000003', 'expense', 100, 'salary', '2026-03-01') $$,
  '23514', null,
  'category must match the transaction type'
);

select throws_ok(
  $$ insert into public.transactions (id, type, amount, category_id, date)
     values ('aaaaaaaa-0000-0000-0000-000000000004', 'expense', -5, 'food', '2026-03-01') $$,
  '23514', null,
  'amount must be positive'
);

select lives_ok(
  $$ insert into public.budgets (category_id, amount) values ('food', 900000) $$,
  'a user can set a budget'
);

-- Act as Ravi
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.transactions), 0, 'another user cannot see the transaction');
select is((select count(*)::int from public.budgets), 0, 'another user cannot see the budget');

select is_empty(
  $$ update public.transactions set note = 'hacked'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning id $$,
  'another user''s update matches no rows'
);

select throws_ok(
  $$ delete from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null,
  'nobody can hard-delete through the API'
);

-- Back to Asha
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select note from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Lunch',
  'the row is unchanged after another user tried to edit it'
);

select lives_ok(
  $$ update public.transactions set deleted_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'owners can soft-delete'
);

update public.transactions
  set user_id = '22222222-2222-2222-2222-222222222222', note = 'Lunch with team'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select is(
  (select user_id::text from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111',
  'ownership cannot be transferred by an update'
);

select ok(
  (select updated_at >= created_at from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'updated_at is maintained by the server'
);

-- Sync guarantees
insert into public.transactions (id, type, amount, category_id, date, updated_at)
  values ('aaaaaaaa-0000-0000-0000-000000000009', 'expense', 500, 'transport', '2026-03-02', '2000-01-01')
  on conflict (id) do update set amount = excluded.amount;
insert into public.transactions (id, type, amount, category_id, date)
  values ('aaaaaaaa-0000-0000-0000-000000000009', 'expense', 700, 'transport', '2026-03-02')
  on conflict (id) do update set amount = excluded.amount;

select is(
  (select count(*)::int from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000009'),
  1,
  'retrying an upsert with the same id never creates a duplicate'
);
select is(
  (select amount from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000009'),
  700::bigint,
  'the retried upsert applies the latest values'
);
select ok(
  (select updated_at > '2001-01-01' from public.transactions where id = 'aaaaaaaa-0000-0000-0000-000000000009'),
  'a client-supplied updated_at is overridden, so sync cursors use server time'
);

-- Anonymous
reset role;
set local role anon;
select throws_ok($$ select * from public.transactions $$, '42501', null, 'anonymous users have no access to transactions');
select throws_ok($$ select * from public.budgets $$, '42501', null, 'anonymous users have no access to budgets');

select * from finish();
rollback;
