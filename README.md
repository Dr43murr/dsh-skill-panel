# dsh-skill-panel · 技能记忆层

把 DeepSeek Harness 里的 skill 变成可见、可改、可调用、可组合、可清理、可度量的流程资产。

## 安装

```sh
dsh plugin --profile web add dsh-skill-panel
```

## 功能
- 悬浮卡片面板（输入框旁 🐳技能）
- 卡片：短简介 / 流程分段 / 实际调用次数
- 组合（进阶，⧉ 组合二级菜单）→ 插入为流程 或 保存为新技能
- agent 内部技能（`audience: agent`）自动从面板隐藏，主界面只留用户真正会点的能力
- 垃圾体检：从未使用 / 长期未用 / 空壳 / 疑似重复（纯本地判定）
- 回收站：删除可还原
- 账本：价值估算（估算节省 token，非实测）
- 安全：frontmatter 白名单 + diff 审批 + 原子写 + 版本链

## Skill 格式

标准 SKILL.md + 扩展 frontmatter 字段：`brief`（短标签）、`prompt`（对话式调用语）、`savesTokens`（估算基线）、`audience`（`agent` 则从用户面板隐藏）。

## API

Base `/api/skill-panel`：`GET /list` `/audit` `/stats` `/trash`；`POST /event` `/invoke` `/propose` `/apply` `/save` `/delete` `/restore` `/purge` `/compose`。

详见 DESIGN.md / PLAN.md。
