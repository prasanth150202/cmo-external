# External CMO Dashboard — Requirements

> **Purpose:** A production-grade, multi-tenant SaaS version of the internal CMO Dashboard.  
> Other agency owners sign up, connect their own ad accounts, and get the same intelligence we use internally — isolated per tenant.

---

## 1. What This App Is

A **self-serve ad operations platform for digital agencies**.  
Each agency owner logs in, adds their client brands, connects their Meta/Google ad accounts via OAuth, and gets:

- Real-time spend / revenue / ROAS dashboards per brand
- AI-powered budget suggestions (scale up, scale down, emergency stop)
- Campaign and ad-set level performance breakdowns
- Automated data sync from Meta Ads API
- Reports and analytics with date-range filtering

---

## 2. Stack
| Layer | Choice | Why |
|---|---|---|
| **Backend** | FastAPI (Python) | Same as internal — reuse all route/service logic |
| **Database** | PostgreSQL on AWS RDS | Production-grade, scalable, managed backups |
| **DB Admin** | pgAdmin | Local management of the RDS instance |
| **ORM / Migrations** | SQLAlchemy + Alembic | Proper schema versioning, no Supabase client dependency |
| **Auth** | JWT (access + refresh tokens) | Agency owner login, scoped to tenant |
| **OAuth** | Meta OAuth 2.0, Google OAuth 2.0 | Each agency connects their own ad accounts |
| **Background Jobs** | Celery + Redis (AWS ElastiCache) | Async data sync, scheduled pulls |
| **File Storage** | AWS S3 | Logo uploads, report exports |
| **Hosting** | AWS EC2 / ECS | Scalable deployment |
| **Frontend** | Next.js + TypeScript + Tailwind | Same as internal |
| **Cache** | Redis | Rate limit tokens, session cache |

---

## 3. Core Features — Internal vs External Comparison

### 3.1 Authentication & Tenancy
| Feature | Internal App | External App |
|---|---|---|
| Login | None (local only) | **JWT auth — agency owner email + password signup/login** |
| Multi-tenancy | Single agency (you) | **Every record scoped to `tenant_id` — agencies never see each other's data** |
| User roles | None | **Owner, Manager, Viewer per tenant** |
| Ad account OAuth | System user token (your token) | **Each agency connects their own Meta/Google via OAuth 2.0 — tokens stored per tenant** |

### 3.2 Brand Management
| Feature | Internal App | External App |
|---|---|---|
| Create / edit / delete brands | Yes | Yes — scoped to tenant |
| Map ad accounts to brands | Yes (META / GOOGLE / DV360) | Yes — same platforms |
| Auto history pull on account map | Yes (3 years, background) | Yes — same logic, queued via Celery |
| Brand color, target ROAS, budget cap | Yes | Yes + **currency setting per brand** |

### 3.3 Dashboard & Analytics
| Feature | Internal App | External App |
|---|---|---|
| Overview KPIs (spend, revenue, ROAS, conversions) | Yes | Yes — per tenant |
| Daily performance chart | Yes | Yes |
| Channel breakdown (META) | Yes | Yes + **Google channel when connected** |
| Campaign-level breakdown | Yes | Yes |
| Ad-set level breakdown | Partial (ingest exists) | **Full ad-set + ad level table** |
| Brand selector / filter | Yes | Yes |
| Date range picker | Yes | Yes |

### 3.4 Rule Engine (AI Suggestions)
| Feature | Internal App | External App |
|---|---|---|
| META-B01 Scale Up | Yes | Yes — same logic |
| META-B02 Scale Down | Yes | Yes — same logic |
| META-F03 Emergency Stop (funnel collapse) | Yes | Yes — same logic |
| AI narrative per suggestion (Gemini) | Yes | Yes |
| Suggestion history / audit log | No | **Yes — every suggestion logged with timestamp** |
| Apply suggestion (actually change budget via API) | No | **Yes — one-click budget apply with confirmation modal** |

### 3.5 Data Sync / Ingest
| Feature | Internal App | External App |
|---|---|---|
| Manual sync trigger | Yes (`/dashboard/sync`) | Yes |
| Sync history (90 days) | Yes | Yes |
| Sync recent (last 3 days, force re-pull) | Yes | Yes |
| Sync status per account | Yes | Yes |
| Scheduled auto-sync | No | **Yes — nightly Celery beat job per tenant** |
| Chunked pulls (90-day account, 30-day campaign) | Yes | Yes — same chunking logic |
| Retry on rate-limit | Yes (3 retries) | Yes — same |

### 3.6 Reports
| Feature | Internal App | External App |
|---|---|---|
| Report generation | Basic | **PDF/CSV export — downloadable, stored in S3** |
| Scheduled reports | No | **Yes — weekly email report per tenant** |

### 3.7 Webhooks
| Feature | Internal App | External App |
|---|---|---|
| Webhook ingestion | Yes (endpoint exists) | Yes — scoped to tenant's accounts |

### 3.8 Creative & Competitor
| Feature | Internal App | External App |
|---|---|---|
| Creative analysis | Stub | Phase 2 |
| Competitor tracking | Stub | Phase 2 |

---

## 4. New Things in External (Not in Internal)

These are net-new features required for external SaaS:

