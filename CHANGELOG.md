# 更新日志（Changelog）· J人模拟器

本文记录项目的迭代过程，格式借鉴 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
条目按**周 / 阶段**倒序排列，并对应真实的 GitHub commit（`git log`）。更细的“做了什么/为什么/验证方式”见 [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md)。

> 时间以 commit 的作者日期为准。哈希为对应提交短 ID。

---

## 2026-06-29 · 收尾微调
- 小幅参数/细节微调。（`7c59ae8` 没有什么用的微调）

## 2026-06-20 · 接入 DeepSeek + 里程碑反思
- **变更**：LLM 后端从本地 Ollama 切换到 **DeepSeek `deepseek-chat`**（OpenAI 兼容），新增 `deepseek_client.py`，`deepseek_chat` 透传 `tools`/`tool_choice`，`/api/health` 暴露可用性与模型名。（`7163314` 改为连接deepseek）
- **文档**：新增第 N 次课 reflection。（`edc6771` reflection）

## 2026-06-13 · AI 对话设置空闲时间 + 下周计划
- **新增**：AI 对话式设置空闲时段功能完善——自然语言 → `weeklyAvailability`，支持 `append/replace_mentioned_days/replace_all` 合并模式与 busy 过滤。（`960a674` ai对话设置空闲时间段功能完善）
- **文档**：next week plan。（`9219676` nextWeekPlan）

## 2026-06-06 · Agent 化 + 空闲解析 Skill + RAG v2 + 计划
> 本周是工程含量最高的一周，一次性落地了对话 Agent、空闲解析 Skill、RAG 参数化知识库 v2。
- **Agent / 对话主页**：主页改为 AI 聊天窗口；新增 `assistant_agent.py`（`run_agent_turn` 多轮 function calling 循环，工具 `set_availability/add_task/generate_plan/list_tasks/get_plan`）；计划生成抽成可复用的 `run_plan_generation()`。（`06108db` ai对话设置时间段、`129c7e7` plan）
- **RAG v2（参数化重构）**：新增 `knowledge_rag.py`（parse→match→compute→package）与 `task_knowledge_v2.jsonl`（ontology/subject_profile/unit_rate/task_template/calibration_case/planning_rule 五层）；单位速率 × 疲劳 × 难度/P人系数估时，LLM 以参数化估时为基准 ±15% 微调。
- **空闲解析 Skill**：`skills/availability/`（`AvailabilitySkillHandler`），`has_time_info` 早退、`polarity_trace` + busy 过滤、非法 JSON 规则式兜底。
- **兜底**：计划时间不足时结构化告警（`details.timeShortage`）而非静默失败。
- **文档**：新增 `docs/DEVELOPMENT_LOG.md`、lesson10 reflection、RAG 设计文档更新。（`b38bcaf` lesson10 reflection）

## 2026-05-23 · 下周计划页
- **新增**：“紧张刺激的 next week plan” 展示。（`74999da`）

## 2026-05-15 ~ 05-16 · 前端 UI PC 化 + RAG 检索优化 + 专注模式 + PPT
- **UI**：像素风背景铺满、卡片/弹窗磨砂半透明、底部导航图标化、时间轴缩放与紧凑重叠布局；优化设置页与显示细节。（`26406e0` 优化前端UI、`f3df130` 优化前端界面、`a3db6c6` Improve UI settings and RAG knowledge design）
- **RAG**：优化知识库检索（结构化 + 文本相似度 top_k，与用户历史样本合并）。（`3783a42` 优化知识库检索…）
- **专注模式**：全屏专注界面，可最小化为悬浮球，结束后在时间轴添加方块。（`dfb351b` 添加专注功能）
- **文档**：PPT 逐页设计稿。（`0cf5233` 增加ppt逐页设计稿）

## 2026-05-09 · 反思与计划
- reflection & plan 文档。（`5bf56d2`）

## 2026-04-24 ~ 04-25 · 账号系统 + 跨天计划 + 空闲时间段
- **账号系统**：注册/登录，用户状态按 JSON 文件隔离。（`b9d0ac6` 添加账号系统）
- **跨天计划**：计划可拆分到 DDL 前多天，按空闲时段排程。（`bf011e4` 跨天计划）
- **空闲时间段**：每周可用时段配置，参与计划生成。（`7804def` 增加空闲时间段功能）

## 2026-04-17 ~ 04-18 · 局域网访问 + 美化 + 可用版本
- **局域网**：支持同一局域网设备访问 demo（`APP_HOST=0.0.0.0`）。（`43c29ce` 局域网连接）
- **UI**：初版美化。（`c069bea` 美化）
- **里程碑**：“有点小 bug 但能用了”——首个端到端可用版本。（`4037f78`）
- **文档**：lesson04 reflection。（`433b87a`）

## 2026-03-28 ~ 03-30 · 初步框架 + 打通 Ollama
- **框架**：`v0_demo` 初步框架（任务 CRUD、今日计划、打卡）。（`e3b4d06` 初步框架）
- **LLM 接入**：解决 Ollama 无法连接、模型响应过慢问题。（`c470732` 解决ollama无法连接的问题、`abba…`/`abb9a2c` 解决模型过慢问题）
- **文档**：lesson03 reflection、开发方向建议。（`2b9a782`、`2e80847`）

## 2026-03-13 ~ 03-21 · 项目启动
- 初始化学生项目 template 仓库与首个 commit。（`4207402` Initial commit、`53f560b` 初始化学生项目template仓库）
- 项目一页纸定义 `docs/project_one_page.md`。（`e095ad1` created project_one_page）
- 首次课程 reflection。（`29cab98` added reflection）

---

### 阶段主线回顾（Roadmap 视角）
1. **启动期（3 月）**：确定“面向高中生的学习计划工具”定位，搭 `v0_demo` 骨架，打通本地 Ollama。
2. **核心功能期（4 月）**：账号系统、每周空闲时间段、跨天可拆分计划、局域网访问。
3. **体验与检索期（5 月）**：前端 PC 化美化、专注模式、RAG 检索优化。
4. **工程深化期（6 月）**：AI 对话 Agent（function calling）、空闲解析 Skill、RAG 参数化知识库 v2、时间不足结构化告警、切换 DeepSeek。
