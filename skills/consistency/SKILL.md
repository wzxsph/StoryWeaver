---
description: Verify StoryWeaver chapters against distributed state, P0-P3 context, chapter contracts, and thirteen consistency dimensions.
---

# StoryWeaver Consistency

Use this skill when the user asks to verify, audit, review, or fix continuity in a web-novel chapter.

## Inputs

- Chapter manuscript: `${CLAUDE_PROJECT_DIR}/chapters/chapter_{N}.txt`
- Chapter record: `${CLAUDE_PROJECT_DIR}/state/chapters/chapter_{N}.json`
- Distributed state: `${CLAUDE_PROJECT_DIR}/state/**`
- Rules: `${CLAUDE_PLUGIN_ROOT}/rules/novelforge/state-schema.md`, `${CLAUDE_PLUGIN_ROOT}/rules/novelforge/state-constraints.md`, and `${CLAUDE_PLUGIN_ROOT}/rules/novelforge/chapter-contract.md`

## Dimensions

Check these dimensions and classify each finding as `critical`, `warning`, or `info`:

1. `character_identity` - appearance, voice, personality, goals, secrets.
2. `character_location` - no impossible simultaneous locations.
3. `temporal_sequence` - events happen in a plausible order.
4. `item_possession` - ownership chains and transfers are continuous.
5. `ability_usage` - skills, powers, costs, cooldowns, and limits match canon.
6. `relationship_logic` - trust, hostility, intimacy, hierarchy, and favors evolve with evidence.
7. `plot_thread_progress` - active threads advance, pause, or close intentionally.
8. `world_rule_compliance` - the chapter obeys world rules and power systems.
9. `emotional_continuity` - emotional transitions have causes on the page.
10. `factual_contradiction` - names, ages, numbers, injuries, geography, and prior events do not conflict.
11. `scene_consistency` - scene layout, atmosphere, available exits, and objects remain coherent.
12. `organization_logic` - factions, ranks, laws, duties, and resources behave consistently.
13. `concept_definition` - concepts such as techniques, systems, taboos, and rituals keep stable definitions.

Also check chapter-contract delivery: goal, reader promise, conflict axis, turning point, and open loops.

## Output Contract

Save the report to `state/chapters/chapter_{N}/review.json`:

```json
{
  "chapter": 1,
  "timestamp": "ISO-8601",
  "scope": "all",
  "passed": true,
  "violations": [],
  "passed_dimensions": [],
  "chapter_contract": {
    "goal_delivered": true,
    "reader_promise_delivered": true,
    "turning_point_present": true,
    "open_loop_handling": "clear"
  },
  "summary": {
    "critical_count": 0,
    "warning_count": 0,
    "info_count": 0
  }
}
```

After saving, tell the user the highest-severity findings first and include the path to the report.
