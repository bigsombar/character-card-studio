# Media assets

The editor stores asset **metadata** inside the card and the **binary data** in IndexedDB. This
keeps `localStorage` small and lets CHARX export read the original bytes.

## Asset metadata

`data.assets` is an array of CCv3 asset objects:

```json
{
  "type": "icon",
  "uri": "embeded://assets/icon/images/main.png",
  "name": "main",
  "ext": "png"
}
```

| Field | Meaning |
|---|---|
| `type` | `icon`, `background`, `emotion`, `user_icon`, `other`, or a custom `x_` type such as `x_audio` or `x_video`. |
| `uri` | `embeded://path` for local files, `data:` for self-contained JSON, `https://` for remote files, or `ccdefault:`. |
| `name` | Identifier used by the card. The main icon/background is always named `main`. |
| `ext` | Lowercase extension without a dot. It must match the file contents. |

Unknown asset fields are preserved verbatim.

## Supported media

| Kind | Extensions | Per-file limit |
|---|---|---|
| Image | png, jpg, jpeg, webp, avif, gif | 20 MB |
| Audio | mp3, wav, ogg | 50 MB |
| Video | mp4, webm | 250 MB |
| Other | — | 20 MB |

Files with a MIME type that does not match the extension are accepted with a warning. Empty files
and unsupported extensions are rejected.

## IndexedDB record

Each local URI maps to:

```js
{
  uri,          // embeded://assets/...
  blob,         // original file bytes
  thumb,        // optional image/video thumbnail
  mime,
  size,
  ext,
  mediaKind,    // image | audio | video | other
  name,
  updatedAt
}
```

The card only contains metadata. **Do not** expect a `embeded://` URI to resolve after clearing
browser storage or on another device — export CHARX or JSON with inlined assets for transport.

## URI resolution

| URI | Behavior |
|---|---|
| `ccdefault:` | The frontend supplies a built-in asset. Preview shows a placeholder. |
| `embeded://path` | Looked up in IndexedDB with an exact, case-sensitive match. |
| `data:image/*`, `data:audio/*`, `data:video/*` | Loaded directly. Other data types are rejected. |
| `https://` | Loaded directly; CHARX export may download it. |
| `http://` | Metadata is kept, but the editor never renders or downloads it. |
| Other schemes | Metadata is kept, no network access, and the preview reports an error. |

## UI operations

- **Add media** — drag/drop or choose files, set type and name, choose the main icon/background.
- **PNG card import** — the PNG image itself is stored as a chunk-free `assets/icon/images/main.*`
  main icon. If the embedded `ccv3` data only had `ccdefault:`, that placeholder is replaced with
  the real local asset so reload and export keep the portrait.
- **Preview/play** — images open full-size, audio has an embedded player, video has a poster and
  modal playback.
- **Replace** — replaces bytes and keeps the asset name/type; the extension may change.
- **Compress images** — resizes every locally stored PNG, JPEG and WebP asset to a shared
  megapixel target (2, 1.5, 1 or 0.5 MP). The aspect ratio is preserved, both sides snap to a
  16 px grid, and images already at or below the target are skipped instead of upscaled. GIF and
  AVIF assets are left untouched because a canvas re-encode would drop animation or change the
  format. Asset URIs and extensions stay the same; only the stored bytes change. The dialog shows
  per-file progress and closes when the batch finishes.
- **Linked media** — scans descriptions, greetings, prompts, multilingual notes and lorebook text
  for Markdown images, HTML `<img>/<audio>/<video>/<source>` tags, BBCode `[img]` and bare media
  URLs. HTTPS links are downloaded into IndexedDB and added as `other` / `x_audio` / `x_video`
  assets, then the original URLs are rewritten to `embeded://`. Downloads show progress, keep
  per-link errors with retry, and reuse an existing local file with the same deterministic name.
  The import dialog offers the same flow when an imported card contains remote media links.
  JSON export inlines these text references together with the asset list.
- **CORS-blocked hosts** — a direct browser download requires the host to send CORS headers.
  Tools → Linked media has an opt-in fallback through 10 public CORS/image services (including
  cors.dev, allOrigins, CodeTabs, cors.lol, weserv, wsrv, DuckDuckGo and Google). Files download up
  to 4 at a time, each proxy attempt has a 5-second response timeout, and proxy URLs are rotated
  across files. Image-only services are skipped for audio/video and animated GIFs are never routed
  through re-encoding proxies. Enabling the option requires a one-time risk acknowledgement stored
  in the `ccs_proxy_consent` cookie; the enabled toggle is kept in `localStorage`. Proxies can
  observe the requested URL and file contents, and impose their own size limits. The import dialog
  deliberately does not offer the proxy toggle; it only points to Tools.
- **Set as main** — exactly one icon/background is named `main`; other assets of the same type are
  renamed to `{type}-alt`.
- **Delete** — removes the card entry and the IndexedDB blob.
- **Clean orphans** — removes blobs that are not referenced by the current card. Run it after
  manual JSON edits or interrupted imports.
- **Browser storage** — shows `navigator.storage.estimate()` usage when available.

## Export behavior

| Format | Assets |
|---|---|
| CHARX | All local assets are embedded as `embeded://` files. This is the only lossless format. |
| V3 JSON | `embeded://` blobs are inlined as data URLs by default. Disabling inline keeps URIs and warns. |
| V3 PNG | Only the main icon/portrait is kept. Audio, video and extra images are omitted with a warning. The embedded asset URI is `ccdefault:`, which points to the PNG image itself; re-importing the PNG converts it back to a local main icon asset. |

## Persistence and limits

- Autosave stores the card metadata in IndexedDB/localStorage quickly after edits.
- Reloading the page keeps assets because blobs live in IndexedDB.
- Clearing site data removes assets permanently; export a backup first.
- The editor defines a 500 MB total asset budget constant (`MAX_TOTAL_ASSET_BYTES`). Browsers may
  enforce smaller quotas; the Assets panel shows `navigator.storage.estimate()` when available.
- Remote assets depend on CORS; failures are surfaced as warnings during CHARX export.
