# storyweaver 项目引导

> **版本**: 1.2.3

本项目是 storyweaver 的项目级学习文档，参考 ECC (Everything Claude Code) 架构模式构建。

## 项目概述

storyweaver 是一个基于 Claude Code 的网文长篇写作助手插件系统。参考 ECC 架构模式和 NovelForge 设计理念，通过十维一致性校验框架，管理角色、物品、情节线和关系网络，确保数百章内容连贯一致。

核心能力：
- **状态追踪** — 自动维护角色、物品、场景、事件状态
- **上下文一致性** — 十维一致性校验引擎 + 扩展维度
- **层级上下文注入** — P0-P3 优先级注入，确保长篇连贯
- **增量状态更新** — 续写后自动提取并更新状态
- **冲突警告机制** — 一致性校验发现问题时向用户发出明确警告
- **多智能体协作** — 规划/写作/校验/提取/构建分离
- **雪花创作法** — 系统化项目启动流程
- **文风控制** — 支持幽默、动人、口语化等风格注入

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 格式 | Markdown + YAML frontmatter |
| 插件系统 | ECC (Everything Claude Code) |
| 状态存储 | JSON 分布式文件（state/ 目录） |
| 内容语言 | 中文（网文内容） |

## 目录结构

```
./
├── CLAUDE.md              # 本文件，项目引导
├── README.md              # 项目介绍文档
├── agents/                # 5 个智能体
├── commands/              # 16 个命令（无需 storyweaver- 前缀）
├── skills/                # 4 个技能
├── rules/
│   ├── common/          # 5 个通用规则
│   └── novelforge/      # 6 个写作规则
├── prompts/              # 16 个提示词模板
├── knowledge/            # 4 个知识库
├── workflows/            # 3 个工作流
├── contexts/            # 3 个模式定义
├── state/               # 分布式状态存储
├── chapters/            # 章节正文存储
└── workflows/            # 工作流（雪花创作法等）
```

## 核心概念

### P0-P3 层级上下文

| 优先级 | 名称 | 内容 |
|--------|------|------|
| P0 | Hard Constraints | 核心设定、世界规则 |
| P1 | Current State | 当前位置、情绪、物品 |
| P2 | Near Context | 最近3章事件 |
| P3 | Distant Reference | 背景、伏笔 |

### 十维一致性 + 扩展维度

**基础十维：**
1. character_identity — 角色外貌/性格
2. character_location — 位置一致性
3. temporal_sequence — 时间顺序
4. item_possession — 物品归属
5. ability_usage — 能力使用
6. relationship_logic — 关系逻辑
7. plot_thread_progress — 情节推进
8. world_rule_compliance — 世界规则
9. emotional_continuity — 情感过渡
10. factual_contradiction — 事实矛盾

**扩展维度（场景/组织/概念）：**
11. scene_consistency — 场景描述一致性
12. organization_logic — 组织架构逻辑
13. concept_definition — 概念定义一致性

### 分布式状态存储

```json
{
  "version": "2.0",
  "metadata": { "title": "", "genre": [], "style": "", "author": "", "word_count_target": 0, "template": "" },
  "outline": {
    "outline.json": {},      // 整体大纲
    "volume_{N}.json": {},   // 分卷大纲
    "chapter_{N}.json": {}   // 章节大纲
  },
  "characters": [],
  "scenes": [],
  "organizations": [],
  "concepts": [],
  "items": [],
  "chapters": [],
  "timeline": [],
  "plot_threads": [],
  "relationships": []
}
```

## 关键命令

### 初始化与状态
| 命令 | 说明 |
|------|------|
| `/init --template snowflake` | 初始化工作区 |
| `/status` | 查看项目状态概览 |
| `/loop-start` | 启动自动写小说循环 |
| `/loop-status` | 查看循环状态 |

### 规划
| 命令 | 说明 |
|------|------|
| `/plan --type outline` | 整体大纲（保存到 state/outline/outline.json） |
| `/plan --type volume --scope 1-30` | 分卷大纲（保存到 state/outline/volume_{N}.json） |
| `/plan --type chapter --scope 5` | 章节大纲（保存到 state/outline/chapter_{N}.json） |

### 章节创作
| 命令 | 说明 |
|------|------|
| `/continue --chapter N --words 3000` | 续写章节 |
| `/continue --chapter N --mode polish` | 润色章节 |
| `/continue --chapter N --mode expand` | 扩写大纲为正文 |
| `/continue --chapter N --style 幽默,动人` | 续写并注入指定文风 |
| `/verify --chapter N --scope all` | 校验一致性 |
| `/revise --chapter N` | 根据审阅报告修正 |

### 文风控制参数

`/continue --style` 支持以下参数（多个用逗号分隔）：
- `幽默` — 添加幽默、诙谐元素
- `动人` — 增加情感张力，打动读者
- `口语化` — 使用更口语化的表达
- `古风` — 古风文体（适用于仙侠/古代背景）
- `燃向` — 高潮情节专用，增强张力

### 自动循环（逐章执行）
| 命令 | 说明 |
|------|------|
| `/loop-start --scope chapter_range --from 1 --to 30` | 启动循环 |
| `/loop-status` | 查看状态 |

### 状态查看
| 命令 | 说明 |
|------|------|
| `/timeline --chapter N` | 事件时间线 |
| `/items --type 法宝` | 物品设定 |
| `/plot --status active` | 情节线状态 |
| `/scenes --character "林小雨"` | 场景列表 |
| `/organizations --type 门派` | 组织势力 |
| `/concepts --type 功法` | 概念设定 |
| `/chapters --range 1-30` | 章节概览 |

### 角色管理
| 命令 | 说明 |
|------|------|
| `/character add --name "张三" --role protagonist` | 添加角色 |
| `/character list` | 列出所有角色 |
| `/character update --name "张三" --field emotional_state --value "开心"` | 更新角色状态 |

## 文件命名约定

- **文件命名**: kebab-case（`storyweaver-continue.md`、`state-extractor.md`）
- **YAML frontmatter**: 所有 agents、skills、commands 必须有 `description` 字段
- **维度命名**: 英文 snake_case（`character_identity`、`temporal_sequence`）

## 组件引用格式

在 Agent/Skill/Rule 文件中引用其他组件时使用：
- `@rules/novelforge/p0-p3-context.md`
- `@prompts/内容生成.txt`
- `@workflows/雪花创作法.md`
- `@KB{作品标签}`

## 参考文档

- [README.md](README.md) — 项目完整介绍
- [架构概述](docs/architecture/overview.md)
- [工作流系统](docs/workflow/overview.md)
- [一致性校验](docs/novel/consistency.md)

## 参考

- [Everything Claude Code (ECC)](https://github.com/affaan-m/ECC) — 架构参考
- [NovelForge](https://github.com/RhythmicWave/NovelForge) — 原始项目
