---
description: 生成全局状态索引，汇总章节、实体引用和健康警告
---

# /storyweaver:index

生成 `state/metadata/index.json`。该文件是项目导航层，不替代 `state/` 中的真实故事状态；它由状态树确定性生成，用于快速查看章节进度、实体反向引用、悬念推进和健康警告。

## 参数

- `--generated-at`: 指定索引生成时间（可选，默认当前 ISO 时间）

## 执行流程

1. 优先运行确定性索引器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/build-index.mjs" "${CLAUDE_PROJECT_DIR}"
   ```
2. 如果用户传入 `--generated-at`，把该值透传给索引器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/build-index.mjs" "${CLAUDE_PROJECT_DIR}" --generated-at "2026-07-06T00:00:00Z"
   ```
3. 生成后读取 `state/metadata/index.json`，向用户报告：
   - 章节数、brief 数、extraction 数、review 数、gate 数
   - 角色、物品、场景、组织、概念、事件、情节线、关系数量
   - 最新章节与每章健康状态
   - warning/critical 警告
4. 如索引器无法运行，手动扫描 `state/` 并写入同等结构；随后执行状态 schema 校验。

## 输出文件

```text
state/metadata/index.json
```

## 示例

```bash
/storyweaver:index
/storyweaver:index --generated-at 2026-07-06T00:00:00Z
```
