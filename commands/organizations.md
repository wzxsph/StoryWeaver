---
description: 列出组织/势力
---

# /storyweaver organizations

列出小说中的组织、势力、门派等。

## 参数

- `--type`: 按类型筛选（可选）
  - `门派` - 修仙门派
  - `王朝` - 世俗王朝
  - `妖族` - 妖族势力
  - `商会` - 商业组织
- `--location`: 按所在地区筛选（可选）

## 输出格式

```
## 组织列表

### {组织名}
- **类型**: {类型}
- **所在地**: {地点}
- **等级制度**: {层级}
- **成员数**: {数量}
- **主要成员**: {成员列表}
```

## 数据来源

从 `.storyweaver/state_document.json` 的 `organizations` 数组读取。

## 世界观构建

创建组织时参考 `@workflows/世界观创建.md`

## 示例

```
/storyweaver organizations
/storyweaver organizations --type 门派
```
