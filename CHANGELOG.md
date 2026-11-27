# Changelog

All notable changes to Character Card Studio are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-11-27

### Added

- Change the type of a local asset from its details dialog. The editor moves the blob and URI to
  the matching `assets/<type>/...` path, rewrites embedded references in card text, and preserves
  the `main` rules. The only main icon cannot change type until another icon exists.
- Automated Cloudflare Workers deployment on published GitHub releases. GitHub Pages is now the
  `noindex` development playground.

### Changed

- Canonical, Open Graph, Twitter and JSON-LD URLs now point to
  `https://character-card-studio.bigsombar.workers.dev/`.
- Search verification codes are hostname-specific; page titles are brand-only.
- GitHub Pages shows a DEV-build footer linking to the release build.

### Fixed

- `main` badges no longer appear on non-icon/background assets named `main`.

## [1.0.0] - 2026-11-27

First stable release and baseline for future changes.

### Added

- Complete Character Card V3 editing: character details, greetings, group greetings, system prompt,
  post-history instructions, tags, multilingual creator notes, source links and raw JSON.
- Full lorebook workspace with keys, secondary keys, regex triggers, ordering, priorities,
  per-entry extensions, drag reordering and **Add similar**.
- Media library for images, audio and video, including main icon selection, linked-media download,
  batch compression and orphan cleanup.
- Export to CHARX, V3 JSON (with inline media) and V3 PNG, with validation before export.
- Import of V3 CHARX/JSON/PNG and automatic V2 PNG/JSON upcast to V3.
- Local-first IndexedDB storage with no account, backend or telemetry.
- Responsive desktop and mobile layouts, keyboard shortcuts and field-level help.

### Security

- ZIP-slip, zip-bomb and encrypted-archive protections for CHARX.
- PNG signature, length and CRC-32 validation for embedded card chunks.
- External assets are never fetched automatically; only HTTPS URIs on explicit user action.
- Unknown card and per-entry `extensions` fields are preserved on round-trip.

### Known limitations

- V3 PNG export embeds only the card and main icon; other media requires CHARX or JSON.
- V2 export is intentionally not supported.
- Browser storage is per-browser and is removed when site data is cleared.

[Unreleased]: https://github.com/bigsombar/character-card-studio/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/bigsombar/character-card-studio/releases/tag/v1.1.0
[1.0.0]: https://github.com/bigsombar/character-card-studio/releases/tag/v1.0.0
