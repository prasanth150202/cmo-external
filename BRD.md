# Business Requirements Document (BRD)
## External CMO Dashboard — Phase 1
**Product:** Multi-Tenant Ad Operations SaaS  
**Phase:** 1 — Meta Ads + Google Ads, Local Dev  
**Date:** 2026-04-13  
**Author:** Digifyce / Prasanth  
**Status:** Approved for Development

---

## 1. Executive Summary

The External CMO Dashboard is a self-serve SaaS platform for digital agency owners. It allows agencies to sign up independently, connect their own Meta and Google Ads accounts via OAuth, and access the same ad-operations intelligence (spend dashboards, ROAS tracking, AI-powered budget suggestions) that the internal Digifyce CMO Dashboard provides — isolated per agency, production-grade, and ready to scale.

**Phase 1 scope:** Authentication, tenant isolation, Meta OAuth, Google OAuth, data ingest from both platforms, core dashboard + analytics, rule engine with suggestion log, and the frontend for all of the above.

---

## 2. Business Objectives

| # | Objective | Success Metric |
|---|-----------|---------------|
| B1 | Enable any agency owner to self-onboard without manual setup | Signup → first data sync in < 10 minutes |
| B2 | Provide real-time ROAS and spend visibility across Meta and Google | Dashboard loads within 2 seconds for 90-day history |
| B3 | Surface actionable AI budget suggestions for every connected brand | Rule engine returns suggestions within 3 seconds |
| B4 | Ensure zero data leakage between tenants | All queries are `WHERE tenant_id = <jwt_tenant>` — no exceptions |
| B5 | Ship Phase 1 on local dev first; deploy to AWS in Phase 2 | Working local stack with Docker, all endpoints tested |

---

## 3. Stakeholders

| Role | Name / Group | Interest |
|------|-------------|---------|
| Product Owner | Prasanth (Digifyce) | Overall product vision and scope |
| Primary Users | Agency owners / CMOs | Self-serve ad ops for their clients |
| Secondary Users | Agency managers / viewers | Read-only or limited-edit access |
| Ad Platforms | Meta, Google | OAuth + API providers |

---

## 4. Scope

### 4.1 In Scope — Phase 1

1. **Authentication System** — email/password signup and login, JWT access + refresh tokens, logout
2. **Tenant Model** — every agency is a tenant; all data is isolated by `tenant_id`
3. **Meta Ads OAuth** — agency connects their own Meta Business ad account
4. **Google Ads OAuth** — agency connects their own Google Ads account
5. **Brand Management** — create, edit, delete brands; map Meta/Google ad accounts per brand
6. **Data Ingest** — pull daily metrics + campaign metrics from Meta and Google APIs
7. **Dashboard** — KPI summary (spend, revenue, ROAS, conversions), date range filter, brand filter
8. **Analytics** — daily chart, channel breakdown (Meta vs Google), campaign-level table
9. **Rule Engine** — META-B01 scale up, META-B02 scale down, META-F03 emergency stop + AI narrative (Gemini)
10. **Suggestion Log** — every rule suggestion stored with timestamp; applied status tracked
11. **Frontend** — login/signup pages, scoped dashboard, settings page with OAuth connect buttons
12. **Local Dev Stack** — Docker Compose (Postgres + Redis + pgAdmin), FastAPI, Next.js

### 4.2 Out of Scope — Phase 1 (Deferred to Phase 2+)

- Celery background jobs / nightly auto-sync (manual sync only in Phase 1)
- One-click budget apply (suggestions shown only; no write-back to Meta/Google API)
- Report PDF/CSV export + S3 storage
- User invitation / team roles (owner role only in Phase 1)
- Stripe subscription billing
- Multi-currency conversion
- AWS deployment (RDS, ECS, ElastiCache)
- Creative analysis, Competitor tracking
- DV360 integration

---

## 5. User Stories

