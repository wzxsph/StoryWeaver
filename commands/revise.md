---
description: 根据审阅报告修订章节，并记录可校验修订历史
---

# /storyweaver:revise

根据 `/storyweaver:verify` 生成的审阅报告和 `/storyweaver:queue` 生成的行动队列修订章节。修订正文和状态后，必须记录 `state/chapters/chapter_{N}/revision_history.json`，再重新校验。

## 参数

- `--chapter`: 章节编号（必填）
- `--report`: 审阅报告路径（可选，默认 `state/chapters/chapter_{N}/review.json`）
- `--fix`: 只修复指定维度或 action task id（可选）
- `--summary`: 本次修订摘要（建议提供）

## 执行流程

1. 创建快照，正文修订时建议包含 `chapters/`：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/create-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --reason "before revise chapter N" --include-chapters
   ```
2. 读取 `state/chapters/chapter_{N}/review.json`。
3. 读取 `state/metadata/action_queue.json`，筛选本章 open 任务。
4. 修改 `chapters/chapter_{N}.txt`；如有状态变化，同步更新 `state/` 中对应实体。
5. 记录修订历史：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/record-revision.mjs" "${CLAUDE_PROJECT_DIR}" --chapter N --summary "<summary>" --files "chapters/chapter_N.txt" --tasks all
   ```
6. 重新执行 `/storyweaver:verify --chapter N --scope all`。
7. 重新执行 `/storyweaver:queue`，确认对应任务减少或关闭。
8. 重新执行 `/storyweaver:gate --chapter N --promote revised`，确认章节可重新进入流程。
9. 若连续三次修订仍有 critical 或 gate blocked，停止自动循环并向用户报告阻塞点。

## 修订历史格式

修订历史保存到：

```text
state/chapters/chapter_{N}/revision_history.json
```

每条记录只说明“本次尝试修了什么”，不代表问题已经解决。问题是否解决必须以新的 `review.json` 和 `action_queue.json` 为准。

## 示例

```bash
/storyweaver:revise --chapter 5 --summary "修正角色位置矛盾"
/storyweaver:revise --chapter 5 --fix character_identity --summary "统一林小雨在本章的语气"
/storyweaver:revise --chapter 5 --fix act_review_chapter_005_001_character_identity --summary "修复审校队列第一项"
```

## 保存要求

- 修改正文后必须保存到 `chapters/chapter_{N}.txt`。
- 状态更新后必须保存到对应 `state/` 文件。
- 修订历史必须保存到 `state/chapters/chapter_{N}/revision_history.json`。
- 修订后必须刷新 `state/metadata/action_queue.json`。
- 修订后必须刷新 `state/chapters/chapter_{N}/gate.json`。
- 所有保存操作必须落盘，不能仅停留在内存。
