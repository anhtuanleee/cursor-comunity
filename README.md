# Signal Room

Next.js gallery with SSR/keyset pagination, PostgreSQL-backed collaboration,
and a Cloudflare Durable Object for realtime cursors, quick chat, reactions,
focus sessions, and shortlist updates.

## Local development

Create the local environment file:

```bash
cp .env.example .env
```

Set `DATABASE_URL`, then run the frontend and realtime server in separate
terminals:

```bash
npm run dev
npm run partykit:dev
```

Regenerate Cloudflare binding types after changing `wrangler.jsonc`:

```bash
npm run worker:types
```

## Testing

Jest covers deterministic unit/component behavior. Playwright covers browser
flows against a running Next.js app, including intercepted item modals and
card-level navigation:

```bash
npm run test:unit
npx playwright install chromium
DATABASE_URL=... npm run test:e2e
```

To run the browser suite against an already deployed or shared environment,
set `PLAYWRIGHT_BASE_URL`; the local `npm run dev` web server is still started
when the variable is omitted:

```bash
PLAYWRIGHT_BASE_URL=https://preview.example.com npm run test:e2e
```

The e2e fixtures expect at least one published gallery item. Keep the suite
against a staging database or preview deployment so comments, focus actions,
and modal navigation do not mutate production data.

## Backend structure

```text
app/api/*/route.ts                 HTTP-only route handlers
server/<domain>/                   validation, service and repository per domain
server/database/client.ts          PostgreSQL client (server-only)

partykit/index.ts                  Worker entrypoint and cron dispatch
partykit/realtime/                 Durable Object, protocol validators, sockets
partykit/ingestion/                Recent and RSS source connectors
partykit/jobs/                     scheduled orchestration
partykit/shared/                   Worker runtime response/logging helpers
```

Routes never issue SQL directly. The Durable Object owns only room coordination;
the ingestion jobs own external fetches and PostgreSQL writes. Cloudflare
binding types are generated from `wrangler.jsonc` instead of being duplicated
in the entrypoint.

The database schema is applied by the production deploy command. For an
existing development database, apply `partykit/schema.sql` and the numbered
files under `partykit/migrations/` before using reactions or the shortlist.

## Realtime collaboration

- Press `/` to open cursor chat at the current pointer position.
- Cursor bubbles share one measured four-direction placement resolver and use
  the participant's cursor color.
- React to a card with love, useful, or question; counts persist in PostgreSQL.
- Start a focus session from a card. Other participants choose whether to join
  before the page scrolls.
- Save references to the shared Keep / Maybe / Reject shortlist and attach a
  decision reason.

## Media gateway

Gallery responses expose same-origin, opaque media paths instead of crawled
asset URLs: `/media/:itemId/cover`, `/media/:itemId/:asset`, and `/media/:itemId/avatar`.
The Node route validates public HTTP(S) hosts, blocks redirects, streams only
image/video responses, and caches them at the CDN. The original publisher is
still attributed in the detail view; its outbound link uses `/out/:itemId` and
redirects only after the visitor deliberately selects **Visit**. Proxying does
not change the source's terms, licensing, or attribution requirements.

## One-command production deployment

The deployment uses Vercel for Next.js and Cloudflare Workers for the realtime
service. A PostgreSQL database must already exist and `DATABASE_URL` must be set
in `.env`.

```bash
npm run deploy
```

On the first run, the script opens the Vercel and Cloudflare login/link flows.
After that it:

1. lints and builds the project;
2. applies the database schema and migrations;
3. deploys the realtime Worker and its `DATABASE_URL` secret;
4. configures the production environment on Vercel;
5. deploys the Next.js application to production.

For CI, set `VERCEL_TOKEN` and `CLOUDFLARE_API_TOKEN` instead of using the
interactive login flows. If the Worker has a custom domain, also set
`NEXT_PUBLIC_PARTYKIT_HOST` to its HTTPS URL.

## Creative content ingestion

The realtime Worker syncs the Recent API every five minutes and public
RSS/Atom feeds every thirty minutes. Codrops, Sidebar, and One Page Love are
enabled in the curated source registry by default. Add or override feeds with
`CREATIVE_FEEDS`; use comma-separated URLs for a quick setup:

```bash
CREATIVE_FEEDS=https://example.com/feed.xml,https://another.example/rss
```

Or attach a category and tags per source with JSON:

```bash
CREATIVE_FEEDS='[{"url":"https://example.com/feed.xml","category":"Brand Inspiration","tags":["typography","branding"]}]'
```

All parsed entries are retained in `raw_items`; publishing is automatic but
strict. An entry must be in creative/UI-UX scope, have a valid public cover
(image, video, GIF, or Lottie), and expose a credible article author. Unsafe,
promotional, placeholder-media, or off-topic entries stay rejected with an
audit record in `moderation_decisions`. Approved entries receive a creator
record and are deduplicated by their canonical link, stored as
`source_type = creative-feed`, and normalized into the existing `items` table.
The Codrops adapter resolves same-origin Open Graph previews because that feed
uses video enclosures rather than image covers. Configure only sources whose
terms and `robots.txt` allow automated access; use official APIs or feeds for
platforms that restrict scraping.

Each feed receives a source record, conditional HTTP checkpoint
(`ETag` / `Last-Modified`), raw-item record, and crawl-run history. Unchanged
feeds return `304` and are not reparsed.

### Cloudflare scheduling on the Free plan

Cloudflare Cron is the scheduler. To remain within the Free plan's 10ms CPU
allowance, the Worker only makes an authenticated request to the Node endpoint;
the endpoint does the actual crawling and database work:

```text
GET https://your-site.example/api/internal/ingest?source=recent
Authorization: Bearer <INGEST_CRON_SECRET>
```

Valid sources are `recent` and `creative`. Keep `INGEST_CRON_SECRET` as a
server-only Vercel environment variable.

Configure these Worker secrets with the same values used by Vercel:

- `INGEST_URL` — production Vercel URL, without a trailing slash;
- `INGEST_CRON_SECRET` — exactly the same value configured on Vercel.

The schedule runs Recent at minutes `02, 17, 32, 47` and creative feeds at
minutes `07, 37` (UTC). `.github/workflows/ingest.yml` remains available for
manual recovery runs only; it no longer schedules duplicate crawls.