### 5.1 Authentication

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| US-01 | Agency owner | Sign up with my email, agency name, and password | I get my own isolated account on the platform | Account created; JWT returned; tenant row created; duplicate email rejected with 409 |
| US-02 | Agency owner | Log in with email + password | I can access my dashboard | Valid credentials → access token + refresh token; invalid → 401 |
| US-03 | Agency owner | Stay logged in across browser refreshes | I don't have to re-authenticate frequently | Refresh token rotates silently; new access token returned |
| US-04 | Agency owner | Log out | My session is invalidated | Refresh token blacklisted; frontend clears tokens |

### 5.2 Meta Ads Connection

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| US-05 | Agency owner | Click "Connect Meta Account" and be redirected to Meta | I can authorize access to my clients' ad accounts | OAuth redirect includes correct scopes: `ads_read`, `ads_management`, `business_management` |
| US-06 | Agency owner | Complete Meta OAuth and return to settings | My token is stored and I see "Meta: Connected" | Long-lived token (60-day) stored encrypted; settings page shows platform as connected |
| US-07 | Agency owner | See my Meta ad accounts listed | I can assign them to brands | API returns all ad accounts accessible to the authorized Meta user |
| US-08 | Agency owner | Disconnect Meta | Remove access if I switch accounts | `oauth_tokens` row deleted; brand_accounts for META unmapped |

### 5.3 Google Ads Connection

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| US-09 | Agency owner | Click "Connect Google Ads" and be redirected to Google | I can authorize access to my Google Ads accounts | OAuth redirect requests `https://www.googleapis.com/auth/adwords` scope |
| US-10 | Agency owner | Complete Google OAuth and return to settings | My tokens are stored | `access_token` + `refresh_token` both stored encrypted; auto-refresh handled on API calls |
| US-11 | Agency owner | See my Google Ads accounts listed | I can assign them to brands | API returns accessible Google Ads customer accounts |
| US-12 | Agency owner | Disconnect Google | Remove access | Token deleted; Google brand_accounts unmapped |

### 5.4 Brand Management

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| US-13 | Agency owner | Create a brand with name, color, industry, target ROAS, budget cap | I can organize my client brands | Brand created scoped to my tenant; not visible to other tenants |
| US-14 | Agency owner | Map a Meta or Google ad account to a brand | Data from that account is attributed to the brand | `brand_accounts` row created; triggers first data sync for the account |
| US-15 | Agency owner | Unmap an ad account from a brand | Stop pulling data for that account | `brand_accounts` row deleted; existing metrics retained |
| US-16 | Agency owner | See an overview of all brands with KPIs | I have a quick summary across clients | `/brands/overview` returns spend, revenue, ROAS per brand for last 7 days |

### 5.5 Data Ingest

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| US-17 | Agency owner | Trigger a manual data sync from the dashboard | My metrics are up to date | `POST /dashboard/sync` creates sync_job rows; fetches from Meta and/or Google APIs; upserts `daily_metrics` and `campaign_daily_metrics` |
| US-18 | Agency owner | See sync status and last sync time | I know if my data is fresh | `GET /dashboard/sync-status` returns per-account status: pending/running/completed/failed |
| US-19 | Agency owner | Have 90 days of historical data pulled on first account connection | I have meaningful trend data from day one | First sync fetches 90 days account-level + 30 days campaign-level in chunks |
| US-20 | System | Retry failed syncs automatically | Transient rate-limit errors don't lose data | 3 retries with exponential backoff per account per sync |

