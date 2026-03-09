# GigPilot AI — Setup Guide

## What's Included

| File | Purpose |
|------|---------|
| `src/App.tsx` | Complete React app (landing, auth, dashboard, venues, outreach, account) |
| `src/main.tsx` | React entry point |
| `index.html` | HTML shell |
| `api/send-email.js` | Vercel function — sends emails via Resend |
| `api/stripe-webhook.js` | Vercel function — handles Stripe payment events |
| `SUPABASE_SETUP.sql` | Database schema + policies |

---

## Step 1 — Deploy to GitHub + Vercel

```bash
# In your repo folder
git add .
git commit -m "GigPilot AI v2 — complete SaaS"
git push
```

Vercel will auto-deploy. The app works in **demo mode** without any env vars set.

---

## Step 2 — Supabase (Real Auth + Database)

1. Go to [supabase.com](https://supabase.com) → New project
2. SQL Editor → paste contents of `SUPABASE_SETUP.sql` → **Run**
3. **Authentication → Providers → Google → Enable**
   - Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
   - Authorised redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. **Authentication → URL Configuration**
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`
5. **Settings → API** → copy Project URL and anon key

Add to Vercel → Settings → Environment Variables:
```
VITE_SUPABASE_URL          = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
SUPABASE_SERVICE_ROLE_KEY  = eyJ... (for webhook, from Settings → API → service_role)
```

---

## Step 3 — Anthropic (AI Email Generation)

1. Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key

Add to Vercel:
```
VITE_ANTHROPIC_KEY = sk-ant-...
```

---

## Step 4 — Stripe (Real Payments in £)

1. Go to [stripe.com](https://stripe.com) → Products → Add product
2. Create **"Artist Plan"** → £15.00 → Recurring → Monthly → **copy Price ID**
3. Create **"Pro Plan"** → £39.00 → Recurring → Monthly → **copy Price ID**
4. Developers → API keys → copy Publishable key and Secret key

Add to Vercel:
```
VITE_STRIPE_PUBLISHABLE_KEY   = pk_live_...
STRIPE_SECRET_KEY             = sk_live_...
VITE_STRIPE_ARTIST_PRICE_ID   = price_xxx (from step 2)
VITE_STRIPE_PRO_PRICE_ID      = price_xxx (from step 3)
```

5. **Webhooks → Add endpoint**
   - URL: `https://your-app.vercel.app/api/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
   - Copy signing secret →

```
STRIPE_WEBHOOK_SECRET = whsec_...
```

---

## Step 5 — Resend (Real Email Delivery)

1. Go to [resend.com](https://resend.com) → Create account
2. Domains → Add domain → verify DNS records (takes ~30 mins)
3. API Keys → Create key

Add to Vercel:
```
RESEND_API_KEY = re_...
```

4. Update `FROM_EMAIL` in `api/send-email.js` with your verified domain:
   ```js
   const FROM_EMAIL = "bookings@yourdomain.com";
   ```

---

## Features

- ✅ Landing page with animated typewriter hero
- ✅ Email + Google OAuth auth (real via Supabase)
- ✅ 3-step onboarding
- ✅ 65 real London music venues in database
- ✅ AI venue matching algorithm (location + genre + similar artists)
- ✅ AI email generation (Claude Sonnet via Anthropic)
- ✅ Email sending via Resend (mailto fallback)
- ✅ Outreach tracker with status management
- ✅ Stripe subscriptions in £GBP
- ✅ Free / Artist £15/mo / Pro £39/mo
- ✅ Account management + profile editing
- ✅ Mobile-responsive with bottom nav
- ✅ Full database persistence (Supabase)
- ✅ Demo mode (works without any env vars)

---

## Pricing

| Plan | Price | Matches | Emails |
|------|-------|---------|--------|
| Free | £0/month | 5/month | 3/month |
| Artist | £15/month | Unlimited | 50/month |
| Pro | £39/month | Unlimited | Unlimited |
