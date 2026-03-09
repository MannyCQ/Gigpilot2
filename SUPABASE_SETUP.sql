-- ════════════════════════════════════════════════════════════════
-- GIGPILOT AI — Complete Supabase Database Setup
-- ════════════════════════════════════════════════════════════════
-- Run this entire script in:
-- supabase.com → your project → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade unique not null,
  artist_name     text,
  area            text,
  genre           text,
  similar_artists text,
  bio             text,
  spotify         text,
  soundcloud      text,
  instagram       text,
  website         text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. OUTREACH TABLE
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.outreach (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  venue_id            integer,
  venue_name          text not null,
  venue_area          text,
  email_subject       text,
  email_body          text,
  status              text default 'sent' check (status in ('sent','replied','no_response','booked')),
  notes               text,
  sent_at             timestamptz default now(),
  created_at          timestamptz default now()
);

-- 3. SUBSCRIPTIONS TABLE
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                        uuid default gen_random_uuid() primary key,
  user_id                   uuid references auth.users(id) on delete cascade unique not null,
  plan                      text default 'free' check (plan in ('free','artist','pro')),
  stripe_customer_id        text,
  stripe_subscription_id    text,
  current_period_end        timestamptz,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.outreach      enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles policies
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- Outreach policies
create policy "outreach_select_own" on public.outreach
  for select using (auth.uid() = user_id);
create policy "outreach_insert_own" on public.outreach
  for insert with check (auth.uid() = user_id);
create policy "outreach_update_own" on public.outreach
  for update using (auth.uid() = user_id);
create policy "outreach_delete_own" on public.outreach
  for delete using (auth.uid() = user_id);

-- Subscriptions policies (read-only from client; server writes via service role)
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- 5. AUTO-UPDATE TIMESTAMPS
-- ─────────────────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- 6. AUTO-CREATE SUBSCRIPTION ROW ON NEW USER SIGNUP
-- ─────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
--
-- Next steps:
-- 1. Authentication → Providers → Google → Enable
--    (you'll need Google OAuth credentials from console.cloud.google.com)
-- 2. Authentication → URL Configuration → add your Vercel URL
-- 3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel
-- ════════════════════════════════════════════════════════════════
