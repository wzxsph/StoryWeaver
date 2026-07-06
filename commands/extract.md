---
description: 从章节正文生成可审计状态提取报告，并可将有证据的实体引用合并进章节 state_delta
---

# /storyweaver:extract

从 `chapters/chapter_{N}.txt` 读取正文，结合现有 `state/` 卡片，生成章节状态提取报告：

```text
state/chapters/chapter_{N}/extraction.json
```

该命令解决“正文写完后，状态到底从哪里来”的问题。它不会凭空发明 canon；只把正文中明确提到的已有角色、物品、场景、组织、概念、事件、情节线和关系提取出来，并附上证据片段。复杂的新实体、新关系或隐含变化仍需要 extract skill 或人工确认后写入对应状态卡。

## 参数

- `--chapter`: 章节编号（必填）
- `--apply`: 将有证据的实体 ID 合并到 `state/chapters/chapter_{N}.json.state_delta`
- `--generated-at`: 指定生成时间（可选）

## 执行流程

1. 确认已存在：
   - `chapters/chapter_{N}.txt`
   - `state/chapters/chapter_{N}.json`
2. 运行确定性提取器：
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/extract-chapter-facts.mjs" "${CLAUDE_PROJECT_DIR}" --chapter N --apply
   ```
3. 读取 `state/chapters/chapter_{N}/extraction.json`，向用户报告：
   - 命中的已有实体
   - 每个实体的证据片段
   - 建议合并的 `state_delta`
   - 需要人工确认的决策
4. 如果提取报告显示 `decisions_required`，不要直接进入 gate；先补全或确认相关状态卡。
5. 提取后继续执行：
   ```bash
   /storyweaver:verify --chapter N --scope all
   /storyweaver:queue
   /storyweaver:gate --chapter N --promote verified
   ```

## 输出文件

```text
state/chapters/chapter_{N}/extraction.json
state/chapters/chapter_{N}.json
state/metadata/index.json
```

## 示例

```bash
/storyweaver:extract --chapter 5
/storyweaver:extract --chapter 5 --apply
```
