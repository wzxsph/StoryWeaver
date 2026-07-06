---
description: 初始化网文写作工作区，创建可校验的 StoryWeaver 状态树
---

# /storyweaver:init

初始化网文写作工作区。该命令优先使用确定性初始化器创建 `state/`、`chapters/`、项目元数据、循环状态、状态索引和修订行动队列。

## 参数

- `--template`: 模板类型，默认 `default`，可选 `default`/`snowflake`
- `--title`: 小说标题（可选）
- `--genre`: 题材标签，多个用英文逗号分隔（可选）
- `--style`: 文风偏好（可选）
- `--author`: 作者名（可选）
- `--target-words`: 目标字数，默认 `0`（可选）
- `--overwrite`: 允许覆盖已有 `project.json` 和 `loop_status.json`（谨慎使用）

## 执行流程

1. 优先运行初始化器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/init-project.mjs" "${CLAUDE_PROJECT_DIR}" --template default
   ```
2. 如用户提供参数，透传给初始化器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/init-project.mjs" "${CLAUDE_PROJECT_DIR}" --template snowflake --title "<title>" --genre "玄幻,升级流" --style "爽文" --author "<author>" --target-words 300000
   ```
3. 初始化器默认不覆盖已有元数据；如检测到已有 `state/metadata/project.json` 或 `state/metadata/loop_status.json`，提示用户确认后再使用 `--overwrite`。
4. 初始化后执行状态 schema 校验。
5. 若使用 `--template snowflake`，继续参考 `@workflows/雪花创作法.md` 引导用户完成项目蓝图。

## 生成文件

```text
state/
├── metadata/project.json
├── metadata/loop_status.json
├── metadata/index.json
├── metadata/action_queue.json
├── outline/
├── characters/
├── items/
├── scenes/
├── organizations/
├── concepts/
├── timeline/
├── plot_threads/
├── relationships/
└── chapters/

chapters/
```

## 初始化后的下一步

1. `/storyweaver:import --path drafts/book.txt`：已有旧稿/存稿时先导入
2. `/storyweaver:plan --type outline`：创建整体大纲
3. `/storyweaver:worldbuild`：构建世界观
4. `/storyweaver:character add`：添加主要角色
5. `/storyweaver:brief --chapter 1 --words 3000`：生成第一章上下文包
6. `/storyweaver:continue --chapter 1`：开始撰写第一章
