# 测试与失败记录（Test & Failure Log）· J人模拟器

> 目的：证明项目**能在多种输入下稳定运行**，而不仅是一个 demo 输入；并诚实记录踩过的坑、修复/兜底方式以及仍存在的问题。
>
> 运行环境：macOS，系统自带 `python3`。自动化单测**不需要联网**（测的是解析/计算纯函数）；涉及 LLM 的功能测试需要在 `run.local.env` 配好 `DEEPSEEK_API_KEY` 后起服务手动验证。
>
> 复现自动化单测：
> ```bash
> cd v0_demo/backend
> python3 test_availability_skill.py     # 空闲解析 Skill
> python3 test_knowledge_rag.py          # RAG 参数化估时
> ```

---

## 一、正常测试（Normal Cases，≥5）

### T1 · 空闲时段解析 Skill 单测（自动化，已通过）
- **目的**：验证自然语言空闲时间解析的核心行为（时间检测、busy 过滤、否定、追加、逐日合并、非法 JSON 回退）。
- **输入**：`test_availability_skill.py` 的 7 个用例，如「周一到周五晚上7-9点有空但周三要上课」「每周一中午1-2点有空但周二不是」「每天晚上7-8点有空但除了周四」等。
- **预期**：busy 时段不进入 `weekly_availability`；否定日被清空；追加不覆盖已有时段；非法 JSON 触发规则式回退。
- **实际**：`python3 test_availability_skill.py` 输出 `All availability skill tests passed.`，退出码 0。
- **结论**：✅ 通过。核心解析逻辑与提示词契约稳定。

### T2 · RAG 参数化估时冒烟测试（自动化，已通过）
- **目的**：验证知识库能对不同任务算出合理的 p25/p50/p75 与任务拆分。
- **输入**：`test_knowledge_rag.py` 三组样本：数学卷3张 / 英语作文2篇 / 背英语单词200个。
- **预期**：正确抽取 `unit_count`（3 / 2 / 200）、命中对应模板、产出 p25≤p50≤p75、给出拆分段数。
- **实际**：
  - 数学卷3张 → 模板 `tpl_math_test_paper_standard`，p25/p50/p75 = **305/375/461** 分钟，6 段拆分；
  - 英语作文2篇 → `tpl_english_essay_standard`，**86/105/135** 分钟，6 段；
  - 背单词200个 → `tpl_english_vocabulary_standard`，**86/106/136** 分钟，4 段（按 50 个/批）。
- **结论**：✅ 通过。中文数量抽取、单位速率、疲劳/难度修正、按批拆分均生效。

### T3 · 注册 / 登录 / 刷新保持登录（功能测试，手动）
- **目的**：验证账号系统与会话持久化。
- **输入**：以手机号 `13900000001` + 密码（≥6 位）注册；退出后重新登录；登录后刷新页面。
- **预期**：注册返回 token 且 `isNew=true`；重复注册同一号返回 409；错误密码返回 401；刷新后仍保持登录、数据不丢。
- **实际**：注册/登录路由 `auth_register`/`auth_login` 按预期返回；`sessions` 持久化到 `data/sessions.json`，服务重启后 `load_sessions()` 恢复；仓库中存在真实用户状态文件 `data/users/13900000001_state.json` 等，佐证多账号隔离生效。
- **结论**：✅ 通过（“刷新掉登录”是历史 bug，见 F2，现已修复）。

### T4 · AI 对话一句话完成「设空闲 + 录任务 + 生成计划」（Agent 端到端，手动）
- **目的**：验证 Agent 多轮工具循环端到端可用。
- **输入**：在对话主页发送「工作日晚上7点到9点有空，数学卷3张周一前，帮我排计划」。
- **预期**：一个回合内依次触发 `set_availability`、`add_task`、`generate_plan` 三次工具调用，状态落库，返回 `stateChanged` 使前端刷新时间轴。
- **实际**：`docs/DEVELOPMENT_LOG.md`（2026-06-28）记录实测一次完成三次工具调用、状态持久化、时间轴出现排程方块；返回体含 `reply/stateChanged/toolTrace`。
- **结论**：✅ 通过。相对时间（“周一前”）能按 `context.today` 换算为 `YYYY-MM-DD`。

### T5 · 生成跨天计划 + 时间轴渲染 + 编辑任务（功能测试，手动）
- **目的**：验证计划生成的约束排程、跨天拆分、时间轴渲染与任务编辑闭环。
- **输入**：录入多个不同 DDL 的任务并配置每周空闲时段，调用 `POST /api/plans/today`（或对话触发 `generate_plan`）；随后在时间轴点击方块编辑任务。
- **预期**：任务按 `deadline > slot fit > history speed` 排序，可跨天拆分但不晚于 DDL，仅落在空闲时段；`plansByDate` 按日期生成；`PUT /api/tasks/<id>` 编辑后前端提示需重新生成。
- **实际**：`run_plan_generation` 产出 `plansByDate` + `scheduledBlocks`（含 `startMinute/endMinute/title/deadline`）+ `details`（rationale/risks/taskEstimates/timeShortage）；前端时间轴按分钟渲染方块，方块可点击编辑/删除（`app.js`）。
- **结论**：✅ 通过。

### T6 · 任务字段校验（边界测试，手动/可脚本化）
- **目的**：验证非法输入被后端确定性拒绝，不污染状态。
- **输入**：`POST /api/tasks` 传非法 `subject="魔法"`、缺 `deadline`、`estimatedMinutes=-5`、`deadline="2026/13/40"`。
- **预期**：均返回 400 且带中文/英文错误信息，不写库。
- **实际**：`validate_task_payload()` 分别抛出 `subject is invalid` / `deadline is required` / `estimatedMinutes must be > 0` / 日期解析失败，路由转成 400。
- **结论**：✅ 通过。LLM 工具路径（`add_task`）复用同一校验，非法值被回灌给模型纠正。

