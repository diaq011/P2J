# 工程说明文档 · J人模拟器（LLM Engineering Notes）

> 本文解释「J人模拟器」在大模型工程上**真正做了什么、为什么这样设计、解决了什么问题、如何验证有效**。所有结论都对应仓库内的真实代码，关键文件与函数名在文中直接给出，便于对照。
>
> 主代码目录：`v0_demo/`。后端入口：`v0_demo/backend/app.py`。默认 LLM：DeepSeek `deepseek-chat`（OpenAI 兼容接口），可切换阿里通义 DashScope `qwen-plus` 或本地 Ollama。

---

## 0. 一分钟架构总览

```
用户自然语言（“数学卷3张周一前，工作日晚上7-9点有空，帮我排计划”）
        │
        ▼
前端 SPA（index.html / app.js / styles.css，聊天窗口为默认主页）
        │  POST /api/chat  { message, history }
        ▼
Flask 后端 app.py :: assistant_chat()
        │
        ▼
Agent 回合循环  assistant_agent.py :: run_agent_turn()
        │  （OpenAI 兼容 function calling，最多 4 轮）
        ├── set_availability ──► availability Skill（LLM 解析空闲时段 → weeklyAvailability）
        ├── add_task ─────────► 校验并写入 用户 state（tasks）
        ├── generate_plan ────► run_plan_generation()：RAG 估时 + 约束排程
        ├── list_tasks / get_plan ─► 只读查询
        │
        ▼
deepseek_client.py :: deepseek_chat()  →  DeepSeek / Qwen / Ollama（OpenAI 兼容）
        │
        ▼
用户状态持久化到 data/users/<id>_state.json；会话持久化到 data/sessions.json
```

一句话：**主页就是一个 AI 聊天窗口**，用户说人话，Agent 通过工具真正修改应用状态（录任务、设空闲、出计划），再把结构化计划渲染成时间轴。

---

## 1. Prompt 设计

### 用了什么
项目里有 **三处**相互独立、各司其职的 system prompt：

1. **对话 Agent 主提示词** —— `v0_demo/backend/assistant_agent.py` 中的 `ASSISTANT_SYSTEM_PROMPT`。
   它定义了助手人设（面向学习任务重、不擅长自己排计划的高年级学生）、可用工具清单，以及 5 条硬性原则，例如：
   - “能用工具就用工具，不要假装已经保存”（防止模型口头答应却不落库）；
   - deadline 必须换算成 `YYYY-MM-DD`，相对时间（“周一前/明天”）要根据注入的 `context.today` 计算；
   - 缺必要信息（任务没有截止日期）时先追问、不许瞎编。

2. **计划生成提示词** —— `app.py :: run_plan_generation()` 内联的 system message。
   它把任务约束求解**框成一个严格的 JSON 生成任务**，用编号硬规则约束模型：只返回 JSON、以 `evidence_package.parametric_estimate` 为估时基准、只能在 ±15% 内微调、优先级必须是 `deadline > slot fit > history speed`、任务可跨天但不得晚于 DDL、`task_estimates[].evidence_ids` 必须引用 `rag_examples.sample_id`。

3. **空闲时段解析提示词** —— `v0_demo/skills/availability/prompt.py` 中的 `AVAILABILITY_PARSE_SYSTEM_PROMPT`，配合 `handler.py` 把「当前已保存的空闲时间」作为上下文一起喂给模型。

### 为什么这样设计
- **分角色而非一个巨型提示词**：对话、排程、时段解析是三种不同任务，各自的输出契约（自由文本 / 计划 JSON / 空闲时段 JSON）完全不同。拆开后每个提示词都短、约束清晰，也能各自换模型（例如 `AVAILABILITY_DEEPSEEK_MODEL` 可单独配置）。
- **把“状态注入提示词”而不是靠模型记忆**：`run_agent_turn` 会把 `context={"today", "weekday_key"}` 追加进 system 内容，空闲解析会把当前 `weeklyAvailability` 作为 system 上下文。这让相对时间换算和增量修改有确定依据。

