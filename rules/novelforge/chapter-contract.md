---
name: chapter-contract
description: 章节契约规则 — 将网文章节从“续写一段内容”提升为可校验的剧情交付单元
---

# 章节契约规则

章节契约是每章写作前必须明确、写作后必须校验的最小剧情单元。它解决两个常见问题：章节看似写了很多但没有推进，以及状态更新无法判断哪些变化重要。

## 必填字段

```json
{
  "chapter": 1,
  "title": "",
  "status": "planned|draft|verified|revised|locked",
  "chapter_goal": "",
  "reader_promise": "",
  "conflict_axis": "",
  "turning_point": "",
  "summary": "",
  "word_count": 0,
  "style_tags": [],
  "pov_character": "",
  "open_loops_introduced": [],
  "open_loops_advanced": [],
  "open_loops_resolved": [],
  "state_delta": {
    "characters": [],
    "items": [],
    "scenes": [],
    "organizations": [],
    "concepts": [],
    "timeline_events": [],
    "plot_threads": [],
    "relationships": []
  }
}
```

## 写作前检查

- `chapter_goal` 必须能用一句话说明本章结束时世界或人物发生了什么变化。
- `reader_promise` 必须具体到情绪或爽点，例如反杀、误会升级、秘密揭开、关系破冰、危机降临。
- `conflict_axis` 必须是可被场景推动的压力，不是抽象主题。
- `turning_point` 必须是本章不可逆的转折、选择、发现或代价。

## 写作后检查

- 如果 `chapter_goal` 未完成，章节状态不得标记为 `verified`。
- 如果 `reader_promise` 没有兑现，需要在 `review.json` 中记录为 warning。
- 如果出现重大状态变化但 `state_delta` 为空，需要重新执行状态提取。
- 如果引入新伏笔，必须进入 `open_loops_introduced`，并关联章节号。
