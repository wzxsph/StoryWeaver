# 工作流系统

StoryWeaver 工作流是 Claude Code 命令和技能的组合，不是独立 DSL 引擎。

## 主要工作流

| 工作流 | 入口 | 输出 |
|--------|------|------|
| 项目初始化 | `/storyweaver:init --template snowflake` | 元数据、循环状态、索引、行动队列 |
| 雪花创作法 | `/storyweaver:init --template snowflake` | 项目蓝图、整体大纲、初始设定 |
| 大纲规划 | `/storyweaver:plan --type outline|volume|chapter` | outline JSON、章节契约 |
| 正文导入 | `/storyweaver:import --path <file>` | 正文、章节契约、brief、导入报告 |
| 世界观构建 | `/storyweaver:worldbuild` | concepts、organizations、scenes、items |
| 故事图谱管理 | `/storyweaver:plot`、`/storyweaver:timeline`、`/storyweaver:relationship` | plot_threads、timeline、relationships |
| 章节上下文包 | `/storyweaver:brief --chapter N` | `brief.json` |
| 章节生成 | `/storyweaver:continue --chapter N` | 正文、章节契约、状态增量 |
| 状态提取 | `/storyweaver:extract --chapter N` | `state/chapters/chapter_{N}/extraction.json` |
| 一致性校验 | `/storyweaver:verify --chapter N` | `review.json` |
| 修订队列 | `/storyweaver:queue` | `state/metadata/action_queue.json` |
| 章节闸门 | `/storyweaver:gate --chapter N` | `state/chapters/chapter_{N}/gate.json` |
| 状态快照 | `/storyweaver:snapshot` | `snapshots/{snapshot_id}/manifest.json` |
| 状态恢复 | `/storyweaver:restore --snapshot <id>` | 恢复 `state/` 和可选正文 |
| 章节修订 | `/storyweaver:revise --chapter N` | 修订正文与修订历史 |
| 状态索引 | `/storyweaver:index` | `state/metadata/index.json` |
| 自动循环 | `/storyweaver:loop-start` | 多章逐步产出 |
| 状态回归样例 | `examples/minimal-project/` | 可被 schema 校验的最小项目 |

## 单章标准流程

```text
读取 state/ 或导入旧稿
  -> 建立章节契约
  -> 必要时生成 outline/chapter_N.json
  -> 构建并保存 brief.json
  -> 生成正文
  -> 保存 chapters/chapter_N.txt
  -> 生成 extraction.json
  -> 提取状态增量
  -> 更新 state/**/*.json
  -> 执行十三维校验
  -> 保存 review.json
  -> 生成 action_queue.json
  -> 生成 gate.json
  -> 必要时 revise
  -> 记录 revision_history.json
  -> 重建 state/metadata/index.json
```

## 失败处理

- 缺少大纲或世界观：先返回前置条件缺失，不强行写。
- 状态引用不存在：创建待确认项或要求用户确认。
- Critical violation：默认进入 `/storyweaver:revise`，除非用户显式 override。
- 连续三次修订仍失败：停止自动循环并报告阻塞原因。
- 覆盖写入、批量导入或修订前：先执行 `/storyweaver:snapshot`。
- 误写状态后：先预览 `/storyweaver:restore --snapshot <id>`，用户确认后再加 `--force`。
- extraction decisions_required：不要直接进入 gate，先补全或确认状态卡。
- gate blocked：不要推进 `last_updated_chapter`，先根据 blockers 运行 extract、verify、queue 或 revise。

## 回归校验

工作流改动后运行：

```powershell
.\tools\validate-storyweaver.ps1 -Strict
```

这会验证插件 manifest、所有 JSON、根项目状态、最小样例状态、状态图引用完整性、项目初始化器、状态卡管理器、故事图谱管理器、快照/恢复、outline 规划器、brief 构建器、extraction 构建器、index 构建器、章节 gate、正文导入器、修订队列构建器、修订历史记录器、技能目录结构和旧状态引用。
