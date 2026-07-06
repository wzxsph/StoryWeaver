---
description: 查看和新增事件时间线，维护章节事件顺序
---

# /storyweaver:timeline

管理 `state/timeline/event_{N}.json`。时间线事件是长篇一致性的骨架：谁在第几章做了什么、和哪条情节线相关、造成了什么后果，都必须落到可校验状态里。

## 子命令

### `/storyweaver:timeline list`

列出事件时间线：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" timeline list
```

常用筛选：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" timeline list --chapter 5
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" timeline list --character "林小雨"
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" timeline list --plot plot_001
```

### `/storyweaver:timeline view`

查看单个事件：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" timeline view --id event_001
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" timeline view --title "玄天剑苏醒"
```

### `/storyweaver:timeline add`

新增事件。目标章节必须已经有 `state/chapters/chapter_{N}.json` 章节契约。

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-story-graph.mjs" "${CLAUDE_PROJECT_DIR}" timeline add --title "玄天剑苏醒" --chapter 1 --description "林小雨在外门祠堂听见玄天剑叫出她的乳名。" --participants "林小雨" --items "玄天剑" --plot plot_001 --consequences "主角意识到玄天剑并非废铁,宗门旧案被重新引出"
```

工具会同时：

- 写入 `state/timeline/event_{N}.json`
- 把事件 ID 追加到对应章节契约的 `state_delta.timeline_events`
- 如果指定 `--plot`，把事件追加到情节线的 `related_events`
- 重建 `state/metadata/index.json`

## 参数

- `--chapter`: 按章节筛选或指定新增事件所属章节。
- `--character`: list 时按角色筛选，可传角色 ID 或精确名称。
- `--plot`: 按情节线筛选或关联情节线，可传 plot ID 或精确名称。
- `--participants`: add 时的参与角色列表，逗号分隔。
- `--items`: add 时的相关物品列表，逗号分隔。
- `--consequences`: add 时的后果列表，逗号分隔。
- `--json`: list 时输出 JSON。

## 状态规则

- 不手写 `event_{N}.json`，优先使用工具分配 ID 和维护反向引用。
- 事件只能记录已经发生或明确进入章节契约的事实；尚未发生的伏笔放入章节契约的 `open_loops_introduced` 或情节线说明。
- 删除事件前必须检查 `plot_threads.related_events`、章节 `state_delta.timeline_events` 和 `index.json` 反向引用。
