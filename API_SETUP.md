# API Setup Guide — External CMO Dashboard

> Before writing a single line of backend code, you need credentials from Meta and Google.
> This file walks you through getting them step by step.

---

## 1. Meta (Facebook) API Setup

You need a **Meta App** to:
- Let agency owners connect their own Meta Business ad accounts via OAuth
- Call the Meta Marketing API on their behalf (read campaigns, spend, ROAS, etc.)

### Step 1 — Create a Meta Developer Account
1. Go to: https://developers.facebook.com
2. Log in with your personal Facebook account (or a business Facebook account)
3. Click **"My Apps"** in the top right → **"Create App"**

### Step 2 — Choose App Type
- Select **"Business"** as the app type
- This gives you access to the Marketing API and Business OAuth

### Step 3 — Fill in App Details
| Field | What to enter |
|---|---|
| App Name | `CMO Dashboard` (or your SaaS product name) |
| App Contact Email | Your email |
| Business Account | Select your Meta Business Account (create one at business.facebook.com if you don't have one) |

### Step 4 — Add the Marketing API Product
1. In your new app's dashboard, click **"Add Product"**
2. Find **"Marketing API"** → click **"Set Up"**
3. This unlocks the ability to read ad account data

### Step 5 — Configure OAuth (Facebook Login)
1. Click **"Add Product"** again → **"Facebook Login"** → **"Set Up"** → choose **"Web"**
2. Under **Facebook Login → Settings**, add your OAuth redirect URL:
   - Local dev: `http://localhost:8000/api/v1/oauth/meta/callback`
   - Production: `https://yourdomain.com/api/v1/oauth/meta/callback`
3. Enable: **"Client OAuth Login"** and **"Web OAuth Login"** — both ON

### Step 6 — Get Your Credentials
Go to **App Settings → Basic**:
```
APP_ID     = (this is your META_CLIENT_ID)
APP_SECRET = (this is your META_CLIENT_SECRET)
```
Copy these into your `.env` file (see Section 4 below).

### Step 7 — Set Required Permissions (Scopes)
When agency owners connect, your app will request these OAuth scopes:
```
ads_read           ← read campaign/adset/ad performance data
ads_management     ← read + write (needed for one-click budget apply in Phase 2)
business_management ← access Business Manager accounts
read_insights      ← access Ads Insights API
```
In the App dashboard → **App Review → Permissions and Features**, request:
- `ads_read` and `ads_management` — these require App Review before going live
- While in development, only you and test users can use the app (no review needed)

### Step 8 — Create a Test User (for local dev)
1. **App Dashboard → Roles → Test Users**
2. Create a test user, grant them an ad account
3. Use this for local OAuth testing without a real agency account

---

## 2. Google Ads API Setup (Phase 2 — skip for now)

You need a **Google Cloud Project** + **Google Ads API access** for Google channel data.

### Step 1 — Google Cloud Project
1. Go to: https://console.cloud.google.com
2. Create a new project: `CMO Dashboard`
3. Enable the **Google Ads API** under APIs & Services → Enable APIs

### Step 2 — OAuth 2.0 Credentials
1. APIs & Services → **Credentials** → Create Credentials → **OAuth 2.0 Client ID**
2. Application type: **Web Application**
3. Add redirect URI:
   - Local: `http://localhost:8000/api/v1/oauth/google/callback`
   - Prod: `https://yourdomain.com/api/v1/oauth/google/callback`
4. Download the JSON — extract:
```
GOOGLE_CLIENT_ID     = ...
GOOGLE_CLIENT_SECRET = ...
```

### Step 3 — Google Ads Developer Token
1. Go to: https://ads.google.com/aw/apicenter
2. Apply for a **Developer Token** — needed for every Google Ads API call
3. Basic access is enough for dev; Standard access is needed for production scale

---

## 3. How OAuth Works in This App (The Flow)

When an agency owner clicks "Connect Meta Account":

```
Agency Owner clicks "Connect Meta"
        ↓
Your backend redirects to Meta with:
  client_id=YOUR_APP_ID
  redirect_uri=your_callback_url
  scope=ads_read,ads_management
  state=<random token to prevent CSRF>
        ↓
Meta shows permission screen to agency owner
        ↓
Agency owner approves
        ↓
Meta redirects to: /api/v1/oauth/meta/callback?code=AUTH_CODE
        ↓
Your backend exchanges code for access_token:
  POST https://graph.facebook.com/oauth/access_token
  params: client_id, client_secret, code, redirect_uri
        ↓
You get: access_token (short-lived, ~1hr)
        ↓
Exchange for long-lived token (60 days):
  GET https://graph.facebook.com/oauth/access_token
  params: grant_type=fb_exchange_token, access_token=<short>
        ↓
Store encrypted access_token in oauth_tokens table (scoped to tenant_id)
        ↓
Now you can call Meta API on behalf of this agency using their token
```

---

## 4. Environment Variables You Need

Create `external/backend/.env` with these keys once you have the credentials:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cmo_external

# JWT Auth
JWT_SECRET=<generate a random 64-char string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Meta OAuth
META_CLIENT_ID=<your App ID from Step 1.6>
META_CLIENT_SECRET=<your App Secret from Step 1.6>
META_REDIRECT_URI=http://localhost:8000/api/v1/oauth/meta/callback

# Google OAuth (Phase 2)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google/callback
GOOGLE_ADS_DEVELOPER_TOKEN=

# Redis (for Celery — Phase 2)
REDIS_URL=redis://localhost:6379/0

# AWS (for deployment — not needed locally)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=ap-south-1
```

---

## 5. Meta App Review — What You Need for Production

While building and testing, your app works in **Development Mode** — only you and test users can use it.

Before real agencies can connect, you must submit for **App Review** and request:
- `ads_read` — read ad account performance data
- `ads_management` — manage budgets (Phase 2)
- `business_management` — access Business Manager

**What Meta requires for review:**
- A working app with real OAuth flow (screencast)
- Privacy Policy URL
- Terms of Service URL
- Explanation of how you use the data

**Timeline:** Usually 1–2 weeks.

---

## 6. Checklist Before Starting Phase 1 Coding

- [ ] Meta Developer account created
- [ ] Meta App created (type: Business)
- [ ] Marketing API product added to the app
- [ ] Facebook Login product added, redirect URI configured
- [ ] `META_CLIENT_ID` and `META_CLIENT_SECRET` copied to `.env`
- [ ] Docker Desktop installed (for local Postgres + Redis)
- [ ] `DATABASE_URL` set pointing to local Docker Postgres
- [ ] `JWT_SECRET` generated

Once all boxes are checked → start with Phase 1 backend setup.

---

*Last updated: 2026-04-12*
