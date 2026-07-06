---
description: 管理情节线状态、进度和关联事件
---

# /storyweaver:plot

管理 `state/plot_threads/plot_{N}.json`。情节线用于追踪主线、支线、伏笔、误会、任务、谜团和情绪债，防止长篇写作中出现“开了坑但忘了推进”的问题。

## 子命令

### `/storyweaver:plot list`

列出情节线：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot list
```

按状态筛选：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot list --status active
```

### `/storyweaver:plot view`

查看单条情节线：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot view --id plot_001
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot view --name "玄天剑为何认识林小雨"
```

### `/storyweaver:plot add`

新增情节线：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot add --name "玄天剑为何认识林小雨" --description "玄天剑残念知道主角隐藏身世，暗示宗门旧案。" --status active --progress 5 --chapter 1
```

如果传入 `--chapter`，工具会确认章节契约存在，并把情节线 ID 追加到 `state_delta.plot_threads`。

### `/storyweaver:plot update`

更新常用字段：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot update --id plot_001 --field progress --value 35 --chapter 6
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot update --id plot_001 --field status --value dormant --chapter 8
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" plot update --id plot_001 --field related_events --value "event_001,event_004" --chapter 8
```

支持字段：

- `status`: `active`、`dormant`、`completed`、`abandoned`
- `progress`: 数字进度，建议 0-100
- `description`: 情节线说明
- `related_events`: 相关事件 ID，逗号分隔

## 状态机

| 状态 | 含义 |
|------|------|
| `active` | 正在推进，近期章节需要关注 |
| `dormant` | 暂时搁置，但后续会回收 |
| `completed` | 已完成并交付读者期待 |
| `abandoned` | 主动废弃，需要说明原因 |

## 状态规则

- 活跃情节线必须尽快关联至少一个 timeline event，否则 `/storyweaver:index` 会给出健康警告。
- 每次推进、搁置或收束情节线，都应传入 `--chapter`，让章节契约留下状态增量。
- 不要用进度数字替代叙事说明；`progress` 只用于扫视，真正依据是 `description`、`related_events` 和章节契约。