### 解决了什么问题
- 降低使用门槛：用户不用填四张表单，一句话即可。
- 抑制“幻觉式确认”：硬规则明确要求“必须调用工具、不要假装保存”，减少了模型只回复不动作的情况。

### 如何验证
- 起服务后实测：一句话“工作日晚上7-9有空，数学卷3张周一前，帮我排计划”可在一个回合内触发 `set_availability + add_task + generate_plan` 三次工具调用并落库（见 `docs/DEVELOPMENT_LOG.md` 2026-06-28 的验证记录）。
- 空闲解析提示词的行为由 `test_availability_skill.py` 的多组用例固定（详见第 5 节）。

---

## 2. Tool Calling（函数调用）

### 用了什么
- **工具 schema**：`assistant_agent.py :: TOOLS`，OpenAI 兼容的 5 个 function：`set_availability`、`add_task`、`generate_plan`、`list_tasks`、`get_plan`。每个都带 `parameters` JSON Schema，`add_task` 的 `subject/taskType/difficulty` 用 `enum` 严格约束取值，`required` 明确 `title/deadline`。
- **透传层**：`deepseek_client.py :: deepseek_chat()` 把 `tools`/`tool_choice` 透传给接口，并处理了一个真实坑——**DeepSeek 不允许 `tools` 与 `response_format=json_object` 同时出现**，所以代码在带 `tools` 时主动 `body_payload.pop("response_format", None)`。
- **解析层**：`extract_deepseek_message()`（取完整 assistant message，含 `tool_calls`）与 `extract_tool_calls()`（安全取数组，异常返回空）。

### 为什么这样设计
- 用官方 function calling 而不是自己解析文本，能拿到结构化 `arguments`，避免脆弱的正则解析。
- 工具 schema 用 `enum` 收敛学科/类型/难度，使模型产出天然对齐后端 `SUBJECT_LABELS`/`TASK_TYPE_LABELS` 校验字典，减少非法值。

### 解决了什么问题
- 让模型的意图能**真正落库**（写 tasks、写 availability、触发排程），而不是停留在聊天。
- 工具结果回灌给模型，使它能基于“真实执行结果”继续对话（例如告知已生成计划、是否时间不足）。

### 如何验证
- `add_task` 会经过 `validate_task_payload()`，非法 `subject/taskType/difficulty/deadline` 直接抛错并回灌给模型（`{"error": ...}`），可通过构造非法参数复现。
- 工具调用轨迹以 `toolTrace` 返回给前端，便于观测每一步（见第 8 节 Trace）。

---

## 3. Agent（多轮工具循环）

### 用了什么
`assistant_agent.py :: run_agent_turn()` 是一个**最多 4 轮**的 tool-calling 循环：

1. 组装 messages（system + 最近 12 条历史 + 本轮 user）。
2. 调 `chat_fn`，取回 assistant message；若**没有** `tool_calls` → 直接把文本作为 `reply` 返回，结束。
3. 若有 `tool_calls`：把带 `tool_calls` 的 assistant message 回写进对话，然后逐个 `dispatch_tool(name, args)`，把每个结果作为 `role:"tool"` 消息回灌，进入下一轮。
4. 循环到最后一轮会**去掉 tools**，强制模型产出纯文本收尾；若耗尽轮次还额外补一次纯文本 wrap-up。

关键的**依赖注入**设计：Agent 模块**不 import Flask、不碰数据存储**。宿主 `app.py :: assistant_chat()` 传入 `deepseek_chat`（LLM）、`DEEPSEEK_MODEL`、以及一个闭包 `dispatch_tool`（内部才访问 `store_lock`、`load_user_state`、`run_plan_generation` 等）。

