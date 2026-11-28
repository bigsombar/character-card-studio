# CHARX format

CHARX is the primary interchange format for this editor. It is a ZIP archive that carries a CCv3
card plus its binary media, so images, audio and video survive a round-trip.

## Archive layout

```text
my-card.charx
├── card.json
└── assets/
    └── {type}/
        ├── images/...
        ├── audio/...
        ├── video/...
        └── other/...
```

- `card.json` **must** be at the archive root. `./card.json` is accepted with a warning.
- Asset URIs inside `card.json` use `embeded://` (one `d`, as defined by the spec).
- The path after `embeded://` is the exact, case-sensitive path inside the ZIP.
- Media is grouped by extension:
  - `images`: png, jpg, jpeg, webp, avif, gif
  - `audio`: mp3, wav, ogg
  - `video`: mp4, webm
  - `other`: anything else
- Media is stored without ZIP compression (level 0) because it is already compressed, while
  `card.json` is deflated (level 6).

Example `card.json`:

```json
{
  "spec": "chara_card_v3",
  "spec_version": "3.0",
  "data": {
    "name": "Nora Bennett",
    "assets": [
      {
        "type": "icon",
        "uri": "embeded://assets/icon/images/main.png",
        "name": "main",
        "ext": "png"
      }
    ]
  }
}
```

## Export

The editor builds a fresh V3 object from the current card, stamps `creation_date` when missing and
always updates `modification_date`. A declared `spec_version` is preserved; otherwise the export
uses `3.0`. V2 output is intentionally not supported.

For every asset:

| URI | Export behavior |
|---|---|
| `embeded://path` | The blob is read from IndexedDB and written to the same path. Missing blobs are omitted with a warning. |
| `data:` | Decoded and written as a file; the URI is rewritten to `embeded://`. |
| `https://` | Downloaded and embedded when “Download HTTPS assets and include them in the archive” is enabled (default). CORS failures keep the HTTPS URL and add a warning. |
| `http://` | Never downloaded. The metadata is kept and a warning is shown. |
| `ccdefault:` | No file is written; the frontend chooses its built-in asset. |
| Unknown scheme | Metadata is kept and a warning is shown. |

Paths are sanitized to ASCII `[A-Za-z0-9._/-]`, collisions get `-2`, `-3`, … suffixes, and the
editor never writes outside `assets/`. The ZIP writer runs in a Web Worker when the browser supports
it.

## RisuAI compatibility (optional)

RisuAI does not resolve `embeded://` URIs in message text: its sanitizer drops the unknown protocol,
so markdown/HTML images lose their source. It only renders its own CBS macros, and those resolve
either from standard `emotion` assets or from additional assets exported with the custom
`x-risu-asset` type.

The export dialog has an opt-in **Add RisuAI compatibility** checkbox for CHARX. It changes only the
exported copy of the card:

- inline images, audio and video with `embeded://` destinations become `{{image::name}}`,
  `{{emotion::name}}`, `{{audio::name}}` or `{{video::name}}`;
- the referenced image/audio/video assets gain `x-risu-asset` aliases whose `name` is the file stem;
- emotion references use the standard `emotion` type and need no alias.

Aliases point at the same archive paths as the canonical entries, so no media is written twice; only
`card.json` grows. The editor card and the regular export keep the canonical
`![alt](embeded://path)` syntax and the standard CCv3 asset types. The downloaded file is suffixed
with ` (RisuAI)`.

Other CCv3 applications will show the macros literally, and RisuAI lists aliased assets twice (as a
character image and under Additional Assets). Keep the canonical CHARX as the primary file and use
the RisuAI variant only when that compatibility is needed. References that cannot be converted
(missing assets, non-media files) are left unchanged and reported as export warnings.

## Import

- The archive is opened with `@zip.js/zip.js` using a Web Worker when available.
- `card.json` is required at the root; `./card.json` is accepted with a warning.
- V2 `card.json` is upcast to V3 with warnings.
- Every `embeded://` asset is read, stored in IndexedDB, and given a thumbnail when possible.
- Missing files, undecodable files, unsupported fields and failed asset imports produce warnings;
  the card still loads with the remaining data.
- Files not referenced by `data.assets` are ignored. Use **Assets → Clean orphans** afterwards to
  remove unreferenced blobs from IndexedDB.

## Security limits

| Limit | Value |
|---|---|
| Maximum archive size | 1 GB |
| Maximum entries | 1000 |
| Maximum total uncompressed size | 1 GB |
| Maximum `card.json` size | 10 MB |
| Maximum single image | 20 MB |
| Maximum single audio | 50 MB |
| Maximum single video | 250 MB |
| Recommended total asset budget (`MAX_TOTAL_ASSET_BYTES`) | 500 MB |

The importer rejects:

- paths containing `..`, backslashes, absolute paths, drive letters or NUL bytes;
- encrypted entries and encrypted central directories;
- archives without a root `card.json`;
- archives that exceed the limits above;
- corrupt ZIP data.

ZIP parsing errors are rewritten as `CHARX archive could not be read: …` so the UI never exposes a
raw library stack trace.

## Not implemented

- `chara-ext-asset_` PNG chunks. The V3 spec recommends new applications use CHARX instead.
- Automatic Live2D/3D/font/code metadata handling beyond `x_` custom types and generic files.
- Running decorators, macros or CBS scripts. The editor preserves and validates structure only.
- V2 export or V2 downcasting; V2 is input-only.

## Example

`Nora Bennett.charx` in `examples/` is a full reference card with 24 embedded images (icon,
backgrounds, emotion portraits and scene images), a 19-entry lorebook, six alternate greetings
and three group-only greetings. It is used by the test suite and is safe to open in the editor.
CHARX is the only example format we ship: a JSON file cannot carry the images that make the card
work.
