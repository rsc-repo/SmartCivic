#!/usr/bin/env bash
# Runs once via devcontainer.json's postCreateCommand, the first time this
# Codespace is created. Safe to re-run (e.g. on "Rebuild Container") — every
# step below is idempotent.
set -euo pipefail

echo "== SmartCivic Codespace setup =="

# --- 1. Install PostgreSQL + PostGIS -------------------------------------
echo "-- Installing PostgreSQL + PostGIS..."
sudo apt-get update -qq || true # tolerate one flaky/unrelated repo mirror
sudo apt-get install -y -qq postgresql postgresql-contrib postgis

sudo service postgresql start

# --- 2. Create the postgres role password + database ---------------------
# Matches backend/.env.example's default connection string:
#   postgresql://postgres:postgres@localhost:5432/smartcivic_db
echo "-- Configuring database..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'smartcivic_db'" \
  | grep -q 1 || sudo -u postgres createdb smartcivic_db

# --- 3. Load the schema (idempotent — uses CREATE ... IF NOT EXISTS) -----
echo "-- Loading schema..."
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d smartcivic_db \
  -f backend/db/schema.sql

# --- 4. Backend: install deps + env file ---------------------------------
echo "-- Installing backend dependencies..."
cd backend
[ -f .env ] || cp .env.example .env
npm install --no-audit --no-fund

echo "-- Seeding departments + test users..."
npm run seed

cd ..

# --- 5. Frontend: install deps + env file ---------------------------------
echo "-- Installing frontend dependencies..."
cd frontend
[ -f .env.local ] || cp .env.local.example .env.local
npm install --no-audit --no-fund
cd ..

echo "== Setup complete =="
echo ""
echo "Next steps:"
echo "  Terminal 1: cd backend && npm run dev    (http://localhost:3001/api)"
echo "  Terminal 2: cd frontend && npm run dev   (http://localhost:3000)"
