# Example card

This directory is reserved for **one curated, safe demo card** that can be committed to the
repository and used in screenshots, manual QA and documentation.

- Keep the example SFW and free of copyrighted character names.
- Put private/NSFW test cards in `test-cards/` instead; that directory is git-ignored.
- The `.gitignore` allows `examples/*.charx` and `examples/**/*.charx` while ignoring other `.charx`
  files, so a single demo archive can be tracked without publishing a library of personal cards.

## Current example

- `safe-office-worker.json` — a safe, SFW CCv3 example about Nora Bennett, an office worker in IT.
  It contains no copyrighted characters and no mature content.
- `safe-office-worker.charx` — the same card packaged with `card.json` and an icon asset, used for
  testing the CHARX import/export pipeline.
