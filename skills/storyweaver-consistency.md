---
name: storyweaver-consistency
description: 十维一致性校验，确保角色状态、时间线、物品归属在长篇中保持连贯
---

# StoryWeaver Consistency

## When to Activate
- 用户要求校验章节一致性
- 续写章节前检查上下文连贯性

## Consistency Dimensions（十维校验）

| # | Dimension | Check |
|---|-----------|-------|
| 1 | character_identity | 角色外貌/性格一致性 |
| 2 | character_location | 角色不能同时在两地 |
| 3 | temporal_sequence | 事件时间顺序正确 |
| 4 | item_possession | 物品持有链连续 |
| 5 | ability_usage | 能力使用正确 |
| 6 | relationship_logic | 关系与事件匹配 |
| 7 | plot_thread_progress | 情节线状态推进 |
| 8 | world_rule_compliance | 世界规则遵守 |
| 9 | emotional_continuity | 情感状态过渡自然 |
| 10 | factual_contradiction | 无事实矛盾 |

## Violation Severity

- **critical**: 必须修复（如角色死亡状态不一致）
- **warning**: 建议检查（如情感状态跳跃）
- **info**: 仅供参考（如伏笔未回收）

## Verification Process

1. 读取 `.storyweaver/state_document.json`
2. 读取目标章节文本
3. 逐维检查一致性
4. 输出 violation 报告