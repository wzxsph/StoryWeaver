# StoryWeaver

StoryWeaver 是一个面向中文网文长篇创作的 Claude Code 插件。它把“写下一章”拆成可持续的工程化流程：项目蓝图、P0-P3 上下文、章节契约、分布式状态、十三维一致性校验和逐章循环。

目标不是一键代笔整本书，而是让作者在 30 万字以上的长篇里少修设定 bug、多推进故事。

> 版本：1.2.3

## 插件形态

StoryWeaver 遵循 Claude Code 插件结构：

```text
storyweaver/
├── .claude-plugin/plugin.json     # 插件 manifest
├── agents/                        # 5 个协作智能体
├── commands/                      # 27 个命名空间命令
├── skills/                        # 4 个 Claude Code 技能目录
├── rules/                         # 通用规则与网文规则
├── prompts/                       # 写作/提取/校验提示词
├── knowledge/                     # 标签、命名、物品、概念知识
├── workflows/                     # 雪花法、章节生成、拆书
├── schemas/                       # 状态 JSON Schema
├── examples/minimal-project/       # 最小可校验样例
├── state/                         # 分布式故事状态
└── chapters/                      # 章节正文
```

安装为插件后，命令以 `/storyweaver:<command>` 暴露，例如 `/storyweaver:continue`。

## 快速开始

```bash
/storyweaver:init --template snowflake
/storyweaver:import --path drafts/book.txt --title "玄天剑醒来"
/storyweaver:plan --type outline
/storyweaver:worldbuild
/storyweaver:character add --name "林小雨" --role protagonist
/storyweaver:items add --name "玄天剑" --type "法宝"
/storyweaver:plot add --name "玄天剑为何认识林小雨" --chapter 1
/storyweaver:relationship add --source "林小雨" --target "玄天剑" --type "持有者与苏醒残剑" --chapter 1
/storyweaver:brief --chapter 1 --words 3000
/storyweaver:continue --chapter 1 --words 3000
/storyweaver:extract --chapter 1 --apply
/storyweaver:verify --chapter 1 --scope all
/storyweaver:queue
/storyweaver:gate --chapter 1 --promote verified
/storyweaver:snapshot --reason "before revise chapter 1" --include-chapters
/storyweaver:index
```

自动逐章工作流：

```bash
/storyweaver:loop-start --scope chapter_range --from 1 --to 30 --mode safe
/storyweaver:loop-status
```

## 核心机制

### P0-P3 上下文

| 优先级 | 内容 |
|--------|------|
| P0 | 核心设定、世界规则、不可违背的 canon |
| P1 | 当前角色状态、位置、情绪、物品、活跃情节线 |
| P2 | 最近三章事件、关系变化、位置变化 |
| P3 | 背景设定、伏笔、休眠情节线、远期回收点 |

### 章节契约

每章写作前先建立 `state/chapters/chapter_{N}.json`：

- `chapter_goal`：本章结束时发生什么变化
- `reader_promise`：本章交付的情绪或爽点
- `conflict_axis`：推动场景的主要压力
- `turning_point`：不可逆转折、发现、选择或代价
- `state_delta`：预计改变的角色、物品、场景、关系、情节线
- `open_loops_*`：新增、推进、解决的钩子

这让“章节是否有效推进”可以被校验，而不只是看字数。

### 大纲状态

整体、分卷和章节规划保存到 `state/outline/`，并受 JSON Schema 约束。`/storyweaver:plan --type chapter` 会同时生成 `state/outline/chapter_{N}.json` 和 `state/chapters/chapter_{N}.json`，让规划结果直接进入 `brief -> continue` 链路。

### 章节上下文包

每章写作前生成 `state/chapters/chapter_{N}/brief.json`：

- 将 P0-P3 状态裁剪为本章必要输入
- 记录 `source_files`，方便追查上下文来自哪里
- 明确 `must_include`、`writing_directives`、`exclusions` 和 `open_questions`
- 让自动循环失败后可以复用同一份写作输入重试

### 十三维一致性

基础十维：

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

扩展三维：

11. `scene_consistency`
12. `organization_logic`
13. `concept_definition`

## 状态存储

StoryWeaver 使用分布式 JSON，避免单个状态文件膨胀：

