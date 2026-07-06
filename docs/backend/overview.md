# 后端说明

StoryWeaver 当前没有 FastAPI、数据库服务或独立后端进程。

“后端”职责由 Claude Code 运行时和本地文件系统承担：

- Claude Code 负责执行命令、读取技能、调用工具。
- `state/` 目录负责持久化结构化故事状态。
- `chapters/` 目录负责保存正文。
- `tools/validate-storyweaver.ps1` 负责本地开发校验。

未来如果需要独立应用，可以在保持当前 `state/` schema 的前提下增加 SQLite 或服务端，但那应作为新产品形态设计，不应污染当前插件架构。
