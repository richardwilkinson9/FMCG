# Security — RLS pen-test, anonymous write rate-limiting, consent

*Workstream 5 (Security & privacy) of [EXCELLENCE_SPRINT.md](./EXCELLENCE_SPRINT.md).
Ops doc — no product surface. Schema and policies live in
[SETUP_SUPABASE.md](./SETUP_SUPABASE.md); the public config is
[src/config/supabase.ts](./src/config/supabase.ts).*

The site ships one Supabase key — the **publishable (anon) key**, public by
design. It grants nothing that Row Level Security does not allow, so RLS is the
entire server-side defence. This document is the threat model, the runnable
attack harness, the findings log, and the written design for the two decisions
the sprint doc names (rate-limiting anon writes; the Insight Tag's PECR
position).

## Threat model

- **Attacker capability**: anyone with the publishable key — i.e. anyone who
  views source. They can call the PostgREST API directly with any method and
  body. They are **not** authenticated (no valid JWT, `auth.uid()` is null,
  `auth.jwt()->>'email'` is null).
- **Assets**: other users' saved models (`models`); the newsletter list
  (`union_signups`); anonymous usage counts (`events`); share payloads
  (`share_links`); the owner-only stats view (`weekly_stats`).
- **What "compromise" means**: reading another user's models; reading the
  Ledger email list or raw events; writing/overwriting/deleting rows the policy
  should forbid; reading owner stats while signed out; bulk-harvesting share
  blobs.
