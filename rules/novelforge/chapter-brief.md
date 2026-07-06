---
name: chapter-brief
description: 章节上下文包规则 — 将 P0-P3 状态裁剪为可审计的单章写作输入
---

# 章节上下文包规则

章节上下文包保存到 `state/chapters/chapter_{N}/brief.json`。它不是章节契约的替代品，而是写作前的输入清单：哪些设定必须进入上下文，哪些旧信息应该降权，哪些内容禁止本章碰。
优先使用 `tools/build-brief.mjs` 从状态树确定性生成；脚本不可用时再按本规则手动组装。

## 解决的问题

- 长篇写到后期状态文件很多，模型临时读取容易漏关键状态。
- P0-P3 只在提示词里描述时不可审计，写错后很难追查输入是否遗漏。
- 自动循环需要稳定产物，方便失败后复用同一份上下文重试。

## 生成原则

1. 先读取 `state/chapters/chapter_{N}.json` 章节契约；没有契约时先生成 draft 契约。
2. 从 `state/` 中筛选本章相关实体，不要全量塞入上下文。
3. P0 放不可违背设定：世界规则、锁定概念、主角核心身份、关键禁令。
4. P1 放当前状态：本章出场角色、地点、持有物、伤势、情绪、活跃情节线。
5. P2 放最近三章：事件摘要、关系变化、物品转移、位置变化。
6. P3 放远距引用：伏笔、休眠情节线、长期关系、背景秘密。
7. `must_include` 中的实体必须真实存在于对应 `state/` 子目录。
8. `exclusions` 明确本章不能引入或解决的内容，避免模型过度推进。

## 输出字段

```json
{
  "chapter": 2,
  "generated_at": "ISO-8601",
  "purpose": "为第2章续写提供可审计上下文",
  "source_files": ["state/chapters/chapter_2.json"],
  "context_budget": {
    "target_words": 3000,
    "max_context_items": 24
  },
  "p0": [],
  "p1": [],
  "p2": [],
  "p3": [],
  "must_include": {
    "characters": [],
    "items": [],
    "scenes": [],
    "organizations": [],
    "concepts": [],
    "timeline_events": [],
    "plot_threads": [],
    "relationships": []
  },
  "writing_directives": [],
  "exclusions": [],
  "open_questions": []
}
```

## 校验

- `chapter` 必须与目录 `chapter_{N}` 一致。
- `must_include` 中所有 ID 必须能解析到真实状态文件。
- `p0`/`p1`/`p2`/`p3` 中若写入实体 ID，也必须能解析到真实状态文件。
- 非 `planned` 章节必须先有 brief，再进入正文生成。
