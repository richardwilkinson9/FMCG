# Supabase setup for GROSS.

The site already ships the project URL and publishable key
(`src/config/supabase.ts`). Two one-off steps in the Supabase dashboard make
the cloud features live. Five minutes, tops.

## 1. Create the tables (SQL Editor → New query → paste → Run)

```sql
-- THE ARCHIVE — saved models. Every save is an INSERT; re-saving the same
-- name builds version history. RLS scopes everything to the signed-in user.
create table public.models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  payload jsonb not null,
  saved_at timestamptz not null default now()
);

alter table public.models enable row level security;

create policy "own models: select" on public.models
  for select using (auth.uid() = user_id);
create policy "own models: insert" on public.models
  for insert with check (auth.uid() = user_id);
create policy "own models: delete" on public.models
  for delete using (auth.uid() = user_id);

create index models_user_saved on public.models (user_id, saved_at desc);

-- THE UNION — newsletter sign-ups. Write-only from the site: anyone can
-- insert, nobody can read the list through the public key.
create table public.union_signups (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.union_signups enable row level security;

create policy "anyone can sign up" on public.union_signups
  for insert with check (true);
```

## 2. Point magic links at the site

**Authentication → URL Configuration**:
- Site URL: `https://getgross.co.uk`
- Additional redirect URLs: `https://www.getgross.co.uk`, plus
  `http://localhost:5173` if you want sign-in to work in local dev.

Email sign-in (magic links) is on by default — no other provider needed.

## What the app does with this

- **Sign in to sync** (on The Shelf): enters your email → Supabase sends a
  magic link → clicking it lands back on the site signed in.
- Signed out, the Archive lives in the browser. On first sign-in, local
  saves are pushed to your account automatically and removed locally.
- Every save is a new row — re-saving "Tesco review" keeps the old copy as
  a version (the "N VERSIONS" chip on The Shelf).
- The Union box on the homepage inserts into `union_signups`. Reading the
  list needs the dashboard (Table Editor) — the site key can only write.

## Free-tier notes

Supabase free tier: 500MB database, 50k monthly active users, magic-link
emails capped at ~2/hour per address (fine for real use; annoying if you
test sign-in repeatedly — wait an hour or add an SMTP provider later).