### 为什么这样设计
- **可测试、可复用、无循环依赖**：Agent 只关心“如何跑循环”，具体工具怎么改状态由宿主决定，因此能用 mock 的 `chat_fn`/`dispatch_tool` 做单测。
- **回合上限**保护：`max_rounds=4` 防止模型陷入无限工具调用；最后一轮去掉工具，确保用户一定拿到一句人话回复。

### 解决了什么问题
- 支撑“一句话完成多件事”：一个回合内可依次设空闲、加多个任务、再生成计划。
- 工具异常不炸整个请求：`dispatch_tool` 抛错被 `try/except` 捕获，转成 `{"error": ...}` 回灌模型，让它自行纠正或向用户解释。

### 如何验证
- `docs/DEVELOPMENT_LOG.md` 记录了 `run_agent_turn` 的 mock 单测通过，以及真机一次完成三次工具调用。
- 返回体固定为 `{"reply", "stateChanged", "toolTrace"}`，前端据 `stateChanged` 精确刷新（tasks/availability/plan）。

> 诚实说明：这是**单 Agent + 多工具**架构，**没有 Multi-Agent**。空闲解析虽然是独立的 Skill 且会二次调用 LLM，但它是被 `set_availability` 工具同步调用的子流程，不是并行/协商的多智能体。

---

## 4. Memory / State（记忆与状态）

### 用了什么
项目区分了三类“记忆”，都落在文件系统上，无需数据库：

1. **会话记忆（Session）**：登录后 token→username 存 `sessions`，并持久化到 `data/sessions.json`（`save_sessions()`/`load_sessions()`，服务启动时 `load_sessions()`）。这修复了“刷新即掉登录”的老 bug（原来 session 只在内存）。
2. **用户长期状态（User State）**：每个用户一个文件 `data/users/<id>_state.json`，结构见 `default_user_state()`：`tasks / todayPlan / plansByDate / checkins / lastPlanner / weeklyAvailability`。读写经 `load_user_state()`/`save_user_state()`，并在 `store_lock` 下串行化。
3. **对话短期记忆**：前端把聊天历史存 `localStorage`，每次 `/api/chat` 带上 `history`；后端只取最近 12 条（`history[-12:]`）拼进上下文，控制 token 与漂移。

此外还有一类**经验记忆**用于 RAG：用户打卡（`/api/checkins`）完成任务时，`build_rag_sample_from_checkin()` 会把“实际耗时”写入 `data/users/<id>_rag_samples.jsonl`，成为下次估时的个人历史样本。

### 为什么这样设计
- 课程 demo 级项目，**文件存储足够且零依赖**，天然做到用户隔离（`safe_username()` 把标识符净化成文件名）。
- 会话与状态分文件，登录态与业务数据解耦；`sessions.json` 已 gitignore，避免把登录令牌提交上库。

### 解决了什么问题
- 刷新/重启后登录与数据都不丢。
- “历史越用越准”：完成的任务变成个人 RAG 样本，估时逐步个性化。

### 如何验证
- 仓库中已存在真实用户状态文件（`data/users/*_state.json`），可直接读到 tasks/plansByDate 结构。
- 并发写入用 `store_lock` 保护；`load_user_state` 对损坏 JSON 有兜底（异常时回退 `default_user_state()`）。

---

## 5. RAG（检索增强 / 证据化估时）

这是本项目工程含量最高的部分：RAG 不是用来“聊天检索文档”，而是用来**为每个任务估算耗时提供可引用的证据**。

