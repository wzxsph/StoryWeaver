# StoryWeaver 项目引导

> 版本：1.2.3

StoryWeaver 是一个 Claude Code 网文长篇写作插件。项目目标是把网文创作从“临时提示词续写”升级为可持续的长篇生产流程：状态追踪、章节契约、P0-P3 上下文、十三维一致性校验和逐章循环。

## 项目原则

- 插件命令使用 `/storyweaver:<command>` 命名空间。
- `state/` 分布式 JSON 是唯一故事状态来源。
- 章节正文写入 `chapters/chapter_{N}.txt`。
- 每章必须有 `state/chapters/chapter_{N}.json` 章节契约。
- 状态提取报告写入 `state/chapters/chapter_{N}/extraction.json`。
- 审阅报告写入 `state/chapters/chapter_{N}/review.json`。
- 章节闸门写入 `state/chapters/chapter_{N}/gate.json`。
- 不再使用旧的单文件 `state_document` 架构。

## 目录结构

```text
./
├── .claude-plugin/        # Claude Code 插件 manifest 与 marketplace
├── agents/                # 5 个智能体
├── commands/              # 27 个插件命令
├── skills/                # 4 个 Claude Code 技能目录
├── rules/                 # 通用规则与网文规则
├── prompts/               # 15 个提示词模板
├── knowledge/             # 4 个知识库
├── workflows/             # 3 个工作流
├── schemas/               # 状态 JSON Schema
├── examples/              # 可校验样例项目
├── state/                 # 分布式状态存储
├── chapters/              # 章节正文
└── tools/                 # 本地验证脚本
```

## 核心概念

### P0-P3 上下文

| 优先级 | 内容 |
|--------|------|
| P0 | 核心设定、世界规则、锁定 canon |
| P1 | 当前角色、位置、情绪、物品、活跃情节线 |
| P2 | 最近三章事件与变化 |
| P3 | 背景设定、伏笔、休眠情节线 |

### 章节契约

章节契约记录在 `state/chapters/chapter_{N}.json`，用于确保每章都有明确交付：

- `chapter_goal`
- `reader_promise`
- `conflict_axis`
- `turning_point`
- `state_delta`
- `open_loops_introduced`
- `open_loops_advanced`
- `open_loops_resolved`

### 十三维一致性

基础十维：`character_identity`、`character_location`、`temporal_sequence`、`item_possession`、`ability_usage`、`relationship_logic`、`plot_thread_progress`、`world_rule_compliance`、`emotional_continuity`、`factual_contradiction`。

扩展三维：`scene_consistency`、`organization_logic`、`concept_definition`。

## 常用命令

| 命令 | 说明 |
|------|------|
| `/storyweaver:init --template snowflake` | 初始化项目 |
| `/storyweaver:import --path drafts/book.txt` | 导入旧稿/存稿 |
| `/storyweaver:plan --type outline` | 整体大纲 |
| `/storyweaver:plan --type volume --scope 1-30` | 分卷大纲 |
| `/storyweaver:plan --type chapter --scope 5` | 章节大纲 |
| `/storyweaver:worldbuild` | 世界观构建 |
| `/storyweaver:character add --name "张三" --role protagonist` | 添加角色 |
| `/storyweaver:plot add --name "主线谜团" --chapter 1` | 新增情节线 |
| `/storyweaver:timeline add --title "关键事件" --chapter 1` | 新增时间线事件 |
| `/storyweaver:relationship add --source "张三" --target "法宝" --type "持有"` | 新增关系 |
| `/storyweaver:brief --chapter N --words 3000` | 生成章节上下文包 |
| `/storyweaver:continue --chapter N --words 3000` | 续写章节 |
| `/storyweaver:continue --chapter N --mode polish` | 润色章节 |
| `/storyweaver:continue --chapter N --mode expand` | 扩写章节 |
| `/storyweaver:extract --chapter N --apply` | 提取章节状态证据 |
| `/storyweaver:verify --chapter N --scope all` | 一致性校验 |
| `/storyweaver:queue` | 生成修订行动队列 |
| `/storyweaver:gate --chapter N --promote verified` | 检查章节质量闸门 |
| `/storyweaver:snapshot --reason "before revise"` | 创建本地恢复点 |
| `/storyweaver:restore --snapshot <id>` | 从快照恢复状态 |
| `/storyweaver:revise --chapter N` | 根据审阅报告修正 |
| `/storyweaver:loop-start --scope chapter_range --from 1 --to 30` | 自动逐章循环 |
| `/storyweaver:index` | 生成状态索引 |
| `/storyweaver:status` | 项目状态 |

## 开发校验

修改插件结构、命令、技能或状态规则后运行：

```powershell
.\tools\validate-storyweaver.ps1 -Strict
```

该脚本必须通过后再发布。

验证范围包括根目录 `state/` 和 `examples/*/state/`，所以新增状态字段时要同步更新 `schemas/` 与最小样例。
