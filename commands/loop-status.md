---
description: 查看自动写小说循环状态
---

# /storyweaver:loop-status

查看当前自动写小说循环的状态和进度。

## 参数

无参数

## 输出格式

```
## 自动写小说循环状态

### 运行状态
- **状态**: 运行中 / 已停止 / 未启动
- **开始时间**: 2026-05-27 00:00:00
- **当前章节**: 第 5 章
- **目标章节**: 第 30 章
- **模式**: safe / fast

### 进度
- **完成章节**: 1, 2, 3, 4
- **失败章节**: 5 (有无法修复的问题)
- **进度**: 13% (4/30 章)

### 统计
- **总字数**: 12,000 字
- **完成章节数**: 4
- **修订次数**: 2

### 最近活动
- 2026-05-27 00:15:00: 第4章完成，修订了 character_identity 问题
- 2026-05-27 00:10:00: 第3章完成，无问题
- 2026-05-27 00:05:00: 第2章完成，修订了 item_possession 问题

### 审阅报告（最近3章）
- 第4章: 2 CRITICAL, 1 WARNING
- 第3章: 0 CRITICAL, 0 WARNING
- 第2章: 1 CRITICAL (已修复)
```

## 数据来源

从 `state/metadata/loop_status.json` 读取状态。

如果文件不存在，输出：

```
## 自动写小说循环状态

### 运行状态
- **状态**: 未启动

请先执行 `/storyweaver:loop-start` 启动自动写小说循环。
```

## 详细报告

如需查看特定章节的审阅报告：
- 第N章审阅报告：`state/chapters/chapter_{N}/review.json`
- 第N章闸门报告：`state/chapters/chapter_{N}/gate.json`
- 修订历史：`state/chapters/chapter_{N}/revision_history.json`
