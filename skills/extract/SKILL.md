---
description: Extract chapter state deltas into StoryWeaver distributed JSON files after drafting, importing, or revising a web-novel chapter.
---

# StoryWeaver Extract

Use this skill after a chapter is written, revised, or imported, or when the user asks to update StoryWeaver state from prose.

Before writing or changing entity cards, run the deterministic extraction report when possible:

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/extract-chapter-facts.mjs" "${CLAUDE_PROJECT_DIR}" --chapter N --apply
```

Use `state/chapters/chapter_{N}/extraction.json` as the evidence ledger for obvious existing-entity mentions. Add or update distributed state cards only for facts supported by the manuscript, the user, or that report.

## State Targets

Write only to the distributed state tree:

- `state/characters/{id}.json`
- `state/items/{id}.json`
- `state/scenes/{id}.json`
- `state/organizations/{id}.json`
- `state/concepts/{id}.json`
- `state/timeline/event_{id}.json`
- `state/plot_threads/{id}.json`
- `state/relationships/{id}.json`
- `state/chapters/chapter_{N}.json`
- `state/chapters/chapter_{N}/extraction.json`
- `state/metadata/index.json` (rebuilt after state writes)

Never write legacy monolithic state files.

## Extraction Rules

1. Extract facts that are explicit or strongly implied by the chapter; do not invent missing canon.
2. Preserve existing IDs and stable names. Create new IDs only when no existing entity matches.
3. Update only changed fields and preserve history fields such as `timeline`, `significant_events`, and `last_updated_chapter`.
4. For every item transfer, update both the item holder and the affected character possessions.
5. For every location change, preserve `previous`, `current`, and `changed_at_chapter`.
6. For every relationship change, record evidence from the chapter and directionality.
7. Add timeline events for irreversible changes, reveals, acquisitions, deaths, vows, betrayals, promotions, and major discoveries.
8. Rebuild `state/metadata/index.json` with `${CLAUDE_PLUGIN_ROOT}/tools/build-index.mjs` after changing distributed state.
9. Validate JSON after writing.

## Delta Summary

When finished, report:

- entities created
- entities updated
- timeline events added
- unresolved ambiguities that need user confirmation
- files written
- index warnings, if any
