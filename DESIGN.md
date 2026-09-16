# dsh-skill-panel — 技能记忆层插件 · 设计文档

> 这是一份**完整、自洽**的设计文档，供任何不了解本项目的人（或 agent）审阅。
> 无需翻阅对话历史即可理解：它是什么、为什么这么做、怎么做的、踩过什么坑、还想往哪走。

---

## 1. 一句话定位

把 DeepSeek Harness（DSH）里"隐形的 skill"变成**可见、可改、可调用、可组合、可清理、可度量**的**可复用流程资产**。

```
对话 ──①提炼──► 候选技能 ──②卡片面板──► 技能库
  ▲                                        │
  └──────③调用 + 回流优化 ◄────────────────┘
```

对应一个核心命题：**agent 的经验不该随会话蒸发，而应沉淀成可执行的、会演化的流程。**

---

## 2. 背景与动机

- DSH 已有 skill 机制（`$DSH_HOME/skills/<name>/SKILL.md`，YAML frontmatter + 正文），格式与 Anthropic 的 SKILL.md 约定一致。
- 但 skill 是**黑箱**：看不到流程、改起来要开编辑器、调用要记名字、没有用量、不会老化清理。
- 本项目把 skill 的生命周期补全成闭环，并全程围绕一个约束设计：**用户极度在意 token 成本**。

三条原始诉求（来自用户）：
1. 从对话中提炼可复用的技能；
2. 用卡片界面看流程、提修改；
3. 对话里直接调用，并持续强化优化技能。

---

## 3. 技术架构

插件是一个 **DSH 双面 bundle**（host 半 + client 半），源码 `C:\Users\majia\tools\skill-panel\`：

```
skill-panel/
├── package.json        # name=dsh-skill-panel, exports["."]=host, exports["./client"]=client
├── cordis.patch.yml    # - insert: { id: skill-panel, name: 'dsh-skill-panel' }
├── lib/index.js        # host 半：Node ESM，注册 HTTP 路由 + 文件系统操作
└── lib/client.js       # client 半：window.__ModuleLoader__.load({...})，React 无 JSX
```

### 3.1 通信桥（host ↔ client）

- **host 半**通过 `ctx.webServer.register({ kind:'prefix', path:'/api/skill-panel', handler })` 注册 HTTP 路由（Node `http` 语义，handler 拥有响应）。
- **client 半**用 `fetch('/api/skill-panel/...')` 调用。
- 选择 HTTP 而非 DSH 的 Typert Remote：**更简单、可独立测试、不引入 schema 声明成本**。

### 3.2 client 半挂载点

- 面板挂在 **`conversation.input.dock`** slot（输入框上方的 dock），`inject: (sessionId) => ({...})` 拿到会话上下文。
- 悬浮面板用 `position: fixed`，`z-index` 拉满，浮在界面右下角。
- 输入框写入走 **`slash/input-insert-text`** 事件（详见 §7 的坑）。

---

## 4. 功能清单（截至 v0.8.x）

### 4.1 卡片列表（主视图）
- 每个技能一张卡片：名称 + 短简介 + 调用次数 `×N` + 操作按钮（▸ 💬 ✎ 🗑）
- **排序**：用得多的在前 → 最近用的在前 → 名字。数据来自 `.usage.json`。
- **自动同步**：面板开启时每 3s 拉取一次，用 `mtime + count` 签名判断是否真变（避免闪烁/打断编辑）。
- **多选模式**：勾选多个 → `插入为流程`（一条编号指令）或 `保存为技能`（组合成一个新技能）。

### 4.2 展开视图（▸）
- 按正文的 `## 标题` **分段展示**（输入/步骤/输出要求/示例…），而不是丢裸步骤。
- 显示**账本**：`自身开销 ≈ N token/次 · 估算省 ≈ M/次 · 累计已省 ≈ K`。

### 4.3 三种编辑
- **💬 提要求**：一句话写进输入框 → 交给 agent 用 `skill-edit` 技能低成本执行。
- **✎ 直改原文**：文本域编辑 + 保存（旧版自动存 `.bak`）。
- **🗑 删除**：二次确认 → 移到 `.trash/`（可回收，非真删）。

