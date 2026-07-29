# Signal Room Design System

This project uses a content-first, achromatic design system inspired by Recent.
The interface should feel like a quiet digital gallery: clear hierarchy,
generous whitespace, restrained elevation, and no decorative color competing
with the work.

## Foundations

### Color

| Token | Value | Role |
| --- | --- | --- |
| `background` | `#FFFFFF` | Page and primary surfaces |
| `foreground` | `#000000` | Primary text |
| `charcoal` | `#202020` | Primary controls and softened dark text |
| `neutral-50` | `#FCFCFC` | Delicate high-value surface |
| `neutral-100` | `#F9F9F9` | Ghost surface |
| `neutral-150` | `#F7F7F7` | Card surface |
| `neutral-200` | `#F2F2F2` | Alternate surface |
| `neutral-250` | `#F0F0F0` | Secondary control surface and divider |
| `neutral-500` | `#8D8D8D` | Secondary text, placeholder, form border |

The product palette is exclusively black, white, and gray. User cursor colors
are presence metadata and are the only intentional exception.

### Typography

Use Inter with the system sans-serif fallback stack.

| Role | Size / line-height | Weight |
| --- | --- | --- |
| Display | `24px / 32px` | 500 |
| Heading 1 | `20px / 30px` | 500 |
| Heading 2 | `15px / 22.5px` | 500 |
| Body | `14px / 21px` | 400 |
| Button | `13px / 19.5px` | 400 |
| Caption | `12px / 18px` | 400 |
| Overline | `11px / 16.5px`, `0.5px` tracking | 500 |

Prefer weight and spacing over additional colors to communicate hierarchy.

### Spacing

Use a `4px` base unit: `4, 8, 12, 16, 20, 24, 32, 48`.

- Component padding: `12–16px`
- Component gap: `8–12px`
- Section gap: `24–32px`
- Page padding: `16px` mobile, `20px` tablet, `32px` desktop
- Gallery gutter: `20px`
- Main content max-width: `1280px`

### Radius

- Gallery images: `0`
- Navigation and badges: `6px`
- Inputs: `10px`
- Cards and modals: `12px`
- Pill buttons: `9999px`

## Components

### Buttons

- Primary: charcoal background, almost-white text, `28px` height, `12px`
  horizontal padding, pill radius.
- Secondary: `#F0F0F0` background and charcoal text.
- Ghost/navigation: transparent background with a quiet `#F7F7F7` hover.
- Transitions use `150–200ms`; avoid dramatic color or scale changes.

### Inputs

Inputs are `32px` high with a white background, `1px #8D8D8D` border,
`10px` radius, and `12px` horizontal padding. Focus uses a black border and a
`3px rgba(0,0,0,.08)` ring.

### Gallery

Gallery media remains square-cornered and visually dominant. Metadata is
spaced beneath it. Hover may use a subtle `1.02` scale and a restrained shadow.
The responsive layout is one column on mobile, two to three on tablet, four to
six on desktop, capped at `1280px`.

### Modal and floating panels

Use white surfaces, `12px` radius, a light divider, and
`0 10px 40px rgba(0,0,0,.1)` elevation. Backdrops use black at 50% opacity.

### Cursor chat

Cursor chat is ephemeral presence UI, not a stored comment. Its bubble is black
with white text and outline, uses the body type scale, sizes to its content, and
flips around viewport edges. The bubble remains visually subordinate to gallery
content.

## Responsive and accessibility rules

- Interactive touch targets are at least `44px` on touch/coarse-pointer devices.
- Mobile uses a single gallery column and `16px` page padding.
- Tablet uses two to three columns and `20px` page padding.
- Desktop uses four to six columns and `32px` page padding.
- Preserve at least 4.5:1 text contrast.
- Every interactive control needs a visible keyboard focus state.
- Never rely on placeholder text as a form label when the field's purpose is not
  otherwise clear.
- Avoid stacked shadows and decorative elements that compete with gallery work.
