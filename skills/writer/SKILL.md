---
description: Generate, continue, polish, or expand Chinese web-novel chapters while preserving StoryWeaver distributed state and chapter contracts.
---

# StoryWeaver Writer

Use this skill when the user asks to write, continue, polish, expand, or structurally improve a long-form Chinese web-novel chapter.

## Source Of Truth

- Treat `${CLAUDE_PROJECT_DIR}/state/` as the only mutable story state.
- Treat `${CLAUDE_PROJECT_DIR}/chapters/chapter_{N}.txt` as the chapter manuscript path.
- Before writing, read the relevant project metadata, outline, character, item, scene, organization, concept, timeline, plot thread, relationship, and recent chapter records under `state/`.
- Do not use legacy monolithic state files.

## Context Stack

Build or load `state/chapters/chapter_{N}/brief.json` before prose generation. The brief is the auditable context pack for the chapter; use it as the primary writing input and update it when the contract or relevant state changes.

The brief must preserve this order:

1. P0 hard constraints: project metadata, world rules, power systems, genre promise, locked canon, forbidden changes.
2. P1 current state: active characters, locations, emotions, injuries, possessions, abilities, active plot threads.
3. P2 near context: the previous three chapter records and manuscript summaries.
4. P3 distant references: unresolved foreshadowing, long-running relationship arcs, dormant plot threads.

Read `${CLAUDE_PLUGIN_ROOT}/rules/novelforge/p0-p3-context.md`, `${CLAUDE_PLUGIN_ROOT}/rules/novelforge/chapter-brief.md`, and `${CLAUDE_PLUGIN_ROOT}/rules/novelforge/storyweaver-rules.md` when the task needs detailed guidance.

## Chapter Contract

Every generated chapter must have a concrete contract before prose generation:

- `chapter_goal`: what changes by the end of this chapter.
- `reader_promise`: the emotional or plot payoff this chapter must deliver.
- `conflict_axis`: the main pressure driving scenes forward.
- `turning_point`: the irreversible beat or reveal.
- `state_delta_plan`: expected changes to characters, items, locations, relationships, concepts, and plot threads.
- `open_loops`: hooks introduced, advanced, or resolved.

Read `${CLAUDE_PLUGIN_ROOT}/rules/novelforge/chapter-contract.md` for the full checklist.

## Writing Workflow

1. Parse user arguments such as `--chapter`, `--words`, `--mode`, `--style`, and `--instructions`.
2. Load or create the chapter contract.
3. Load or create the chapter brief at `state/chapters/chapter_{N}/brief.json`.
4. For `write` or `expand`, draft the chapter as readable Chinese web-novel prose, not a synopsis.
5. For `polish`, preserve plot facts and state; improve rhythm, dialogue, emotion, and readability.
6. Save the manuscript to `chapters/chapter_{N}.txt`.
7. Save or update `state/chapters/chapter_{N}.json` with the chapter contract, summary, word count, status, and state delta.
8. Run `/storyweaver:extract --chapter N --apply` to create `state/chapters/chapter_{N}/extraction.json` and merge evidence-backed entity refs into `state_delta`.
9. Extract more complex state changes into distributed files under `state/`; use the StoryWeaver Extract skill when extraction is substantial.
10. Rebuild `state/metadata/index.json` so `/storyweaver:status` and `/storyweaver:chapters` reflect the new chapter.
11. Run `/storyweaver:verify`, `/storyweaver:queue`, and `/storyweaver:gate` before treating the chapter as ready for the next chapter.
12. Report saved files, extraction/gate status, and notable state changes to the user.

## Quality Bar

- Keep scenes causally connected: desire -> obstacle -> choice -> consequence.
- Favor concrete actions, sensory details, and character decisions over explanatory summaries.
- Avoid generic AI-flavored phrasing, hollow emotion labels, and abrupt relationship jumps.
- Ask for confirmation before killing major characters, destroying core items, rewriting world rules, or closing a main plot thread.
