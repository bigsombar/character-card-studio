# Example card

This directory is reserved for **one curated, safe demo card** that can be committed to the
repository and used in screenshots, manual QA and documentation.

- Keep the example SFW and free of copyrighted character names.
- Put private/NSFW test cards in `test-cards/` instead; that directory is git-ignored.
- The `.gitignore` allows `examples/*.charx` and `examples/**/*.charx` while ignoring other `.charx`
  files, so a single demo archive can be tracked without publishing a library of personal cards.

## Current example

A CCv3 reference card for **Nora Bennett**, a 30-year-old project coordinator in an IT
department. It is a grounded slice-of-life card that demonstrates the V3 feature set rather than
the minimum viable card:

- 24 image assets: 1 main icon, 3 backgrounds, 10 emotion portraits and 10 scene or prop images.
  The archive ships the final artwork; if a file is replaced in **Assets → Replace file**, keeping the
  asset name and URI preserves every text reference.
- 6 alternate greetings and 3 group-only greetings, each with its own scene, mood and image.
- A 19-entry lorebook with keywords, secondary keys, a regex trigger, priority, insertion order,
  positions and V3 decorators (`@@position`, `@@depth`, `@@is_greeting`, `@@activate_only_after`,
  `@@activate_only_every`, `@@additional_keys`, `@@exclude_keys`, `@@keep_activate_after_match`,
  `@@dont_activate_after_match`, `@@ignore_on_max_context`).
- Emotion assets named `neutral`, `happy`, `amused`, `tired`, `focused`, `worried`, `annoyed`,
  `surprised`, `soft` and `sleepy`.
- Multilingual creator notes (en, ru), nickname, tags, source links and namespaced custom
  extensions on the card, the lorebook and selected entries.

The card deliberately has **no user or player image**, no `user_icon` asset and no portraits or
image markup in the character description. Character cards ship the character, not the reader.

File:

- `Nora Bennett.charx` — the complete archive with `card.json` at the root and all 24 PNG files
  under `assets/{type}/images/`. Used by the test suite and safe to open in the editor.

The image replacement brief lives outside the repository at `Nora_images_lost.md`; the card
itself only depends on the asset names and `embeded://` paths.

All 24 images are released under CC0 1.0 and were generated with Moss Image (Apache 2.0). The same
licensing note is included in the card's creator notes.
