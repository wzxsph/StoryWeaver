---
description: 状态数据结构规范 — 定义角色、物品、事件等状态的数据结构模板
---

# 状态数据结构规范

## 概述

状态数据存储在用户工作目录的 `state/` 目录下，按类型分散存储。本规范定义各状态实体的数据结构模板。

## ID 命名规则

| 类型 | 格式 | 示例 |
|------|------|------|
| 角色 | `char_NNN` | `char_001` |
| 物品 | `item_NNN` | `item_002` |
| 事件 | `event_NNN` | `event_003` |
| 场景 | `scene_NNN` | `scene_004` |
| 组织 | `org_NNN` | `org_001` |
| 概念 | `concept_NNN` | `concept_001` |
| 情节线 | `plot_NNN` | `plot_001` |
| 关系 | `rel_NNN` | `rel_001` |

## 通用字段

所有状态实体都包含以下字段：

```json
{
  "id": "char_001",
  "name": "角色名称",
  "created_at": "2026-05-27T10:00:00Z",
  "updated_at": "2026-05-27T12:00:00Z",
  "last_updated_chapter": 5,
  "schema_version": "1.0"
}
```

## 角色状态 (Character)

```json
{
  "id": "char_001",
  "name": "张三",
  "role": "protagonist",
  "core_identity": {
    "appearance": "外貌描述",
    "personality": "性格特点",
    "background": "背景故事",
    "goals": ["目标1", "目标2"],
    "secrets": ["秘密1"]
  },
  "current_state": {
    "location": {
      "current": "当前位置",
      "previous": "之前位置",
      "changed_at_chapter": 3
    },
    "emotional_state": "开心",
    "physical_state": "良好",
    "possessions": ["item_001", "item_002"],
    "abilities": ["技能1", "技能2"],
    "cultivation_realm": "筑基期"
  },
  "relationship_map": {
    "char_002": {
      "target_id": "char_002",
      "relationship_type": "师徒",
      "strength": 8,
      "updated_at_chapter": 5
    }
  },
  "timeline": [
    {
      "chapter": 1,
      "event": "出场",
      "timestamp": "2026-05-27T10:00:00Z"
    }
  ]
}
```

## 物品状态 (Item)

```json
{
  "id": "item_001",
  "name": "玄天剑",
  "type": "法宝",
  "description": "一把锋利的宝剑",
  "current_holder": "char_001",
  "previous_holders": ["char_003"],
  "abilities": ["剑气", "破甲"],
  "limitations": ["每天只能用3次"],
  "current_state": "完好",
  "significant_events": [
    {"chapter": 1, "event": "获得"},
    {"chapter": 5, "event": "升级"}
  ]
}
```

## 事件状态 (Event)

```json
{
  "id": "event_001",
  "title": "宗门大比",
  "chapter": 5,
  "timestamp": "2026-05-27T10:00:00Z",
  "location": "天剑宗比武场",
  "participants": ["char_001", "char_002"],
  "related_items": ["item_001"],
  "plot_thread_id": "plot_001",
  "description": "描述",
  "consequences": ["主角获胜", "获得法宝"]
}
```

## 场景状态 (Scene)

```json
{
  "id": "scene_001",
  "name": "天剑宗比武场",
  "type": "宗门场景",
  "description": "外门与内门共用的公开比武场",
  "location": "天剑宗主峰东侧",
  "function_in_story": "公开冲突、排名变化、势力观察",
  "dynamic_state": {
    "time": "清晨",
    "atmosphere": "紧张",
    "characters_present": ["char_001"],
    "key_objects": ["item_001"],
    "last_changed_chapter": 5
  },
  "constraints": ["宗门长老在场时禁止私斗"]
}
```

## 组织状态 (Organization)

```json
{
  "id": "org_001",
  "name": "天剑宗",
  "type": "门派",
  "public_face": "名门正派",
  "private_agenda": "争夺玄天秘境入口",
  "resources": ["剑修传承", "灵脉"],
  "fears": ["宗主闭关失败", "魔教渗透"],
  "territory": ["scene_001"],
  "members": ["char_001"],
  "relationships": {
    "org_002": {
      "type": "敌对",
      "evidence": "第5章夺宝冲突"
    }
  }
}
```

## 概念状态 (Concept)

