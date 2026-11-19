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
- Build: no chunk-size warning; main bundle should stay under the 350 KB gzip budget.

## Manual smoke test

Use both a fresh project and an imported card.

1. Import V2 JSON and V2 PNG; confirm the upcast warning and V3 state.
2. Import a V3 CHARX with image, audio and video; preview and play each file.
3. Reload the page; confirm the card and assets are restored.
4. Edit every section; confirm help tooltips open on hover and keyboard focus.
5. Export CHARX; inspect the ZIP for `card.json` and `assets/...` paths.
6. Re-import the exported CHARX; confirm assets and metadata round-trip.
7. Export V3 JSON with inline assets; confirm it parses and validates.
8. Export V3 PNG; confirm the lossy warning and that the PNG contains only `ccv3`.
9. Try an invalid card in Advanced raw JSON; confirm export is blocked and errors are visible.
10. Check Assets → Clean orphans and the storage estimate.
11. Run Lighthouse on Character, Assets, Advanced and the export dialog.
12. Test at 1280, 1024, 768 and 375 px widths.

## Security checks

- CHARX with `../` entry paths is rejected.
- Encrypted CHARX is rejected.
- Corrupt CHARX shows a readable error.
- HTTP asset URIs are not rendered or downloaded.
- `data:text/html` asset URIs are rejected.
- Unknown asset URI schemes are preserved but never loaded.
- Oversized archives and entry counts are rejected before extraction.

## Performance checks

- Main bundle under 350 KB gzip.
- Sections, zip.js and image compression are lazy-loaded chunks.
- A 50 MB CHARX/asset import completes with progress and without freezing the tab.
- Media grid uses thumbnails; full files load only in the preview dialog.
- Object URLs are revoked when previews unmount.

Measured on 2026-11-16 (production build, Chromium on Windows):

| Check | Result |
|---|---|
| Main JS bundle | 422.56 kB raw / **138.54 kB gzip** |
| Reload trace (4.8 s) | **0 long tasks** |
| 20 MB CHARX import | ~150 ms, max timer gap 25 ms |
| 50 MB CHARX import | completed successfully with progress |
| 20 MB CHARX export blob | 20,972,222 bytes, ZIP signature `50 4b 03 04` |
| Lighthouse Accessibility | 100 on Character, Assets, Advanced and export dialog |

## Documentation

- `README.md` links to `docs/CHARX.md`, `docs/ASSETS.md` and `docs/DESIGN.md`.
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

This attribution is a condition of the free Icons8 license and must remain visible.

## Release

1. Decide the version (recommended: `1.0.0` for the first release candidate).
2. Update `package.json` and `package-lock.json`.
3. Commit as `chore: release vX.Y.Z`.
4. Create an annotated tag and push it.
5. Publish release notes with supported formats, breaking changes and known limitations.

## Rollback

- Revert the release commit and let the deploy workflow rebuild Pages.
- Keep the previous CHARX/JSON exports; they are forward-compatible.
- If a bad archive slips through, the importer is designed to warn and preserve metadata rather
  than overwrite the current card silently.
