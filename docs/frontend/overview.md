# 前端说明

StoryWeaver 当前没有 Electron/Vue 前端。

用户界面由 Claude Code 的聊天界面、斜杠命令和文件系统组成：

- 命令入口：`/storyweaver:<command>`
- 状态查看：`/storyweaver:status`、`/storyweaver:chapters`、`/storyweaver:timeline` 等
- 正文文件：`chapters/chapter_{N}.txt`
- 结构化状态：`state/**/*.json`

如果未来做可视化界面，应优先围绕这些本地文件构建，而不是重新定义一套状态模型。