```json
{
  "id": "concept_001",
  "name": "御剑术",
  "type": "功法",
  "definition": "以灵力驱动飞剑的基础剑修术法",
  "rules": ["筑基期方可长距离御剑", "连续使用会消耗神识"],
  "limitations": ["禁灵阵内失效"],
  "status": "locked",
  "introduced_chapter": 2,
  "last_updated_chapter": 5
}
```

## 章节记录与章节契约 (Chapter)

每章必须有章节记录。章节记录既是目录索引，也是写作质量和状态增量的契约。

```json
{
  "chapter": 1,
  "title": "觉醒",
  "status": "planned|draft|verified|revised|locked",
  "chapter_goal": "主角发现自己能听见灵器残念",
  "reader_promise": "觉醒金手指并埋下第一次危机",
  "conflict_axis": "主角想隐藏异状，但宗门检测逼近",
  "turning_point": "主角听见玄天剑残念喊出自己的真名",
  "summary": "本章摘要",
  "word_count": 3200,
  "style_tags": ["口语化", "燃向"],
  "pov_character": "char_001",
  "open_loops_introduced": ["玄天剑为何认识主角"],
  "open_loops_advanced": [],
  "open_loops_resolved": [],
  "state_delta": {
    "characters": ["char_001"],
    "items": ["item_001"],
    "scenes": ["scene_001"],
    "organizations": ["org_001"],
    "concepts": ["concept_001"],
    "timeline_events": ["event_001"],
    "plot_threads": ["plot_001"],
    "relationships": []
  },
  "created_at": "2026-05-27T10:00:00Z",
  "updated_at": "2026-05-27T12:00:00Z",
  "schema_version": "2.0"
}
```

## 状态文件路径

```
state/
├── metadata/project.json       # 项目元数据
├── metadata/loop_status.json   # 自动循环状态
├── metadata/index.json         # 可重建状态索引
├── metadata/action_queue.json  # 可重建修订行动队列
├── metadata/import_report.json # 最近一次正文导入报告
├── characters/{id}.json       # 角色状态
├── items/{id}.json           # 物品状态
├── timeline/event_{id}.json   # 时间线事件
├── scenes/{id}.json          # 场景状态
├── organizations/{id}.json   # 组织状态
├── concepts/{id}.json        # 概念状态（功法、规则等）
├── plot_threads/{id}.json    # 情节线状态
├── relationships/{id}.json   # 关系状态
├── chapters/chapter_{N}.json # 章节记录
├── chapters/chapter_{N}/brief.json # 章节上下文包
├── chapters/chapter_{N}/extraction.json # 状态提取报告
├── chapters/chapter_{N}/review.json # 一致性审阅报告
├── chapters/chapter_{N}/gate.json # 章节质量闸门
├── chapters/chapter_{N}/revision_history.json # 修订历史
├── outline/outline.json      # 整体大纲
├── outline/volume_{N}.json   # 分卷大纲
└── outline/chapter_{N}.json  # 章节大纲
```

## Schema 版本管理

- 每个状态文件包含 `schema_version` 字段
- 大版本升级时创建新的 Schema 文件
- 迁移时提供数据迁移脚本
- 机器校验 Schema 存放在 `schemas/`，修改本规范时必须同步对应 JSON Schema 和 `examples/minimal-project/`
- `state/metadata/index.json` 只能由状态树重建，不应作为角色、情节或世界观事实的唯一来源
- `state/metadata/action_queue.json` 只能由 review 与 index 重建，不应作为问题是否已修复的唯一证据
- `extraction.json` 记录正文到状态增量的证据，不应凭空创建 canon；复杂新实体必须由状态卡承接
- `gate.json` 只能证明章节进入下一状态的机器闸门结果，不替代 `review.json` 和人工审校
- `revision_history.json` 只记录修订尝试，问题是否解决必须以新的 `review.json` 为准

## 关联

- 参考: `@rules/novelforge/state-constraints.md` (状态更新约束)
- 章节契约: `@rules/novelforge/chapter-contract.md`
- 章节上下文: `@rules/novelforge/chapter-brief.md`
- 机器校验: `@schemas/*.schema.json`
- 使用: `@agents/state-extractor.md` (状态提取)
- 校验: `@agents/consistency-guardian.md` (一致性校验)