### 用了什么
- **知识库**：`data/knowledge/task_knowledge_v2.jsonl`（参数化 v2，约 300+ 条），五层结构：`ontology / subject_profile / unit_rate / task_template / calibration_case / planning_rule`（设计见 `docs/rag_knowledge_base_design.md`）。旧版 `task_duration_knowledge.jsonl` 作为 legacy 回退（`load_knowledge_records()`）。
- **检索/计算管线**：`knowledge_rag.py`，流程为 `parse_task_intent → match_task_template → compute_parametric_estimate → build_evidence_package`。
  - 从标题抽取数量（“数学卷**3**张”“背单词**200**个”，支持中文数字），套用**单位速率 × 疲劳系数 × 难度/年级修正 × P 人慢速系数（默认 1.18）**算出 p25/p50/p75；
  - `word`/`problem`/`page` 走线性+按批疲劳，`set`/`article` 走逐单位疲劳；
  - 产出 `evidence_package`：结构化意图、命中模板、参数化估时、任务拆分建议、标定案例、`warnings`（估时与标定案例偏差>30% 时告警）。
- **两路证据融合**：`app.py :: build_task_rag_context()` 把「用户个人历史样本」（`compute_history_rag_examples`，含文本 Jaccard 相似度、学科/类型/难度加权、MAD 离群降权、时间衰减 `RAG_TIME_DECAY_DAYS`）与「知识库参数化证据」（`evidence_to_rag_examples`）合并，按分数排序取 `RAG_TOP_K`（默认 5）。
- **交给 LLM 时**：`build_llm_prompt_payload()` 把每个任务的 `evidence_package`、`rag_examples`（含 `sample_id`）、`rag_stats` 一起塞进 prompt，要求模型引用 `evidence_ids`。

### 为什么这样设计
- 学生任务耗时差异极大，纯让 LLM“拍脑袋估时”既不稳定也不可解释。**参数化知识库 + 个人历史**给出可复算、可引用的锚点，LLM 只做小幅校准。
- `parse_llm_plan()` 会**校验模型返回的 `evidence_ids` 是否真实存在**于该任务的候选样本集合；无效引用会被丢弃并触发回退，杜绝“伪造证据”。

### 解决了什么问题
- 估时可解释（每条估时都带 `reason` 和 `evidence_ids`）。
- 冷启动无历史时也能估（靠参数化知识库）；有历史后逐步个性化（融合历史中位数）。

### 如何验证
- `test_knowledge_rag.py` 跑三组课堂样本（数学卷3张 / 英语作文2篇 / 背单词200个），**已实测通过**，输出 p25/p50/p75 与拆分段数（见 `TEST_AND_FAILURE_LOG.md` 正常测试 T5）。
- 若模型引用无效或全 RAG 样本为空，`run_plan_generation` 会走 `fallback_estimate()` 并在 `details.risks` 里显式提示“RAG 样本不足，估时回退比例较高”。

> 诚实说明：当前检索是**属性匹配 + 文本相似度**，尚未接入向量库（ChromaDB）。这在 `docs/DEVELOPMENT_LOG.md` 的“已知问题”里已标注为后续方向。

---

## 6. Safety Guard（安全与校验）

### 用了什么
- **密钥安全**：API key **绝不入库**。`app.py :: _load_local_env()` 在 import LLM 客户端**之前**从 gitignored 的 `run.local.env` 读入环境变量；另有 `run.local.sh(.example)` 方式。`.gitignore` 已忽略 `*.local.env`、`run.local.sh`、`data/sessions.json`。仓库仅提供不含真实 key 的 `run.local.env.example` / `run.local.sh.example` 模板。
- **认证与口令**：注册/登录支持手机号或邮箱（`PHONE_RE`/`EMAIL_RE` 正则校验、`classify_identifier`），口令用 **每用户随机 salt + SHA-256** 存储（`hash_password`，`secrets.token_hex`），token 用 `secrets.token_urlsafe(32)`。所有业务路由用 `get_current_username()` 做鉴权，未登录返回 401。
- **输入校验**：`validate_task_payload()` 严格校验任务字段（enum 白名单、日期格式、`estimatedMinutes` 为正整数）；空闲时段用 `normalize_and_validate_availability()` 规整并校验 `HH:MM`；`parse_hhmm_to_minutes()` 拒绝越界时间。
- **估时钳制**：`clamp_task_minutes()` 把任何估时夹在 15–480 分钟，防止模型输出极端值污染排程。

