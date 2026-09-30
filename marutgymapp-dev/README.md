# White-Label Gym Management SaaS Platform (Fitness Business Operating System)

Production-ready, multi-tenant, white-label Gym/Fitness Management SaaS platform decoupled into 3 separate top-level directories:

1. **`/database`**: Database schema (`prisma/schema.prisma`), SQLite/PostgreSQL configuration, database migrations, and initial seed script (`seed.ts`).
2. **`/backend`**: Express Node.js REST API Server (TypeScript, JWT Auth middleware, Tenant Context Isolation guard, RBAC permission system, Dynamic Custom Fields Engine, Biometric Adapter Framework, WhatsApp Cloud API Adapter, Audit Logger, Report Generators).
3. **`/frontend`**: Modern Next.js App Router UI (React, TypeScript, Tailwind CSS, Lucide Icons, dynamic white-label ThemeProvider, UI pages and client API services).

---

## 🚀 Quick Start Guide

### 1. Database Setup (`/database`)
```bash
cd database
npm install
npm run db:push
npm run db:seed
```

### 2. Backend API Server (`/backend`)
```bash
cd backend
npm install
npm run dev
# Starts REST API server on http://localhost:5000
```

### 3. Frontend Application (`/frontend`)
```bash
cd frontend
npm install
npm run dev
# Starts Next.js application on http://localhost:3000
```

---

## 🔑 Pre-Configured Seed Logins

### Initial Tenant: **Cross Road Fitness**
- **Gym Owner Login**: `owner@crossroadfitness.com`
- **Password**: `crossroad123`

### SaaS Platform Super Admin
- **Super Admin Login**: `admin@saas.com`
- **Password**: `admin123`

---

## 🏢 Key Features Built

- **Multi-Tenant Data Isolation**: Database-enforced tenant isolation (`tenant_id` on all tables & queries).
- **Dynamic White-Labeling Engine**: Dynamic primary/secondary CSS theme injection per tenant, custom logo, favicon, contact details, login text, and footer branding.
- **Dynamic Custom Fields Engine**: Add/edit custom business attributes for Members, Staff, Leads, Memberships, Payments without code modifications.
- **Core SaaS Modules**: Member Management, Memberships & Renewals, Live Attendance (Manual + QR Scanner + Biometric API), Finance & Receipts, CRM Lead Pipeline, Staff & Workout Plans, Dynamic Reports Generator.
- **Integration Frameworks**: Generic adapter interfaces for Biometric Readers (eSSL, ZKTeco, Anviz) and WhatsApp Business Cloud API.
- **Licensing & Feature Entitlements**: Feature gating engine for plan capabilities (`CORE_GYM_MANAGEMENT`, `WHATSAPP`, `BIOMETRIC_API`, `BIOMETRIC_DATABASE`, `CAMERA_ATTENDANCE`, `AI_VOICE`).
- **Audit Logging**: Tracks sensitive administrative actions.

---

### `/members` performance changes

The members list endpoint was optimized without changing the member detail/edit workflows:

- The list query no longer loads every custom-field value for every member.
- The list query loads only the latest membership required by the members table.
- Full membership/payment/custom-field history remains available through `GET /api/v1/members/:id`.
- Member-list cache TTL is reduced to 30 seconds and capped at 128 entries to avoid unbounded process memory growth.
- Search requests cancel the previous in-flight request when the user types again.
- Transient gateway retries were reduced from long 1.5-second increments to 750ms and GET retries are limited for the members screen.
- A composite membership index was added for the list/detail access pattern.


Do not expose PostgreSQL publicly. Keep the backend restricted to the API reverse proxy/security group.
