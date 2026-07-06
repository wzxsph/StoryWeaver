---
description: StoryWeaver 命令总览与推荐工作流
---

# /storyweaver:help

StoryWeaver 是面向中文网文长篇创作的 Claude Code 插件。插件安装后，命令以 `/storyweaver:<command>` 命名空间暴露。

## 推荐工作流

1. `/storyweaver:init --template snowflake`
2. `/storyweaver:import --path drafts/book.txt`（已有旧稿/存稿时）
3. `/storyweaver:plan --type outline`
4. `/storyweaver:worldbuild`
5. `/storyweaver:character add --name "主角名" --role protagonist`
6. `/storyweaver:brief --chapter 1 --words 3000`
7. `/storyweaver:continue --chapter 1 --words 3000`
8. `/storyweaver:extract --chapter 1 --apply`
9. `/storyweaver:verify --chapter 1 --scope all`
10. `/storyweaver:queue`
11. `/storyweaver:gate --chapter 1 --promote verified`
12. `/storyweaver:snapshot --reason "before revise chapter 1" --include-chapters`
13. `/storyweaver:revise --chapter 1`（仅当审阅报告发现问题）
14. `/storyweaver:index`

## 核心命令

| 命令 | 作用 |
|------|------|
| `/storyweaver:init` | 初始化项目与 `state/` 目录 |
| `/storyweaver:import` | 导入旧稿/存稿并生成章节契约 |
| `/storyweaver:plan` | 生成整体、分卷、章节大纲 |
| `/storyweaver:worldbuild` | 构建世界观并保存结构化设定 |
| `/storyweaver:character` | 添加、查看、更新角色 |
| `/storyweaver:plot` | 管理情节线、伏笔进度和关联事件 |
| `/storyweaver:timeline` | 管理章节事件时间线 |
| `/storyweaver:relationship` | 管理角色、物品、组织和事件之间的关系网络 |
| `/storyweaver:brief` | 生成章节上下文包 |
| `/storyweaver:continue` | 续写、润色或扩写章节 |
| `/storyweaver:extract` | 从正文生成状态提取报告 |
| `/storyweaver:verify` | 执行十三维一致性校验 |
| `/storyweaver:queue` | 汇总审阅问题和状态健康警告 |
| `/storyweaver:gate` | 检查章节是否可进入下一步 |
| `/storyweaver:snapshot` | 创建或列出本地状态快照 |
| `/storyweaver:restore` | 从快照恢复状态并重新校验 |
| `/storyweaver:revise` | 根据审阅报告修正章节 |
| `/storyweaver:loop-start` | 逐章自动执行写作、审阅、修订、状态更新 |
| `/storyweaver:index` | 生成全局状态索引和健康警告 |
| `/storyweaver:status` | 查看项目状态概览 |

## 状态原则

- 所有故事状态写入 `state/` 分布式 JSON。
- 初始化会创建 `state/metadata/project.json`、`loop_status.json`、`index.json` 和 `action_queue.json`。
- 章节上下文包写入 `state/chapters/chapter_{N}/brief.json`。
- 章节正文写入 `chapters/chapter_{N}.txt`。
- 每章都应拥有 `state/chapters/chapter_{N}.json` 章节契约。
- 状态提取报告写入 `state/chapters/chapter_{N}/extraction.json`。
- 一致性报告写入 `state/chapters/chapter_{N}/review.json`。
- 修订行动队列写入 `state/metadata/action_queue.json`。
- 章节闸门写入 `state/chapters/chapter_{N}/gate.json`。
- 时间线、情节线和关系网络由 `tools/manage-story-graph.mjs` 写入，并同步章节 `state_delta`。
- 全局导航索引写入 `state/metadata/index.json`，可由 `/storyweaver:index` 随时重建。