1. **Tenant Signup / Onboarding Flow** — email verification, agency name, timezone
2. **Meta OAuth Connect Flow** — agency connects their own Meta Business account
3. **Google Ads OAuth Connect Flow** — agency connects Google Ads
4. **Token Vault** — encrypted storage of OAuth tokens per tenant (AWS Secrets Manager or DB encrypted column)
5. **Subscription / Plan Tiers** — Free (1 brand), Pro (5 brands), Agency (unlimited) — Stripe integration
6. **Suggestion Audit Log** — who saw what suggestion, what action was taken
7. **One-Click Budget Apply** — call Meta API to actually update the budget from the dashboard
8. **Nightly Auto-Sync (Celery Beat)** — every tenant's accounts synced on schedule
9. **User Role Management** — Owner can invite team members with Viewer/Manager roles
10. **Report Export (PDF/CSV)** — downloadable reports stored in S3
11. **Multi-currency support** — spend/revenue in the brand's local currency

---

## 5. Database Schema (PostgreSQL — Key Tables)

```sql
-- Tenants (agencies)
tenants (id, name, email, plan, timezone, created_at)

-- Users (agency team members)
users (id, tenant_id, email, password_hash, role, created_at)

-- Brands (per tenant)
brands (id, tenant_id, name, color, industry, target_roas, monthly_budget_cap, currency, logo_url)

-- Ad account connections (per tenant, per platform)
brand_accounts (id, tenant_id, brand_id, platform, account_id, account_name, access_token_ref)

-- OAuth tokens (encrypted, per tenant per platform)
oauth_tokens (id, tenant_id, platform, access_token, refresh_token, expires_at, meta_user_id)

-- Daily account-level metrics
daily_metrics (id, tenant_id, account_id, date, spend, revenue, roas, conversions, impressions, clicks, ctr, atc, checkout, synced_at)

-- Campaign-level daily metrics
campaign_daily_metrics (id, tenant_id, campaign_id, campaign_name, account_id, date, spend, revenue, roas, conversions, impressions, clicks, ctr, atc, checkout)

-- Sync jobs
sync_jobs (id, tenant_id, account_id, status, rows_synced, error, created_at, updated_at)

-- Rule engine suggestion log
suggestion_log (id, tenant_id, brand_id, campaign_id, rule_id, suggestion_json, applied, applied_at, applied_by)

-- Performance metrics (rule engine input)
performance_metrics (id, tenant_id, account_id, campaign_id, ...)
```

---

## 6. API Structure (FastAPI)

```
/auth
  POST /signup
  POST /login
  POST /refresh
  POST /logout

/oauth
  GET  /meta/connect          ← redirects to Meta OAuth
  GET  /meta/callback         ← handles Meta code exchange
  GET  /google/connect        ← redirects to Google OAuth
  GET  /google/callback

/brands          (all scoped to tenant from JWT)
  GET    /
  POST   /
  PUT    /{id}
  DELETE /{id}
  GET    /overview
  POST   /{id}/accounts       ← map ad account
  DELETE /{id}/accounts/{aid}

/dashboard
  GET  /summary
  GET  /live-state
  POST /sync
  POST /sync-history
  POST /sync-recent
  GET  /sync-status
  POST /narrative

/analytics
  GET  /overview
  GET  /by-channel
  GET  /campaigns
  GET  /entities

/reports
  GET  /
  POST /generate
  GET  /{id}/download

/webhooks
  POST /meta

/admin           (owner only)
  GET  /users
  POST /users/invite
  DELETE /users/{id}
```

---

## 7. Priority Order (What to Build First)

### Phase 1 — Local Dev Foundation
1. PostgreSQL schema (Alembic migrations) with `tenant_id` on all tables
2. JWT auth (signup, login, refresh)
3. Brands CRUD (scoped to tenant)
4. Meta OAuth connect + token storage
5. Data ingest (port from internal — replace Supabase client with SQLAlchemy)
6. Dashboard + Analytics endpoints (same logic, scoped to tenant)
7. Rule engine (copy directly from internal)
8. Frontend — auth pages + scoped dashboard

### Phase 2 — Production Features
9. Celery + Redis for background sync
10. One-click budget apply
11. Suggestion audit log
12. Report export (PDF/CSV + S3)
13. User invite / roles
14. Google Ads OAuth + data

### Phase 3 — Scale & Monetize
15. Stripe subscription billing
16. Multi-currency
17. Scheduled email reports
18. Admin panel

---

## 8. Local Dev Setup Plan

```
external/
  backend/
    app/
      api/v1/endpoints/    ← auth, brands, dashboard, analytics, oauth, reports
      core/                ← config, security (JWT), dependencies
      db/                  ← SQLAlchemy engine, session, Base
      models/              ← ORM models (Tenant, User, Brand, etc.)
      schemas/             ← Pydantic schemas
      services/
        rules/             ← copy meta_rules.py + executor.py from internal
        ingest.py          ← port from internal (SQLAlchemy instead of Supabase)
        meta.py            ← port from internal
        ai.py              ← port from internal
    migrations/            ← Alembic migration files
    alembic.ini
    requirements.txt
    .env.example
  frontend/                ← Next.js app (new, with auth pages)
  docker-compose.yml       ← postgres + redis locally
  README.md
```

**Local stack:**
- PostgreSQL via Docker (`docker-compose up`)
- pgAdmin at `localhost:5050`
- FastAPI at `localhost:8000`
- Next.js at `localhost:3000`
- Redis via Docker (for Celery)

---

## 9. What You Need Before Coding

- [ ] Meta App created (for OAuth — client ID + secret)
- [ ] Google Cloud project created (for Google Ads OAuth — optional Phase 2)
- [ ] AWS account ready (RDS, S3, ElastiCache — for deployment, not local dev)
- [ ] Docker Desktop installed (for local Postgres + Redis)
- [ ] `.env` variables ready: `DATABASE_URL`, `JWT_SECRET`, `META_CLIENT_ID`, `META_CLIENT_SECRET`

---

*Last updated: 2026-04-12*
