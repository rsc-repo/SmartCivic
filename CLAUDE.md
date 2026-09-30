# **SmartCivic: Project Build Specification (Docker-Free)**

## **1\. System Context & Overview**

**SmartCivic** is a geo-enabled, full-stack crowdsourced civic issue reporting and resolution platform. Citizens report issues (potholes, garbage, streetlights) with photos and geographic location. Municipal officers are automatically assigned issues, track SLAs, update status workflows, upload repair evidence, and allow citizens to verify fixes before closure.

### **Key Design Constraints**

* **Docker-Free Environment**: All components run directly on the host machine using native runtimes (Node.js, Python, PostgreSQL).  
* **Local Storage First**: Media uploaded by users is stored on the local filesystem.  
* **Native OS Services**: PostgreSQL \+ PostGIS must be installed directly on the developer's operating system.  
* **In-Memory / Database SLA Engine**: Background SLA tracking uses @nestjs/schedule (cron) querying PostgreSQL directly (no Redis or BullMQ).

## **2\. Technology Stack**

* **Frontend**: Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Leaflet / React-Leaflet.  
* **Backend API**: NestJS (TypeScript), TypeORM (or Prisma), @nestjs/schedule.  
* **Database**: PostgreSQL with PostGIS extension enabled.  
* **File Storage**: Local disk storage (backend/uploads/ directory mapped to static server routes).  
* **AI Service (Phase 2\)**: Python \+ FastAPI running inside a Python virtual environment (venv) using scikit-learn / OpenCV for spatial duplicate checks and image classification.

## **3\. Database Schema (PostgreSQL \+ PostGIS)**

Run this SQL initialization directly in your local smartcivic\_db database:

SQL  
\-- Enable PostGIS extension  
CREATE EXTENSION IF NOT EXISTS postgis;

\-- Enum Types  
CREATE TYPE user\_role AS ENUM ('CITIZEN', 'OFFICER', 'DEPT\_ADMIN', 'SYSTEM\_ADMIN');  
CREATE TYPE issue\_status AS ENUM (  
  'SUBMITTED', 'VALIDATING', 'VALID', 'INVALID',   
  'TRIAGED', 'ASSIGNED', 'IN\_PROGRESS', 'RESOLVED',   
  'VERIFICATION\_PENDING', 'CLOSED', 'REOPENED'  
);  
CREATE TYPE issue\_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

