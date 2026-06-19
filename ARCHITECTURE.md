# External CMO Dashboard — System Architecture
> Phase 1: Meta Ads + Google Ads · Multi-tenant SaaS · April 2026

---

## 1. High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENCY OWNER (Browser)                       │
│                     Next.js Frontend  :3000                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / REST JSON
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend  :8000                            │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  /auth   │  │  /oauth  │  │ /brands  │  │ /dashboard       │   │
│  │ signup   │  │  meta    │  │ CRUD     │  │ /analytics       │   │
│  │ login    │  │  google  │  │ accounts │  │ /reports         │   │
│  │ refresh  │  │ callback │  │ overview │  │ /sync            │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                     SERVICES LAYER                         │    │
│  │  meta.py · google.py · ingest.py · rules/ · ai.py         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────┐    ┌────────────────────────────────┐     │
│  │  SQLAlchemy ORM     │    │  OAuth Token Vault             │     │
│  │  + Alembic          │    │  (encrypted column / Secrets)  │     │
│  └──────────┬──────────┘    └────────────────────────────────┘     │
└─────────────┼───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────┐      ┌──────────────────────────────┐
│  PostgreSQL (Docker /   │      │  Meta Marketing API          │
│  AWS RDS in prod)       │      │  graph.facebook.com/v20.0    │
│                         │      ├──────────────────────────────┤
│  • tenants              │      │  Google Ads API              │
│  • users                │      │  googleads.googleapis.com    │
│  • brands               │      └──────────────────────────────┘
│  • brand_accounts       │
│  • oauth_tokens         │      ┌──────────────────────────────┐
│  • daily_metrics        │      │  Gemini AI (rule narratives) │
│  • campaign_metrics     │      │  generativelanguage API      │
│  • sync_jobs            │      └──────────────────────────────┘
│  • suggestion_log       │
└─────────────────────────┘
```

---

## 2. Authentication & Tenancy Architecture

```
AGENCY OWNER                  BACKEND                        DATABASE
     │                            │                               │
     │  POST /auth/signup         │                               │
     │ ─────────────────────────► │  hash password (bcrypt)       │
     │                            │  INSERT tenant + user ──────► │
     │  {access_token, refresh}   │                               │
     │ ◄───────────────────────── │                               │
     │                            │                               │
     │  Every request:            │                               │
     │  Authorization: Bearer JWT │                               │
     │ ─────────────────────────► │  decode JWT → tenant_id       │
     │                            │  ALL queries WHERE            │
     │                            │  tenant_id = <from_jwt>       │
     │                            │  ─────────────────────────►   │
```

**JWT Payload:**
```json
{
  "sub": "user_id",
  "tenant_id": "uuid",
  "role": "owner | manager | viewer",
  "exp": 1234567890
}
```

**Tenant Isolation Rule:** Every DB table has `tenant_id UUID NOT NULL`. Every query in every service function accepts `tenant_id` as a required parameter — never derived from a global or inferred from request state alone.

---

## 3. Meta OAuth Flow

```
AGENCY                 BACKEND                   META
  │                       │                        │
  │  GET /oauth/meta/     │                        │
  │  connect              │                        │
  │ ───────────────────► │                        │
  │                       │  build redirect URL    │
  │  302 → Meta OAuth     │  scope: ads_read,      │
  │  consent screen       │  ads_management,       │
  │ ◄─────────────────── │  business_management   │
  │                       │                        │
  │  [user approves on Meta]                       │
  │                       │  ?code=AUTH_CODE ────► │
  │                       │  ◄──────────────────── │
  │                       │  exchange code         │
  │                       │  for short-lived token │
  │                       │  exchange for 60-day   │
  │                       │  long-lived token      │
  │                       │  encrypt + store in    │
  │                       │  oauth_tokens table    │
  │  redirect → /settings │                        │
  │  ?meta=connected      │                        │
  │ ◄─────────────────── │                        │
