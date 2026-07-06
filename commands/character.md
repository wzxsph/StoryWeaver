---
description: 管理角色卡片，使用确定性工具创建、查看和更新符合 schema 的角色状态
---

# /storyweaver:character

管理 `state/characters/{id}.json` 角色卡。角色卡是长篇一致性的核心状态，不应手写旧格式 JSON；优先使用确定性工具分配 ID、写入 schema 兼容结构并重建索引。

## 子命令

### `/storyweaver:character list`

列出所有角色：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-state-card.mjs" "${CLAUDE_PROJECT_DIR}" character list
```

如需 JSON 输出：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-state-card.mjs" "${CLAUDE_PROJECT_DIR}" character list --json
```

### `/storyweaver:character view`

查看单个角色：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-state-card.mjs" "${CLAUDE_PROJECT_DIR}" character view --name "林小雨"
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-state-card.mjs" "${CLAUDE_PROJECT_DIR}" character view --id char_001
```

### `/storyweaver:character add`

新增角色：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-state-card.mjs" "${CLAUDE_PROJECT_DIR}" character add --name "张三" --role supporting --description "天剑宗外门执事" --chapter 1
```

可选参数：

- `--name`: 角色名（必填）
- `--role`: 角色定位，默认 `supporting`
- `--description`: 背景说明，会写入 `core_identity.background`
- `--chapter`: 首次记录章节，默认 `1`
- `--id`: 指定 ID，如 `char_003`；不传则自动递增

### `/storyweaver:character update`

更新常用状态字段：

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/manage-state-card.mjs" "${CLAUDE_PROJECT_DIR}" character update --name "林小雨" --field emotional_state --value "警惕" --chapter 2
```

支持字段：

- `status`
- `current_location`
- `emotional_state`
- `physical_state`
- `cultivation_realm`
- `abilities`，逗号分隔
- `goals`，逗号分隔
- `secrets`，逗号分隔

更新后工具会刷新 `state/metadata/index.json`。

## 当前角色结构

角色卡必须符合 `schemas/character.schema.json`：

```json
{
  "id": "char_001",
  "name": "林小雨",
  "role": "protagonist",
  "status": "alive",
  "core_identity": {
    "appearance": "",
    "personality": "",
    "background": "",
    "goals": [],
    "secrets": []
  },
  "current_state": {
    "location": {
      "current": "",
      "previous": "",
      "changed_at_chapter": 1
    },
    "emotional_state": "",
    "physical_state": "",
    "possessions": [],
    "abilities": [],
    "cultivation_realm": ""
  },
  "relationship_map": {},
  "timeline": [],
  "last_updated_chapter": 1,
  "schema_version": "2.0"
}
```

## 保存规则

- 新增或更新角色后必须落盘到 `state/characters/{id}.json`。
- 改动后必须重建 `state/metadata/index.json`。
- 如改动影响章节事实，继续运行 `/storyweaver:extract`、`/storyweaver:verify`、`/storyweaver:queue` 和 `/storyweaver:gate`。
