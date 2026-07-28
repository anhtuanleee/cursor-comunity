# Creative Content Ingestion Plan

Updated: 2026-07-28

## Product goal

Build a curated creative feed from publisher-provided design sources. The
product does not ingest from social networks.

## Active sources

| Source | Access strategy | Scope |
| --- | --- | --- |
| Recent | Existing public JSON endpoint | Design references |
| Codrops | Publisher RSS feed + same-origin Open Graph cover | Creative development and motion |
| Sidebar | Public RSS feed | Curated design and maker links |
| One Page Love | Publisher RSS feed | Website and landing-page inspiration |
| Smashing Magazine | Publisher RSS feed | UX, web design, and frontend |
| Creative Boom | Publisher RSS feed | Branding, graphic design, and illustration |
| Design Milk | Publisher RSS feed | Product, interior, and architecture |
| CSS-Tricks | Publisher RSS feed | CSS, UI, and frontend |
| Designboom | Publisher RSS feed | Art, design, and architecture |
| UX Collective | Medium RSS feed | UX and product design |
| Muzli Magazine | Medium RSS feed | Visual design inspiration |
| Speckyboy | Publisher RSS feed | UI and web-design resources |
| Webdesigner Depot | Publisher RSS feed | Web and UI design |
| Hongkiat | Publisher RSS feed | Design/development resources |
| Abduzeedo | FeedBurner RSS feed | Branding, illustration, and 3D |

Design Shack is excluded because it currently returns a bot challenge; AIGA Eye
on Design is excluded because its supplied feed URL returns 404. FWA, Awwwards,
and CSS Design Awards remain manual-only until a publisher feed,
official API, or written permission is available. Do not scrape login walls,
private endpoints, or publisher content that does not permit automated access.

## Runtime architecture

```text
GitHub Actions schedule
  → authenticated Vercel ingestion endpoint
  → source checkpoints and raw_items
  → normalized gallery items
```

Cloudflare Workers only provides realtime cursor/chat on the Free plan. It does
not run crawling work because Free cron invocations have an insufficient CPU
budget for database-backed ingestion.

## Quality gate

Publish only entries with a canonical source URL and a valid visual asset.
Retain source provenance, dedupe by source/external ID, keep a crawl history,
and display link-based references rather than rehosting publisher media.
