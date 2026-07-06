---
description: 规划小说整体、分卷和章节，并写入可校验 outline 状态
---

# /storyweaver:plan

规划小说的大纲、结构和章节推进。该命令优先使用确定性规划脚手架把用户创意落成 JSON；其中 `--type chapter` 会同时生成章节大纲和 `state/chapters/chapter_{N}.json` 章节契约，让后续 `/storyweaver:brief` 可以直接使用。

## 参数

- `--type`: 规划类型，必填
  - `outline`: 整体大纲，写入 `state/outline/outline.json`
  - `volume`: 分卷大纲，写入 `state/outline/volume_{N}.json`
  - `chapter`: 章节大纲，写入 `state/outline/chapter_{N}.json`
- `--scope`: 范围
  - `volume`: 如 `1-30`
  - `chapter`: 如 `5`
- `--volume`: 分卷编号，默认 `1`
- `--title`: 标题（可选）
- `--content`: 用户提供的规划方向、梗概或章节目标（可选）
- `--overwrite`: 允许覆盖已有 outline 或章节契约（谨慎使用）

## 执行流程

1. 确认已执行 `/storyweaver:init`，存在 `state/metadata/project.json`。
2. 如果使用 `--overwrite`，先创建快照：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/create-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --reason "before plan overwrite"
   ```
3. 优先运行规划脚手架：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/plan-outline.mjs" "${CLAUDE_PROJECT_DIR}" --type outline --content "<content>"
   ```
4. 生成后执行 `/storyweaver:index` 和 `/storyweaver:queue`，刷新项目导航和行动队列。
5. 对 `--type chapter`，必须检查：
   - `state/outline/chapter_{N}.json`
   - `state/chapters/chapter_{N}.json`
6. 如用户要求更细的创意推演，再参考 `@workflows/雪花创作法.md` 和 `@prompts/大纲生成.txt` 填充字段，而不是绕过 JSON 状态。

## 保存路径

| 类型 | 保存路径 |
|------|----------|
| `outline` | `state/outline/outline.json` |
| `volume` | `state/outline/volume_{N}.json` |
| `chapter` | `state/outline/chapter_{N}.json` 与 `state/chapters/chapter_{N}.json` |

## 示例

```bash
/storyweaver:plan --type outline --content "废剑苏醒，牵出宗门旧案"
/storyweaver:plan --type volume --volume 1 --scope 1-30 --content "第一卷完成金手指觉醒和宗门复测"
/storyweaver:plan --type chapter --scope 5 --title "复测钟响" --content "林小雨被迫参加灵根复测"
```
