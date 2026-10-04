#!/usr/bin/env bash
# Runs the migration and pgTAP tests on a plain Postgres (no Docker needed).
# Requires: psql, a reachable Postgres, and the pgtap extension installed.
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a Postgres you can create databases on}"
DB=purse_test_$$
psql "$DATABASE_URL" -q -c "create database $DB"
trap 'psql "$DATABASE_URL" -q -c "drop database if exists $DB"' EXIT
TEST_URL="${DATABASE_URL%/*}/$DB"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/shim/supabase_shim.sql
for f in supabase/migrations/*.sql; do psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
OUT=$(psql "$TEST_URL" -q -t -f supabase/tests/database/rls.test.sql 2>&1)
echo "$OUT" | grep -E '^\s*(ok|not ok|#|1\.\.)'
if echo "$OUT" | grep -qE 'not ok|ERROR|Looks like'; then echo "Database tests failed"; exit 1; fi
