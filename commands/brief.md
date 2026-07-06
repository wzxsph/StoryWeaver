---
description: 生成章节上下文包，将 P0-P3 状态裁剪为可审计的写作输入
---

# /storyweaver:brief

为指定章节生成上下文包，保存到 `state/chapters/chapter_{N}/brief.json`。

## 参数

- `--chapter`: 章节编号（必填）
- `--words`: 本章目标字数（默认 3000）
- `--max-context-items`: 最大上下文条目数（默认 24）
- `--mode`: 用途（默认 `write`，可选 `write`/`polish`/`expand`/`verify`）
- `--instructions`: 额外上下文筛选说明（可选）

## 执行流程

1. 优先运行确定性构建器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/build-brief.mjs" "${CLAUDE_PROJECT_DIR}" --chapter N --words 3000 --max-context-items 24
   ```
2. 如果当前环境无法直接使用 `${CLAUDE_PLUGIN_ROOT}`，按下列规则手动构建同等结构。
3. 读取 `state/chapters/chapter_{N}.json` 章节契约；如不存在，先提示需要 `/storyweaver:plan --type chapter --scope N` 或创建 draft 契约。
4. 读取 `state/metadata/project.json`、相关大纲、角色、物品、场景、组织、概念、时间线、情节线和关系。
5. 按 `@rules/novelforge/p0-p3-context.md` 和 `@rules/novelforge/chapter-brief.md` 组装上下文包。
6. 保存 `state/chapters/chapter_{N}/brief.json`。
7. 验证 brief 中的 `must_include` 和 P0-P3 实体引用都存在。

## P0-P3 输出要求

| 层级 | 内容 |
|------|------|
| P0 | 不可违背设定、锁定概念、世界规则、核心身份 |
| P1 | 本章当前角色、地点、情绪、持有物、活跃冲突 |
| P2 | 最近三章事件、关系变化、物品转移、位置变化 |
| P3 | 伏笔、休眠情节线、长期秘密、远期回收点 |

## 保存要求

必须写入：

```text
state/chapters/chapter_{N}/brief.json
```

## 示例

```bash
/storyweaver:brief --chapter 5 --words 3000
/storyweaver:brief --chapter 5 --max-context-items 16 --instructions "重点保留感情线和玄天剑状态"
```
