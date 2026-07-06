---
description: 查看当前项目状态概览
---

# /storyweaver:status

查看当前小说项目的状态概览。优先读取 `state/metadata/index.json`；如果索引不存在或明显过期，先执行 `/storyweaver:index` 重新生成。

## 参数

无参数。

## 数据来源

1. `state/metadata/index.json`：统计数量、最新章节、章节健康状态、实体引用和警告。
2. `state/metadata/project.json`：标题、题材、文风、作者、目标字数、模板。
3. `state/metadata/loop_status.json`：自动循环运行状态。
4. 如索引不存在，扫描 `state/characters/`、`state/scenes/`、`state/organizations/`、`state/concepts/`、`state/items/`、`state/chapters/`、`state/timeline/`、`state/plot_threads/`、`state/relationships/`。

## 输出格式

```markdown
## 项目状态概览

### 元数据
- 标题：{标题}
- 题材：{题材标签}
- 文风：{文风}
- 作者：{作者}
- 目标字数：{字数}
- 创作模板：{模板}

### 状态统计
- 章节：{chapters}
- brief：{briefs}
- extraction：{extractions}
- review：{reviews}
- gate：{gates}
- 角色：{characters}
- 物品：{items}
- 场景：{scenes}
- 组织：{organizations}
- 概念：{concepts}
- 时间线事件：{timeline_events}
- 情节线：{plot_threads}
- 关系：{relationships}

### 最新章节
- 第 {latest_chapter} 章
- 最近章节状态：{status}
- 正文/brief/extraction/review/gate：{has_manuscript}/{has_brief}/{has_extraction}/{has_review}/{has_gate}

### 健康警告
- [{level}] {message} ({source})
```

## 示例

```bash
/storyweaver:status
```
