#!/usr/bin/env bash
set -euo pipefail

echo "== SmartCivic Codespace setup =="

echo "-- Installing PostgreSQL + PostGIS..."
sudo apt-get update -qq || true
sudo apt-get install -y -qq postgresql postgresql-contrib postgis

sudo service postgresql start

as_postgres() {
  sudo su - postgres -c "$1"
}

echo "-- Configuring database..."
as_postgres "psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
as_postgres "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'smartcivic_db'\"" \
  | grep -q 1 || as_postgres "createdb smartcivic_db"

echo "-- Loading schema..."
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d smartcivic_db \
  -f backend/db/schema.sql

echo "-- Installing backend dependencies..."
cd backend
[ -f .env ] || cp .env.example .env
npm install --no-audit --no-fund

echo "-- Seeding departments + test users..."
npm run seed

cd ..

echo "-- Installing frontend dependencies..."
cd frontend
[ -f .env.local ] || cp .env.local.example .env.local
npm install --no-audit --no-fund
cd ..

echo "== Setup complete =="
