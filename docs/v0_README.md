# 入门指南：StoryWeaver

> ⚠️ **本项目仍处于测试开发期**，存在诸多不完善之处，欢迎批评指正。README 中也可能存在表述不清的地方，请以源代码为准。
>
> 历史文档：本文件记录 v0 单文件状态和旧 `/storyweaver ...` 命令形态，仅供迁移参考。当前插件架构以仓库根 README、`/storyweaver:<command>` 命名空间、`state/` 分布式 JSON、`schemas/` 和 `examples/minimal-project/` 为准。

## 概述

StoryWeaver 是一个基于 ECC (Everything Claude Code) 的网文长篇写作助手插件系统。通过十维一致性校验框架，管理角色、物品、情节线和关系网络，确保数百章的内容连贯一致。

## 技术栈

| 层级 | 技术 |
|------|------|
| 格式 | Markdown + YAML frontmatter |
| 插件系统 | ECC (Everything Claude Code) |
| 状态存储 | JSON (`state_document.json`) |
| 内容语言 | 中文（网文内容） |

## 架构

ECC 使用 6 类组件：
- **智能体** (`agents/*.md`) — 自主角色（planner, writer, consistency-guardian, state-extractor, world-builder）
- **命令** (`commands/*.md`) — 斜杠命令（`/storyweaver init`、`/storyweaver continue` 等）
- **技能** (`skills/*.md`) — 智能体引用的可复用技能定义
- **规则** (`rules/*.md`) — 写作约束和 P0-P3 上下文
- **提示词** (`prompts/*.txt`) — LLM 提示词模板
- **状态** (`state_document.json`) — 所有故事状态的单一真相来源

## 关键入口

- **插件配置**: `.claude-plugin/plugin.json` — 注册 agents/commands/skills/rules 路径
- **命令中心**: `commands/storyweaver.md` — 主入口，列出所有子命令
- **状态文档**: `.storyweaver/state_document.json` — 持久化故事状态（初始化时创建）

## 目录结构

```
storyweaverwriter/
├── .claude-plugin/plugin.json   # 插件清单
├── agents/                       # 5 个智能体
├── commands/                     # 6 个命令
├── skills/                       # 4 个技能
├── rules/                        # storyweaver-rules.md + p0-p3-context.md
├── prompts/                      # 7 个中文提示词模板
├── state/                        # state_document.json 模板
└── examples/                    # 示例项目/
```

## 约定

**文件命名**: kebab-case（`storyweaver-continue.md`、`state-extractor.md`）

**YAML frontmatter**: 所有 agents 和 skills 必须有 `name` + `description` 字段

**P0-P3 上下文**: 定义在 `rules/p0-p3-context.md`，各处引用

**状态文档**: `.storyweaver/state_document.json` — 不可手动编辑

**维度命名**: 英文 snake_case（`character_identity`、`temporal_sequence`）

**提交风格**: 约定式提交（`feat:`、`refactor:`、`fix:`）

## 常见任务

- **初始化项目**: `/storyweaver init`
- **撰写章节**: `/storyweaver continue --chapter 1 --words 3000`
- **校验一致性**: `/storyweaver verify --chapter 1`
- **添加角色**: `/storyweaver character add --name "张三" --role protagonist`

## 查找位置

| 我想... | 查看... |
|---------|---------|
| 添加新命令 | `commands/storyweaver-*.md` |
| 修改写作规则 | `rules/storyweaver-rules.md` |
| 修改 P0-P3 上下文 | `rules/p0-p3-context.md` |
| 了解状态结构 | `state/state_document.json` |
| 修改提示词模板 | `prompts/*.txt` |

## 功能

- **状态追踪** — 自动维护角色、物品、事件状态
- **上下文一致性** — 十维一致性校验引擎
- **层级上下文注入** — P0-P3 优先级注入，确保长篇连贯
- **增量状态更新** — 续写后自动提取并更新状态
- **多智能体协作** — 规划/写作/校验分离
- **甜文法则** — 专为甜蜜恋爱题材优化

## 安装

### 方式一：复制到项目（推荐）

```bash
# 在你的小说项目目录下
mkdir -p .claude/commands/storyweaver_writer
cp -r /path/to/storyweaver_writer/commands/* .claude/commands/storyweaver_writer/
```

重启 Claude Code 或运行 `/reload-plugins`。

### 方式二：安装为插件

```bash
/plugin marketplace add https://github.com/wzxsph/storyweaver
/plugin install storyweaver
```

## 快速开始

```bash
# 1. 初始化工作区
/storyweaver init

# 2. 构建世界观
/storyweaver worldbuild

# 3. 添加角色
/storyweaver character add --name "林小雨" --role protagonist

# 4. 开始写第一章
/storyweaver continue --chapter 1

# 5. 校验一致性
/storyweaver verify --chapter 1

# 6. 查看状态
/storyweaver character list
```

## 核心概念

### 状态文档 (State Document)

`.storyweaver/state_document.json` 是所有状态的单一真相来源：

```json
{
  "version": "1.0",
  "last_updated_chapter": 2,
  "characters": [...],
  "timeline": [...],
  "items": [...],
  "plot_threads": [...],
  "relationships": [...]
}
```

