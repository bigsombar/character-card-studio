# Design system

The editor is dark-only by design. This document records the visual and accessibility rules so
new sections stay consistent.

## Palette

| Token | Hex | Use |
|---|---|---|
| Background | `#272727` | Canvas and shell |
| Deep background | `#1E1E1E` | Inputs, code, media wells |
| Surface | `#2F2F2F` | Panels, dialogs, accordions |
| Border | `#404040` | Dividers and outlines |
| Text | `#F2F0E9` | Primary copy |
| Muted text | `#B3B3B3` | Secondary copy, labels |
| Disabled text | `#747474` | Disabled affordances only |
| Yellow | `#FFE400` | Primary action, focus ring, active navigation |
| Orange | `#FF652F` | Errors and destructive actions |
| Jade | `#14A76C` | Success, main asset, secondary accent |
| On accent | `#171717` | Text on yellow/jade |

No purple and no light theme. Color is never the only signal: errors and warnings always include an
icon and a text label.

## Typography

- Display: Space Grotesk for headings and the card name.
- Body: Inter.
- Monospace: JetBrains Mono for IDs, URIs, sizes and raw JSON.
- Labels are uppercase, small and letter-spaced; field names stay outside the input border.

## Layout

```text
┌────────────────────────────────────────────┐
│ Top bar: name, save state, spec, Export    │
├──────┬─────────────────────────────────────┤
│ Rail │ Toolbar: import, portrait, JSON      │
│      ├──────────────┬──────────────────────┤
│      │ Portrait     │ Section header       │
│      │              │ Scrollable fields    │
│      │              │ Footer: size/status  │
└──────┴──────────────┴──────────────────────┘
```

- Vertical rail only; the old horizontal tabs are gone.
- `Alt+1 … Alt+9` switches sections.
- The portrait column collapses below the editor on narrow screens.
- The content column is the only scroll container; the shell never scrolls horizontally.

## Field pattern

Every editable field uses:

1. `FieldLabel` with an uppercase caption.
2. `InfoTooltip` from `content/fieldHelp.js`.
3. An input or select.
4. Optional helper text for counts/errors.

Help entries must stay short: what the field does, what it affects, and a tiny example where useful.
Adding a card field without a help entry should fail review.

## Feedback

- `NotificationContext` + `NoticeDialog` for import/export/asset results.
- `ValidationPanel` for structural errors and warnings.
- Errors block export; warnings do not.
- Destructive actions use `ConfirmationDialog`.
- Empty states explain the next action instead of showing a blank panel.

## Accessibility

- All icon-only buttons have `aria-label`.
- Dialogs use `aria-labelledby`.
- Tooltips are keyboard reachable and set `aria-describedby`.
- Focus rings use `#FFE400` with a visible offset.
- Status uses icon + text, not color alone.
- The theme respects `prefers-reduced-motion`.
- Target: Lighthouse Accessibility 100 and `axe-core` smoke tests with no violations.
- Color contrast is checked with Lighthouse rather than jsdom.

## Responsive behavior

Breakpoints follow MUI defaults:

| Width | Behavior |
|---|---|
| ≥ 1280 | Three-column workspace with portrait. |
| 1024 | Portrait narrows, fields switch to two columns. |
| 768 | Portrait stacks above the section; grids collapse. |
| 375 | Single column, toolbar wraps, dialogs use full width. |

## Voice and copy

- Concise, direct, no marketing language.
- Explain consequences ("This cannot be undone") before destructive actions.
- Say what is preserved and what is lost, especially for PNG export.
- Never imply the editor runs decorators, macros or CBS scripts.
