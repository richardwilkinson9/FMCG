# Sending The Ledger — ESP setup + the welcome email

## 1. Pick the ESP (10 minutes)

Either works at this size; both have a free tier and custom HTML:

- **Buttondown** — simplest, markdown-or-HTML, good deliverability, easy
  archive off. `Settings → Import subscribers` takes a CSV.
- **MailerLite** — bigger free tier (1,000 subs), drag editor you'll ignore
  (paste the HTML), automation for the welcome email built in.

Do these in the ESP whichever you pick:
1. Sending address: `ledger@getgross.co.uk` (add the domain, then the DNS
   records they give you — SPF + DKIM — in your DNS panel; takes 10 minutes
   and it is the difference between inbox and spam).
2. Double opt-in OFF (these are people who typed their email to get a file —
   re-confirming loses a third of them), but keep the unsubscribe link
   obvious. The copy already is.
3. Replace `{{unsubscribe}}` in the HTML with the ESP's merge tag
   (Buttondown: `{{ unsubscribe_url }}`; MailerLite: `{$unsubscribe}`).

## 2. Export the list from Supabase (2 minutes)

Dashboard → SQL Editor:

```sql
-- Everyone, newest first, ready for CSV download
select email, created_at
from union_signups
order by created_at desc;
```

Run → Download CSV → import into the ESP. Re-run and re-import before each
send (or set up the ESP's API later — not worth it under ~500 subs).

## 3. Send order

1. Ratify a shell (A / B / C in this folder — A is the recommendation:
   closest to the site, safest rendering).
2. Send yourself a test. Check it in Gmail (web + phone) and Outlook — those
   two cover the audience.
3. Send the welcome email as an automation to NEW subscribers only
   (copy below). Do not blast it to the existing list.
4. Send `ledger-001-shell-a.html` to everyone. First Tuesday, morning.

## The welcome email (automation, on subscribe)

Subject: `You're on the list. Here's issue 001.`

> THE LEDGER — a receipt of your sign-up
>
> You asked for the maths, so here's the maths: one email a month on the
> commercial numbers of UK FMCG. Margins, trade spend, fees, payment terms —
> the working always shown.
>
> Issue 001 is already out: **How wrong can you be** — the margin that
> survives a halved forecast.
>
> → Read it: https://getgross.co.uk/the-ledger/001?utm_source=email&utm_medium=welcome
>
> The calculators are free and stay free: https://getgross.co.uk
>
> You get this because you asked for it. Unsubscribe below — no guilt trip.
> VAT number: not applicable. This is an email.

## The metric

Open rate above 45% = healthy. Below 35% two issues running = prune the dead
addresses and check the DNS records. Forwards and replies matter more than
opens — reply personally to every reply.