- **Out of scope here**: authenticated-user attacks (a signed-in user seeing
  *another* signed-in user's models — covered by the same `auth.uid() =
  user_id` policy but needs two real JWTs to test), email deliverability, and
  transport security (HTTPS/HSTS — handled by the headers task).

## The harness

[`scripts/rls-pentest.mjs`](./scripts/rls-pentest.mjs) — run with:

```bash
npm run pentest:rls
# or, against any project:
SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/rls-pentest.mjs
```

- Uses **only** the publishable anon key (from env, else parsed out of
  `src/config/supabase.ts`). It never reads or requires a service-role key —
  that would defeat the test.
- Every fetch is timeout-guarded (8s) and fail-soft.
- **Env-gated**: a preflight checks the response actually looks like PostgREST
  (a JSON array, or a JSON error carrying `message`/`code`/`hint`/`details`).
  If Supabase is unreachable — as it is from the build sandbox, whose proxy
  returns a non-PostgREST 403 — it prints `SKIPPED — Supabase unreachable from
  this environment; run from a networked host or in CI` and **exits 0**. It
  never crashes.
- When it *does* run: prints a `{table, attack, expected, observed, verdict}`
  table and **exits 1 if any attack FAILs**, so CI catches a policy regression.

## The attacks and their expected RLS behaviour

| # | Table / view | Attack | Expected (policy) | PASS means |
|---|---|---|---|---|
| 1 | `models` | Read the whole list, anon | `select using (auth.uid() = user_id)`; anon `auth.uid()` is null | 200 with 0 rows, or a denial — no rows leak |
| 2 | `models` | Insert a model, no/wrong user | `insert with check (auth.uid() = user_id)` fails for anon | Denied (401/403, code `42501`) — no row created |
| 3 | `share_links` | Bulk-enumerate (SELECT \*, no id) | `select using (true)` — links are public **by design** | Readable; **accepted, flagged** exposure (see below) — not an RLS failure |
| 3b | `share_links` | Tamper — overwrite a blob (UPDATE) | No UPDATE policy exists | 0 rows changed / denied |
| 4 | `union_signups` | Read the list, anon | INSERT-only policy, **no** select policy | 200 with 0 rows / denied — the email list never leaks |
| 5 | `events` | Read raw events, anon | INSERT-only policy, **no** select policy | 200 with 0 rows / denied |
| 6 | `weekly_stats` | Read owner stats, signed out | `revoke all from anon`; view filters on caller's JWT email | Denied / 0 rows |

Note on attack 3: reading a **known** short id is the intended product path
(`resolveShortLink`), and share blobs are the same public model a share URL
already carries — no PII. The residual risk is **bulk harvesting** the whole
table. Because the policy is `using (true)`, the harness reports this as PASS
(it matches the documented policy) but the exposure is real and is what the
rate-limiting / hardening design below addresses. If bulk enumeration is ever
judged unacceptable, replace the blanket read with a by-id-only path (see
"Optional hardening" below) — that is a policy change in SETUP_SUPABASE.md, not
a code change here.

## Findings log

Fill in from a real run (networked host or CI). The build sandbox cannot reach
Supabase, so the entry below records the SKIP; replace it with the dated result
of an actual run.

| Date | Env | Result | Notes |
|---|---|---|---|
| 2026-07-10 | build sandbox | SKIPPED | Proxy blocks Supabase; preflight returned a non-PostgREST HTTP 403, harness exited 0 as designed. No real verdict obtained here. |
| _pending_ | production (anon key) | _run `npm run pentest:rls` from a networked host_ | Expect all seven attacks PASS. Record any FAIL as an open finding and fix the policy before closing. |

**Definition of done (sprint):** pen-test log with zero open highs. A FAIL on
attacks 1, 2, 4, 5 or 6 is a HIGH (data leak or unauthorised write) and blocks
release. Attack 3 is documented as accepted-with-hardening, not an open high.

## Design — rate-limiting anonymous writes (events, share_links)

**Problem.** `events` and `share_links` accept anonymous INSERTs by design
(`with check (true)`). Nothing stops a script inserting millions of rows —
filling the free-tier database, poisoning the usage counts, or farming short
ids. RLS grants the *right* to insert; it does not bound the *rate*. This is a
written design only — **not implemented tonight** (no product surface change).

Three Supabase-side approaches, cheapest first:

**A. Per-window insert cap via a `BEFORE INSERT` trigger (Postgres-native).**
Keep a tiny counter table and reject inserts once a window budget is spent.
Coarse (global, not per-IP — PostgREST does not expose the client IP to RLS by
default) but zero infrastructure and immediate.

```sql
-- Sketch, not enabled. One row per (table, minute-bucket); reject over budget.
create table if not exists public.write_budget (
  bucket text primary key,          -- e.g. 'events:2026-07-10T14:32'
  n integer not null default 0
);

create or replace function public.rate_limit()
returns trigger language plpgsql security definer as $$
declare
  key text := tg_table_name || ':' || to_char(now(), 'YYYY-MM-DD"T"HH24:MI');
  budget int := case tg_table_name when 'events' then 600 else 60 end; -- per minute
  cur int;
begin
  insert into public.write_budget(bucket, n) values (key, 1)
    on conflict (bucket) do update set n = write_budget.n + 1
    returning n into cur;
  if cur > budget then
    raise exception 'rate limit exceeded for %', tg_table_name
      using errcode = '53400';
  end if;
  return new;
end $$;

-- create trigger events_rl      before insert on public.events      for each row execute function public.rate_limit();
-- create trigger share_links_rl before insert on public.share_links for each row execute function public.rate_limit();
-- A scheduled pg_cron job prunes write_budget rows older than a few minutes.
```

The app already fails soft on insert errors (`logEvent` swallows everything;
`createShortLink`/`unionSignup` return `{ok:false}` quietly), so a `53400`
rejection degrades cleanly — no user-visible break.

**B. Edge rate-limit before the row is ever written.** Put the two writes behind
a Supabase **Edge Function** (or Vercel Edge Middleware on a `/api/event` /
`/api/shortlink` route) that keys a token bucket on the client IP
(`x-forwarded-for`) in Supabase's Postgres or an edge KV, then inserts with the
service role. This gets true per-IP limiting and keeps the anon key off the raw
table entirely — at the cost of one function to run and a small latency add.
Preferred if abuse actually appears; overkill until then.

**C. Supabase platform / network limits.** Enable the project's built-in API
rate limits and put Cloudflare (or Vercel's WAF) in front with a per-IP rule on
the PostgREST path. No SQL, but blunt — it limits *all* API traffic, not just
anon writes.

**Recommendation.** Ship **A** the day writes look abusive (a few minutes of
SQL, no new infra, fail-soft-compatible), and graduate to **B** only if a
determined attacker beats the global cap. Track database row growth on
`events`/`share_links` as the trigger to act.

**Optional hardening for share_links enumeration (attack 3).** If bulk harvest
is unwanted, drop the blanket `select using (true)` and expose resolution
through a `security definer` RPC that returns one blob by exact id, so a caller
can resolve a link they hold but cannot list the table:

```sql
-- Sketch. Replaces the public SELECT with a by-id-only function.
-- revoke select on public.share_links from anon;
create or replace function public.resolve_share_link(link_id text)
returns text language sql security definer set search_path = public as $$
  select blob from public.share_links where id = link_id;
$$;
-- grant execute on function public.resolve_share_link(text) to anon;
```

Deferred, not tonight: it changes the resolve path in `cloud.ts` and needs its
own test. Recorded here so the decision is explicit.

## Decision — LinkedIn Insight Tag: PECR / consent

**Status: NOT loaded on the site today.** No LinkedIn Insight Tag, no analytics
cookies, no third-party runtime scripts. The only analytics is the cookieless,
PII-free `events` insert. This section records the position and a ready-to-flip
consent approach so the decision is made *before* anyone adds the tag.

**The PECR position.** The LinkedIn Insight Tag sets cookies (e.g. matched-
audience / conversion cookies) and is not "strictly necessary" for a service the
user requested. Under the UK **Privacy and Electronic Communications
Regulations (PECR) reg. 6**, non-essential cookies require **prior informed
consent** — opt-in, before the tag fires, not implied. The current cookieless
`events` model needs no banner precisely because it sets nothing on the device
and identifies no one. **Therefore: the Insight Tag must not fire until the user
has opted in.** If we are unwilling to run a consent gate, we do not add the tag
— which is the current, deliberate state.

**Ready-to-enable consent approach (on-brand, deadpan).** A single dismissable
bottom strip, GROSS. house style — Ink border, receipt background, Space Mono,
radius 0, British sentence case, no emoji, no exclamation marks. It blocks the
tag until "Allow" is clicked; "No" (and dismiss) leave the tag unloaded and are
remembered. Consent stored in `localStorage` (`gross-consent-linkedin` =
`granted` | `denied`), matching how the export email and ledger nudge already
persist — no new table, no server state.

> **We'd like to count the clicks.**
> LinkedIn's tag drops a cookie so we can see which posts brought you here.
> Say no and nothing loads. Your maths is unaffected either way.
> `[ Allow ]  [ No ]`

Wiring, when wanted: gate the tag's injection on
`localStorage['gross-consent-linkedin'] === 'granted'`; render the strip only
when the key is unset; on "Allow" set `granted` and inject; on "No"/dismiss set
`denied` and never inject. `prefers-reduced-motion` static, keyboard-operable,
labelled — same bar as every other GROSS surface. All of this stays dormant
until the day the tag is actually wanted; the decision is recorded either way,
as the sprint requires.

## security.txt & disclosure

The sprint's Workstream 5 "done" also calls for a `security.txt` and a
disclosure inbox (handled by the headers task, not here). If not yet present,
add `public/.well-known/security.txt` with a contact address so a finder has a
path — this doc is where confirmed RLS findings get logged.
