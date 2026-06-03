---
description: 列出概念设定（功法、规则、社会制度）
---

# /storyweaver concepts

列出小说中的概念设定，如功法、规则、社会制度等。

## 参数

- `--type`: 按类型筛选（可选）
  - `功法` - 功法秘籍
  - `规则` - 世界规则
  - `社会制度` - 社会制度
  - `境界` - 修炼境界
  - `势力` - 势力划分

## 输出格式

```
## 概念设定

### {概念名}
- **类型**: {类型}
- **描述**: {描述}
- **规则**: {规则列表}
```

## 概念类别

参考 `@knowledge/概念类别.txt`

## 数据来源

从 `.storyweaver/state_document.json` 的 `concepts` 数组读取。

## 示例

```
/storyweaver concepts
/storyweaver concepts --type 功法
```
