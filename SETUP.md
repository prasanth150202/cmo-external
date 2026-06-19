# Quick Start — External CMO Dashboard

## Prerequisites
- Docker Desktop running
- Python 3.11+
- Node.js 20+

---

## Step 1 — Start the database

```bash
cd external
docker-compose up -d
```

Postgres runs on `:5432`, pgAdmin on `:5050`, Redis on `:6379`.

---

## Step 2 — Backend setup

```bash
cd external/backend

# Copy env file
cp .env.example .env
# Edit .env — generate JWT_SECRET and ENCRYPTION_KEY (see comments inside)

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Alembic migrations (creates all tables)
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

## Step 3 — Frontend setup

```bash
cd external/frontend
npm install
npm run dev
```

App: http://localhost:3000

---

## Step 4 — Create your first account

1. Go to http://localhost:3000/signup
2. Enter agency name, email, password
3. You're in — create brands, then go to Settings to connect Meta/Google

---

## Step 5 — Add API keys (when ready)

Edit `external/backend/.env`:
```
META_CLIENT_ID=...
META_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
GEMINI_API_KEY=...
```

Then restart uvicorn. OAuth connect buttons in Settings will become live.

---

## Generate secrets

```bash
# JWT_SECRET
python -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY (for token vault)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## pgAdmin (view database)

- URL: http://localhost:5050
- Login: admin@cmo.local / admin
- Add server: host=localhost, port=5432, db=cmo_external, user=postgres, password=password






● Getting Production Credentials                                                                      
  
  Meta Ads                                                                                               
  1. Go to https://developers.facebook.com → Your App → Settings → Basic                              
  2. Copy App ID → this is META_CLIENT_ID
  3. Copy App Secret → this is META_CLIENT_SECRET
  4. Go to Facebook Login → Settings → add your production redirect URI:
  https://yourdomain.com/api/v1/oauth/meta/callback
  5. Under App Review → make your app live (toggle from Development → Live)

  Google Ads

  1. https://console.cloud.google.com → Credentials → your OAuth client
  2. Add production redirect URI:
  https://yourdomain.com/api/v1/oauth/google/callback
  3. Copy Client ID and Client Secret
  4. Developer token from Google Ads → Tools → API Center

  ---
  Where to Store in Production

  Never put secrets in .env files committed to git or on the server as plain files.

  Option 1 — Railway / Render / Fly.io (easiest)

  These platforms have a built-in secrets UI. You just paste each key in the dashboard:

  Settings → Environment Variables → Add Variable

  Your app reads them as normal os.environ — no code change needed.

  Option 2 — AWS Secrets Manager

  aws secretsmanager create-secret \
    --name "cmo-dashboard/prod" \
    --secret-string '{
      "META_CLIENT_ID": "...",
      "META_CLIENT_SECRET": "...",
      "GOOGLE_CLIENT_ID": "...",
      "GOOGLE_CLIENT_SECRET": "...",
      "ENCRYPTION_KEY": "...",
      "SECRET_KEY": "..."
    }'

  Then in your backend config.py, fetch at startup instead of reading .env.

  Option 3 — GitHub Actions / CI secrets

  If you deploy via GitHub Actions:

  Repo → Settings → Secrets and variables → Actions → New repository secret

  Reference in your workflow:
  env:
    META_CLIENT_ID: ${{ secrets.META_CLIENT_ID }}

  ---
  The .env file rule

  ┌───────────────────┬───────────────┬────────────────────┐
  │       File        │      Dev      │     Production     │
  ├───────────────────┼───────────────┼────────────────────┤
  │ .env              │ ✅ local only │ ❌ never on server │
  ├───────────────────┼───────────────┼────────────────────┤
  │ Platform env vars │ —             │ ✅                 │
  ├───────────────────┼───────────────┼────────────────────┤
  │ Secret manager    │ —             │ ✅ best practice   │
  └───────────────────┴───────────────┴────────────────────┘

  Make sure .env is in your .gitignore:
  # already should be there
  .env
  *.env

  ---
  Your production .env equivalent (all keys needed)

  # Database
  DATABASE_URL=postgresql://user:pass@host:5432/dbname

  # Auth
  SECRET_KEY=generate-with-openssl-rand-hex-32
  ENCRYPTION_KEY=generate-with-python-fernet

  # Meta
  META_CLIENT_ID=your_app_id
  META_CLIENT_SECRET=your_32char_app_secret
  META_REDIRECT_URI=https://yourdomain.com/api/v1/oauth/meta/callback

  # Google
  GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-xxx
  GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/oauth/google/callback
  GOOGLE_DEVELOPER_TOKEN=your_developer_token

  # Frontend
  NEXT_PUBLIC_API_URL=https://yourdomain.com

  Generate the two random keys:
  # SECRET_KEY
  openssl rand -hex 32

  # ENCRYPTION_KEY (Fernet)
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

  ---
  Short answer: For production, use your hosting platform's environment variable UI (Railway, Render, 
  etc.) — paste each key there, never in a file on the server.
  
