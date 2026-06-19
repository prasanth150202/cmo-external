# Google Ads API — Tool Design Document
**Company:** Digifyce  
**Product:** CMO Dashboard — Multi-Tenant Ad Operations SaaS  
**Contact Email:** digifycecbe@gmail.com  
**Date:** May 2026  
**Version:** 1.0

---

## 1. Company & Product Overview

**Digifyce** is a digital marketing agency that manages paid advertising for multiple client brands across Meta Ads and Google Ads platforms. We operate in the D2C (direct-to-consumer) and e-commerce space, running Search, Performance Max, Display, and Shopping campaigns for our clients.

We are building the **CMO Dashboard** — a proprietary ad operations SaaS platform designed for digital agency owners. The tool enables agency owners to:

- Connect their own Google Ads accounts via OAuth 2.0
- Pull historical and current campaign performance data
- Monitor spend, ROAS, conversions, impressions, and clicks per brand
- Receive AI-generated budget optimization suggestions based on live performance data
- Manage multiple client brands under one unified dashboard

The platform serves **two categories of users:**
1. **Digifyce (internal)** — our own team using it to manage client campaigns
2. **External agency owners** — other independent agencies who sign up to the SaaS platform and connect their own Google Ads accounts

---

## 2. Tool Architecture

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────┐
│                  AGENCY OWNER (Browser)                  │
│               Next.js Frontend  :3000                    │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS / REST JSON
                      ▼
┌─────────────────────────────────────────────────────────┐
│               FastAPI Backend  :8000                     │
│                                                         │
│   /oauth/google/connect   ← initiates OAuth             │
│   /oauth/google/callback  ← exchanges code for tokens   │
│   /dashboard/sync         ← triggers data pull          │
│   /analytics/campaigns    ← returns performance data    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              SERVICES LAYER                     │   │
│   │  google.py  ·  ingest.py  ·  token_vault.py    │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────┐   ┌──────────────────────┐
│  PostgreSQL Database        │   │  Google Ads API       │
│  (tenant-isolated storage)  │   │  googleads.googleapis │
│  · oauth_tokens (encrypted) │   │  .com/v17            │
│  · daily_metrics            │   └──────────────────────┘
│  · campaign_daily_metrics   │
└─────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 + FastAPI |
| Google Ads SDK | `google-ads` Python SDK (v23+) |
| Database | PostgreSQL 16 |
| Token Security | Fernet AES-256 encryption (cryptography library) |
| Auth | JWT (access + refresh tokens, HS256) |
| Frontend | Next.js 14 + TypeScript |

---

## 3. Google Ads OAuth 2.0 Flow

Each agency owner independently authorizes the tool to access their own Google Ads account. We never use a shared or system-level Google Ads token.

### 3.1 Authorization Flow

```
Step 1: Agency owner clicks "Connect Google Ads" in the dashboard settings page.

Step 2: Backend generates an OAuth 2.0 authorization URL:
  · client_id      = GOOGLE_CLIENT_ID (from Google Cloud Console)
  · redirect_uri   = https://app.digifyce.com/api/v1/oauth/google/callback
  · scope          = https://www.googleapis.com/auth/adwords
  · access_type    = offline   ← to receive a refresh_token
  · prompt         = consent   ← forces refresh_token issuance on every auth

Step 3: Agency owner is redirected to Google's consent screen.
  They approve access to their Google Ads account(s).

Step 4: Google redirects back to our callback URL with ?code=AUTH_CODE.

Step 5: Backend exchanges the code for tokens:
  POST https://oauth2.googleapis.com/token
  · client_id, client_secret, code, redirect_uri, grant_type=authorization_code
  · Response: { access_token, refresh_token, expires_in }

Step 6: Both tokens are AES-256 encrypted and stored in the oauth_tokens table,
  scoped to the agency's tenant_id.

Step 7: The access_token is automatically refreshed using the refresh_token
  whenever it expires (every ~1 hour), with no user action required.
```

### 3.2 OAuth Token Storage Schema

```sql
CREATE TABLE oauth_tokens (
  id               UUID PRIMARY KEY,
  tenant_id        UUID NOT NULL,          -- agency isolation
  platform         VARCHAR(20) NOT NULL,   -- 'GOOGLE'
  access_token     TEXT NOT NULL,          -- AES-256 encrypted
  refresh_token    TEXT,                   -- AES-256 encrypted
  expires_at       TIMESTAMPTZ,
  platform_user_id VARCHAR(100),           -- Google Customer ID
  scopes           TEXT[],
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  UNIQUE (tenant_id, platform)             -- one Google connection per agency
);
```

**Security:** Tokens are encrypted using `cryptography.fernet` (AES-256) before any DB write. The encryption key is stored as an environment variable, never in the database or codebase.

---

## 4. Google Ads API Usage

### 4.1 API Calls Made

The tool makes **read-only** calls to the Google Ads API. No campaigns, budgets, keywords, or settings are created or modified in Phase 1.