\-- Users Table  
CREATE TABLE users (  
    id SERIAL PRIMARY KEY,  
    email VARCHAR(255) UNIQUE NOT NULL,  
    password\_hash VARCHAR(255) NOT NULL,  
    full\_name VARCHAR(100) NOT NULL,  
    role user\_role DEFAULT 'CITIZEN',  
    reputation\_score INT DEFAULT 100,  
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

\-- Departments Table  
CREATE TABLE departments (  
    id SERIAL PRIMARY KEY,  
    name VARCHAR(100) NOT NULL,  
    code VARCHAR(20) UNIQUE NOT NULL,  
    sla\_hours\_default INT DEFAULT 48  
);

\-- Issues Table  
CREATE TABLE issues (  
    id SERIAL PRIMARY KEY,  
    ticket\_id VARCHAR(50) UNIQUE NOT NULL,  
    title VARCHAR(255) NOT NULL,  
    description TEXT,  
    category VARCHAR(50) NOT NULL,  
    status issue\_status DEFAULT 'SUBMITTED',  
    priority issue\_priority DEFAULT 'MEDIUM',  
    reporter\_id INT REFERENCES users(id),  
    department\_id INT REFERENCES departments(id),  
    assigned\_officer\_id INT REFERENCES users(id),  
      
    \-- Geospatial Data (SRID 4326: Standard WGS 84 GPS Coordinates)  
    location GEOMETRY(Point, 4326\) NOT NULL,  
    address\_text TEXT,  
      
    \-- SLA Engine Data  
    sla\_due\_at TIMESTAMP,  
    is\_sla\_breached BOOLEAN DEFAULT FALSE,  
      
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

\-- Media Uploads (Local Path Storage)  
CREATE TABLE issue\_media (  
    id SERIAL PRIMARY KEY,  
    issue\_id INT REFERENCES issues(id) ON DELETE CASCADE,  
    file\_path VARCHAR(500) NOT NULL,  
    media\_type VARCHAR(50) NOT NULL,  
    uploaded\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

\-- Audit Trail / Status History  
CREATE TABLE issue\_status\_history (  
    id SERIAL PRIMARY KEY,  
    issue\_id INT REFERENCES issues(id) ON DELETE CASCADE,  
    previous\_status issue\_status,  
    new\_status issue\_status NOT NULL,  
    changed\_by\_user\_id INT REFERENCES users(id),  
    comments TEXT,  
    created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

\-- Spatial Query Index  
CREATE INDEX idx\_issues\_location ON issues USING GIST(location);

## **4\. Repository Structure**

Plaintext  
smartcivic/  
├── CLAUDE.md                    \# Project guidance file for Claude Code  
├── frontend/                    \# Next.js App  
│   ├── src/  
│   │   ├── app/                 \# Pages (Dashboard, Map, Report, Officer)  
│   │   ├── components/          \# Leaflet map, Issue Forms, UI Components  
│   │   └── lib/                 \# API client, map helpers  
│   ├── public/  
│   └── package.json  
├── backend/                     \# NestJS App  
│   ├── src/  
│   │   ├── auth/                \# JWT Auth & Role Guards  
│   │   ├── issues/              \# Issue CRUD, Geospatial endpoints  
│   │   ├── sla/                 \# NestJS Cron SLA Checker  
│   │   └── uploads/             \# Static file storage directory  
│   ├── package.json  
│   └── .env  
└── ai-service/                  \# Optional Phase 2 Python FastAPI app  
    ├── main.py  
    ├── venv/  
    └── requirements.txt

## **5\. Implementation Roadmap (Milestones)**

Follow these phases sequentially:

### **Phase 1: Environment Setup & Database Initialization**

1. Create backend/ and frontend/ folders.  
2. Initialize NestJS backend with TypeORM/Prisma pointing to local PostgreSQL (smartcivic\_db).  
3. Seed default departments (*Roads & Infrastructure, Sanitation, Water Supply, Public Lighting*) and test users (*Citizen, Municipal Officer, Admin*).

### **Phase 2: Auth & Role-Based Access Control (RBAC)**

1. Implement NestJS JWT authentication (/auth/register, /auth/login).  
2. Add Role Guards for CITIZEN, OFFICER, and ADMIN.

### **Phase 3: Issue Creation & Local Media Uploads**

1. Create POST /issues endpoint in NestJS handling multipart/form-data.  
2. Configure local file storage to save images to backend/uploads/ and expose them via NestJS static serve (ServeStaticModule).  
3. Accept latitude and longitude in the request body and save them as PostGIS GEOMETRY(Point, 4326\).

### **Phase 4: Geospatial API & Map UI**

1. Add GET /issues/nearby?lat=...\&lng=...\&radius=... using PostGIS ST\_DWithin spatial query.  
2. Create Next.js frontend with Leaflet/React-Leaflet map rendering pins for reported issues based on bounding box coordinates.

### **Phase 5: Officer Workflow & Status Tracking**

1. Create Officer Dashboard in Next.js filtering assigned issues by department.  
2. Implement transition endpoints (PATCH /issues/:id/status) enforcing the lifecycle:  
   SUBMITTED \-\> ASSIGNED \-\> IN\_PROGRESS \-\> RESOLVED \-\> VERIFICATION\_PENDING \-\> CLOSED.  
3. Save state transitions to issue\_status\_history.

### **Phase 6: SLA Cron Engine (No Redis)**

1. Implement a NestJS Cron job using @nestjs/schedule running every 10 minutes.  
2. Query issues where sla\_due\_at \< NOW() and is\_sla\_breached \= false.  
3. Automatically flag breached issues and log an escalation event in issue\_status\_history.

### **Phase 7: Citizen Verification & Feedback Loop**

1. When issue status is changed to RESOLVED, require citizen verification.  
2. Citizen can click **"Confirm Fix"** (CLOSED) or **"Reject Fix"** (REOPENED), triggering auto-reassignment to the officer.

## **6\. Development Instructions for Claude Code**

When starting execution, perform the following initialization checks:

1. Ensure no Docker files, Docker Compose configs, Redis clients, or MinIO integrations are generated.  
2. Default database connection string: postgresql://postgres:postgres@localhost:5432/smartcivic\_db.  
3. All file paths must be local filesystem paths relative to backend/uploads.  
4. Keep the setup fully runnable with basic standard terminals (npm run dev for frontend and backend).

