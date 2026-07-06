# 一致性校验

StoryWeaver 校验分为两层：故事事实一致性和章节契约交付。

## 十三维框架

| # | Dimension | 检查内容 |
|---|-----------|----------|
| 1 | `character_identity` | 外貌、性格、目标、口吻、秘密 |
| 2 | `character_location` | 角色不能同时在两地 |
| 3 | `temporal_sequence` | 事件顺序、时间跨度、因果先后 |
| 4 | `item_possession` | 物品持有链、转移、损坏、消耗 |
| 5 | `ability_usage` | 能力等级、代价、冷却、限制 |
| 6 | `relationship_logic` | 关系变化是否有事件支撑 |
| 7 | `plot_thread_progress` | 情节线推进、暂停、收束是否清楚 |
| 8 | `world_rule_compliance` | 世界规则与力量体系是否被遵守 |
| 9 | `emotional_continuity` | 情绪变化是否有触发与过渡 |
| 10 | `factual_contradiction` | 名称、数字、伤势、地理、事件事实 |
| 11 | `scene_consistency` | 场景布局、氛围、可用物、出入口 |
| 12 | `organization_logic` | 组织层级、资源、法律、行动逻辑 |
| 13 | `concept_definition` | 功法、规则、制度、禁忌定义稳定 |

## 章节契约校验

每次 `/storyweaver:verify --chapter N` 还要检查：

- `chapter_goal` 是否完成
- `reader_promise` 是否兑现
- `conflict_axis` 是否贯穿主要场景
- `turning_point` 是否存在且不可逆
- `state_delta` 是否与正文事实匹配
- 新增和解决的 open loops 是否记录

## 报告位置

校验报告保存到：

```text
state/chapters/chapter_{N}/review.json
```

Critical 问题必须修复；warning 建议修复；info 仅供参考。
