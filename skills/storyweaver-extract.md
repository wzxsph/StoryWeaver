---
name: storyweaver-extract
description: 从章节文本提取角色、物品、场景、关系状态变化
---

# StoryWeaver Extract

## When to Activate
- 续写章节完成后，需要更新状态文档
- 用户要求分析某个章节的状态变化

## Extraction Types

### 1. 角色动态信息提取
参考 `@prompts/角色动态信息提取.txt`

动态信息类别：
- 系统/模拟器/金手指信息
- 等级/修为境界
- 装备/法宝
- 知识/情报
- 资产/领地
- 功法/技能
- 血脉/体质
- 人脉/人情
- 心理想法/目标快照

### 2. 物品状态提取
参考 `@prompts/物品状态提取.txt`

字段：`name/category/description/owner_hint/power_or_effect/constraints/current_state/important_events`

### 3. 场景状态提取
参考 `@prompts/场景状态提取.txt`

字段：`name/description/function_in_story/dynamic_state`

### 4. 关系提取
参考 `@prompts/关系提取.txt`

关系类型：同盟/队友/同门/敌对/亲属/师徒/对手/伙伴/上级/下属/隶属/成员/领导/创立/控制/位于/影响/克制/关于/其他

## Output Format

所有提取结果输出为 JSON，仅更新状态文档中有变化的部分。