---

## 二、失败案例（Failure Cases，≥3）

### F1 · DeepSeek/LLM 连接握手超时（`_ssl.c:1112: handshake timed out`）
- **现象**：后端刚重启或代理网络波动时，首个 LLM 请求 SSL 握手超时，早期版本直接 500 崩溃、前端白屏。
- **根因**：外部 API 首包建连慢 + 无探活/无超时兜底，异常直接冒泡。
- **修复 / 兜底**：
  1. `deepseek_client.py :: deepseek_model_ready()` 先探活（3 秒列模型），不可用时上层返回 **503 + 友好中文提示**（`assistant_chat`、`run_plan_generation`、`parse_availability_chat`）；
  2. `deepseek_chat()` 把超时统一转成明确的 `timed out` RuntimeError，上层据此返回 **504「模型响应超时」**，其余错误 502；
  3. 超时时长可配（`DEEPSEEK_TIMEOUT_SEC`，默认 90s）。
- **遗留风险**：仍未做**自动重试/指数退避**；首包偶发超时需用户手动重试。建议后续加 1–2 次重试并调大握手超时。

### F2 · 刷新即掉登录 + 前端初始化顺序 bug
- **现象**：刷新页面后登录态丢失；某些情况下前端 `bootstrap()` 因变量在声明前被使用（Temporal Dead Zone）而报错。
- **根因**：session 原本只存在内存字典，进程重启/刷新即失效；前端初始化顺序不当。
- **修复 / 兜底**：session 持久化到 `data/sessions.json`（`save_sessions()`/`load_sessions()`，启动即加载）；调整前端 `bootstrap()` 初始化顺序修掉 TDZ。`sessions.json` 已加入 `.gitignore`，避免提交登录令牌。
- **遗留风险**：token 无过期与轮换机制；游客态（`X-Guest-Id`）暂不自动迁移到账号（见 `DEVELOPMENT_LOG.md` 已知问题）。

### F3 · 计划无法在 DDL 前排满（时间不足）被静默忽略
- **现象**：任务总需求时间超过可用空闲时段时，早期版本静默排不下，用户不知道为什么任务“消失”。
- **根因**：排程只按空闲时段填充，没有对“需求 > 供给”做显式反馈。
- **修复 / 兜底**：`schedule_tasks_until_deadline()` 记录 `unscheduled_ids`，`build_time_shortage_details()` 计算 `hasShortage/缺口分钟/受影响任务`，写入 `details.timeShortage` 与 `risks`；前端弹窗提示“压缩任务或增加空闲时段”。若从今天到 DDL 完全无空闲时段，直接返回 **400** 引导用户先设置。
- **遗留风险**：目前只“告警”，**不会自动帮用户重排优先级或建议砍哪个任务**；智能取舍是后续方向。

### F4 · 中文输入法回车误发送
- **现象**：用中文输入法打字，组字中途按回车（选词/确认候选）会被当成“发送消息”，导致半句话被发出。
- **根因**：`keydown` 监听未区分 IME 组字状态。
- **修复 / 兜底**：`app.js` 用 `compositionstart/compositionend` 维护 `assistantChatComposing` 标志，并在回车处理里判断 `event.isComposing || event.keyCode === 229 || assistantChatComposing`，组字期间的回车不触发发送。
- **遗留风险**：极少数浏览器/输入法的事件时序差异仍可能漏判；未做跨浏览器全量回归。

### F5 · `DEEPSEEK_API_KEY not configured`（启动即不可用）
- **现象**：后端启动后所有 LLM 功能报 `DEEPSEEK_API_KEY not configured`。
- **根因**：import `deepseek_client` 时读取环境变量，但启动脚本没在此之前注入 key。
- **修复 / 兜底**：`app.py` 在**导入客户端之前**调用 `_load_local_env()`，自动从 gitignored 的 `run.local.env` 读入变量；同时保留 `run.local.sh` 方式。仓库提供不含真实 key 的 `run.local.env.example` 模板。`/api/health` 暴露 `deepseekApiReady/deepseekMessage` 便于快速定位。
- **遗留风险**：若用户既没建 `run.local.env` 也没导出环境变量，功能仍不可用——属配置问题，已用 README + 模板 + 健康检查三重提示缓解。

### F6 · 端口占用（`5000 already in use`，macOS AirPlay 抢占）
- **现象**：`python3 app.py` 启动报 5000 端口被占用。
- **根因**：macOS 的 AirPlay Receiver（ControlCenter）默认占用 5000。
- **修复 / 兜底**：`run.local.sh.example` 默认 `APP_PORT=5001`；`APP_PORT` 可通过环境变量覆盖（`app.py` 读 `os.getenv("APP_PORT")`）。README 也提示改端口或关闭 AirPlay 接收器。
- **遗留风险**：纯运维项，换端口即可；无代码层残留问题。

---

## 三、当前测试覆盖与缺口（诚实说明）
- ✅ **纯函数层**（空闲解析、RAG 估时）有可自动运行的测试，已通过。
- ⚠️ **HTTP 路由层** 目前靠手动/接口测试，未写 Flask `test_client` 自动化用例；`pytest` 未在环境中安装（`python3 -m pytest` 报 `No module named pytest`），因此用各测试文件自带的 `main()` 直接运行。
- ⚠️ **LLM 相关端到端**（对话、生成计划）依赖真实 API key，无法在无网/无 key 的 CI 中自动跑，只能手动验证。
- 后续建议：补 `flask.testing` 路由级用例、给 Agent 循环补 mock 单测、引入 `pytest` 统一入口。
