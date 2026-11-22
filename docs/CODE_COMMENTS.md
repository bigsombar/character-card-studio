# Comment and JSDoc style

Comments describe the contract of the code, not the history of how it was written. They are part of
the public surface of each module and should read like documentation written for this project.

## Rules

1. Start with the guarantee: what the module owns, what it returns, or which invariant it protects.
2. Document non-obvious decisions, failure modes and data flow. Do not restate an obvious parameter
   name in prose.
3. Use `@param` for shape, units or accepted ranges; skip it when the signature already explains the
   value.
4. Mention side effects explicitly: writes to IndexedDB, network access, timers, mutations.
5. Describe browser edge cases as rules, not as a diary of old bugs.
6. Keep UI copy separate from implementation comments. UI text lives in components and is written
   for the person using the editor.
7. Never copy a doc block from another project. Rewrite the idea in this project's vocabulary.
8. Prefer short paragraphs and tables over long lists of names.

## Preferred vocabulary

| Context | Prefer |
|---|---|
| Buffered input | draft, commit, stable value, composition |
| PNG | chunk stream, payload, image bytes, metadata |
| Card import | detect format, upcast, normalize, snapshot |
| Assets | record, blob, local URI, remote URI |
| Rows and lists | row key, expansion, reorder |
| Export | snapshot, policy, lossless, lossy |

## Avoid

- "Shared wrapper for…" without explaining the contract.
- "Passed through as…", "called with the raw event", "renders the field as…".
- Copying bug-fix narratives into JSDoc.
- Claiming that a value is validated or normalized when the function only forwards it.
- Comments that describe a different implementation than the one underneath.

## Review check

- Does the first sentence tell a new contributor what the code guarantees?
- Are failure modes and side effects visible?
- Is any sentence a near-copy of a sentence from another codebase?
- Could the same information be expressed with fewer words?
