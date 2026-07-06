---
description: 列出章节概览
---

# /storyweaver:chapters

列出所有章节的概览信息。优先读取 `state/metadata/index.json` 的 `chapters` 数组；如果索引不存在，先执行 `/storyweaver:index`。

## 参数

- `--range`: 章节范围，如 `1-10`（可选）
- `--status`: 按状态筛选，可选 `planned`、`draft`、`verified`、`revised`、`locked`
- `--missing`: 仅列出缺少 `manuscript`、`brief`、`extraction`、`review` 或 `gate` 的章节（可选）

## 输出格式

```markdown
## 章节列表

### 第 {N} 章 {title}
- 状态：{status}
- 字数：{word_count}
- 正文：{has_manuscript}
- brief：{has_brief}
- extraction：{has_extraction}
- review：{has_review}
- gate：{has_gate}（{gate_status} / {gate_score}）
- 状态变更：角色 {characters} / 物品 {items} / 场景 {scenes} / 情节线 {plot_threads}
- 来源：{source}
```

## 数据来源

- `state/metadata/index.json`
- 必要时回退读取 `state/chapters/chapter_{N}.json`
- 必要时读取 `chapters/chapter_{N}.txt` 统计正文

## 示例

```bash
/storyweaver:chapters
/storyweaver:chapters --range 1-30
/storyweaver:chapters --status verified
/storyweaver:chapters --missing gate
```
