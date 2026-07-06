---
description: 管理角色、物品、组织、事件之间的关系网络
---

# /storyweaver:relationship

管理 `state/relationships/rel_{N}.json`。关系网络用于记录角色关系、人物和物品绑定、组织隶属、敌友变化、事件因果等可追溯事实。

## 子命令

### `/storyweaver:relationship list`

列出关系：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" relationship list
```

按来源或目标筛选：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" relationship list --source "林小雨"
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" relationship list --target item_001
```

### `/storyweaver:relationship view`

查看单条关系：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" relationship view --id rel_001
```

### `/storyweaver:relationship add`

新增关系：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" relationship add --source "林小雨" --target "玄天剑" --type "持有者与苏醒残剑" --strength 3 --evidence "第1章玄天剑叫出林小雨乳名" --chapter 1
```

工具会同时：

- 写入 `state/relationships/rel_{N}.json`
- 如果来源是角色，把目标同步进该角色的 `relationship_map`
- 如果传入 `--chapter`，把关系 ID 追加到章节契约的 `state_delta.relationships`
- 重建 `state/metadata/index.json`

### `/storyweaver:relationship update`

更新关系强度、类型或证据：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" relationship update --id rel_001 --field strength --value 6 --chapter 6
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" relationship update --id rel_001 --field evidence --value "第1章玄天剑叫出乳名,第6章残剑主动护主" --chapter 6
```

支持字段：

- `relationship_type`
- `strength`
- `evidence`

## 状态规则

- `source` 和 `target` 可以是角色、物品、场景、组织、概念、事件或情节线，优先传 ID；传名称时必须能精确匹配唯一实体。
- 关系不是“氛围描述”，必须有 evidence。无法找到正文证据时，先写入章节契约或 extraction，再新增关系。
- 关系发生变化时不要覆盖历史正文；更新 `strength`、`relationship_type` 和 `evidence`，并在章节契约留下本次变化。
