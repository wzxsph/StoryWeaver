# 状态卡片系统

StoryWeaver 的“卡片”不是 UI 卡片，而是 `state/` 下的实体 JSON 文件。每个实体一个文件，便于 Claude Code 按需读取和局部更新。

## 卡片类型

| 类型 | 路径 | 作用 |
|------|------|------|
| 角色 | `state/characters/{id}.json` | 身份、状态、位置、情绪、能力、持有物 |
| 物品 | `state/items/{id}.json` | 持有者、能力、限制、转移历史 |
| 场景 | `state/scenes/{id}.json` | 地点、功能、动态状态、在场角色 |
| 组织 | `state/organizations/{id}.json` | 势力、资源、成员、关系 |
| 概念 | `state/concepts/{id}.json` | 功法、规则、制度、禁忌 |
| 事件 | `state/timeline/event_{id}.json` | 章节事件与后果 |
| 情节线 | `state/plot_threads/{id}.json` | 主线、支线、伏笔进度 |
| 关系 | `state/relationships/{id}.json` | 人物/组织/概念之间的关系 |
| 大纲 | `state/outline/*.json` | 整体、分卷和章节规划 |
| 章节 | `state/chapters/chapter_{N}.json` | 章节契约、摘要、状态增量 |
| 章节上下文包 | `state/chapters/chapter_{N}/brief.json` | 本章 P0-P3 写作输入 |
| 状态提取报告 | `state/chapters/chapter_{N}/extraction.json` | 正文到状态增量的证据报告 |
| 修订历史 | `state/chapters/chapter_{N}/revision_history.json` | 修订尝试、修复项和风险 |
| 修订队列 | `state/metadata/action_queue.json` | 汇总 review 问题和状态健康警告 |
| 章节闸门 | `state/chapters/chapter_{N}/gate.json` | 判断章节是否可进入下一状态 |
| 导入报告 | `state/metadata/import_report.json` | 旧稿/存稿导入批次、切章结果和警告 |

## 设计原则

- 文件名稳定，ID 不随名称变化。
- 增量更新，不全量覆盖。
- 事实来自正文或用户设定，不靠模型脑补。
- 物品转移必须同步更新角色持有物。
- 章节契约是章节级卡片，负责连接写作质量与状态变化。
- 章节上下文包负责记录本章实际注入的 P0-P3 输入，避免长篇后期上下文随机漂移。
- 状态提取报告负责记录正文证据，避免 `state_delta` 变成无法追溯的人工猜测。

## 机器校验

状态卡片的机器约束放在 `schemas/`。开发时运行：

```powershell
.\tools\validate-storyweaver.ps1 -Strict
```

该脚本会校验根目录 `state/` 和 `examples/*/state/`，并检查跨文件引用是否能解析到真实实体。例如角色持有物必须存在、章节 `state_delta` 必须指向真实实体、非 planned 章节必须有 extraction，verified 章节必须有正文和 review，locked 章节必须有通过的 gate。新增卡片字段时，需要同时更新对应 schema 与 `examples/minimal-project/`。