```

**Token Storage:**
```sql
oauth_tokens (
  id          UUID PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  platform    VARCHAR(20),          -- 'META' | 'GOOGLE'
  access_token TEXT NOT NULL,       -- AES-256 encrypted at rest
  refresh_token TEXT,               -- Google only
  expires_at  TIMESTAMPTZ,
  platform_user_id VARCHAR(100),    -- Meta user ID / Google customer ID
  scopes      TEXT[],
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
)
```

---

## 4. Google Ads OAuth Flow

```
AGENCY                 BACKEND                   GOOGLE
  │                       │                        │
  │  GET /oauth/google/   │                        │
  │  connect              │                        │
  │ ───────────────────► │                        │
  │                       │  build Google OAuth    │
  │  302 → Google consent │  URL with:             │
  │ ◄─────────────────── │  scope: adwords         │
  │                       │  access_type=offline   │
  │  [user approves]      │  prompt=consent        │
  │                       │  ?code=AUTH_CODE ────► │
  │                       │  ◄──────────────────── │
  │                       │  exchange for:         │
  │                       │  access_token (1hr)    │
  │                       │  refresh_token (∞)     │
  │                       │  store both encrypted  │
  │  redirect → /settings │                        │
  │  ?google=connected    │                        │
  │ ◄─────────────────── │                        │
```

**Google Ads API Library:** `google-ads` Python SDK  
**Key difference from Meta:** Google tokens refresh automatically via `refresh_token` — no 60-day re-auth needed.

---

## 5. Data Ingest Architecture

```
TRIGGER (manual sync or nightly Celery beat)
           │
           ▼
    ingest.py::sync_account(tenant_id, account_id, platform)
           │
    ┌──────┴───────┐
    │              │
    ▼              ▼
 META path    GOOGLE path
    │              │
 meta.py       google.py
 fetch_        fetch_
 insights()    report()
    │              │
    └──────┬───────┘
           ▼
   upsert → daily_metrics
   upsert → campaign_daily_metrics
   upsert → adset_daily_metrics  (if applicable)
           │
           ▼
   sync_jobs (status=completed, rows_synced=N)
```

**Chunking Strategy (same as internal):**
- Account-level: 90-day windows
- Campaign-level: 30-day windows
- Retry on rate-limit: 3 attempts with exponential backoff

---

## 6. Rule Engine Architecture (AI Engine)

```
GET /dashboard/live-state
        │
        ▼
  load last 7 days from daily_metrics + campaign_daily_metrics
  (scoped to tenant_id + brand filter)
        │
        ▼
  rule_executor.py::evaluate_all(metrics, tenant_id)
        │
    ┌───┴────────────────────────┐
    │ META-B01: Scale Up         │  spend ≥ 80% of budget_cap
    │ META-B02: Scale Down       │  + ROAS ≥ target_roas
    │ META-F03: Emergency Stop   │  ROAS collapse / spend spike
    └────────────────────────────┘
        │
        ▼
  for each triggered rule:
    ai.py::generate_narrative(rule, metrics)  →  Gemini
        │
        ▼
  suggestion_log INSERT (tenant_id, rule, suggestion_json)
        │
        ▼
  return suggestions[] to frontend