### 4.4 整理页（🧹，垃圾体检）
全本地判定、**不调用模型**：
- **从未使用**：count=0 且存在 ≥7 天
- **长期未用**：用过但 ≥30 天没动
- **空壳内容**：正文 <120 字
- **疑似重复**：名字/描述/正文的 bigram Jaccard ≥55%
- 勾选 → 批量移入回收站；另有一个「从对话提炼」按钮（触发 agent 提炼，见 §6）。

### 4.5 回收站页（♻）
- 列出 `.trash/` 内容 + 删除时间 → `还原` / `彻底删`。

### 4.6 调用（点卡片）
- 单点：往输入框**追加** `【<短简介>】<对话式调用语>`，**同一技能已存在则去重跳过**。
- 多选：追加一条编号流程指令 `依次执行以下步骤：1. … 2. …`。

---

## 5. Skill 文件格式（frontmatter 扩展）

在标准 `name` / `description` 之上，新增了三个字段：

```markdown
---
name: media-to-text
description: 把视频/音频在本地转成文字稿，用于转录、字幕、会议记录、视频笔记。
brief: 音视频转文字                 # 卡片上的一行短标签（≤18字）
whenToUse: 用户要求转文字/转录/字幕时。 # 触发条件（已有字段）
prompt: 把这段音视频转成文字：        # 点卡片时插进输入框的"对话式调用语"
savesTokens: 25000                 # 声明的"没有它要多花多少 token"（估算基线）
---
# 正文（按 ## 标题分段）
```

字段语义：
- `brief` —— 卡片/标记上的短名，避免用长段落硬截断。
- `prompt` —— **关键设计**：让"调用语气"由技能作者控制。默认句式 `请使用「X」技能：` 是"元语言"（在说"我要用工具"），会打断对话流；`prompt` 是"任务语言"（直接说要做的事），读起来自然，agent 仍能靠 `whenToUse` 命中。
- `savesTokens` —— 账本的估算基线，作者声明、用户可改。

---

## 6. 关键设计决策（及理由）

| 决策 | 理由 |
|---|---|
| **提炼交给 agent，面板只"发起"** | 提炼需要判断力（"这条够通用吗？"），纯自动会产垃圾库。人审是质量闸门。 |
| **垃圾清理靠数据 + 文本相似度，不靠模型** | 0 token 成本；且"判定器的一半可以用规则实现"。 |
| **组合 = 内联展开，不嵌套** | v1 不允许 A 技能调用 B 技能，避免循环引用与调试地狱。 |
| **用量 ≈ 面板点击次数** | 挂钩 `ctx.skills` 服务成本高、收益小，先接受这个近似。 |
| **删除 = 移回收站** | 可回滚，避免误删。 |
| **账本用"声明基线"而非"真实测量"** | 会话日志拿不到可靠 token 数（见 §7），counterfactual 本就不可观测；诚实标注"估算"。 |

---

## 7. 踩过的坑（DSH 0.1.2-rc.1 专属，重要）

这些是**实测**得出的，不是猜的，对任何想在此版本做插件的人都值钱：

1. **`--dsw-alias-brand-primary` 是近白色（`#f9fafb`）**，不是品牌蓝。主按钮色要用 `--dsw-alias-button-info-fill`（`#679efe`）。用错会得到"白底白字"的按钮。
2. **`slash/input-insert-reference` 会被 shell 静默拒绝**——chip 根本落不进输入框（无报错、无异常）。
3. **`slash/input-insert-text` 必须带 span**，且要用 file-upload 原样的 append 形态：`{start: draft.length, end: draft.length, draftRev: state.draftRev}`。无 span 或对含 decorator 的范围做替换都会静默失败。
4. **主题 CSS 变量定义在组件的祖先作用域，不在 `:root`**——直接 `getComputedStyle(document.documentElement)` 取不到，要在面板元素上取。
5. **`@deepseek-ai/dsh-client-runtime` 在此版本不存在**（npm 上只有 0.0.1-rc.1，插件要求 ^0.1.0-rc.6）。社区插件大面积依赖它。
6. **插件必须作为正规 bundle 装进 profile 的安装闭包**（npm pack → `dsh plugin add <tgz>`）。`link:` 本地目录会被桌面安全模式判 `resolves outside the installation closure` 并剔除。
7. **桌面有安全模式 + generation 闭包校验**，会静默/自动移除"不兼容"的插件（本会话里 pet-whale、dsh-cost-meter、dsh-better-sidebar 都被它清过）。
8. **host 半改动要重启 DSH 才生效**（启动时加载）；client 半硬刷新即可。
9. **本机是 Windows PowerShell 5.1，没有 pwsh 7**——写含中文的 `.ps1` 必须 UTF-8 BOM；`$ErrorActionPreference='Stop'` + 原生命令写 stderr 会误终止。