### P0-P3 上下文

| 优先级 | 名称 | 内容 |
|--------|------|------|
| P0 | Hard Constraints | 核心角色定义、世界规则 |
| P1 | Current State | 当前状态（位置、情绪、物品） |
| P2 | Near Context | 最近3章事件 |
| P3 | Distant Reference | 背景设定、伏笔 |

### 十维一致性

1. **character_identity** — 角色外貌/性格
2. **character_location** — 位置一致性
3. **temporal_sequence** — 时间顺序
4. **item_possession** — 物品归属
5. **ability_usage** — 能力使用
6. **relationship_logic** — 关系与事件
7. **plot_thread_progress** — 情节推进
8. **world_rule_compliance** — 世界规则
9. **emotional_continuity** — 情感过渡
10. **factual_contradiction** — 事实矛盾

## 命令参考

| 命令 | 说明 |
|------|------|
| `/storyweaver init` | 初始化工作区，创建状态文档 |
| `/storyweaver worldbuild` | 构建世界观设定 |
| `/storyweaver character add --name "张三" --role protagonist` | 添加角色 |
| `/storyweaver character list` | 列出所有角色 |
| `/storyweaver character update --name "张三" --field emotional_state --value "开心"` | 更新角色状态 |
| `/storyweaver continue --chapter 1` | 续写章节 |
| `/storyweaver verify --chapter 1` | 校验章节一致性 |
| `/storyweaver status` | 查看当前状态概览 |

## 组件详解

### 智能体 (agents/)

| 智能体 | 文件 | 职责 |
|--------|------|------|
| **planner** | `agents/planner.md` | 网文大纲规划：根据用户意图创建章节/卷/整体大纲。擅长三幕结构、起承转合、人物弧设计。 |
| **writer** | `agents/writer.md` | 写作执行：基于上下文和状态文档生成章节内容。遵守 P0-P3 层级上下文，保持文风统一。 |
| **world-builder** | `agents/world-builder.md` | 世界观构建：从用户描述生成完整世界设定，包括修炼体系、势力架构、地理设定。 |
| **state-extractor** | `agents/state-extractor.md` | 状态提取：从章节文本提取角色、物品、关系变化，更新状态文档。 |
| **consistency-guardian** | `agents/consistency-guardian.md` | 一致性校验：十维框架校验角色、物品、时间线、关系的连贯性。 |

### 命令 (commands/)

| 命令 | 文件 | 职责 |
|------|------|------|
| **storyweaver** | `commands/storyweaver.md` | 主入口，列出所有子命令 |
| **storyweaver init** | `commands/storyweaver-init.md` | 初始化工作区，创建 `.storyweaver/state_document.json` |
| **storyweaver character** | `commands/storyweaver-character.md` | 角色管理：添加、查看、更新、删除角色 |
| **storyweaver continue** | `commands/storyweaver-continue.md` | 续写章节，参考 P0-P3 上下文生成内容 |
| **storyweaver verify** | `commands/storyweaver-verify.md` | 校验章节一致性，十维框架检测矛盾 |
| **storyweaver worldbuild** | `commands/storyweaver-worldbuild.md` | 根据用户描述生成世界观设定 |

### 技能 (skills/)

| 技能 | 文件 | 职责 |
|------|------|------|
| **storyweaver** | `skills/storyweaver.md` | 核心写作技能，激活于用户撰写/续写小说章节时。强制状态优先、增量更新、P0-P3 上下文注入。 |
| **storyweaver-extract** | `skills/storyweaver-extract.md` | 状态提取技能，从章节文本提取角色动态信息、物品状态、场景状态、关系变化。 |
| **storyweaver-consistency** | `skills/storyweaver-consistency.md` | 一致性校验技能，十维维度校验框架。 |
| **storyweaver-worldbuild** | `skills/storyweaver-worldbuild.md` | 世界观生成技能，参考 prompt 模板生成完整世界设定。 |

### 规则 (rules/)

| 规则 | 文件 | 职责 |
|------|------|------|
| **storyweaver-rules** | `rules/storyweaver-rules.md` | 写作文风规范与禁词规则。包括白描为主、节奏紧凑、对话自然等文风要求，以及 AI 味道词汇和网文禁词列表。 |
| **p0-p3-context** | `rules/p0-p3-context.md` | P0-P3 层级上下文优先级定义。P0 硬约束、P1 当前状态、P2 近距上下文、P3 远距引用。所有续写/校验操作必须遵循。 |

## 示例小说

《我真的可以拥有甜甜的恋爱吗》— 都市+玄幻+穿越，幽默风趣

- 主角：林小雨（穿越者）、陆尘（天元宗首席弟子）
- 红线绳绑定，命中注定的相遇
- 修炼加成与恋爱甜蜜值挂钩

## 参考

- [Everything Claude Code (ECC)](https://github.com/affaan-m/ECC) — 系统架构参考
- [NovelForge](https://github.com/RhythmicWave/NovelForge) — prompt 模板参考

## 许可证

MIT
