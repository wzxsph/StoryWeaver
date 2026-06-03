---
description: 查看事件时间线，按章节排序
---

# /storyweaver timeline

查看小说的事件时间线，按章节顺序排列。

## 参数

- `--chapter`: 筛选特定章节的事件（可选）
- `--character`: 筛选特定角色参与的事件（可选）
- `--limit`: 显示数量限制（默认50）

## 输出格式

```
## 事件时间线

### 第{N}章
- **[时间描述]** 事件摘要
  - 参与角色: 角色1, 角色2
  - 位置: 地点

---
```

## 数据来源

从 `.storyweaver/state_document.json` 的 `timeline` 数组读取。

## 示例

```
/storyweaver timeline
/storyweaver timeline --chapter 5
/storyweaver timeline --character "林小雨"
```

## 时间线规则

参考 `@rules/novelforge/timeline-rules.md` 确保事件顺序正确。