| Purpose | Google Ads API Resource | Fields Retrieved |
|---|---|---|
| List accessible accounts | `CustomerService.listAccessibleCustomers` | `resource_name`, `customer_id`, `descriptive_name` |
| Account-level daily metrics | `GoogleAdsService.search` on `customer` | `metrics.cost_micros`, `metrics.conversions_value`, `metrics.conversions`, `metrics.impressions`, `metrics.clicks`, `segments.date` |
| Campaign-level daily metrics | `GoogleAdsService.search` on `campaign` | `campaign.id`, `campaign.name`, `campaign.status`, `metrics.cost_micros`, `metrics.conversions_value`, `metrics.conversions`, `metrics.impressions`, `metrics.clicks`, `segments.date` |
| Ad group metrics (Phase 2) | `GoogleAdsService.search` on `ad_group` | `ad_group.id`, `ad_group.name`, spend, ROAS, impressions |

### 4.2 Sample GAQL Query (Campaign Daily Metrics)

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  metrics.cost_micros,
  metrics.conversions_value,
  metrics.conversions,
  metrics.impressions,
  metrics.clicks,
  segments.date
FROM campaign
WHERE segments.date BETWEEN '2026-04-01' AND '2026-04-30'
  AND campaign.status != 'REMOVED'
ORDER BY segments.date DESC
```

### 4.3 Data Pull Strategy

| Pull Type | Date Window | Frequency |
|---|---|---|
| First sync (new account) | Last 90 days, 30-day chunks | Once on account connection |
| Regular manual sync | Last 3–7 days | User-triggered from dashboard |
| Nightly auto-sync (Phase 2) | Previous day | Daily via Celery scheduler |

**Rate limit handling:** All API calls use exponential backoff with 3 retries on `RESOURCE_EXHAUSTED` or `TRANSIENT_FAULT` errors.

---

## 5. Multi-Tenant Data Architecture

Every agency that signs up to the platform is an isolated **tenant**. There is zero data sharing between tenants.

### 5.1 Isolation Model

- Every database table has a mandatory `tenant_id UUID NOT NULL` column
- Every service function receives `tenant_id` as a required parameter, always derived from the JWT token — never from user input
- All database queries include `WHERE tenant_id = :tenant_id`
- Each agency's Google Ads OAuth token is stored under their unique `tenant_id`
- Agency A's token is never used to pull data for Agency B

### 5.2 User Access Levels

| Role | Access |
|---|---|
| Owner | Full access — can connect/disconnect Google Ads, manage all brands, see all data |
| Manager | Can trigger syncs and view all data — cannot modify OAuth connections |
| Viewer | Read-only dashboard access |

---

## 6. Data Handling & Security

| Concern | Implementation |
|---|---|
| OAuth token storage | AES-256 Fernet encryption before DB write; decrypted only at API call time in memory |
| No plaintext secrets | All keys in environment variables; no secrets in code or version control |
| SQL injection prevention | SQLAlchemy ORM with parameterized queries throughout |
| JWT security | HS256 signed, 60-minute access tokens + 30-day refresh tokens stored hashed server-side |
| HTTPS | TLS via Nginx in production; all API communication is encrypted in transit |
| Data retention | Metric data retained as long as the account is connected; deleted on tenant account closure |
| No data resale | Data pulled from Google Ads is used exclusively to display dashboards to the account owner. It is never sold, shared, or used for any purpose other than showing the agency owner their own ad performance. |

---

## 7. What the Tool Does NOT Do

To be explicitly clear about the scope of API usage:

- ❌ Does **not** create Google Ads campaigns, ad groups, or keywords
- ❌ Does **not** modify budgets, bids, or targeting in Phase 1
- ❌ Does **not** access any Google Ads account the agency owner has not explicitly authorized via OAuth
- ❌ Does **not** share data between tenants (agencies)
- ❌ Does **not** use data for machine learning model training or any purpose beyond displaying it to the account owner
- ❌ Does **not** store any Personally Identifiable Information (PII) from Google Ads end users

---

## 8. Intended Users & Scale

| User Type | Description | Estimated Count |
|---|---|---|
| Digifyce internal team | Agency staff using the dashboard to manage client accounts | 5–10 users |
| External agency owners | Independent agencies who sign up to the SaaS | Target: 50–200 agencies in Year 1 |
| Per-agency ad accounts | Each agency typically manages 3–15 Google Ads accounts | Avg. ~5 accounts per agency |

---

## 9. Compliance & Policy Acknowledgements

- The tool complies with the [Google Ads API Terms of Service](https://developers.google.com/google-ads/api/docs/terms)
- OAuth scopes requested are limited to `https://www.googleapis.com/auth/adwords` — the minimum required for read-only reporting
- The platform has a published **Privacy Policy** and **Terms of Service** accessible to all users before OAuth authorization
- Agency owners explicitly consent to Google Ads data access at the time of OAuth authorization
- API access credentials (developer token, client ID/secret) are stored only as environment variables and are never exposed to end users

---

*Document prepared by Digifyce for Google Ads API Standard Access Review*  
*Contact: digifycecbe@gmail.com*  
*Date: May 2026*
