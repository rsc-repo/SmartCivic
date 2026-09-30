-- SmartCivic: Database Schema Initialization
-- Run against your local database, e.g.:
--   psql -U postgres -d smartcivic_db -f db/schema.sql

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum Types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CITIZEN', 'OFFICER', 'DEPT_ADMIN', 'SYSTEM_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM (
    'SUBMITTED', 'VALIDATING', 'VALID', 'INVALID',
    'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED',
    'VERIFICATION_PENDING', 'CLOSED', 'REOPENED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE issue_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'CITIZEN',
    reputation_score INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    sla_hours_default INT DEFAULT 48
);

-- Issues Table
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    status issue_status DEFAULT 'SUBMITTED',
    priority issue_priority DEFAULT 'MEDIUM',
    reporter_id INT REFERENCES users(id),
    department_id INT REFERENCES departments(id),
    assigned_officer_id INT REFERENCES users(id),

    -- Geospatial Data (SRID 4326: Standard WGS 84 GPS Coordinates)
    location GEOMETRY(Point, 4326) NOT NULL,
    address_text TEXT,

    -- SLA Engine Data
    sla_due_at TIMESTAMP,
    is_sla_breached BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media Uploads (Local Path Storage)
CREATE TABLE IF NOT EXISTS issue_media (
    id SERIAL PRIMARY KEY,
    issue_id INT REFERENCES issues(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail / Status History
CREATE TABLE IF NOT EXISTS issue_status_history (
    id SERIAL PRIMARY KEY,
    issue_id INT REFERENCES issues(id) ON DELETE CASCADE,
    previous_status issue_status,
    new_status issue_status NOT NULL,
    changed_by_user_id INT REFERENCES users(id),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Query Index
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues USING GIST(location);
