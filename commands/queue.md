---
description: 从审阅报告和状态索引生成修订行动队列
---

# /storyweaver:queue

生成 `state/metadata/action_queue.json`，把散落在各章 `review.json` 里的 critical/warning/info 问题，以及 `state/metadata/index.json` 的健康警告，汇总成可排序的修订任务。

## 参数

- `--generated-at`: 指定生成时间（可选，默认当前 ISO 时间）

## 执行流程

1. 确保已有最新索引；必要时先执行 `/storyweaver:index`。
2. 优先运行确定性队列构建器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/build-action-queue.mjs" "${CLAUDE_PROJECT_DIR}"
   ```
3. 队列按严重程度排序：`critical` → `warning` → `info`，同级按章节顺序。
4. 生成后读取 `state/metadata/action_queue.json`，向用户报告：
   - open/critical/warning/info 数量
   - 每章未处理任务数
   - 最高优先级的前 5 个任务

## 输出文件

```text
state/metadata/action_queue.json
```

## 后续处理

```bash
/storyweaver:revise --chapter N
/storyweaver:verify --chapter N --scope all
/storyweaver:queue
/storyweaver:gate --chapter N --promote verified
```

## 示例

```bash
/storyweaver:queue
/storyweaver:queue --generated-at 2026-07-06T00:00:00Z
```
