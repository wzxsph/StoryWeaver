---
description: 状态更新约束规则 — 定义状态读写、一致性保证、版本管理
---

# 状态更新约束规则

## 状态更新原则

1. **增量更新**：只更新变化的字段，保留未变化的字段
2. **版本检查**：更新前检查 `updated_at` 时间戳，避免旧数据覆盖新数据
3. **章节顺序**：状态更新的 `last_updated_chapter` 必须 >= 当前章节编号

## 约束规则

### 角色状态约束

- `emotional_state` 变化必须有 `chapter` 记录
- `location` 变化必须记录 `previous` 和 `current`
- 物品获得/失去必须同步更新物品的 `current_holder`
- `role` 字段一旦设定不可更改（如需更改需新建角色）

### 物品状态约束

- `current_holder` 必须存在于 `characters/` 中
- 物品转移时必须同时更新旧持有者的 `possessions`
- `significant_events` 最多保留3条，超出时删除最早的

### 事件状态约束

- `chapter` 编号必须单调递增
- `plot_thread_id` 必须关联已存在的情节线

### 章节契约约束

- `state/chapters/chapter_{N}.json.chapter` 必须等于 N
- 非 `planned` 章节必须存在 `state/chapters/chapter_{N}/brief.json`
- 非 `planned` 章节必须存在 `state/chapters/chapter_{N}/extraction.json`
- `status=verified` 前必须存在 `review.json`
- `status=locked` 前不得存在未解决的 critical violation
- `status=locked` 前必须存在通过的 `gate.json`
- `status=verified` 或 `status=revised` 时不得存在 blocked gate
- 产生修订后必须记录 `state/chapters/chapter_{N}/revision_history.json`
- `chapter_goal`、`reader_promise`、`conflict_axis`、`turning_point` 不得为空
- `state_delta` 中引用的实体 ID 必须能在对应 `state/` 子目录找到
- 更新分布式状态后应重建 `state/metadata/index.json`，索引只能作为导航和健康提示，不作为 canon 事实来源
- 新增伏笔必须进入 `open_loops_introduced`
- 已解决伏笔必须进入 `open_loops_resolved`，并说明解决章节

### 跨文件引用约束

- 每个实体文件名必须与 `id` 一致，例如 `state/items/item_001.json.id == item_001`
- `characters.current_state.possessions` 必须指向存在的 `state/items/{id}.json`
- `items.current_holder` 和 `items.previous_holders` 必须指向存在的角色
- `scenes.dynamic_state.characters_present` 必须指向存在的角色
- `scenes.dynamic_state.key_objects` 必须指向存在的物品
- `organizations.territory` 必须指向存在的场景，`members` 必须指向存在的角色
- `timeline.participants`、`related_items`、`plot_thread_id` 必须分别指向存在的角色、物品、情节线
- `plot_threads.related_events` 必须指向存在的时间线事件
- `relationships.source_id` 和 `target_id` 必须指向已存在实体
- 非 `planned` 章节必须存在 `chapters/chapter_{N}.txt`

## 一致性检查

每次状态更新后自动执行以下检查：

1. **角色存在性**：引用 `current_holder` 的物品，其 holder 必须在 `characters/` 中存在
2. **ID 格式合规性**：所有 ID 必须符合命名规则
3. **章节连续性**：事件和章节记录的 `chapter` 必须单调递增
4. **时间戳顺序**：`updated_at` 不可早于 `created_at`
5. **章节契约完整性**：章节记录必须包含目标、读者承诺、冲突轴、转折点和状态增量
6. **状态图完整性**：跨文件引用必须能解析到真实实体，章节产物必须存在

## 读取规范

- 读取状态时优先使用最新的 `updated_at` 版本
- 如有版本冲突，保留 `last_updated_chapter` 较大的版本
- 读取失败时返回错误，不使用过期的缓存数据

## 写入规范

- 覆盖写入、批量导入、章节修订或自动循环开始前，必须优先创建本地快照：`/storyweaver:snapshot --reason "<reason>" --include-chapters`
- 快照保存到 `snapshots/`，不进入 `state/`，避免旧事实被误读为当前 canon
- 需要回滚时先预览 `/storyweaver:restore --snapshot <id>`，用户确认后才可追加 `--force`
- 写入前备份原文件（保持 .bak 后缀）
- 写入后立即验证 JSON 格式正确性
- 写入失败时回滚到备份版本
- 如果只生成正文而未生成章节契约，必须标记为 `draft`，不得标记为 `verified`

## 关联

- 定义: `@rules/novelforge/state-schema.md` (状态数据结构)
- 机器校验: `@tools/validate-state-schemas.mjs`
- 提取: `@agents/state-extractor.md` (状态提取)
- 校验: `@agents/consistency-guardian.md` (一致性校验)
