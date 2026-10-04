-- Minimal stand-in for what a Supabase project provides, so the migration and pgTAP
-- tests can run on plain Postgres (used by `npm run test:db` in CI without Docker).
-- Mirrors Supabase: auth.uid() reads the "sub" claim from request.jwt.claims.
create extension if not exists pgtap;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
