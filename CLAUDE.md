# StoryWeaver Claude Code 引导

> 版本：1.2.3

StoryWeaver 是一个 Claude Code 网文长篇写作插件。你在本项目中工作时，应把它当作可分发插件维护，而不是单个项目里的临时 `.claude` 配置。

## 工作原则

- 插件根目录是仓库根目录，`.claude-plugin/` 只放 manifest 和 marketplace 元数据。
- 技能使用 `skills/<name>/SKILL.md` 目录结构。
- 命令使用 `commands/*.md`，安装后以 `/storyweaver:<command>` 暴露。
- Agents 放在 `agents/*.md`。
- `state/` 分布式 JSON 是唯一故事状态来源。
- 章节正文保存到 `chapters/chapter_{N}.txt`。
- 每章必须保存章节契约到 `state/chapters/chapter_{N}.json`。
- 一致性校验报告保存到 `state/chapters/chapter_{N}/review.json`。
- 修订历史保存到 `state/chapters/chapter_{N}/revision_history.json`。
- 状态结构的机器约束位于 `schemas/`；修改状态字段时必须同步 schema、规则文档和 `examples/minimal-project/`。

## 核心流程

1. `/storyweaver:init --template snowflake`
2. `/storyweaver:import --path drafts/book.txt`（已有旧稿/存稿时）
3. `/storyweaver:plan --type outline`
4. `/storyweaver:worldbuild`
5. `/storyweaver:character add --name "主角名" --role protagonist`
6. `/storyweaver:brief --chapter 1 --words 3000`
7. `/storyweaver:continue --chapter 1 --words 3000`
8. `/storyweaver:verify --chapter 1 --scope all`
9. `/storyweaver:queue`
10. `/storyweaver:revise --chapter 1`（如有 critical/warning）
11. `/storyweaver:index`

## 状态与一致性

P0-P3 上下文顺序：

| 优先级 | 内容 |
|--------|------|
| P0 | 核心设定、世界规则、锁定 canon |
| P1 | 当前角色、位置、情绪、物品、活跃情节线 |
| P2 | 最近三章事件与变化 |
| P3 | 背景设定、伏笔、休眠情节线 |

章节上下文包保存到 `state/chapters/chapter_{N}/brief.json`，用于审计每章实际注入的 P0-P3 写作输入。
大纲保存到 `state/outline/`；章节大纲必须能落到章节契约，供 brief 和正文生成继续使用。
全局状态索引保存到 `state/metadata/index.json`，用于快速查看章节健康状态、实体反向引用和悬念推进。
修订行动队列保存到 `state/metadata/action_queue.json`，用于把审阅报告和状态警告汇总成下一步任务。

十三维一致性：

1. `character_identity`
2. `character_location`
3. `temporal_sequence`
4. `item_possession`
5. `ability_usage`
6. `relationship_logic`
7. `plot_thread_progress`
8. `world_rule_compliance`
9. `emotional_continuity`
10. `factual_contradiction`
11. `scene_consistency`
12. `organization_logic`
13. `concept_definition`

## 本地验证

```powershell
.\tools\validate-storyweaver.ps1 -Strict
```

验证内容包括 Claude Code 插件 strict 校验、JSON 校验、状态 schema 校验、状态图引用完整性、init project smoke test、outline planner smoke test、brief 构建器 smoke test、index 构建器 smoke test、manuscript import smoke test、action queue smoke test、revision history smoke test、活跃组件旧状态引用扫描和技能目录结构检查。
同时会校验根目录 `state/` 和 `examples/*/state/` 是否符合 `schemas/`，以及跨文件引用是否能解析到真实实体。
