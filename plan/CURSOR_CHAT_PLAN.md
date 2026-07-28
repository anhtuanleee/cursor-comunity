# Cursor Chat Case Plan

Updated: 2026-07-28  
Reference: [Figma handoff, node 45:335](https://www.figma.com/design/gEYQOZliBOBgHFUmBTJH5o/Figma-Cursor-Chat---More-Detailed-Handoff-Design-to-Developers--Community-?node-id=45-335&m=dev)

## Goal

Cursor chat should feel attached to the pointer without hiding the pointer,
remain readable over any gallery image, and never jump or flicker when it
changes side. Local input and remote messages must use the same placement and
visual rules.

## Placement model

Treat the pointer tip as the anchor. Test four candidates in this order:

1. right and below;
2. left and below;
3. right and above;
4. left and above.

For every candidate, measure the real bubble rectangle and calculate:

- viewport overflow;
- overlap with the cursor shape;
- overlap with the safe viewport inset;
- movement from the previously selected placement.

Choose the lowest-score candidate. Use a `1rem` hysteresis zone before changing
side so a cursor moving along an edge does not make the bubble flicker.

### Placement invariants

- Cursor-to-bubble gap: `0.75rem`.
- Viewport safe inset: `0.75rem`.
- Bubble width: content width, minimum `9.375rem`, maximum `22.5rem`.
- The tail points toward the cursor and moves to the corresponding corner.
- Remaining overflow after flipping is clamped inside the safe viewport.
- Placement is recomputed after text width changes, viewport resize, zoom, and
  root font-size changes.

## Visual cases

| Case | Bubble position | Corner connected to cursor |
| --- | --- | --- |
| Enough space right/below | Right/below | Top-left |
| Near right edge | Left/below | Top-right |
| Near bottom edge | Right/above | Bottom-left |
| Near bottom-right corner | Left/above | Bottom-right |

The bubble background and cursor fill use the same user color. Text switches
between black and white based on contrast. A subtle white outline and restrained
shadow preserve the silhouette over light and dark media.

## Interaction state machine

```text
idle
  └─ "/" → composing-empty
composing-empty
  ├─ type → composing-text
  ├─ Escape / outside click / idle timeout → exited
  └─ Enter → composing-empty
composing-text
  ├─ type → composing-text
  ├─ Enter → composing-empty + remote clear
  ├─ 5s no input → composing-empty + remote clear
  └─ Escape / outside click → exited
disconnected
  └─ reconnect → restore active non-empty draft once
```

Rules:

- `/` never opens while focus is inside an input, textarea, or editable region.
- IME composition must not submit on Enter.
- Text is limited to 280 characters.
- Remote chat expires five seconds after its last update.
- Sequence numbers prevent an older update from restoring a cleared message.

## Movement and lifecycle cases

- First pointer movement: mount directly at the measured position.
- Pointer leaves and re-enters viewport: never animate from `(0,0)`.
- Window loses focus: hide local cursor but retain an active draft.
- Remote update latency: interpolate only between two valid positions.
- Remote disconnect: remove cursor and message together.
- Reconnect: rebuild presence from room state before showing the cursor.
- Reduced motion: disable cursor interpolation and bubble scale animation.
- Touch/coarse pointer: do not display the custom cursor; expose another entry
  point if cursor chat is needed on touch devices.

## Implementation slices

1. Build a shared `useCursorChatPlacement` hook using `ResizeObserver`.
2. Replace separate local/remote positioning logic with that hook.
3. Extract one shared bubble shell for color, outline, tail, and placement.
4. Keep local input and remote text as bubble-shell content variants.
5. Add deterministic tests for every edge/corner candidate.
6. Add Playwright tests for leave/re-enter, resize, zoom, long text, IME, and
   reconnect.

## Acceptance tests

- Bubble does not overflow at all four viewport corners.
- Moving horizontally across the flip boundary changes side once, without
  repeated oscillation.
- Typing from one character to 280 characters does not cover the pointer.
- Local and remote rendering choose the same side for identical geometry.
- Re-entering the viewport produces no visible `(0,0)` movement.
- Root font size at 100%, 125%, and 150% preserves the intended gap.

