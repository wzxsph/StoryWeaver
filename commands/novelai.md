---
description: 网文长篇写作助手 — 管理角色、物品、事件状态，保证长篇一致性
---

# /storyweaver

网文长篇写作助手，管理角色、物品、事件状态，保证长篇一致性。

## 子命令

### 初始化与状态
| 命令 | 说明 | 提示 |
|------|------|------|
| `/init --template snowflake` | 初始化工作区 | template 可选 `default`/`snowflake` |
| `/status` | 查看项目状态概览 | 无参数 |
| `/loop-start` | 启动自动写小说循环 | scope 可选 `all`/`volume`/`chapter_range` |
| `/loop-status` | 查看循环状态 | 无参数 |

### 规划
| 命令 | 说明 | 提示 |
|------|------|------|
| `/plan --type outline` | 整体大纲规划 | type 可选 `outline`/`volume`/`chapter` |
| `/plan --type volume --scope 1-30` | 分卷大纲 | scope 格式 `1-30` |
| `/plan --type chapter --scope 5` | 章节大纲 | scope 指定章节号 |

### 角色管理
| 命令 | 说明 | 提示 |
|------|------|------|
| `/character add --name "张三" --role protagonist` | 添加角色 | role 可选 `protagonist`/`antagonist`/`supporting`/`minor` |
| `/character list` | 列出所有角色 | 无参数 |
| `/character update --name "张三" --field emotional_state --value "开心"` | 更新角色状态 | field 可选 `status`/`current_location`/`emotional_state` |

### 章节创作
| 命令 | 说明 | 提示 |
|------|------|------|
| `/continue --chapter 5 --words 3000` | 续写章节 | words 默认 3000 |
| `/continue --chapter 5 --mode polish` | 润色章节 | mode 可选 `write`/`polish`/`expand` |
| `/continue --chapter 5 --mode expand` | 扩写大纲为正文 | 无 |
| `/verify --chapter 5 --scope all` | 校验一致性 | scope 可选 `basic`/`extended`/`all` |
| `/chapters --range 1-30` | 列出章节概览 | range 格式 `1-30` |

### 审阅与修改
| 命令 | 说明 | 提示 |
|------|------|------|
| `/revise --chapter 5` | 根据审阅报告修改正文 | 需先执行 `/verify` |
| `/revise --chapter 5 --fix character_identity` | 修复特定问题 | fix 可选十维维度名 |

### 状态查看
| 命令 | 说明 | 提示 |
|------|------|------|
| `/timeline --chapter 5` | 事件时间线 | 可加 `--character "角色名"` 筛选 |
| `/items --type 法宝` | 物品设定 | type 可选 `法宝`/`武器`/`丹药`/`材料` |
| `/plot --status active` | 情节线状态 | status 可选 `active`/`dormant`/`completed` |
| `/scenes --character "林小雨"` | 场景列表 | 可筛选在场角色 |
| `/organizations --type 门派` | 组织势力 | type 可选 `门派`/`王朝`/`妖族` |
| `/concepts --type 功法` | 概念设定 | type 可选 `功法`/`规则`/`社会制度` |

### 世界观构建
| 命令 | 说明 | 提示 |
|------|------|------|
| `/worldbuild` | 构建世界观设定 | 无参数 |

## 保存规则 ⚠️

执行命令后，**必须**将结果保存到 state 目录：

| 数据类型 | 保存路径 |
|----------|----------|
| 整体大纲 | `state/outline/outline.json` |
| 分卷大纲 | `state/outline/volume_{N}.json` |
| 章节大纲 | `state/outline/chapter_{N}.json` |
| 审阅报告 | `state/chapters/chapter_{N}/review.json` |
| 修订历史 | `state/chapters/chapter_{N}/revision_history.json` |
| 章节正文 | `chapters/chapter_{N}.txt` |
| 角色状态 | `state/characters/{id}.json` |
| 物品状态 | `state/items/{id}.json` |
| 场景状态 | `state/scenes/{id}.json` |
| 组织状态 | `state/organizations/{id}.json` |
| 概念状态 | `state/concepts/{id}.json` |
| 时间线事件 | `state/timeline/event_{id}.json` |
| 情节线状态 | `state/plot_threads/{id}.json` |
| 关系状态 | `state/relationships/{id}.json` |
| 章节记录 | `state/chapters/chapter_{N}.json` |
| 循环状态 | `state/metadata/loop_status.json` |

## 工作流程

### 手动工作流
1. `/init` 初始化工作区
2. `/plan --type outline` 创建整体大纲
3. `/worldbuild` 构建世界观
4. `/character add` 添加初始角色
5. `/continue --chapter 1` 生成第一章
6. `/verify` 校验一致性
7. `/revise` 根据报告修改（如有问题）
8. 循环续写直到完本

### 自动工作流（推荐）
1. `/init --template snowflake`
2. `/plan --type outline`
3. `/worldbuild`
4. `/character add`
5. `/loop-start` ← 自动逐章写、审阅、修改

## 自动循环 (/loop-start)

使用 `/loop-start` 自动完成整本小说：

```bash
/loop-start                    # 自动写所有章节
/loop-start --from 1 --to 30  # 指定范围
/loop-start --mode fast       # 快速模式（跳过审阅）
/loop-start --mode safe       # 安全模式（每章审阅+修改）
```

使用 `/loop-status` 查看进度。

## 前提条件检查

执行 `/loop-start` 前请确认：
- [ ] `/init` 已执行
- [ ] `/plan --type outline` 已完成
- [ ] `/worldbuild` 已完成
- [ ] 至少有主角在 state 中
