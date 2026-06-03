---
description: 列出物品、法宝、丹药等设定
---

# /storyweaver items

列出小说中的物品、法宝、丹药、材料等设定。

## 参数

- `--type`: 物品类型筛选（可选）
  - `法宝` - 法宝类物品
  - `武器` - 武器装备
  - `丹药` - 丹药类
  - `材料` - 炼器材料
  - `功法` - 功法秘籍
- `--owner`: 按持有者筛选（可选）
- `--status`: 按状态筛选（可选：active/lost/destroyed）

## 输出格式

```
## 物品列表

### {物品名}
- **类型**: {类型}
- **持有者**: {当前持有者}
- **描述**: {描述}
- **来历**: {来历}
```

## 数据来源

从 `.storyweaver/state_document.json` 的 `items` 数组读取。

## 物品类别

参考 `@knowledge/物品类别.txt`

## 示例

```
/storyweaver items
/storyweaver items --type 法宝
/storyweaver items --owner "林小雨"
```