```

---

## 7. Folder Structure

```
external/
├── docker-compose.yml           ← postgres + redis
├── ARCHITECTURE.md              ← this file
├── BRD.md
├── API_SETUP.md
├── REQUIREMENTS.md
│
├── backend/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── migrations/              ← Alembic versions
│   │   ├── 001_tenants_users.sql
│   │   ├── 002_brands.sql
│   │   ├── 003_oauth_tokens.sql
│   │   ├── 004_metrics.sql
│   │   └── 005_sync_suggestion_log.sql
│   │
│   └── app/
│       ├── main.py              ← FastAPI app factory
│       │
│       ├── core/
│       │   ├── config.py        ← env vars (pydantic Settings)
│       │   ├── security.py      ← JWT encode/decode, bcrypt
│       │   └── deps.py          ← get_current_tenant(), get_db()
│       │
│       ├── db/
│       │   ├── engine.py        ← SQLAlchemy engine + session
│       │   └── base.py          ← Base declarative
│       │
│       ├── models/              ← SQLAlchemy ORM models
│       │   ├── tenant.py
│       │   ├── user.py
│       │   ├── brand.py
│       │   ├── brand_account.py
│       │   ├── oauth_token.py
│       │   ├── daily_metric.py
│       │   ├── campaign_metric.py
│       │   ├── sync_job.py
│       │   └── suggestion_log.py
│       │
│       ├── schemas/             ← Pydantic request/response models
│       │   ├── auth.py
│       │   ├── brand.py
│       │   ├── analytics.py
│       │   ├── dashboard.py
│       │   └── oauth.py
│       │
│       ├── api/
│       │   └── v1/
│       │       ├── router.py    ← include all sub-routers
│       │       └── endpoints/
│       │           ├── auth.py          ← signup, login, refresh, logout
│       │           ├── oauth_meta.py    ← /oauth/meta/connect + callback
│       │           ├── oauth_google.py  ← /oauth/google/connect + callback
│       │           ├── brands.py        ← CRUD + account mapping
│       │           ├── dashboard.py     ← summary, sync, live-state
│       │           ├── analytics.py     ← overview, campaigns, entities
│       │           └── reports.py       ← generate, download
│       │
│       └── services/
│           ├── meta.py          ← Meta Ads API calls (ported + adapted)
│           ├── google.py        ← Google Ads API calls (new)
│           ├── ingest.py        ← unified ingest dispatcher
│           ├── token_vault.py   ← encrypt/decrypt OAuth tokens
│           ├── ai.py            ← Gemini narrative generation
│           └── rules/
│               ├── executor.py  ← evaluate_all()
│               ├── meta_b01.py  ← scale up
│               ├── meta_b02.py  ← scale down
│               └── meta_f03.py  ← emergency stop
│
└── frontend/
    ├── package.json
    └── src/
        ├── app/
        │   ├── (auth)/
        │   │   ├── login/page.tsx
        │   │   └── signup/page.tsx
        │   ├── (dashboard)/
        │   │   ├── layout.tsx       ← auth guard + tenant context
        │   │   ├── page.tsx         ← overview
        │   │   ├── brands/page.tsx
        │   │   ├── analytics/page.tsx
        │   │   ├── ai-engine/page.tsx
        │   │   ├── reports/page.tsx
        │   │   └── settings/page.tsx ← OAuth connect buttons
        │   └── api/                 ← Next.js route handlers (optional)
        ├── components/
        │   ├── auth/
        │   ├── brands/
        │   ├── dashboard/
        │   └── shared/
        └── lib/
            ├── api.ts               ← axios instance with JWT header
            ├── auth.ts              ← token storage + refresh logic
            └── types.ts
```

---

## 8. Database Schema (Phase 1 — All Tables)

```sql
-- Core tenancy
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  plan        VARCHAR(20) DEFAULT 'free',   -- free | pro | agency
  timezone    VARCHAR(50) DEFAULT 'UTC',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users (agency team members)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) DEFAULT 'owner',  -- owner | manager | viewer
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Brands (per tenant)
CREATE TABLE brands (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  color             VARCHAR(7),
  industry          VARCHAR(100),
  target_roas       NUMERIC(10,2),
  monthly_budget_cap NUMERIC(15,2),
  currency          VARCHAR(3) DEFAULT 'INR',
  logo_url          TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Ad account connections
CREATE TABLE brand_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  brand_id     UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform     VARCHAR(20) NOT NULL,    -- META | GOOGLE
  account_id   VARCHAR(100) NOT NULL,
  account_name VARCHAR(200),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, platform, account_id)
);

-- OAuth tokens (encrypted)
CREATE TABLE oauth_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform         VARCHAR(20) NOT NULL,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT,
  expires_at       TIMESTAMPTZ,
  platform_user_id VARCHAR(100),
  scopes           TEXT[],
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, platform)
);

-- Account-level daily metrics
CREATE TABLE daily_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  account_id   VARCHAR(100) NOT NULL,
  platform     VARCHAR(20) NOT NULL,
  date         DATE NOT NULL,
  spend        NUMERIC(15,2),
  revenue      NUMERIC(15,2),
  roas         NUMERIC(10,4),
  conversions  INTEGER,
  impressions  BIGINT,
  clicks       INTEGER,
  ctr          NUMERIC(8,4),
  synced_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, account_id, platform, date)
);

