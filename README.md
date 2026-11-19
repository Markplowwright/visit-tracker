# visit-tracker

A small, privacy-friendly visit tracker for my portfolio sites, with a private login dashboard. It replaces a hosted counter with something I own and can read per visit.

Sites tracked: [Admin Practice Lab](https://markplowwright.github.io/admin-practice-lab/) and my portfolio. Any other project can be added with one script tag.

## What it collects

Each event stores only:

- a random visit ID (made fresh for each browser tab visit, not linked to a person)
- the site label (`lab`, `portfolio`, ...)
- the event name (for example `screen/intune.home` or `ticket/s1-resolved`)
- the time
- the device type (phone, tablet or desktop)
- on the page view only: the name of the site the visitor came from (for example `linkedin.com`), and a two-letter country code guessed from the browser's time zone (for example `America/New_York` becomes `US`). This is a rough guess and involves no IP lookup. Time zones that are not in the built-in list send no country.

It does **not** collect names, email addresses, IP addresses, cookies, anything typed into a page, or the full address of a page or link. It does not track people across visits or across sites.

It skips localhost and file pages, known bots, and any browser that opened a page with `?notrack`. Open a page with `?track` to turn it back on.

## How it works

```
site (GitHub Pages)  --tracker.js-->  Supabase table "events"  <--login--  dashboard (this repo, GitHub Pages)
```

- `tracker.js` is loaded by each site and sends events with Supabase's publishable key. That key can only add events.
- The `events` table has row-level security. Visitors can insert (with strict checks on the format of every field) and cannot read. Only accounts listed in `private.tracker_admins` can read. Sign-ups are turned off, so only the owner's account exists.
- The dashboard (`index.html`) is a plain public page. It holds no data and no secrets. After signing in, it reads events from Supabase and draws the charts in the browser. It asks search engines not to index it.

## Add it to a site

```html
<script src="https://markplowwright.github.io/visit-tracker/tracker.js" data-site="lab" async></script>
```

Then send events from the site's own code:

```js
if (window.vtrack) { window.vtrack("ticket/s1-started"); }
```

Event names are lower case letters, numbers and `/ . _ : -`, up to 120 characters. Other characters are replaced.

## Dashboard

Range picker (24 hours to 90 days), site filter, visits per day, most used events, where people drop off (started versus finished per ticket and mission), referrers, devices and countries, per-visit journeys, and a CSV export.

## Set it up

1. Create a Supabase project and run `sql/001_events.sql` and `sql/002_lock_rls_helper.sql` in its SQL editor.
2. In Supabase Auth, create one user, turn off new sign-ups, then add that user's id to `private.tracker_admins` (see the comment at the end of `001_events.sql`).
3. Put the project URL and publishable key at the top of `tracker.js` and `js/dashboard.js`.
4. Turn on GitHub Pages for this repo (Settings, then Pages, branch `main`, root).

## Files

| File | What it is |
| --- | --- |
| `tracker.js` | Script that sites load |
| `index.html`, `css/dashboard.css`, `js/dashboard.js` | The dashboard |
| `js/lib.js` | Data helpers (counting, funnels, CSV), tested |
| `sql/` | Database setup |
| `tests/` | `npm test` runs the helper and tracker tests |

## Not yet

Country is only a time zone guess, so travelers and VPN users can look wrong. Bot filtering is basic (user-agent and automation flags). Old events are not deleted automatically yet, and there is no scheduled backup; use Export CSV for now.
