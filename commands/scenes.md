---
description: 列出场景及其状态
---

# /storyweaver scenes

列出所有场景及其当前状态。

## 参数

- `--character`: 筛选特定角色所在的场景（可选）
- `--time`: 筛选特定时间段（可选）

## 输出格式

```
## 场景列表

### {场景名}
- **位置**: {位置描述}
- **时间**: {时间}
- **天气**: {天气}
- **在场角色**: {角色列表}
- **氛围**: {氛围描述}
```

## 场景追踪规则

参考 `@rules/novelforge/scene-tracking.md`

## 数据来源

从 `.storyweaver/state_document.json` 的 `scenes` 数组读取。

## 示例

```
/storyweaver scenes
/storyweaver scenes --character "林小雨"
```