-- Campaign-level daily metrics
CREATE TABLE campaign_daily_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  account_id    VARCHAR(100) NOT NULL,
  campaign_id   VARCHAR(100) NOT NULL,
  campaign_name VARCHAR(500),
  platform      VARCHAR(20) NOT NULL,
  date          DATE NOT NULL,
  spend         NUMERIC(15,2),
  revenue       NUMERIC(15,2),
  roas          NUMERIC(10,4),
  conversions   INTEGER,
  impressions   BIGINT,
  clicks        INTEGER,
  ctr           NUMERIC(8,4),
  UNIQUE (tenant_id, campaign_id, platform, date)
);

-- Sync jobs
CREATE TABLE sync_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  account_id  VARCHAR(100) NOT NULL,
  platform    VARCHAR(20) NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending',  -- pending | running | completed | failed
  rows_synced INTEGER DEFAULT 0,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Rule engine suggestion log
CREATE TABLE suggestion_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  brand_id        UUID REFERENCES brands(id),
  campaign_id     VARCHAR(100),
  rule_id         VARCHAR(20) NOT NULL,
  suggestion_json JSONB NOT NULL,
  applied         BOOLEAN DEFAULT FALSE,
  applied_at      TIMESTAMPTZ,
  applied_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. API Route Map (Phase 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | Public | Create tenant + owner user |
| POST | `/auth/login` | Public | Email + password → JWT pair |
| POST | `/auth/refresh` | Refresh token | New access token |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| GET | `/oauth/meta/connect` | JWT | Redirect to Meta OAuth |
| GET | `/oauth/meta/callback` | Public | Code exchange, store token |
| GET | `/oauth/google/connect` | JWT | Redirect to Google OAuth |
| GET | `/oauth/google/callback` | Public | Code exchange, store token |
| GET | `/brands/` | JWT | List brands (tenant scoped) |
| POST | `/brands/` | JWT | Create brand |
| PUT | `/brands/{id}` | JWT | Update brand |
| DELETE | `/brands/{id}` | JWT | Delete brand |
| GET | `/brands/overview` | JWT | All brands with KPI summary |
| POST | `/brands/{id}/accounts` | JWT | Map ad account to brand |
| DELETE | `/brands/{id}/accounts/{aid}` | JWT | Unmap ad account |
| GET | `/dashboard/summary` | JWT | KPIs for date range + brand |
| GET | `/dashboard/live-state` | JWT | Rule engine suggestions |
| POST | `/dashboard/sync` | JWT | Trigger manual data sync |
| GET | `/dashboard/sync-status` | JWT | Status of sync jobs |
| GET | `/analytics/overview` | JWT | Daily chart data |
| GET | `/analytics/by-channel` | JWT | META vs GOOGLE breakdown |
| GET | `/analytics/campaigns` | JWT | Campaign-level table |
| POST | `/reports/generate` | JWT | Generate PDF/CSV |
| GET | `/reports/{id}/download` | JWT | Download from S3 |

---

## 10. Environment Variables (.env.example)

```env
# App
APP_ENV=development
APP_PORT=8000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cmo_external

# JWT
JWT_SECRET=<64-char random string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Token encryption (for OAuth token vault)
ENCRYPTION_KEY=<32-byte Fernet key — generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# Meta OAuth
META_CLIENT_ID=
META_CLIENT_SECRET=
META_REDIRECT_URI=http://localhost:8000/api/v1/oauth/meta/callback

# Google OAuth + Ads
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google/callback
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_LOGIN_CUSTOMER_ID=   # MCC account ID if applicable

# Gemini AI
GEMINI_API_KEY=

# Redis (Phase 2 Celery — configure but not required for Phase 1)
REDIS_URL=redis://localhost:6379/0

# AWS (production only)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=ap-south-1
```

---

## 11. Local Dev Stack (docker-compose.yml)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: cmo_external
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@cmo.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

---

## 12. Security Decisions

| Concern | Solution |
|---------|----------|
| Tenant data isolation | `tenant_id` on every table, mandatory filter in every service |
| Password storage | bcrypt (passlib) |
| JWT signing | HS256, secret in env, 60-min access + 30-day refresh |
| OAuth token storage | AES-256 (Fernet) encrypted before DB write |
| SQL injection | SQLAlchemy ORM parameterized queries throughout |
| CORS | FastAPI CORS middleware, restrict to frontend origin in prod |
| Rate limiting | SlowAPI on auth endpoints (signup, login) |
| HTTPS | Nginx TLS termination in prod (not needed locally) |

---

*Last updated: 2026-04-13*
