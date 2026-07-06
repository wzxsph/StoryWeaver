---
description: 导入已有小说正文，切章并生成章节契约、brief、导入报告和状态索引
---

# /storyweaver:import

把已有 `.txt` 或 `.md` 正文导入 StoryWeaver 项目。该命令解决“已有存稿/旧稿如何接入状态树”的问题：先确定性切章、保存正文、生成章节契约和上下文包，再由 extract skill、state-extractor agent、`/storyweaver:verify` 或人工审校补全角色、物品、场景、情节线等状态。

## 参数

- `--path`: 正文文件或目录路径（必填）
- `--title`: 项目标题（可选）
- `--author`: 作者名（可选）
- `--start`: 起始章节编号，默认 `1`
- `--status`: 导入章节状态，默认 `draft`，可选 `draft`/`planned`
- `--overwrite`: 允许覆盖同编号正文、章节契约和 brief（谨慎使用）

## 执行流程

1. 如果使用 `--overwrite` 或导入多章节存稿，先创建快照：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/create-snapshot.mjs" "${CLAUDE_PROJECT_DIR}" --reason "before import" --include-chapters
   ```
2. 优先运行确定性导入器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/import-manuscript.mjs" "${CLAUDE_PROJECT_DIR}" --input "<path>" --title "<title>" --author "<author>"
   ```
3. 导入器会识别常见章节标题，如 `第一章 ...`、`第12章 ...`、`Chapter 12 ...`。
4. 对每章写入：
   - `chapters/chapter_{N}.txt`
   - `state/chapters/chapter_{N}.json`
   - `state/chapters/chapter_{N}/brief.json`
5. 写入导入报告：
   - `state/metadata/import_report.json`
6. 重建状态索引：
   - `state/metadata/index.json`
7. 导入后不要把占位契约当作最终 canon；继续执行状态提取和校验。

## 导入后建议

```bash
/storyweaver:status
/storyweaver:chapters --missing review
/storyweaver:verify --chapter 1 --scope all
/storyweaver:queue
/storyweaver:gate --chapter 1
```

## 示例

```bash
/storyweaver:import --path drafts/book.txt --title "玄天剑醒来" --author "某某"
/storyweaver:import --path drafts/volume-1 --start 31
/storyweaver:import --path drafts/book.md --overwrite
```
