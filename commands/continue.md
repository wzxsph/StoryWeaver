---
description: 续写小说章节，基于上下文状态文档
---

# /storyweaver:continue

续写小说章节，保持角色、物品、事件一致性。

## 参数

- `--chapter`: 章节编号（必填）
- `--previous`: 前一章文件路径（可选，若不提供则从状态文档推断）
- `--words`: 目标字数（默认 3000）
- `--instructions`: 额外写作指示（可选）
- `--mode`: 模式（默认 `write`，可选 `polish`/`expand`）
  - `write`: 新写章节
  - `polish`: 润色现有章节
  - `expand`: 扩写大纲为正文
- `--style`: 文风控制参数（可选，多个值用逗号分隔）
  - `幽默`: 添加幽默、诙谐元素
  - `动人`: 增加情感张力，打动读者
  - `口语化`: 使用更口语化的表达
  - `古风`: 古风文体（适用于仙侠/古代背景）
  - `燃向`: 高潮情节专用，增强张力

**文风组合示例**：
```
/storyweaver:continue --chapter 5 --style 幽默,动人
/storyweaver:continue --chapter 10 --style 燃向
/storyweaver:continue --chapter 15 --mode expand --style 古风
```

## 执行流程

1. **读取状态文档**：从 `state/` 目录读取相关状态文件
2. **建立章节契约**：参考 `@rules/novelforge/chapter-contract.md`
3. **生成或读取章节上下文包**：优先使用 `state/chapters/chapter_{N}/brief.json`；不存在时先执行 `/storyweaver:brief --chapter N`
4. **加载写作规则**：参考 `@rules/novelforge/storyweaver-rules.md`
5. **注入文风参数**：如指定 `--style`，注入对应的风格提示词
6. **基于 brief 和章节契约生成章节内容**
7. **保存章节正文**：⚠️ 必须保存到 `chapters/chapter_{N}.txt`
8. **提取状态变化**
9. **更新状态文档**：⚠️ 必须更新 `state/` 目录下的对应文件
10. **保存章节记录**：⚠️ 必须保存到 `state/chapters/chapter_{N}.json`
11. **重建索引并进入闸门链路**：执行 `/storyweaver:index`，随后执行 `/storyweaver:extract`、`/storyweaver:verify`、`/storyweaver:queue` 和 `/storyweaver:gate`

## 保存要求 ⚠️

**必须将以下内容保存到文件**：

| 数据 | 保存路径 |
|------|----------|
| 章节上下文包 | `state/chapters/chapter_{N}/brief.json` |
| 章节正文 | `chapters/chapter_{N}.txt` |
| 章节记录/章节契约 | `state/chapters/chapter_{N}.json` |
| 状态提取报告 | `state/chapters/chapter_{N}/extraction.json` |
| 章节质量闸门 | `state/chapters/chapter_{N}/gate.json` |
| 角色状态更新 | `state/characters/{id}.json` |
| 物品状态更新 | `state/items/{id}.json` |
| 场景状态更新 | `state/scenes/{id}.json` |
| 时间线事件 | `state/timeline/event_{id}.json` |
| 情节线状态 | `state/plot_threads/{id}.json` |

**保存方式**：使用 Write 工具写入文件，不能仅停留在内存中显示。

## 输出

- 章节文本保存到 `chapters/chapter_{N}.txt`
- 状态文档更新到 `state/` 目录
- 向用户报告更新了什么内容

## 下一步

生成章节后进行一致性校验、行动队列刷新和章节闸门检查：

```bash
/storyweaver:extract --chapter N --apply
/storyweaver:verify --chapter N
/storyweaver:queue
/storyweaver:gate --chapter N --promote verified
```

## 示例

```
/storyweaver:continue --chapter 1 --words 3000
/storyweaver:continue --chapter 5 --mode polish
/storyweaver:continue --chapter 5 --mode expand --instructions "增加感情戏"
```
