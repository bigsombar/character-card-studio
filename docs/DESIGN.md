# Design system

The editor is dark-only by design. This document records the visual, layout and accessibility rules
so new sections stay consistent.

## Palette

| Token | Hex | Use |
|---|---|---|
| Background | `#272727` | Canvas and shell |
| Deep background | `#1E1E1E` | Inputs, code, media wells |
| Surface | `#2F2F2F` | Panels, dialogs, accordions |
| Raised surface | `#363636` | Hover states and nested panels |
| Border | `#404040` | Dividers and outlines |
| Text | `#F2F0E9` | Primary copy |
| Muted text | `#B3B3B3` | Secondary copy, labels |
| Disabled text | `#747474` | Disabled affordances only |
| Yellow | `#FFE400` | Primary action, focus ring, active navigation |
| Orange | `#FF652F` | Errors and destructive actions |
| Jade | `#14A76C` | Success, main asset, secondary accent |
| On accent | `#171717` | Text on yellow/jade |

No purple and no light theme. Color is never the only signal: errors and warnings always include an
icon and a text label. Palette values come from `src/theme/tokens.js`.

## Typography

- Display: Space Grotesk for headings and the card name.
- Body: Inter.
- Monospace: JetBrains Mono for IDs, URIs, sizes and raw JSON.
- Labels are uppercase, small and letter-spaced; field names stay outside the input border.

## Layout

```text
┌──────────────────────────────────────────────┐
│ Top bar: name, save state, spec, Export      │
├──────┬───────────────────────────────────────┤
│ Rail │ Toolbar: card file, portrait controls │
│      ├──────────────┬────────────────────────┤
│      │ Portrait     │ Section header         │
│      │ (400 px)     │ Scrollable fields      │
│      │              │                        │
└──────┴──────────────┴────────────────────────┘
```

- Desktop uses the vertical rail. Below the `md` breakpoint (900 px) the rail is replaced by a
  bottom navigation bar.
- `Alt+1 … Alt+9` switches sections on desktop.
- Mobile bottom navigation keeps Character, Greetings, Lorebook and Assets in thumb reach; Creator,
  Prompts, Groups, Tools and Advanced live in the **More** sheet.
- The portrait column is 400 px wide on desktop when enabled. It is hidden for Lorebook and Assets,
  and on mobile except for the compact portrait shown on the Character section.
- The content column is the only scroll container; the shell never scrolls horizontally.

## Field pattern

Every editable field uses:

1. `FieldLabel` with an uppercase caption.
2. `InfoTooltip` from `content/fieldHelp.js`.
3. An input, textarea or select.
4. Optional helper text for counts/errors.

`CardTextInput` binds a field to card state; `DeferredTextInput` provides the local draft, debounce,
auto-growing textarea and macro highlighting. Multiline fields grow with their content so long
descriptions, greetings and lorebook entries stay visible without manual resizing.

Help entries must stay short: what the field does, what it affects, and a tiny example where useful.
Adding a card field without a help entry should fail review.

## Feedback

- `NotificationContext` + `NoticeDialog` for import/export/asset results.
- `ValidationPanel` for structural errors and warnings.
- Errors block export; warnings do not.
- Destructive actions use `ConfirmActionDialog`.
- Empty states explain the next action instead of showing a blank panel.

## Accessibility

- All icon-only buttons have `aria-label`.
- Dialogs use `aria-labelledby` and `aria-describedby` where appropriate.
- Tooltips are keyboard reachable and set `aria-describedby`.
- Focus rings use `#FFE400` with a visible offset.
- Status uses icon + text, not color alone.
- The theme respects `prefers-reduced-motion`.
- Target: Lighthouse Accessibility 100 and `axe-core` smoke tests with no violations.
- Color contrast is checked with Lighthouse rather than jsdom.

## Responsive behavior

Breakpoints follow MUI defaults; the shell switches to mobile below `md`.

| Width | Behavior |
|---|---|
| ≥ 1200 (`lg`) | Full desktop workspace; portrait column and two-column field grids. |
| 900–1199 (`md`) | Desktop rail and portrait column; narrower workspace and grids. |
| < 900 (`md` down) | Mobile shell: bottom navigation, compact portrait on Character, portrait hidden elsewhere. |
| 375 | Single column, toolbar wraps, dialogs use full width. |

Lorebook and Assets always use the full editor width and never show the portrait column.

## Component map

| Component | Responsibility |
|---|---|
| `AppProviders` | Theme, error boundary and data providers. |
| `AppShell` | Rail or mobile navigation, top bar, workspace and footer. |
| `CardWorkspace` | Section routing, import/export dialogs, portrait column and lorebook header actions. |
| `CardTextInput` | Card field bound to `CardStoreContext`. |
| `DeferredTextInput` | Debounced text input with macro highlighting. |
| `CardFilePicker` | Card file strip and hidden file input. |
| `ConfirmActionDialog` | Accessible confirmation dialog for destructive actions. |
| `EmbeddedCardDialog` | Chooses between differing V3 and V2 payloads in one PNG. |
| `PortraitResizeDialog` | Megapixel portrait resizing. |
| `BookFieldInputs` | Shared lorebook metadata and entry fields. |

## Voice and copy

- Concise, direct, no marketing language.
- Explain consequences ("This cannot be undone") before destructive actions.
- Say what is preserved and what is lost, especially for PNG export.
- Never imply the editor runs decorators, macros or CBS scripts.
