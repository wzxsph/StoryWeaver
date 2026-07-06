# Minimal StoryWeaver Project

这是一个最小可校验样例，用来证明 StoryWeaver 的状态树、章节契约、章节上下文包、状态提取报告、状态索引、修订行动队列、gate 和 review 报告可以落地到文件。
其中 `state/chapters/chapter_1/brief.json` 可由 `tools/build-brief.mjs` 从本样例状态树重新生成，`state/chapters/chapter_1/extraction.json` 可由 `tools/extract-chapter-facts.mjs` 重新生成，`state/metadata/index.json` 可由 `tools/build-index.mjs` 重新生成，`state/metadata/action_queue.json` 可由 `tools/build-action-queue.mjs` 重新生成。

运行仓库根目录的验证脚本会同时校验本样例：

```powershell
.\tools\validate-storyweaver.ps1 -Strict
```

样例包含：

- `state/metadata/project.json`
- `state/metadata/index.json`
- `state/metadata/action_queue.json`
- `state/outline/outline.json`
- `state/outline/volume_1.json`
- `state/outline/chapter_1.json`
- `state/characters/char_001.json`
- `state/items/item_001.json`
- `state/scenes/scene_001.json`
- `state/organizations/org_001.json`
- `state/concepts/concept_001.json`
- `state/timeline/event_001.json`
- `state/plot_threads/plot_001.json`
- `state/relationships/rel_001.json`
- `state/chapters/chapter_1/brief.json`
- `state/chapters/chapter_1/extraction.json`
- `state/chapters/chapter_1.json`
- `state/chapters/chapter_1/gate.json`
- `state/chapters/chapter_1/review.json`
- `state/chapters/chapter_1/revision_history.json`
- `chapters/chapter_1.txt`
