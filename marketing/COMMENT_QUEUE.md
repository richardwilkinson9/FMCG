# The comment queue — commenting as the page

The engagement routine posts these via the `post_page_comment` action
(the bounded write: it can create comments as Gross. and physically
nothing else). Same discipline as the post queue: nothing posts unless
its status is APPROVED, text goes verbatim, missed items just wait.

## How entries get here

- The owner drops a LinkedIn post URL (plus the post text, or a
  screenshot) into the session — beat-list material per playbook §4:
  The Grocer / Retail Week grocery posts, the UK grocery commentariat,
  challenger founders posting listing wins, category managers posting
  charts. The next session drafts the comment and files it as PENDING.
- Drafting rules (playbook §4): never congratulate, never agree emptily,
  never link. One number or one translation per comment. Deadpan, dry,
  British, sentence case, no exclamation marks, no emoji.
- Replies to comments on the page's OWN posts do not queue here — the
  scan's reply engine handles those directly (maths challenges answered
  with working shown; anything hostile beyond a maths point gets flagged
  to the owner instead of answered).

## Statuses

- `PENDING` — drafted, awaiting owner approval. Edit freely.
- `APPROVED` — cleared; the next scan posts it and marks it POSTED.
- `POSTED` — done, comment URN recorded.
- `CUT` — owner dropped it.

## Entry format

### C-001
- target: <LinkedIn post URL or URN>
- context: <one line on what the target post says>
- status: PENDING

```
<comment text, posted verbatim>
```

---

*(no entries yet — drop a post link in the session to start the queue)*
