# 状态安全

StoryWeaver 把 `state/` 视为当前小说事实图。安全产物必须放在事实图外面，避免旧设定、旧章节契约或失败中间态被误当成当前 canon。

## 快照结构

快照保存到：

```text
snapshots/{snapshot_id}/
├── manifest.json
├── state/...
└── chapters/...        # 仅在使用 --include-chapters 时存在
```

`manifest.json` 记录：

- 快照原因
- 生成时间
- 是否包含 `chapters/`
- 每个复制文件的来源路径
- 每个复制文件的 SHA-256 和字节数

## 何时创建快照

任何可能重写多个文件的操作前都应创建快照：

- 使用 `--overwrite` 导入旧稿或存稿
- 使用 `--overwrite` 重做大纲或章节契约
- 修订章节正文和相关状态
- 启动自动逐章循环
- 手工修复一次失败的状态提取或一致性校验结果

示例：

```bash
node tools/create-snapshot.mjs . --reason "before chapter 12 revise" --include-chapters
```

## 恢复策略

恢复必须显式执行：

```bash
node tools/restore-snapshot.mjs . --snapshot snap_20260706T000000000Z
node tools/restore-snapshot.mjs . --snapshot snap_20260706T000000000Z --force
```

第一条命令只预览文件清单；第二条命令才会写回。

写回前，恢复工具会自动创建一份 `pre-restore` 快照。写回后，除非传入 `--skip-validate`，否则会运行 `tools/validate-state-schemas.mjs`。

恢复只覆盖 manifest 中记录的文件，不删除快照之后新增的其他文件。