---

## 8. HTTP API

Base：`/api/skill-panel`（`GET` 用 query，`POST` 用 JSON body）

| 方法 | 路由 | 说明 |
|---|---|---|
| GET | `/list` | 技能列表（含 brief/intro/sections/steps/count/tokens/savesTokens），已按用量排序 |
| GET | `/audit` | 垃圾体检 `{unused, stale, stub, dup}` |
| GET | `/stats` | `{skills, used, totalCalls, skillTokens, savedTokens, top}` |
| GET | `/trash` | 回收站清单 |
| POST | `/save` | `{id, content}` 覆盖写（旧版存 `.bak`） |
| POST | `/touch` | `{id}` 记一次使用 |
| POST | `/delete` | `{id}` 移到 `.trash/` |
| POST | `/restore` | `{entry}` 还原 |
| POST | `/purge` | `{entry}` 彻底删除 |
| POST | `/compose` | `{ids, name, description?}` 内联组合成一个新技能 |

数据文件（都在 `$DSH_HOME/skills/`，以 `.` 开头故不会被扫成技能）：
- `.usage.json` —— `{ [id]: { count, lastUsedAt, createdAt } }`
- `.trash/<id>__<ISO时间戳>/` —— 被删技能

---

## 9. 已知限制（诚实清单）

1. **chip 高亮做不了**（§7-2），用 `【】` 文本标记代替。
2. **省 token 是估算**，不是实测；会话日志无可靠 token 字段。
3. **用量只记面板点击**，记不到 agent 在对话里自动加载技能的次数 → 系统性低估。
4. **只支持目录 bundle + 单文件 `.md` 两种形态**，不支持嵌套 `**/SKILL.md`。
5. **步骤抽取是启发式**（认编号列表 + `-`/`*`），`##` 分段是简单的行解析，不是 AST。
6. **没有多用户/同步/团队共享**——所有数据都在单机 `$DSH_HOME` 下。
7. **无国际化**——界面文案硬编码中文。

---

## 10. 待讨论的开放问题（想听其他 agent 意见）

1. **用量近似的代价**：值不值得为"记到 agent 自动加载"而挂钩 `ctx.skills`？还是"面板点击 ≈ 使用频次"够用？
2. **组合技能是否要允许嵌套**（A 调 B）？我倾向 v1 禁止，但能力上诱人。
3. **"省 token"的呈现**：声明基线（现状） vs 从会话日志解析真实消耗（复杂、可能拿不到） vs 用 rounds/tool-calls 作为替代度量。哪个最有说服力？
4. **提炼的触发时机**：每次对话结束自动提一次案 vs 用户手动点按钮 vs 低频后台扫。怎么平衡"不漏好技能"和"不烦人、不产垃圾"？
5. **技能库的"退役"语义**：是软退役（置灰、不再出现在触发里）还是硬删除进回收站？
6. **可移植性**：这个闭环（提炼→管理→调用→演化）在 Claude Code / Cursor 上同样成立，是否应该把核心抽象成与 DSH 解耦的格式（SKILL.md + 一个 usage sidecar）？
7. **安全**：让 agent 自动改写自己下一步要遵守的指令，是持久化注入面。如何做才安全？（现状：默认只提案、人审、`.bak` 可回滚。）
8. **成本归因**：有没有比"每次调用的声明基线 × 次数"更可解释、更可信的成本模型？

---

## 11. 目录速查

| 项 | 路径 |
|---|---|
| 插件源码 | `C:\Users\majia\tools\skill-panel\` |
| 技能库 | `C:\Users\majia\AppData\Roaming\dsh-desktop\harness\skills\` |
| 用量账本 | `…\skills\.usage.json` |
| 回收站 | `…\skills\.trash\` |
| DSH profile | `…\harness\profiles\web\` |

---

## 12. 一句话总结这个项目的"护城河"判断

面板是入口，组合是造技能，账本是叙事，**提炼的判定质量 + 回流的归因质量**才是真正的护城河——而这二者目前都是"人 + agent 协作"而不是纯自动，我认为这是对的：**先做可靠，再做自动。**
