#!/usr/bin/env bash
# Per-boot runtime initialization for the Cloud Agent environment.
# Starts PostgreSQL, ensures the app database exists, syncs the Prisma schema,
# and seeds daily prompts. Idempotent and safe to run on every boot.
set -euo pipefail

cd "$(dirname "$0")/.."

PGUSER_APP="appuser"
PGPASS_APP="apppass"
PGDB="x402miniapp"
DB_URL="postgresql://${PGUSER_APP}:${PGPASS_APP}@127.0.0.1:5432/${PGDB}?schema=public"

echo "==> Starting PostgreSQL cluster (if not already running)"
if ! sudo pg_lsclusters -h 2>/dev/null | awk '{print $4}' | grep -q online; then
  sudo pg_ctlcluster 16 main start || true
fi

echo "==> Waiting for PostgreSQL to accept connections"
for i in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    break
  fi
  sleep 1
done
sudo -u postgres pg_isready

echo "==> Ensuring application role and database exist"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${PGUSER_APP}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${PGUSER_APP} LOGIN PASSWORD '${PGPASS_APP}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${PGDB}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${PGUSER_APP}" "${PGDB}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${PGDB} TO ${PGUSER_APP};" >/dev/null

echo "==> Syncing Prisma schema to the database (prisma db push)"
DATABASE_URL="${DB_URL}" npx prisma db push --skip-generate --accept-data-loss

echo "==> Seeding daily prompts (idempotent upsert)"
DATABASE_URL="${DB_URL}" pnpm seed

echo "==> start.sh complete; app database is ready"
