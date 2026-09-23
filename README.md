# dsh-skill-panel · 技能记忆层

把 DeepSeek Harness 里的 skill 变成可见、可点、可沉淀的流程资产。

## 一句话

点卡片 → 把 skill 写进输入框 → 发送，agent 按 skill 执行。常用的自动排前面，越用越省 token。

## 安装

```sh
dsh plugin --profile web add dsh-skill-panel
```

## 怎么用

面板在输入框旁的「🐳 技能」按钮里，几个操作：

- **点卡片 = 调用 skill**：点一下，输入框里出现一个 `🐳 skill:<名字>` 贴纸。这个贴纸**只是标记**，代表「你接下来这条消息要用这个 skill」——**发送后 agent 才会真正执行**，点卡片本身不会执行。
- **🔍 检测**：让 agent 检查本次对话有没有被反复使用的流程，有就提炼成一个新 skill（先给你确认再落盘），没有就回「无新增 skill」。
- **🧹 清除**：勾选不要的 skill，确认后删除。

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

Base `/api/skill-panel`：`GET /list /stats`；`POST /event /invoke /propose /apply /save /delete`。

详见 DESIGN.md / PLAN.md。