### 为什么这样设计
- 课程明确要求 GitHub 迭代且不泄露密钥；把 key 隔离到 gitignored 文件是最直接的护栏。
- LLM 输出不可全信，因此**所有落库前都过一层确定性校验**，把模型当“不可信输入源”。

### 解决了什么问题
- 避免密钥泄露（历史上出现过 `DEEPSEEK_API_KEY not configured`，靠 `_load_local_env()` 解决注入问题，同时保证不硬编码）。
- 防止非法/极端数据破坏排程与前端渲染。

### 如何验证
- 尝试用无 token 请求 `/api/state` 返回 401；非法 `subject` 的 `add_task` 会被 `validate_task_payload` 拒绝（见测试日志失败/边界用例）。
- `git status` / `.gitignore` 可确认 `run.local.env`、`sessions.json` 不在版本控制内。

---

## 7. Fallback（降级与兜底）

这是本项目在“工程健壮性”上着墨最多的一块，均有真实代码支撑：

1. **LLM 不可用**：`deepseek_model_ready()` 先探活（列模型，3 秒超时）；不可用时相关路由返回 **503 + 友好中文提示**（`"DeepSeek API 不可用：..."`），而不是 500 崩溃。这直接兜底了历史上的 `_ssl.c:1112 handshake timed out` 首包超时问题。
2. **超时细分**：`deepseek_chat()` 把 `TimeoutError`/`URLError(timeout)` 统一转成明确的“请求超时”RuntimeError；上层 `assistant_chat`/`run_plan_generation` 据关键字 `timed out` 返回 **504**，其余模型错误返回 **502**，文案都对用户友好。
3. **估时证据不足**：模型未给有效 `evidence_ids` 时走 `fallback_estimate()`（历史中位数 → 参数化估时 → 用户预估 → 默认 60 分钟的多级回退），并在 `reason` 里注明“已回退”。
4. **JSON 解析失败**：`run_plan_generation` 捕获 `json.loads` 异常，返回 502“模型解析失败”，不影响已有数据。
5. **时间不足（结构化告警而非静默失败）**：`schedule_tasks_until_deadline()` + `build_time_shortage_details()` 会算出总需求 vs 可用时段，产出 `details.timeShortage`（缺口分钟、受影响任务列表）与 `risks`，前端弹窗提示用户“压缩任务或增加空闲时段”。若从今天到 DDL 完全没有空闲时段，直接返回 400 让用户先去设置。
6. **空闲解析兜底**：LLM 返回非法 JSON 时，`parse_availability_llm_response` 回退到规则式 `extract_slots_from_user_message`（`test_availability_skill.py::test_fallback_rule_parse_on_invalid_json` 覆盖）。
7. **模型可切换**：客户端是 OpenAI 兼容层，通过环境变量即可从 DeepSeek 切到通义 `qwen-plus` 或本地 Ollama，本身就是对“某家服务不可用”的运维级兜底。

### 如何验证
- 停掉网络或清空 key，`/api/health` 的 `deepseekApiReady=false`，对话/生成计划返回 503 友好提示（可复现）。
- 时间不足场景由 `TEST_AND_FAILURE_LOG.md` 的失败案例 F3 记录。

---

## 8. Trace / 可观测性

### 用了什么
- **工具轨迹**：`run_agent_turn` 返回 `toolTrace`（每次工具的 `name/args/result`）与 `stateChanged`，前端可据此展示/调试 Agent 到底做了什么。
- **计划可解释性**：每次生成的计划在 `details` 里带 `rationale / risks / taskEstimates（含 reason 与 evidence_ids）/ ragExamples / planningWindow / timeShortage`，等于把“为什么这么排”留痕在数据里。
- **健康检查**：`GET /api/health` 暴露 `deepseekApiReady/deepseekMessage/deepseekModel/deepseekTimeoutSec/ragTopK/...`，一眼看清运行配置与外部依赖状态。
- **规划器指纹**：`state.lastPlanner` 记录本次用的模型与参数（如 `deepseek:deepseek-chat+rag_top_k=5`）。
- **开发日志**：`docs/DEVELOPMENT_LOG.md` 逐轮记录“做了什么/为什么/涉及文件/验证方式”。

