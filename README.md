# storyweaver

基于 Claude Code 的网文长篇写作助手插件系统。参考 ECC 架构模式和 NovelForge 设计理念，通过十维一致性校验框架，管理角色、物品、情节线和关系网络，确保数百章内容连贯一致。

> 本项目处于构建初期，尚未经过充分测试，属于即兴创作的产物，在实际使用中可能会遇到各种问题。本项目深度参考了 [ECC](https://github.com/affaan-m/ECC) 和 [NovelForge](https://github.com/RhythmicWave/NovelForge) 的设计理念实现。
>
> **版本**: 1.2.3

## 技术栈

| 层级 | 技术 |
|------|------|
| 格式 | Markdown + YAML frontmatter |
| 插件系统 | ECC (Everything Claude Code) |
| 状态存储 | JSON 分布式文件（state/ 目录） |
| 内容语言 | 中文（网文内容） |
| AI 模型 | Claude (Anthropic) |

## 目录结构

```
storyweaver/
├── agents/                       # 5 个智能体
├── commands/                     # 16 个命令
├── skills/                       # 4 个技能
├── rules/
│   ├── common/                  # 5 个通用规则
│   └── novelforge/              # 6 个写作规则
├── prompts/                     # 16 个提示词模板
├── knowledge/                   # 4 个知识库
├── workflows/                   # 3 个工作流
├── contexts/                    # 3 个模式定义
├── state/                        # 分布式状态存储
│   ├── metadata/                # 项目元数据
│   ├── outline/                 # 大纲目录
│   ├── characters/              # 角色状态
│   ├── items/                   # 物品状态
│   ├── scenes/                  # 场景状态
│   ├── organizations/           # 组织状态
│   ├── concepts/                # 概念状态
│   ├── timeline/                # 时间线事件
│   ├── plot_threads/            # 情节线状态
│   ├── relationships/          # 关系状态
│   └── chapters/               # 章节记录
├── chapters/                     # 章节正文存储
└── workflows/                    # 工作流（雪花创作法等）
```

## 核心概念

### P0-P3 层级上下文

| 优先级 | 名称 | 内容 |
|--------|------|------|
| P0 | Hard Constraints | 核心设定、世界规则 |
| P1 | Current State | 当前位置、情绪、物品 |
| P2 | Near Context | 最近3章事件 |
| P3 | Distant Reference | 背景、伏笔 |

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

### 分布式状态存储

状态信息分散存储在 `state/` 目录下的多个文件中，避免单一文件过于臃肿：

- `metadata/project.json` — 项目元数据
- `outline/outline.json` — 整体大纲
- `outline/volume_{N}.json` — 分卷大纲
- `outline/chapter_{N}.json` — 章节大纲
- `characters/{id}.json` — 单个角色状态
- `items/{id}.json` — 单个物品状态
- `scenes/{id}.json` — 单个场景状态
- `organizations/{id}.json` — 单个组织状态
- `concepts/{id}.json` — 单个概念状态
- `timeline/event_{id}.json` — 单个时间线事件
- `plot_threads/{id}.json` — 单个情节线状态
- `relationships/{id}.json` — 单个关系状态
- `chapters/chapter_{N}.json` — 单个章节记录

## 快速开始

```bash
# 1. 初始化工作区
/init --template snowflake

# 2. 创建整体大纲
/plan --type outline

# 3. 构建世界观
/worldbuild

# 4. 添加角色
/character add --name "林小雨" --role protagonist

# 5. 开始写第一章
/continue --chapter 1

# 6. 校验一致性
/verify --chapter 1
```

## 自动循环

`/loop-start` 支持逐章自动撰写，每章执行完整流程：撰写→审阅→修正→状态更新。

```bash
/loop-start --scope chapter_range --from 1 --to 30
/loop-status
```

## 冲突警告机制

`/verify` 和 `/loop-start` 执行一致性校验时，如发现问题会显示警告：

```
⚠️ [一致性警告] 第 5 章发现 3 个问题

🔴 CRITICAL (必须修改):
  • character_location: 角色张三位置不一致
    建议: 修改为本章时间线内合理的位置

🟡 WARNING (建议修改):
  • emotional_continuity: 情感过渡不自然
    ...
```

## 命令参考

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
| `/plan --type outline` | 整体大纲规划 |
| `/plan --type volume --scope 1-30` | 分卷大纲 |
| `/plan --type chapter --scope 5` | 章节大纲 |

### 角色管理
| 命令 | 说明 |
|------|------|
| `/character add --name "张三" --role protagonist` | 添加角色 |
| `/character list` | 列出所有角色 |
| `/character update --name "张三" --field emotional_state --value "开心"` | 更新角色状态 |

### 章节创作
| 命令 | 说明 |
|------|------|
| `/continue --chapter 5 --words 3000` | 续写章节 |
| `/continue --chapter 5 --mode polish` | 润色章节 |
| `/continue --chapter 5 --mode expand` | 扩写大纲为正文 |
| `/continue --chapter 5 --style 幽默,动人` | 续写并注入指定文风 |
| `/verify --chapter 5 --scope all` | 校验一致性 |
| `/revise --chapter 5` | 修正章节问题 |
| `/chapters --range 1-30` | 列出章节概览 |

### 文风控制参数

`/continue --style` 支持以下参数（多个用逗号分隔）：
- `幽默` — 添加幽默、诙谐元素
- `动人` — 增加情感张力，打动读者
- `口语化` — 使用更口语化的表达
- `古风` — 古风文体（适用于仙侠/古代背景）
- `燃向` — 高潮情节专用，增强张力

### 状态查看
| 命令 | 说明 |
|------|------|
| `/timeline --chapter 5` | 事件时间线 |
| `/items --type 法宝` | 物品设定 |
| `/plot --status active` | 情节线状态 |
| `/scenes --character "林小雨"` | 场景列表 |
| `/organizations --type 门派` | 组织势力 |
| `/concepts --type 功法` | 概念设定 |

## 安装

### 方式一：安装为插件（推荐）

```bash
# 添加市场
/plugin marketplace add https://github.com/wzxsph/StoryWeaver

# 安装插件
/plugin install storyweaver
```

### 方式二：复制到项目

```bash
# 克隆仓库
git clone https://github.com/wzxsph/StoryWeaver.git

# 进入目录
cd StoryWeaver

# 复制整个项目到 Claude Code 配置目录
cp -r agents commands skills rules prompts knowledge workflows contexts state .claude-plugin/ ~/.claude/
```

## 参考

- [Everything Claude Code (ECC)](https://github.com/affaan-m/ECC)
- [NovelForge](https://github.com/RhythmicWave/NovelForge)
- [CLAUDE.md](CLAUDE.md) — 项目引导
