# StoryWeaver 文档

## 架构

- [插件架构](architecture/overview.md)
- [后端说明](backend/overview.md)
- [前端说明](frontend/overview.md)
- [工作流系统](workflow/overview.md)

## 网文创作

- [状态卡片系统](novel/card-system.md)
- [一致性校验](novel/consistency.md)

## 样例与校验

- `examples/minimal-project/`：最小可校验项目
- `schemas/`：状态 JSON Schema
- `tools/init-project.mjs`：初始化可校验的 StoryWeaver 状态树
- `tools/manage-state-card.mjs`：创建、查看、列出和更新基础状态卡
- `tools/manage-story-graph.mjs`：创建、查看、列出和更新事件、情节线与关系网络
- `tools/plan-outline.mjs`：生成可校验 outline，并为章节规划创建章节契约
- `tools/build-index.mjs`：重建 `state/metadata/index.json` 状态索引
- `tools/extract-chapter-facts.mjs`：从章节正文生成 `extraction.json` 证据报告
- `tools/check-chapter-gate.mjs`：生成 `state/chapters/chapter_{N}/gate.json` 章节闸门报告
- `tools/build-action-queue.mjs`：重建 `state/metadata/action_queue.json` 修订队列
- `tools/record-revision.mjs`：追加 `revision_history.json` 修订审计记录
- `tools/import-manuscript.mjs`：导入 `.txt`/`.md` 正文并生成章节契约
- `tools/create-snapshot.mjs`：创建或列出 `snapshots/` 本地恢复点
- `tools/restore-snapshot.mjs`：从快照恢复状态并重新校验
- `tools/validate-storyweaver.ps1`：插件与状态回归校验
- [状态安全](state-safety.md)：快照、恢复和覆盖写入策略

## 参考

- [v0 旧文档](v0_README.md)：保留为历史参考，不代表当前插件架构。
