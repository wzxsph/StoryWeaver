---
description: 从 StoryWeaver 快照恢复 state/ 和可选 chapters/ 文件，并在写回后重新校验状态
---

# /storyweaver:restore

从 `snapshots/{snapshot_id}/manifest.json` 恢复快照文件。该命令用于导入覆盖失败、修订把状态写坏、自动循环中断后回滚到已知可用状态。

默认只预览恢复清单，不写文件。只有用户明确要求恢复，并确认 `snapshot_id` 后，才使用 `--force` 写回。

## 参数

- `--snapshot`: 快照 ID，例如 `snap_20260706T000000000Z`。
- `--force`: 执行恢复写回；缺省时只预览。
- `--skip-validate`: 恢复后跳过 `validate-state-schemas.mjs`，仅用于校验工具本身不可用的极端情况。

## 执行流程

1. 先列出快照，确认目标：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/create-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --list
   ```
2. 预览恢复清单：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/restore-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --snapshot "<snapshot_id>"
   ```
3. 用户确认后再写回：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/restore-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --snapshot "<snapshot_id>" --force
   ```
4. 写回前工具会自动创建一份 `pre-restore` 快照，避免回滚操作本身不可逆。
5. 写回后必须重新执行：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/validate-state-schemas.mjs" "${CLAUDE_PROJECT_DIR}"
   ```

## 注意

- 恢复只覆盖 manifest 中记录的文件，不删除快照之后新增的其他文件。
- 快照哈希校验失败时必须停止恢复，不要手工跳过。
- 恢复成功不代表章节逻辑已经修好；仍需根据 `/storyweaver:verify` 和 `/storyweaver:queue` 继续处理一致性问题。

## 示例

```bash
/storyweaver:restore --snapshot snap_20260706T000000000Z
/storyweaver:restore --snapshot snap_20260706T000000000Z --force
```
