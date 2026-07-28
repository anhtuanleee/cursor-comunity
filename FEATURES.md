# Product Differentiation Research

Updated: 2026-07-28

## What Recent already owns

Recent is a broad, curated directory spanning design, websites, OG images,
app screenshots, app icons, tools, skills, and jobs. Its strongest loop is
fast category filtering plus visual browsing. The current site also exposes
partner/deal inventory, installable design skills, and a large tool directory:

- [Recent home](https://recent.design/)
- [Recent tools](https://recent.design/tools)
- [Recent skills](https://recent.design/skills)

Trying to win by adding “more cards” or another category filter would be
incremental. Cursor Community should own the layer Recent does not emphasize:
live, social, explainable curation around each reference.

## Competitive signals

| Product | Strong behavior | Opportunity for Cursor Community |
| --- | --- | --- |
| Recent | Breadth and editorial discovery across many resource types | Add context and collaborative interpretation around each item |
| Are.na | Channels are collaborative collections of blocks with open/closed/private visibility and export | Build lightweight project boards with a decision trail, without becoming a general-purpose archive |
| Mobbin | Deep product UI references and flow-oriented research | Represent a reference as a reusable flow/pattern, not only a screenshot |
| Pinterest | Visual search can select an object or region inside an image and refine similar results | Add “find the visual reason” workflows: crop, compare, and search by visual traits |
| FigJam/Figma | Presence, cursor chat, and live collaboration reduce communication friction | Make collaborative critique the primary discovery experience |

Sources: [Are.na channels](https://help.are.na/docs/getting-started/channels),
[Are.na about/features](https://www.are.na/about),
[Pinterest visual search](https://help.pinterest.com/en/article/use-visual-search-features),
[Figma cursor chat](https://help.figma.com/hc/en-us/articles/1500004414842-Send-messages-with-cursor-chat).

## Recommended product position

> A live reference room where designers discover, compare, explain, and decide
> together.

## Prioritized feature bets

### P0 — Live critique layer

Build on the current WebSocket room and comments:

- cursor chat with live typing, Enter-to-clear, five-second ephemeral expiry;
- reactions that float beside the cursor (`love`, `useful`, `question`);
- “focus together” mode that lets one person spotlight a card for everyone;
- presence roster showing who is currently viewing the same reference.

Why it is differentiated: Recent gives users references; this turns a reference
into a shared moment of judgment and discussion.

### P1 — Project boards with decision trails

Add a persistent board model separate from the public gallery:

- save a reference to a board;
- drag references into `keep`, `maybe`, and `reject` lanes;
- record a short reason (“spacing”, “type scale”, “motion”, “not on-brand”);
- invite collaborators with viewer/editor roles;
- show a compact activity timeline.

This borrows the useful part of Are.na channels—collaborative collections and
visibility control—without copying its open-ended block system.

### P1 — Compare mode

Let users select two to four gallery cards and open a synchronized comparison:

- aligned image viewport;
- metadata and source links side by side;
- overlay cursor comments anchored to a selected card;
- keyboard navigation and shareable compare URL.

This is a direct bridge from “inspiration” to design decision-making.

### P2 — Pattern extraction

Add structured, human-confirmed fields to each reference:

- pattern: `hero`, `pricing`, `onboarding`, `navigation`, `empty-state`, etc.;
- intent: `conversion`, `trust`, `exploration`, `activation`;
- visual traits: density, contrast, motion, composition;
- “works because…” explanation.

Use these fields for explainable filters rather than an opaque popularity feed.

### P2 — Visual similarity with human controls

Start without a costly ML platform:

1. allow a crop selection on a reference;
2. derive filter chips from the selected area (`type`, `layout`, `color`,
   `density`);
3. return tagged/curated matches;
4. later replace the matching layer with embeddings or a vision API.

The differentiator is the explanation and editable traits, not just “similar
image” ranking.

### P3 — Capture and contribution loop

- browser bookmarklet/share sheet to submit a URL;
- automatic screenshot/OG extraction;
- contributor credit and source provenance;
- duplicate detection;
- moderation queue;
- weekly community collections.

This makes the community a living curator network instead of a read-only feed.

## Data model direction

Keep public synced `items` read-only. Add separate tables:

```text
boards
board_members
board_items
board_decisions
reactions
activity_events
```

Keep ephemeral presence/chat in Durable Objects. Keep board decisions,
reactions, and activity in PostgreSQL. This preserves the clean split between
live collaboration and durable knowledge.

## Suggested first release

Ship these together as a coherent differentiator:

1. Figma-like cursor chat;
2. one-click reactions;
3. save-to-board;
4. keep/maybe/reject lanes;
5. short decision reason;
6. shareable board URL.

Avoid starting with generic follows, likes, profiles, or an AI feed. Those are
easy to copy, add moderation pressure, and do not use the realtime advantage
already present in this codebase.
