# Release checklist

## Preflight

```powershell
npm ci
npm run lint
npm run test:run
npm run build
```

Required result:

- ESLint: 0 errors, 0 warnings.
- Vitest: all tests pass, including CHARX security, large-asset, axe and export-validation tests.
  The current suite has 320 tests across 51 files.
- Build: no chunk-size warning; the main JS chunk should stay around 355 kB raw and under 150 kB
  gzip.

## Manual smoke test

Use both a fresh project and an imported card.

1. Import V2 JSON and V2 PNG; confirm the upcast warning and V3 state.
2. Import a V3 CHARX with image, audio and video; preview and play each file.
3. Import a PNG with a `ccv3` chunk; confirm the image becomes the main icon asset and the card
   fields load.
4. Import a PNG that contains both `ccv3` and a differing `chara` copy; confirm the copy chooser
   appears and that V3 is preselected. Confirm an identical pair imports without a chooser.
5. Reload the page; confirm the card and assets are restored.
6. Edit every section; confirm help tooltips open on hover and keyboard focus.
7. Switch sections with `Alt+1 … Alt+9`; on a narrow viewport, use the bottom navigation and the
   **More** sheet.
8. Toggle **Show portrait** on desktop and confirm Lorebook and Assets keep the full editor width.
9. Resize the portrait with the megapixel dialog and confirm the displayed/exported size changes.
10. Add, replace and delete assets; run batch image compression and confirm presets that would not
    shrink anything are hidden.
11. Use Tools → Linked media on a card with HTTPS images; test direct download, retry and the
    opt-in proxy fallback.
12. Add, duplicate, reorder and delete lorebook entries; toggle **Advanced JSON** in the Lorebook
    header. Confirm expansion follows the same entry after a reorder.
13. Run **Sync labels** on entries with a missing name or comment and confirm conflicting non-empty
    labels stay untouched.
14. Run **Remove emphasis markup** and confirm `*…*`, `**…**` and `***…***` are stripped while
    literal asterisks and unclosed markers remain.
15. Import and export a standalone lorebook JSON.
16. Export CHARX; inspect the ZIP for `card.json` and `assets/...` paths.
17. Re-import the exported CHARX; confirm assets and metadata round-trip.
18. Export V3 JSON with inline assets; confirm it parses and validates.
19. Export V3 PNG; confirm the lossy warning and that the PNG contains only `ccv3`.
20. Try an invalid card in Advanced raw JSON; confirm export is blocked and errors are visible.
21. Check Assets → Clean orphans and the storage estimate.
22. Run Lighthouse on Character, Assets, Advanced and the export dialog.
23. Test at 1280, 1024, 899 and 375 px widths.

## Security checks

- CHARX with `../` entry paths is rejected.
- Encrypted CHARX is rejected.
- Corrupt CHARX shows a readable error.
- HTTP asset URIs are not rendered or downloaded.
- `data:text/html` asset URIs are rejected.
- Unknown asset URI schemes are preserved but never loaded.
- Oversized archives and entry counts are rejected before extraction.
- ZIP-slip, zip-bomb and encrypted-archive protections remain enabled.

## Performance checks

- Main JS chunk around 355 kB raw / under 150 kB gzip.
- Sections, zip.js and image compression are lazy-loaded chunks.
- A 50 MB CHARX/asset import completes with progress and without freezing the tab.
- Media grid uses thumbnails; full files load only in the preview dialog.
- Object URLs are revoked when previews unmount.

Last measured on 2026-11-22 (production build, Chromium on Windows):

| Check | Result |
|---|---|
| Main JS bundle | 354.55 kB raw / **112.39 kB gzip** |
| Test suite | **320 passed / 320** |
| Reload trace (4.8 s) | **0 long tasks** (2026-11-16) |
| 20 MB CHARX import | ~150 ms, max timer gap 25 ms (2026-11-16) |
| 50 MB CHARX import | completed successfully with progress (2026-11-16) |
| 20 MB CHARX export blob | 20,972,222 bytes, ZIP signature `50 4b 03 04` (2026-11-16) |
| Lighthouse Accessibility | 100 on Character, Assets, Advanced and export dialog (2026-11-16) |

Re-run the import/export measurements after changing the archive, PNG or asset pipelines.

## Documentation

- `README.md` links to `docs/CHARX.md`, `docs/ASSETS.md`, `docs/DESIGN.md`, `docs/RELEASE.md` and
  the CCv3 specification.
- Known limitations are listed honestly.
- Example cards are SFW and contain no copyrighted characters.

## CI and deployment

- Repository Actions are enabled.
- GitHub Pages is enabled with **Source: Deploy from a branch → `gh-pages`**.
- GitHub Actions `CI` is green on `main`.
- GitHub Actions `Deploy to GitHub Pages` succeeds.
- Open `https://bigsombar.github.io/character-card-studio/` directly.
- Confirm favicon, manifest, theme color `#272727`, and that all lazy chunks load from the
  `/character-card-studio/` base path.
- `npm run preview` serves the production build at `http://localhost:4173/character-card-studio/`.

## Icon and attribution

The site uses the Icons8 “Anime” icon, recolored to the site palette. The sidebar badge is rendered
at 48×48 px, and the same artwork is exported to `favicon.ico`, `favicon.svg`, `logo192.png`,
`logo512.png` and `apple-touch-icon.png`.

The required attribution is present in the site footer in small, semi-transparent text:

```html
<a target="_blank" href="https://icons8.com/icon/MTivAq0U9TSN/anime">Anime</a> icon by
<a target="_blank" href="https://icons8.com">Icons8</a>
```

On mobile the same attribution appears in the **More** sheet. This attribution is a condition of
the free Icons8 license and must remain visible.

## Release

1. Decide the version. The current package version is `0.1.0`; use `1.0.0` for the first public
   stable release.
2. Update `package.json` and `package-lock.json`.
3. Commit as `chore: release vX.Y.Z`.
4. Create an annotated tag and push it.
5. Publish release notes with supported formats, breaking changes and known limitations.

## Rollback

- Revert the release commit and let the deploy workflow rebuild Pages.
- Keep the previous CHARX/JSON exports; they are forward-compatible.
- If a bad archive slips through, the importer warns and preserves metadata rather than silently
  overwriting the current card.