### 为什么 & 解决了什么
- 排程是“黑箱决策”，把证据、风险、时间缺口显式写进返回体后，答辩和调试都能指着数据说话，而不是猜。

> 诚实说明：目前是**结构化返回 + 服务端日志**级别的可观测性，尚未接入专门的 tracing 平台（如 Langfuse）。Flask `debug=True` 下有请求日志，但没有做统一的 metrics 采集。

---

## 9. 测试与失败分析

详见根目录 `TEST_AND_FAILURE_LOG.md`。要点：

- **可自动化的单测**：`test_availability_skill.py`（7 个断言用例，覆盖时间检测、busy 过滤、非法 JSON 规则回退、否定/追加/逐日合并等）、`test_knowledge_rag.py`（三组参数化估时冒烟）。二者**均已在本机 `python3` 直接运行通过**（无需联网，因为它们测的是解析/计算纯函数）。
- **失败案例**：连接握手超时、缺 API key、刷新掉登录、中文输入法回车误发送、时间不足无法排满、端口占用，均在代码里留下了对应的修复或兜底（见第 6–7 节）。

---

## 10. 答辩速览：评分维度 → 代码落点

| 评分维度（权重） | 在本项目如何满足 | 关键代码/文件 |
|---|---|---|
| **项目完整度 25%**（能跑、闭环） | 注册/登录 → 一句话录任务+设空闲 → 生成跨天计划 → 时间轴渲染/编辑 → 打卡回流，端到端闭环 | `app.py` 全部路由；`index.html`/`app.js` 前端 |
| **大模型工程能力 25%** | Prompt（3 处分角色）、Tool Calling（5 工具 schema + 透传/解析）、Agent（多轮循环 `run_agent_turn`）、Memory（sessions + user state + RAG 样本）、RAG（参数化知识库 5 层 + 历史融合）、Safety（鉴权/校验/密钥隔离）、Fallback（LLM 降级/时间不足/多级估时回退） | 本文第 1–7 节；`assistant_agent.py`、`knowledge_rag.py`、`deepseek_client.py`、`skills/availability/` |
| **测试与失败分析 20%** | ≥5 正常测试 + ≥3 失败案例，含可运行单测与真实 bug 复盘 | `TEST_AND_FAILURE_LOG.md`、`test_*.py` |
| **作品集展示质量 20%** | README 展示页（定位/功能/安装/示例/截图/完成度/未来方向）+ 4 张真实截图 | `README.md`、`docs/screenshots/*.png` |
| **GitHub 迭代过程 10%** | 从 2026-03 到 2026-06 的持续 commit + 分周 changelog | `CHANGELOG.md`、`git log`、`docs/DEVELOPMENT_LOG.md` |

---

## 11. 诚实的局限（不吹）

- **无 Multi-Agent**：单 Agent + 工具，空闲解析是子流程而非独立智能体。
- **无向量检索**：RAG 目前是属性 + 文本相似度，未接 ChromaDB/embedding。
- **无流式输出**：`/api/chat` 一次性返回，前端无逐字流。
- **可观测性偏轻**：结构化返回 + 日志，未接 tracing/metrics 平台。
- **单机文件存储**：JSON 文件足够 demo，但非高并发/多实例方案。
- **依赖外部 LLM**：断网或无 key 时功能核心不可用（已做友好降级，但不是本地可离线跑完整流程；理论上可切 Ollama 本地模型缓解）。
