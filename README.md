# dsh-skill-panel · 技能记忆层

把 DeepSeek Harness 里的 skill 变成可见、可点、可沉淀的流程资产。当前版本 **1.1.5**。

## 一句话

点卡片 → 把 skill 写进输入框 → 发送，agent 按 skill 执行。常用的自动排前面，越用越省 token。

## 安装

```sh
# 从本仓库直接装（推荐）
dsh plugin --profile web add github:Dr43murr/dsh-skill-panel
```

或下载 [Releases](https://github.com/Dr43murr/dsh-skill-panel/releases) 里的 `dsh-skill-panel-1.1.5.tgz`，然后：

```sh
dsh plugin --profile web add ./dsh-skill-panel-1.1.5.tgz
```

> ⚠️ 别用 `dsh plugin --profile web add dsh-skill-panel`：npm 上同名的 `dsh-skill-panel` 是别人的包，不是这一份。

## 怎么用

面板在输入框旁的「🐳 技能」按钮里（挂载点 `conversation.input.dock`），三个操作：

- **点卡片 = 调用 skill**：点一下，输入框里出现一个 `🐳 skill:<名字>` 贴纸。这个贴纸**只是标记**，代表「你接下来这条消息要用这个 skill」——**发送后 agent 才会真正执行**，点卡片本身不会执行。
- **🔍 检测**：把「检查本次对话里有没有反复用到的流程，有就提炼成新 skill，没有就回『无新增 skill』」这段指令写进输入框，交给 agent 执行（先给你确认再落盘）。
- **🧹 清除**：勾选不要的 skill，确认后删除（文件移入 `skills/.trash/`，需要时可手动还原）。

## 特点

- 常用 skill 自动排前面（按实际调用次数 + 时间衰减）
- agent 内部技能（`audience: agent`）自动隐藏，主界面只留你真正会点的
- 价值账本：估算节省 token（诚实标注「价值估算，非实测」）
- 安全：frontmatter 白名单 + diff 审批 + 原子写 + 版本链

## Skill 格式

标准 SKILL.md + 扩展 frontmatter 字段：

- `brief`：短标签（卡片上显示）
- `prompt`：对话式调用语
- `savesTokens`：估算基线
- `audience`：`agent` 则从用户面板隐藏

## API

Base `/api/skill-panel`。面板实际用到：

- `GET /list`、`GET /stats`
- `POST /event`、`POST /delete`

仓库还保留了面板已不调用的路由：`GET /audit /trash`，`POST /invoke /propose /apply /save /restore /purge /compose`。

## 版本

- **1.1.5** — 极简头部：移除 ⧉ 组合、♻ 回收站、↻ 刷新，只留「🔍 检测 / 🧹 清除」
- 完整改动看 [CHANGELOG.md](CHANGELOG.md)；设计与踩过的坑看 [DESIGN.md](DESIGN.md)

## License

MIT
