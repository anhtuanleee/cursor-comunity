# Realtime Feature Options

Updated: 2026-07-28

## Product direction

The strongest position is not “another inspiration gallery.” It is a shared
reference room where a team can browse, critique, compare, and make a design
decision together.

## Option A — Live reactions

Users tap a compact reaction beside the cursor:

- useful;
- love;
- question;
- too much;
- save.

The reaction floats briefly beside the cursor. Aggregate counts are visible on
the card and persist after the room closes.

Realtime state: ephemeral animation in Durable Objects.  
Persistent state: aggregate and per-user reaction in PostgreSQL.  
Effort: small.  
Differentiation: medium.

## Option B — Focus together

One user selects a card and starts a focus session:

- the selected card receives a clear focus ring;
- other cards dim slightly;
- everyone is scrolled to the card only after explicitly joining follow mode;
- cursor chat remains available around the focused card;
- focus ownership can be passed to another participant.

Never force-scroll users who did not opt in. Show a “Join focus” control instead.

Realtime state: active card, presenter, followers, and focus lifecycle.  
Persistent state: optional session event only.  
Effort: medium.  
Differentiation: high.

## Option C — Realtime shortlist board

Create a room-specific board with three lanes:

```text
keep | maybe | reject
```

Dragging a gallery item updates every participant immediately. Each move can
include a short decision reason. The final board has a shareable URL and a
decision timeline.

Realtime state: optimistic item movement and active drag presence.  
Persistent state: board, lane, rank, decision reason, actor, timestamp.  
Effort: medium-high.  
Differentiation: very high.

## Option D — Compare room

Select two to four references and compare them in synchronized view:

- aligned viewport;
- independent or synchronized zoom;
- cursor comments anchored to a specific reference;
- metadata, source, tags, and saved rationale side by side;
- shareable compare URL.

Realtime state: selected references, zoom/pan mode, active reference, cursors.  
Persistent state: compare set and comments.  
Effort: high.  
Differentiation: very high.

## Option E — Live design tour

A curator records or hosts a short guided tour:

- sequence of gallery cards;
- presenter notes;
- optional follow-presenter mode;
- live cursor and reactions;
- replay as a lightweight story after the session.

Realtime state: presenter, current step, playback position, attendees.  
Persistent state: tour steps and notes.  
Effort: high.  
Differentiation: high.

## Option F — Presence-aware discovery

Use live activity as a transparent ranking signal:

- “3 people are discussing this”;
- “trending in this room”;
- active-card indicator in the gallery;
- recent room decisions, not a black-box global feed.

Do not expose precise identities outside the room. Presence expires quickly.

Realtime state: anonymous room activity counters.  
Persistent state: coarse hourly aggregates only.  
Effort: small-medium.  
Differentiation: medium.

## Recommended release

Ship one coherent workflow:

1. Live reactions.
2. Focus together with opt-in follow.
3. Keep/maybe/reject board.
4. Short decision reason.
5. Shareable final board.

This creates a complete loop:

```text
discover → discuss → focus → decide → share
```

## Architecture boundary

Keep ephemeral, high-frequency state in Durable Objects:

- cursor position;
- cursor chat;
- typing/presence;
- active focus;
- drag preview;
- temporary reactions.

Keep durable product knowledge in PostgreSQL:

- boards and members;
- lane positions;
- decision reasons;
- comments;
- reaction records;
- activity timeline.

Use sequence numbers or versions for every shared mutation. Clients apply
optimistic changes and reconcile with the server-authoritative version.

## Success metrics

- rooms with two or more active participants;
- references discussed per room;
- reactions that become board saves;
- boards reaching a final decision;
- time from first reference view to final shortlist;
- shared board return visits.

