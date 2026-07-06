---
description: 检查章节是否满足进入下一步的机器闸门，并生成可审计的 gate 报告
---

# /storyweaver:gate

检查指定章节是否已经具备进入下一步的条件。该命令不会替代 `/storyweaver:verify`，而是把章节正文、章节契约、brief、extraction、review、action queue 和索引健康信息合并成一个机器可读的闸门报告。

报告保存到：

```text
state/chapters/chapter_{N}/gate.json
```

## 参数

- `--chapter`: 章节编号（必填）
- `--min-words`: 最低正文字数/字符数要求（可选，默认 `1`）
- `--promote`: gate 通过后推进章节状态，可选 `verified`、`revised`、`locked`

## 执行流程

1. 确认章节正文已保存到 `chapters/chapter_{N}.txt`。
2. 确认章节契约已保存到 `state/chapters/chapter_{N}.json`。
3. 确认上下文包已保存到 `state/chapters/chapter_{N}/brief.json`。
4. 先执行 `/storyweaver:extract --chapter N --apply`，生成 `extraction.json`。
5. 先执行 `/storyweaver:verify --chapter N --scope all`，生成 `review.json`。
6. 先执行 `/storyweaver:queue`，刷新 `action_queue.json`。
7. 运行 gate：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/check-chapter-gate.mjs" "${CLAUDE_PROJECT_DIR}" --chapter N --min-words 3000
   ```
8. 如果需要让自动循环进入下一章，可在 gate 通过后推进状态：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/check-chapter-gate.mjs" "${CLAUDE_PROJECT_DIR}" --chapter N --promote verified
   ```

## 通过条件

- 必要文件存在：章节契约、正文、brief、extraction、review、action queue。
- 章节契约核心字段非空：`chapter_goal`、`reader_promise`、`conflict_axis`、`turning_point`、`summary`。
- 正文字数达到 `--min-words`。
- review 没有 critical finding。
- action queue 没有本章 open critical task。

有 warning 时 gate 会显示 `warning`，可进入 `verified` 或 `revised`，但不能直接 `locked`。`locked` 要求无 blocker 且无 warning。

## 示例

```bash
/storyweaver:gate --chapter 5 --min-words 3000
/storyweaver:gate --chapter 5 --promote verified
/storyweaver:gate --chapter 5 --promote locked
```