### 5.6 Dashboard & Analytics

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| US-21 | Agency owner | See KPIs (total spend, revenue, ROAS, conversions) for a selected date range and brand | I can monitor performance at a glance | `/dashboard/summary` returns aggregated values for the filter; date range defaults to last 7 days |
| US-22 | Agency owner | Filter dashboard by brand or "All Brands" | I can drill into a single client | Brand selector in UI updates all KPI cards and charts |
| US-23 | Agency owner | See a daily spend/revenue/ROAS line chart | I can spot trends | `/analytics/overview` returns day-by-day rows for the selected range |
| US-24 | Agency owner | See Meta vs Google channel breakdown | I know which platform is performing | `/analytics/by-channel` returns totals per platform for the selected range |
| US-25 | Agency owner | See a campaign-level table with spend, ROAS, conversions | I can identify top and bottom performers | `/analytics/campaigns` returns all campaigns for the tenant + filters, sortable |

### 5.7 Rule Engine (AI Engine)

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|------------|---------------------|
| US-26 | Agency owner | See AI-generated budget suggestions based on my campaign performance | I can take data-driven action | `/dashboard/live-state` evaluates META-B01, META-B02, META-F03 and returns triggered suggestions |
| US-27 | Agency owner | See a Gemini-generated narrative explaining each suggestion | I understand why the AI is recommending it | Each suggestion includes a `narrative` field generated via Gemini API |
| US-28 | Agency owner | See all past suggestions and whether they were applied | I have an audit trail | `suggestion_log` table stores every suggestion; `/dashboard/live-state` response includes `suggestion_id` for future apply action |

---

## 6. Functional Requirements

### 6.1 Authentication

| ID | Requirement |
|----|-------------|
| FR-01 | System must hash passwords using bcrypt before storage |
| FR-02 | JWT access token must expire after 60 minutes |
| FR-03 | Refresh tokens must be stored (hashed) server-side to support invalidation |
| FR-04 | All protected endpoints must return 401 if no valid JWT is provided |
| FR-05 | Signup must create exactly one tenant and one owner user atomically |

### 6.2 Tenant Isolation

| ID | Requirement |
|----|-------------|
| FR-06 | Every table except `tenants` and `users` must have a `tenant_id` column |
| FR-07 | Every service function that reads/writes data must accept `tenant_id` as a required parameter |
| FR-08 | No endpoint may return data belonging to a different tenant under any condition |
| FR-09 | `tenant_id` must always be derived from the validated JWT — never from a query parameter or request body |

### 6.3 OAuth

| ID | Requirement |
|----|-------------|
| FR-10 | Meta OAuth must use a `state` parameter (random UUID) to prevent CSRF; verified on callback |
| FR-11 | Meta access tokens must be exchanged for long-lived tokens (60-day) before storage |
| FR-12 | All OAuth tokens must be AES-256 (Fernet) encrypted before writing to DB |
| FR-13 | Google OAuth must request `offline` access to obtain a refresh token |
| FR-14 | Google access token must be transparently refreshed using the refresh token when expired |
| FR-15 | Disconnecting a platform must delete the token and all brand_accounts for that platform |

### 6.4 Data Ingest

| ID | Requirement |
|----|-------------|
| FR-16 | Ingest must support both META and GOOGLE platforms via a unified dispatcher |
| FR-17 | Account-level pulls must use 90-day chunks; campaign-level must use 30-day chunks |
| FR-18 | All upserts must use `ON CONFLICT DO UPDATE` to avoid duplicate rows |
| FR-19 | Every sync run must create a `sync_jobs` record with status transitions: pending → running → completed/failed |
| FR-20 | Rate-limit errors (HTTP 429 / Meta error code 17) must trigger exponential retry, max 3 attempts |

### 6.5 Rule Engine

| ID | Requirement |
|----|-------------|
| FR-21 | Rule evaluation must use the last 7 days of metrics for the selected brand/tenant |
| FR-22 | Every triggered suggestion must be written to `suggestion_log` before being returned |
| FR-23 | Gemini narrative generation failures must not block suggestion delivery — fallback to rule description |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Dashboard summary endpoint responds in < 2 seconds for 90-day data with up to 10 brands |
| **Security** | No plaintext secrets in code or logs; all OAuth tokens encrypted at rest |
| **Scalability** | Schema design supports 1,000+ tenants without schema changes |
| **Reliability** | Ingest retries on failure; sync_jobs table provides full audit of ingest history |
| **Maintainability** | Alembic manages all schema changes; no manual SQL in production |
| **Developer Experience** | Full local stack via `docker-compose up`; single `.env.example` for all config |

