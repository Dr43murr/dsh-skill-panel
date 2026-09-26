# Changelog

## 1.1.5
- 移除 ⧉ 组合、♻ 回收站、↻ 刷新三个按钮，头部只留「🔍 检测 / 🧹 清除」

## 1.1.4
- 「⟳同步」改为「🔍检测」：让 agent 检查本次对话的重复流程并提炼成新 skill，无可复用流程则回「无新增 skill」；移除自动轮询同步
- 点卡片插入 `🐳 skill:<名字>` 贴纸作为调用标记（发送后才执行，点卡片不执行）
- 「🧹」从体检改为「清除 Skill」：多选移入回收站；体检/从对话提炼从主界面移除

## 1.1.3
- 按真人用户视角精简：`audience: agent` 的技能（如 self-check / skill-edit / local-batch）自动从面板隐藏，主界面只留用户真正会点的能力
- 多选组合/合并从主界面收进「⧉ 组合」二级视图，日常主路径回归「点一下即用」

## 1.1.2
- 点击卡片后卡片标「✓ 已加入」，明确"只是准备好、发送后才执行"，消除误点焦虑

## 1.1.0
- 市场元数据（dsh.compatibility + dshhub）
- 新增 POST /invoke（记录 invoked 事件 + 返回 skill/context）

## 1.0.x
- 事件日志 .events.jsonl（clicked/invoked/auto_loaded）+ 半衰期排序
- frontmatter 白名单 + /propose(diff) + /apply(确认) + 原子写 + 版本链
- 悬浮卡片面板、多选组合、垃圾体检、回收站、价值估算账本
