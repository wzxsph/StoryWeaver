---
description: 列出章节概览
---

# /storyweaver chapters

列出所有章节的概览信息。

## 参数

- `--range`: 章节范围，如 `1-10`（可选）
- `--status`: 按状态筛选（可选：writing/completed/verified）

## 输出格式

```
## 章节列表

### 第{N}章 {标题}
- **字数**: {字数}
- **状态**: {状态}
- **摘要**: {摘要}
- **关键事件**: {事件列表}
- **活跃情节线**: {情节线列表}
```

## 数据来源

从 `.storyweaver/state_document.json` 的 `chapters` 数组读取。

## 示例

```
/storyweaver chapters
/storyweaver chapters --range 1-30
/storyweaver chapters --status completed
```