---

## 8. Phase 1 Build Order

The following order minimizes blocked work — each item unlocks the next.

```
Step 1  ── docker-compose.yml (Postgres + Redis + pgAdmin)
Step 2  ── Alembic migrations (all Phase 1 tables)
Step 3  ── SQLAlchemy models + pydantic schemas
Step 4  ── JWT auth endpoints (signup, login, refresh, logout)
Step 5  ── Core dependencies: get_current_tenant(), get_db()
Step 6  ── Brands CRUD endpoints (scoped to tenant)
Step 7  ── Meta OAuth endpoints (connect + callback + token vault)
Step 8  ── Google OAuth endpoints (connect + callback + token vault)
Step 9  ── meta.py service (port from internal, use oauth_tokens)
Step 10 ── google.py service (new — Google Ads API)
Step 11 ── ingest.py dispatcher + sync_jobs tracking
Step 12 ── Dashboard summary + sync endpoints
Step 13 ── Analytics endpoints (overview, by-channel, campaigns)
Step 14 ── Rule engine (port from internal, add suggestion_log writes)
Step 15 ── Frontend: login/signup pages + auth guard
Step 16 ── Frontend: settings page (OAuth connect buttons)
Step 17 ── Frontend: dashboard, analytics, brands pages (scoped)
Step 18 ── Frontend: AI engine page (suggestions display)
Step 19 ── End-to-end test: signup → connect Meta → connect Google → sync → view dashboard → see suggestions
```

---

## 9. Assumptions & Constraints

| # | Assumption / Constraint |
|---|------------------------|
| A1 | Phase 1 runs entirely on local developer machine (no AWS in Phase 1) |
| A2 | Meta app is in Development Mode — only the developer and test users can authenticate |
| A3 | Google Ads developer token is "Basic" access (sufficient for test accounts) |
| A4 | No background jobs in Phase 1 — all syncs are manual (triggered via UI button) |
| A5 | Only "owner" role is implemented in Phase 1 — team invite is Phase 2 |
| A6 | Reports (PDF/CSV) are Phase 2 — endpoint exists but returns placeholder |
| A7 | Stripe billing is Phase 3 — plan field exists in DB but no enforcement in Phase 1 |

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Meta App Review delay (Phase 2+) | Medium | High | Phase 1 dev mode is exempt; submit review early |
| Google Ads developer token approval | Low | Medium | Basic token approved quickly; standard token needed for production |
| OAuth token expiry during long dev sessions | Low | Low | Token vault handles refresh transparently |
| Tenant isolation bug (data leak) | Low | Critical | Unit test every service with two different tenant IDs |
| SQLAlchemy N+1 queries on brands overview | Medium | Medium | Eager-load metrics in single aggregated query |

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| Tenant | One agency (one signup) — all their data is isolated under a `tenant_id` |
| Brand | A client account managed by the agency — can have Meta and/or Google ad accounts mapped to it |
| Ad Account | A Meta Business ad account or Google Ads customer account |
| OAuth Token | An access credential granted by Meta or Google on behalf of the agency owner |
| Token Vault | The encrypted storage layer for OAuth tokens (Fernet AES-256 in Phase 1) |
| Rule Engine | The automated logic that evaluates campaign metrics and generates budget suggestions |
| Suggestion Log | Append-only record of every rule suggestion, including whether it was applied |
| Ingest | The process of pulling metrics from Meta/Google APIs and writing them to the DB |
| Sync Job | A tracked record of one ingest run for one ad account |

---

*Last updated: 2026-04-13*
