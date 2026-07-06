---
description: 创建或列出 StoryWeaver 状态快照，用于导入、覆盖、修订和自动循环前的安全备份
---

# /storyweaver:snapshot

为当前小说项目创建可校验的状态快照。快照默认复制 `state/`，可选复制 `chapters/` 正文，并在 `snapshots/{snapshot_id}/manifest.json` 记录每个文件的 SHA-256、字节数和来源路径。

## 参数

- `--reason`: 快照原因，例如 `"before revise chapter 12"`。
- `--include-chapters`: 同时备份 `chapters/` 正文。
- `--list`: 列出已有快照，不创建新快照。

## 执行流程

1. 在以下操作前优先创建快照：
   - `/storyweaver:import --overwrite`
   - `/storyweaver:plan --overwrite`
   - `/storyweaver:revise`
   - `/storyweaver:loop-start --mode safe` 开始批量章节前
2. 创建快照：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/create-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --reason "<reason>" --include-chapters
   ```
3. 如只需查看已有快照：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/create-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --list
   ```
4. 快照目录 `snapshots/` 是本地安全产物，不应提交到仓库。

## 示例

```bash
/storyweaver:snapshot --reason "before importing legacy draft" --include-chapters
/storyweaver:snapshot --reason "before revising chapter 5"
/storyweaver:snapshot --list
```
