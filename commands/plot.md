---
description: 列出情节线状态和进度
---

# /storyweaver plot

列出所有情节线（plot threads）的当前状态和进度。

## 参数

- `--status`: 按状态筛选（可选：active/dormant/completed/abandoned）
- `--progress`: 按进度筛选（可选：0-100）

## 输出格式

```
## 情节线状态

### {情节线名}
- **状态**: {状态}
- **进度**: {进度}
- **开始章节**: 第{章}章
- **描述**: {描述}

**关键事件**:
- 事件1
- 事件2
```

## 情节线状态机

| 状态 | 说明 |
|------|------|
| active | 进行中，正在推进 |
| dormant | 暂停，暂未推进 |
| completed | 已完成 |
| abandoned | 已废弃 |

## 数据来源

从 `.storyweaver/state_document.json` 的 `plot_threads` 数组读取。

## 规则参考

参考 `@rules/novelforge/plot-thread-rules.md`

## 示例

```
/storyweaver plot
/storyweaver plot --status active
/storyweaver plot --progress 50
```