```text
state/
├── metadata/project.json
├── metadata/loop_status.json
├── metadata/index.json
├── metadata/action_queue.json
├── metadata/import_report.json
├── outline/outline.json
├── outline/volume_{N}.json
├── outline/chapter_{N}.json
├── characters/{id}.json
├── items/{id}.json
├── scenes/{id}.json
├── organizations/{id}.json
├── concepts/{id}.json
├── timeline/event_{id}.json
├── plot_threads/{id}.json
├── relationships/{id}.json
└── chapters/chapter_{N}.json
```

章节正文保存到 `chapters/chapter_{N}.txt`，审阅报告保存到 `state/chapters/chapter_{N}/review.json`。
章节上下文包保存到 `state/chapters/chapter_{N}/brief.json`。
章节提取报告保存到 `state/chapters/chapter_{N}/extraction.json`。
章节质量闸门保存到 `state/chapters/chapter_{N}/gate.json`。
修订历史保存到 `state/chapters/chapter_{N}/revision_history.json`。
全局导航索引保存到 `state/metadata/index.json`，可由 `/storyweaver:index` 随时重建。

## 命令参考

| 命令 | 说明 |
|------|------|
| `/storyweaver:help` | 查看命令总览 |
| `/storyweaver:init` | 初始化项目 |
| `/storyweaver:import` | 导入旧稿/存稿并生成章节契约 |
| `/storyweaver:plan` | 规划整体、分卷、章节大纲 |
| `/storyweaver:worldbuild` | 构建世界观 |
| `/storyweaver:character` | 管理角色 |
| `/storyweaver:brief` | 生成章节上下文包 |
| `/storyweaver:continue` | 续写、润色、扩写章节 |
| `/storyweaver:extract` | 从正文生成状态提取报告 |
| `/storyweaver:verify` | 一致性校验并保存报告 |
| `/storyweaver:queue` | 汇总审阅问题和状态警告 |
| `/storyweaver:gate` | 检查章节是否可进入下一步 |
| `/storyweaver:snapshot` | 创建或列出本地状态快照 |
| `/storyweaver:restore` | 从快照恢复状态并重新校验 |
| `/storyweaver:revise` | 根据报告修订章节 |
| `/storyweaver:loop-start` | 自动逐章写作循环 |
| `/storyweaver:loop-status` | 查看循环状态 |
| `/storyweaver:index` | 生成状态索引与健康警告 |
| `/storyweaver:status` | 查看项目概览 |
| `/storyweaver:chapters` | 查看章节概览 |
| `/storyweaver:timeline` | 查看时间线 |
| `/storyweaver:items` | 查看物品 |
| `/storyweaver:plot` | 查看情节线 |
| `/storyweaver:relationship` | 管理关系网络 |
| `/storyweaver:scenes` | 查看场景 |
| `/storyweaver:organizations` | 查看组织 |
| `/storyweaver:concepts` | 查看概念 |

## 校验

本地开发时运行：

```powershell
.\tools\validate-storyweaver.ps1 -Strict
```

该脚本会执行 Claude Code 插件严格校验、JSON 解析、状态 JSON Schema 校验、状态图引用完整性校验、init project smoke test、state card manager smoke test、story graph manager smoke test、outline planner smoke test、brief 构建器 smoke test、index 构建器 smoke test、chapter extraction smoke test、chapter gate smoke test、manuscript import smoke test、action queue smoke test、活跃组件旧状态引用扫描，以及技能目录结构检查。状态校验覆盖根目录 `state/` 和 `examples/*/state/`。

最小样例位于 `examples/minimal-project/`，包含一章正文、整体/分卷/章节大纲、章节契约、章节上下文包、章节 extraction、章节 gate、状态索引、修订行动队列、角色、物品、场景、组织、概念、事件、情节线、关系和 review 报告。

## 安装

开发期可在 Claude Code 中使用本地插件目录测试：

```bash
claude --plugin-dir .
```

发布后可通过 marketplace 安装：

```bash
/plugin marketplace add https://github.com/wzxsph/StoryWeaver
/plugin install storyweaver
```

## 参考

- [Everything Claude Code](https://github.com/affaan-m/ECC)
- [NovelForge](https://github.com/RhythmicWave/NovelForge)
