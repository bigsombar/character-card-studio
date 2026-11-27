# Media assets

The editor keeps asset **metadata** in `card.data.assets` and the **binary data** in IndexedDB.
This keeps the card JSON small and lets CHARX export write the original bytes.

## Asset metadata

Each entry follows the CCv3 asset shape:

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
| `type` | Image: `icon`, `background`, `emotion`, `user_icon`, `other`. Audio: `x_audio`, `x_voice`, `x_sfx`, `x_bgm`, `other`. Video: `x_video`, `x_background`, `other`. Custom `x_` types are preserved. |
| `uri` | `embeded://path` for local files, `data:` for self-contained JSON, `https://` for remote files, `ccdefault:` for a frontend-provided asset, or another scheme that is preserved but not loaded. |
| `name` | Identifier used by the card. The selected icon or background is named `main`; other assets can use any name. |
| `ext` | Lowercase extension without a dot. It must match the file contents. |

Unknown asset fields are preserved verbatim during editing and export.

## Supported media

| Kind | Extensions | Per-file limit |
|---|---|---|
| Image | `png`, `jpg`, `jpeg`, `webp`, `avif`, `gif` | 20 MB |
| Audio | `mp3`, `wav`, `ogg` | 50 MB |
| Video | `mp4`, `webm` | 250 MB |

Files added through the editor must use these extensions. A MIME type that does not match the
extension is accepted with a warning; empty files and unsupported extensions are rejected. An asset
with type `other` still uses one of the supported image, audio or video files — it is an asset role,
not an arbitrary file format. A CHARX archive can carry additional referenced files under `other/`;
they are stored and exported as-is.

## IndexedDB record

Each local URI maps to an `AssetRecord`:

```js
{
  uri,          // embeded://assets/...
  blob,         // original or resized file bytes
  thumb,        // optional image/video thumbnail
  mime,
  size,
  ext,
  mediaKind,    // image | audio | video | other
  name,
  updatedAt     // set by the storage layer
}
```

The card only contains metadata. An `embeded://` URI is local to this browser profile: it will not
resolve after clearing site data or on another device. Export CHARX, or JSON with inlined assets, to
move the media elsewhere.

## URI resolution

| URI | Behavior |
|---|---|
| `ccdefault:` | The frontend supplies a built-in asset. Preview shows a placeholder. |
| `embeded://path` | Looked up in IndexedDB with an exact, case-sensitive match. |
| `data:image/*`, `data:audio/*`, `data:video/*` | Loaded directly. Other data types are rejected. |
| `https://` | Loaded only when the user previews it or explicitly embeds it during export/import. |
| `http://` | Metadata is kept, but the editor never renders or downloads it. |
| Other schemes | Metadata is kept, no network access, and the preview reports an error. |

Remote media is never fetched automatically when a card is loaded. Connected-media imports and
CHARX export require an explicit action.

## UI operations

- **Add media** — choose files, set type and name, and optionally choose the main icon or
  background. The file picker accepts the image, audio and video extensions listed above.
- **PNG card import** — the PNG image itself is stored as a chunk-free
  `assets/icon/images/main.*` main icon. If the embedded `ccv3` data only had `ccdefault:`, that
  placeholder is replaced with the real local asset so reload and export keep the portrait.
- **Preview/play** — images open full-size, audio has an embedded player, video has a poster and
  modal playback.
- **Change type** — local `embeded://` assets expose a type selector in the details dialog. The
  editor moves the blob and URI to the matching `assets/<type>/...` folder, rewrites embedded URI
  references in the card, and preserves the `main` rules. The only main icon cannot change type
  until another icon exists. Remote, `data:` and `ccdefault:` assets keep their URI and do not show
  the selector.
- **Replace** — replaces bytes and keeps the asset name/type; the extension may change.
- **Compress images** — resizes locally stored PNG, JPEG and WebP assets to a shared megapixel
  target (2, 1.5, 1 or 0.5 MP). Presets that would not shrink any image are hidden. Aspect ratio is
  preserved, both sides snap to a 16 px grid, and images already at or below the target are skipped
  instead of upscaled. GIF and AVIF assets are left untouched because a canvas re-encode would drop
  animation or change the format. Asset URIs and extensions stay the same; only the stored bytes
  change. The dialog shows per-file progress and closes when the batch finishes.
- **Linked media** — scans descriptions, personality, scenario, example messages, creator notes,
  prompts, multilingual notes, greetings and lorebook text for Markdown images, HTML
  `<img>/<audio>/<video>/<source>` tags, BBCode `[img]` and bare media URLs. HTTPS links are
  downloaded into IndexedDB and added as `other` / `x_audio` / `x_video` assets, then the original
  URLs are rewritten to `embeded://`. Downloads show progress, keep per-link errors with retry, and
  reuse an existing local file with the same deterministic name. The import dialog offers the same
  flow when an imported card contains remote media links. JSON export inlines these text references
  together with the asset list.
- **CORS-blocked hosts** — a direct browser download requires the host to send CORS headers.
  Tools → Linked media has an opt-in fallback through 10 public CORS/image services: cors.dev,
  allOrigins, CodeTabs, cors.lol, CORS Workers demo, weserv.nl, wsrv.nl, DuckDuckGo, Google focus
  proxy and ThingProxy. Direct downloads have a 60-second header timeout and a 30-second body-stall
  timeout; proxy attempts use a 5-second header timeout. Files download up to 4 at a time. Some
  proxies impose their own caps (cors.dev 6 MiB, CodeTabs 5 MB, ThingProxy 100 KB). Image-only
  services are skipped for audio/video and animated GIFs are never routed through re-encoding
  proxies. Enabling the option requires a one-time risk acknowledgement stored in the
  `ccs_proxy_consent` cookie; the enabled toggle is kept in `localStorage`. Proxies can observe the
  requested URL and file contents. The import dialog deliberately does not offer the proxy toggle;
  it only points to Tools.
- **Set as main** — exactly one icon or background of that type is named `main`; the previous main
  is renamed to `{type}-alt`.
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

- Card metadata is autosaved to IndexedDB shortly after edits. `localStorage` is used only for the
  one-time migration of the legacy card/portrait keys and for the proxy toggle.
- Reloading the page keeps assets because blobs live in IndexedDB.
- Clearing site data removes assets permanently; export a backup first.
- The editor defines a 500 MB total asset budget constant (`MAX_TOTAL_ASSET_BYTES`). Browsers may
  enforce smaller quotas; the Assets panel shows `navigator.storage.estimate()` when available.
- Remote assets depend on CORS; failures are surfaced as warnings during CHARX export and linked
  media import.
