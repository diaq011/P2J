const API_BASE = window.location.origin.startsWith("http")
  ? `${window.location.origin}/api`
  : "http://127.0.0.1:5000/api";

const WEEK_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEK_LABELS = {
  mon: "周一",
  tue: "周二",
  wed: "周三",
  thu: "周四",
  fri: "周五",
  sat: "周六",
  sun: "周日",
};

const SUBJECT_LABELS = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  history: "历史",
  politics: "政治",
  geography: "地理",
  general: "综合/其他",
};

const TASK_TYPE_LABELS = {
  test_paper: "试卷",
  exercise_set: "习题/刷题",
  essay: "作文/写作",
  reading: "阅读",
  recitation: "背诵",
  vocabulary: "单词/词组",
  mistake_review: "错题整理",
  chapter_review: "章节复习",
  preview: "预习",
  lab_report: "实验报告",
  group_work: "小组作业",
  presentation: "展示/PPT",
};

const DIFFICULTY_LABELS = {
  easy: "简单",
  medium: "普通",
  hard: "困难",
};

const ASSISTANT_INTRO =
  "嗨，我是你的「J人模拟器」学习规划助手 👋\n" +
  "你不用去填复杂的表单，直接跟我说就行：\n" +
  "• 告诉我你什么时候有空，比如「工作日晚上7点到9点有空，周末下午2点到5点」\n" +
  "• 告诉我你要做的任务和截止时间，比如「数学卷3张，周一前；英语作文2篇，周三前」\n" +
  "• 说一句「帮我排计划」，我就会按你的空闲时间把任务排到 DDL 之前。\n" +
  "想从哪一件开始？";

const state = {
  authToken: localStorage.getItem("auth_token") || "",
  currentUser: "",
  tasks: [],
  todayPlan: null,
  selectedPlan: null,
  checkins: [],
  planner: "none",
  activePage: "chat",
  planStale: localStorage.getItem("plan_stale") === "1",
  editingTaskId: "",
  profileName: localStorage.getItem("profile_name") || "",
  selectedDate: formatDate(new Date()),
  timerSeconds: 0,
  timerRunning: false,
  timerHandle: null,
  focusBlockStartAt: "",
  focusSessionStartAt: "",
  focusElapsedMs: 0,
  focusDisplayMode: localStorage.getItem("focus_display_mode") || "elapsed",
  focusContent: localStorage.getItem("focus_content") || "",
  focusMode: "countup",
  focusTargetMinutes: 25,
  focusPanelHandle: null,
  focusDialDrag: false,
  pomodoroPhase: "idle", // idle | work | shortBreak | longBreak | awaitingChoice
  pomodoroWorkCount: 0,
  pomodoroWorkMinutes: 25,
  focusBlocks: loadFocusBlocks(),
  timelineBlockEdits: loadTimelineBlockEdits(),
  editingTimelineBlock: null,
  focusBubbleDrag: null,
  feedbackTimer: null,
  weeklyAvailability: Object.fromEntries(WEEK_KEYS.map((k) => [k, []])),
  availabilityChatMessages: [],
  availabilityChatSending: false,
  assistantMessages: loadAssistantMessages(),
  assistantChatSending: false,
  lastTap: { taskId: "", ts: 0 },
};

const ui = {
  pages: Array.from(document.querySelectorAll(".page")),
  navItems: Array.from(document.querySelectorAll(".nav-item[data-nav]")),
  timerDisplay: document.getElementById("timerDisplay"),
  timerToggleBtn: document.getElementById("timerToggleBtn"),
  timerResetBtn: document.getElementById("timerResetBtn"),
  homeAccountBtn: document.getElementById("homeAccountBtn"),
  taskForm: document.getElementById("taskForm"),
  taskCreateView: document.getElementById("taskCreateView"),
  taskListView: document.getElementById("taskListView"),
  openTaskCreateBtn: document.getElementById("openTaskCreateBtn"),
  backTaskListBtn: document.getElementById("backTaskListBtn"),
  titleInput: document.getElementById("titleInput"),
  deadlineInput: document.getElementById("deadlineInput"),
  subjectInput: document.getElementById("subjectInput"),
  taskTypeInput: document.getElementById("taskTypeInput"),
  difficultyInput: document.getElementById("difficultyInput"),
  estimateInput: document.getElementById("estimateInput"),
  generateBtn: document.getElementById("generateBtn"),
  generateSpinner: document.getElementById("generateSpinner"),
  planInfoBtn: document.getElementById("planInfoBtn"),
  timelineHeader: document.getElementById("timelineHeader"),
  timelineCanvas: document.getElementById("timelineCanvas"),
  planList: document.getElementById("planList"),
  feedbackBox: document.getElementById("feedbackBox"),
  availabilityForm: document.getElementById("availabilityForm"),
  availabilityEditor: document.getElementById("availabilityEditor"),
  settingsHome: document.getElementById("settingsHome"),
  availabilityModeSettings: document.getElementById("availabilityModeSettings"),
  availabilityAiSettings: document.getElementById("availabilityAiSettings"),
  availabilitySettings: document.getElementById("availabilitySettings"),
  openAvailabilityAiBtn: document.getElementById("openAvailabilityAiBtn"),
  openAvailabilityManualBtn: document.getElementById("openAvailabilityManualBtn"),
  backFromAvailabilityModeBtn: document.getElementById("backFromAvailabilityModeBtn"),
  backFromAvailabilityAiBtn: document.getElementById("backFromAvailabilityAiBtn"),
  availabilityChatMessages: document.getElementById("availabilityChatMessages"),
  availabilityChatForm: document.getElementById("availabilityChatForm"),
  availabilityChatInput: document.getElementById("availabilityChatInput"),
  availabilityChatSendBtn: document.getElementById("availabilityChatSendBtn"),
  focusPanel: document.querySelector(".focus-panel"),
  focusModeSwitch: document.getElementById("focusModeSwitch"),
  focusModeIndicator: document.querySelector("#focusModeSwitch .mode-switch-indicator"),
  focusModeBtns: Array.from(document.querySelectorAll("#focusModeSwitch .mode-switch-btn")),
  focusGoalInput: document.getElementById("focusGoalInput"),
  focusDial: document.getElementById("focusDial"),
  focusDialSvg: document.querySelector("#focusDial .focus-dial-svg"),
  focusDialTicks: document.querySelector("#focusDial .focus-dial-ticks"),
  focusDialSector: document.querySelector("#focusDial .focus-dial-sector"),
  focusDialHand: document.querySelector("#focusDial .focus-dial-hand"),
  focusReadout: document.getElementById("focusReadout"),
  focusEndHint: document.getElementById("focusEndHint"),
  focusPomodoroStatus: document.getElementById("focusPomodoroStatus"),
  focusStartBtn: document.getElementById("focusStartBtn"),
  focusRunningControls: document.getElementById("focusRunningControls"),
  focusPauseResumeBtn: document.getElementById("focusPauseResumeBtn"),
  focusStopBtn: document.getElementById("focusStopBtn"),
  focusPomodoroChoice: document.getElementById("focusPomodoroChoice"),
  focusLongBreakBtn: document.getElementById("focusLongBreakBtn"),
  focusPomodoroStopBtn: document.getElementById("focusPomodoroStopBtn"),
  assistantChatMessages: document.getElementById("assistantChatMessages"),
  assistantChatForm: document.getElementById("assistantChatForm"),
  assistantChatInput: document.getElementById("assistantChatInput"),
  assistantChatSendBtn: document.getElementById("assistantChatSendBtn"),
  authGate: document.getElementById("authGate"),
  authLogo: document.getElementById("authLogo"),
  authActions: document.getElementById("authActions"),
  authNotice: document.getElementById("authNotice"),
  scrollHint: document.getElementById("scrollHint"),
  loginCards: Array.from(document.querySelectorAll(".login-card")),
  railActions: document.getElementById("railActions"),
  actionRail: document.getElementById("actionRail"),
  accountSettings: document.getElementById("accountSettings"),
  focusSettingsPage: document.getElementById("focusSettingsPage"),
  openAvailabilitySettingsBtn: document.getElementById("openAvailabilitySettingsBtn"),
  openAccountSettingsBtn: document.getElementById("openAccountSettingsBtn"),
  openFocusSettingsPageBtn: document.getElementById("openFocusSettingsPageBtn"),
  startFocusFromSettingsBtn: document.getElementById("startFocusFromSettingsBtn"),
  backSettingsBtn: document.getElementById("backSettingsBtn"),
  backAccountSettingsBtn: document.getElementById("backAccountSettingsBtn"),
  backFocusSettingsBtn: document.getElementById("backFocusSettingsBtn"),
  copyWeekdaysBtn: document.getElementById("copyWeekdaysBtn"),
  copyAllDaysBtn: document.getElementById("copyAllDaysBtn"),
  timeOptions: document.getElementById("timeOptions"),
  prevDayBtn: document.getElementById("prevDayBtn"),
  nextDayBtn: document.getElementById("nextDayBtn"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  weekStrip: document.getElementById("weekStrip"),
  planInfoModal: document.getElementById("planInfoModal"),
  closePlanInfoBtn: document.getElementById("closePlanInfoBtn"),
  planSummaryStrip: document.getElementById("planSummaryStrip"),
  planReasonText: document.getElementById("planReasonText"),
  planRiskList: document.getElementById("planRiskList"),
  planEstimateList: document.getElementById("planEstimateList"),
  planShortageSection: document.getElementById("planShortageSection"),
  planShortageSummary: document.getElementById("planShortageSummary"),
  planShortageTaskList: document.getElementById("planShortageTaskList"),
  timeShortageModal: document.getElementById("timeShortageModal"),
  timeShortageSummary: document.getElementById("timeShortageSummary"),
  timeShortageDetailBtn: document.getElementById("timeShortageDetailBtn"),
  closeTimeShortageBtn: document.getElementById("closeTimeShortageBtn"),
  focusOverlay: document.getElementById("focusOverlay"),
  focusMinimizeBtn: document.getElementById("focusMinimizeBtn"),
  focusSettingsBtn: document.getElementById("focusSettingsBtn"),
  focusClock: document.getElementById("focusClock"),
  focusContentBtn: document.getElementById("focusContentBtn"),
  focusPauseBtn: document.getElementById("focusPauseBtn"),
  focusEndBtn: document.getElementById("focusEndBtn"),
  focusBubble: document.getElementById("focusBubble"),
  focusSettingsModal: document.getElementById("focusSettingsModal"),
  closeFocusSettingsBtn: document.getElementById("closeFocusSettingsBtn"),
  focusContentModal: document.getElementById("focusContentModal"),
  closeFocusContentBtn: document.getElementById("closeFocusContentBtn"),
  focusContentInput: document.getElementById("focusContentInput"),
  saveFocusContentBtn: document.getElementById("saveFocusContentBtn"),
  focusDisplayModeInputs: Array.from(document.querySelectorAll("input[name='focusDisplayMode']")),
  timelineEditModal: document.getElementById("timelineEditModal"),
  closeTimelineEditBtn: document.getElementById("closeTimelineEditBtn"),
  timelineEditTitleInput: document.getElementById("timelineEditTitleInput"),
  timelineEditStartInput: document.getElementById("timelineEditStartInput"),
  timelineEditEndInput: document.getElementById("timelineEditEndInput"),
  timelineEditDescriptionInput: document.getElementById("timelineEditDescriptionInput"),
  deleteTimelineBlockBtn: document.getElementById("deleteTimelineBlockBtn"),
  saveTimelineBlockBtn: document.getElementById("saveTimelineBlockBtn"),
  taskEditModal: document.getElementById("taskEditModal"),
  closeTaskEditBtn: document.getElementById("closeTaskEditBtn"),
  editTitleInput: document.getElementById("editTitleInput"),
  editDeadlineInput: document.getElementById("editDeadlineInput"),
  editSubjectInput: document.getElementById("editSubjectInput"),
  editTaskTypeInput: document.getElementById("editTaskTypeInput"),
  editDifficultyInput: document.getElementById("editDifficultyInput"),
  editEstimateInput: document.getElementById("editEstimateInput"),
  deleteTaskBtn: document.getElementById("deleteTaskBtn"),
  saveTaskEditBtn: document.getElementById("saveTaskEditBtn"),
  authForm: document.getElementById("authForm"),
  accountProfileView: document.getElementById("accountProfileView"),
  accountDisplayName: document.getElementById("accountDisplayName"),
  accountUsernameText: document.getElementById("accountUsernameText"),
  profileNameInput: document.getElementById("profileNameInput"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  profileLogoutBtn: document.getElementById("profileLogoutBtn"),
  authUsername: document.getElementById("authUsername"),
  authPassword: document.getElementById("authPassword"),
  registerBtn: document.getElementById("registerBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  authStatus: document.getElementById("authStatus"),
};

setupAuthGate();
ui.navItems.forEach((item) => item.addEventListener("click", () => switchPage(item.dataset.nav)));
ui.assistantChatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendAssistantMessage();
});
let assistantChatComposing = false;
ui.assistantChatInput.addEventListener("compositionstart", () => {
  assistantChatComposing = true;
});
ui.assistantChatInput.addEventListener("compositionend", () => {
  assistantChatComposing = false;
});
ui.assistantChatInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) return;
  // Don't send while an IME is composing (e.g. pressing Enter to commit pinyin
  // or to keep raw letters). isComposing / keyCode 229 cover the composing Enter;
  // the flag guards browsers that fire keydown right after compositionend.
  if (event.isComposing || event.keyCode === 229 || assistantChatComposing) return;
  event.preventDefault();
  sendAssistantMessage();
});
ui.openTaskCreateBtn.addEventListener("click", () => showTaskCreateView());
ui.backTaskListBtn.addEventListener("click", () => showTaskListView());
if (ui.homeAccountBtn) {
  ui.homeAccountBtn.addEventListener("click", () => {
    switchPage("settings");
    showAccountSettings();
  });
}
ui.openAvailabilitySettingsBtn.addEventListener("click", () => showAvailabilityModeSettings());
ui.openAvailabilityAiBtn.addEventListener("click", () => showAvailabilityAiSettings());
ui.openAvailabilityManualBtn.addEventListener("click", () => showAvailabilityManualSettings());
ui.backFromAvailabilityModeBtn.addEventListener("click", () => showSettingsHome());
ui.backFromAvailabilityAiBtn.addEventListener("click", () => showAvailabilityModeSettings());
ui.backSettingsBtn.addEventListener("click", () => showAvailabilityModeSettings());
ui.availabilityChatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendAvailabilityChatMessage();
});
ui.openAccountSettingsBtn.addEventListener("click", () => showAccountSettings());
ui.openFocusSettingsPageBtn.addEventListener("click", () => showFocusSettingsPage());
if (ui.startFocusFromSettingsBtn) {
  ui.startFocusFromSettingsBtn.addEventListener("click", () => openFocusOverlay(true));
}
ui.backAccountSettingsBtn.addEventListener("click", () => showSettingsHome());
ui.backFocusSettingsBtn.addEventListener("click", () => showSettingsHome());
ui.prevDayBtn.addEventListener("click", () => changeSelectedDate(-1));
ui.nextDayBtn.addEventListener("click", () => changeSelectedDate(1));
ui.weekStrip.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-date]");
  if (!btn) return;
  state.selectedDate = btn.dataset.date;
  await refreshSelectedDatePlan();
  renderDateSwitcher();
  renderTimeline();
});

ui.planInfoBtn.addEventListener("click", () => openPlanInfoModal());
ui.closePlanInfoBtn.addEventListener("click", () => {
  if (activeRailAction) closeRailSurface();
  else closePlanInfoModal();
});
ui.planInfoModal.addEventListener("click", (e) => {
  if (e.target !== ui.planInfoModal) return;
  if (activeRailAction) closeRailSurface();
  else closePlanInfoModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && activeRailAction) closeRailSurface();
});
ui.closeTimeShortageBtn.addEventListener("click", () => closeTimeShortageModal());
ui.timeShortageDetailBtn.addEventListener("click", () => {
  closeTimeShortageModal();
  openPlanInfoModal();
});
ui.timeShortageModal.addEventListener("click", (event) => {
  if (event.target === ui.timeShortageModal) closeTimeShortageModal();
});

ui.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await login();
});
ui.registerBtn.addEventListener("click", async () => {
  await register();
});
ui.logoutBtn.addEventListener("click", async () => {
  await logout();
});

if (ui.timerToggleBtn) {
  ui.timerToggleBtn.addEventListener("click", () => openFocusOverlay(true));
}
if (ui.timerResetBtn) {
  ui.timerResetBtn.addEventListener("click", () => {
    if (state.timerHandle) clearInterval(state.timerHandle);
    state.timerHandle = null;
    state.timerRunning = false;
    state.timerSeconds = 0;
    state.focusElapsedMs = 0;
    state.focusBlockStartAt = "";
    state.focusSessionStartAt = "";
    if (ui.timerToggleBtn) ui.timerToggleBtn.textContent = "开始";
    renderTimer();
    renderFocusClock();
  });
}

ui.focusMinimizeBtn.addEventListener("click", () => minimizeFocusOverlay());
ui.focusSettingsBtn.addEventListener("click", () => openFocusSettings());
ui.closeFocusSettingsBtn.addEventListener("click", () => closeFocusSettings());
ui.focusSettingsModal.addEventListener("click", (event) => {
  if (event.target === ui.focusSettingsModal) closeFocusSettings();
});
ui.focusDisplayModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    state.focusDisplayMode = input.value;
    localStorage.setItem("focus_display_mode", state.focusDisplayMode);
    renderFocusClock();
  });
});
ui.focusContentBtn.addEventListener("click", () => editFocusContent());
ui.closeFocusContentBtn.addEventListener("click", () => closeFocusContentModal());
ui.saveFocusContentBtn.addEventListener("click", () => saveFocusContentFromModal());
ui.focusContentModal.addEventListener("click", (event) => {
  if (event.target === ui.focusContentModal) closeFocusContentModal();
});
ui.focusPauseBtn.addEventListener("click", () => toggleFocusPause());
ui.focusEndBtn.addEventListener("click", () => endFocusSession());
ui.focusBubble.addEventListener("pointerdown", startFocusBubbleDrag);
ui.focusBubble.addEventListener("pointermove", moveFocusBubble);
ui.focusBubble.addEventListener("pointerup", endFocusBubbleDrag);
ui.focusBubble.addEventListener("pointercancel", endFocusBubbleDrag);
ui.closeTimelineEditBtn.addEventListener("click", () => closeTimelineBlockEditor());
ui.timelineEditModal.addEventListener("click", (event) => {
  if (event.target === ui.timelineEditModal) closeTimelineBlockEditor();
});
ui.saveTimelineBlockBtn.addEventListener("click", () => saveTimelineBlockEdit());
ui.deleteTimelineBlockBtn.addEventListener("click", () => deleteTimelineBlockEdit());
ui.saveProfileBtn.addEventListener("click", () => saveProfileSettings());
ui.profileLogoutBtn.addEventListener("click", async () => logout());
ui.closeTaskEditBtn.addEventListener("click", () => closeTaskEditor());
ui.taskEditModal.addEventListener("click", (event) => {
  if (event.target === ui.taskEditModal) closeTaskEditor();
});
ui.saveTaskEditBtn.addEventListener("click", () => saveTaskEdit());
ui.deleteTaskBtn.addEventListener("click", () => deleteTaskFromEditor());

ui.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!hasIdentity()) return setFeedback("初始化中，请稍候重试", true);
  const title = ui.titleInput.value.trim();
  const deadline = ui.deadlineInput.value;
  const subject = ui.subjectInput.value;
  const taskType = ui.taskTypeInput.value;
  const difficulty = ui.difficultyInput.value;
  const estimateRaw = ui.estimateInput.value.trim();
  if (!title || !deadline || !subject || !taskType || !difficulty) {
    return setFeedback("请填写任务名称、截止日期、学科、任务类型和难度。", true);
  }

  try {
    await api("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title,
        deadline,
        subject,
        taskType,
        difficulty,
        estimatedMinutes: estimateRaw ? Number.parseInt(estimateRaw, 10) : null,
      }),
    });
    ui.taskForm.reset();
    ui.subjectInput.value = "math";
    ui.taskTypeInput.value = "test_paper";
    ui.difficultyInput.value = "medium";
    await refreshState();
    await refreshSelectedDatePlan();
    renderTimeline();
    renderPlanList();
    showTaskListView();
    markPlanStale();
    setFeedback("任务已添加。");
  } catch (error) {
    setFeedback(`添加任务失败：${error.message}`, true);
  }
});

ui.availabilityEditor.addEventListener("click", (event) => {
  const addBtn = event.target.closest("[data-add-day]");
  if (addBtn) return addAvailabilitySlot(addBtn.dataset.addDay);
  const removeBtn = event.target.closest("[data-remove-day]");
  if (removeBtn) removeAvailabilitySlot(removeBtn.dataset.removeDay, Number.parseInt(removeBtn.dataset.removeIndex, 10));
});

ui.copyWeekdaysBtn.addEventListener("click", () => {
  const source = cloneDayRanges("mon");
  ["tue", "wed", "thu", "fri"].forEach((day) => {
    state.weeklyAvailability[day] = source.map((r) => ({ ...r }));
  });
  renderAvailabilityEditor();
  setFeedback("已复制到周二到周五。");
});
ui.copyAllDaysBtn.addEventListener("click", () => {
  const source = cloneDayRanges("mon");
  WEEK_KEYS.forEach((day) => {
    state.weeklyAvailability[day] = source.map((r) => ({ ...r }));
  });
  renderAvailabilityEditor();
  setFeedback("已复制到全周。");
});

ui.availabilityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!hasIdentity()) return setFeedback("初始化中，请稍候重试", true);
  try {
    const payload = collectAvailabilityPayload();
    const result = await api("/settings/availability", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.weeklyAvailability = result.weeklyAvailability;
    renderAvailabilityEditor();
    setFeedback("空闲时间段已保存。");
  } catch (error) {
    setFeedback(`保存失败：${error.message}`, true);
  }
});

ui.generateBtn.addEventListener("click", async () => {
  await generatePlanForToday();
});

ui.timelineCanvas.addEventListener("click", async (event) => {
  const block = event.target.closest(".timeline-block");
  if (!block) return;
  openTimelineBlockEditor(block);
});

ui.planList.addEventListener("click", async (event) => {
  if (!hasIdentity()) return;
  const menu = event.target.closest("[data-task-menu]");
  if (menu) {
    openTaskEditor(menu.dataset.taskMenu);
    return;
  }
  const check = event.target.closest(".task-check");
  if (!check) return;
  const taskId = check.dataset.taskId;
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  try {
    await markTaskDone(taskId, task.status !== "done");
    await refreshState();
    await refreshSelectedDatePlan();
    renderTimeline();
    renderPlanList();
    markPlanStale();
  } catch (error) {
    setFeedback(`更新任务状态失败：${error.message}`, true);
  }
});

function renderAuthStatus() {
  ui.authStatus.textContent = state.currentUser ? `当前账号：${state.currentUser}` : "未登录";
  ui.authForm.hidden = !!state.currentUser;
  ui.accountProfileView.hidden = !state.currentUser;
  ui.accountDisplayName.textContent = state.profileName || state.currentUser || "未登录";
  ui.accountUsernameText.textContent = state.currentUser ? `用户名：${state.currentUser}` : "--";
  ui.profileNameInput.value = state.profileName;
  const disabled = !hasIdentity();
  [ui.taskForm, ui.generateBtn, ui.availabilityForm, ui.planInfoBtn].forEach((el) => {
    if (!el) return;
    if (el.tagName === "FORM") {
      Array.from(el.querySelectorAll("input,button,select,textarea")).forEach((n) => {
        if (n.id === "registerBtn" || n.id === "logoutBtn" || n.id === "loginBtn") return;
        n.disabled = disabled;
      });
      return;
    }
    el.disabled = disabled;
  });
  ui.logoutBtn.disabled = !state.currentUser;
}

function saveProfileSettings() {
  state.profileName = ui.profileNameInput.value.trim();
  localStorage.setItem("profile_name", state.profileName);
  renderAuthStatus();
  setFeedback("账号资料已保存。");
}

function clearAppData() {
  state.tasks = [];
  state.todayPlan = null;
  state.selectedPlan = null;
  state.checkins = [];
  state.planner = "none";
  state.weeklyAvailability = Object.fromEntries(WEEK_KEYS.map((k) => [k, []]));
  renderAvailabilityEditor();
  renderTimeline();
  renderPlanList();
}

async function loadIdentityData() {
  if (!hasIdentity()) return;
  await refreshAvailability();
  await refreshState();
  await refreshSelectedDatePlan();
}

async function tryRestoreSession() {
  if (!state.authToken) {
    renderAuthStatus();
    try {
      await loadIdentityData();
    } catch {
      // guest data load failed (e.g. backend offline); keep defaults
    }
    return;
  }
  try {
    const me = await api("/auth/me");
    state.currentUser = me.user?.username || "";
    await loadIdentityData();
  } catch {
    state.authToken = "";
    state.currentUser = "";
    localStorage.removeItem("auth_token");
    clearAppData();
    try {
      await loadIdentityData();
    } catch {
      // ignore guest fallback load error
    }
  }
  renderAuthStatus();
}

async function register() {
  const username = ui.authUsername.value.trim();
  const password = ui.authPassword.value;
  if (!username || !password) return setFeedback("请输入用户名和密码", true);
  try {
    const result = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      authOptional: true,
    });
    state.authToken = result.token || "";
    state.currentUser = result.user?.username || username;
    localStorage.setItem("auth_token", state.authToken);
    await refreshAvailability();
    await refreshState();
    await refreshSelectedDatePlan();
    renderDateSwitcher();
    renderTimeline();
    renderPlanList();
    renderAuthStatus();
    setFeedback(`注册并登录成功：${state.currentUser}`);
  } catch (error) {
    setFeedback(`注册失败：${error.message}`, true);
  }
}

async function login() {
  const username = ui.authUsername.value.trim();
  const password = ui.authPassword.value;
  if (!username || !password) return setFeedback("请输入用户名和密码", true);
  try {
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      authOptional: true,
    });
    state.authToken = result.token || "";
    state.currentUser = result.user?.username || username;
    localStorage.setItem("auth_token", state.authToken);
    await refreshAvailability();
    await refreshState();
    await refreshSelectedDatePlan();
    renderDateSwitcher();
    renderTimeline();
    renderPlanList();
    renderAuthStatus();
    setFeedback(`登录成功：${state.currentUser}`);
  } catch (error) {
    setFeedback(`登录失败：${error.message}`, true);
  }
}

async function logout() {
  try {
    if (state.authToken) {
      await api("/auth/logout", { method: "POST" });
    }
  } catch {
    // ignore
  }
  state.authToken = "";
  state.currentUser = "";
  localStorage.removeItem("auth_token");
  clearAppData();
  renderAuthStatus();
  resetAssistantConversation();
  showAuthGate("已退出登录，请重新登录。");
}

async function bootstrap() {
  buildTimeOptions();
  renderAvailabilityEditor();
  renderTimer();
  renderFocusClock();
  renderFocusContent();
  syncFocusSettingsInputs();
  initFocusPanel();
  renderAssistantChat();
  switchPage("chat");
  await tryRestoreSession();
  renderDateSwitcher();
  renderTimeline();
  renderPlanList();
  if (state.currentUser) {
    hideAuthGate();
    setFeedback(`已登录：${state.currentUser}`);
  } else {
    showAuthGate();
  }
}

async function changeSelectedDate(deltaDays) {
  if (!hasIdentity()) return;
  state.selectedDate = shiftDate(state.selectedDate, deltaDays);
  await refreshSelectedDatePlan();
  renderDateSwitcher();
  renderTimeline();
}

async function generatePlanForToday() {
  if (!hasIdentity()) return setFeedback("初始化中，请稍候重试", true);
  if (ui.generateBtn.disabled) return;
  setGenerateLoading(true);
  try {
    const result = await api("/plans/today", { method: "POST" });
    await refreshState();
    state.selectedDate = result.plan?.date || formatDate(new Date());
    await refreshSelectedDatePlan();
    renderDateSwitcher();
    renderTimeline();
    clearPlanStale();
    const note = result.plan?.note ? ` ${result.plan.note}` : "";
    setFeedback(`计划已生成（${state.selectedDate}）。${note}`);
    // Remember whether this plan had unfittable tasks so the rail icon can show
    // brain-doubt after generation (set before setGenerateLoading(false) runs).
    state.planShortage = !!result.plan?.details?.timeShortage?.hasShortage;
    showTimeShortageModal(result.plan);
  } catch (error) {
    setFeedback(`生成计划失败：${error.message}`, true);
  } finally {
    setGenerateLoading(false);
  }
}

async function completeTaskFromBlock(taskId) {
  if (!taskId) return;
  try {
    await markTaskDone(taskId, true);
    await refreshState();
    await refreshSelectedDatePlan();
    renderTimeline();
    renderPlanList();
    setFeedback("任务已完成，已从时间轴移除。");
  } catch (error) {
    setFeedback(`标记完成失败：${error.message}`, true);
  }
}

function formatDurationMinutes(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours > 0 && mins > 0) return `${hours} 小时 ${mins} 分钟`;
  if (hours > 0) return `${hours} 小时`;
  return `${mins} 分钟`;
}

function buildTimeShortageSummary(shortage) {
  if (!shortage?.hasShortage) return "";
  const parts = [
    `即使排满所有空闲时段，仍无法在截止日期前完成全部任务。`,
    `共需 ${formatDurationMinutes(shortage.totalNeededMinutes)}，可用 ${formatDurationMinutes(shortage.totalAvailableMinutes)}，`,
    `缺少 ${formatDurationMinutes(shortage.shortageMinutes)}。`,
  ];
  const affected = shortage.affectedTasks || [];
  if (affected.length > 0) {
    parts.push(`涉及 ${affected.length} 个任务未能完全排入。`);
  }
  return parts.join("");
}

function renderTimeShortageDetails(shortage, summaryEl, listEl, sectionEl) {
  if (!shortage?.hasShortage) {
    if (sectionEl) sectionEl.hidden = true;
    return;
  }
  if (sectionEl) sectionEl.hidden = false;
  if (summaryEl) summaryEl.textContent = buildTimeShortageSummary(shortage);
  if (!listEl) return;
  listEl.innerHTML = "";
  (shortage.affectedTasks || []).forEach((task) => {
    const li = document.createElement("li");
    li.textContent = `${task.title}（DDL ${task.deadline}）：还需 ${formatDurationMinutes(task.shortageMinutes)}（已排 ${formatDurationMinutes(task.scheduledMinutes)} / 需 ${formatDurationMinutes(task.estimatedMinutes)}）`;
    listEl.appendChild(li);
  });
  if ((shortage.affectedTasks || []).length === 0) {
    const li = document.createElement("li");
    li.textContent = "总空闲时间不足，建议减少任务量或增加空闲时段。";
    listEl.appendChild(li);
  }
}

function showTimeShortageModal(plan) {
  const shortage = plan?.details?.timeShortage;
  if (!shortage?.hasShortage) return;
  ui.timeShortageSummary.textContent = buildTimeShortageSummary(shortage);
  ui.timeShortageModal.classList.remove("hidden");
}

function closeTimeShortageModal() {
  ui.timeShortageModal.classList.add("hidden");
}

function openPlanInfoModal() {
  const plan = state.selectedPlan || state.todayPlan;
  if (!plan || !plan.details) {
    setFeedback("当前日期暂无计划详情。", true);
    return;
  }
  if (ui.planSummaryStrip) {
    const blocks = plan.scheduledBlocks || [];
    const activeBlocks = blocks.filter((block) => {
      const task = state.tasks.find((t) => t.id === block.taskId);
      return !task || task.status !== "done";
    });
    const totalMinutes = activeBlocks.reduce(
      (sum, block) => sum + Math.max(0, (block.endMinute || 0) - (block.startMinute || 0)),
      0,
    );
    const dateLabel = plan.date || state.selectedDate;
    ui.planSummaryStrip.innerHTML = "";
    const dateChip = document.createElement("span");
    dateChip.className = "plan-summary-date";
    dateChip.textContent = dateLabel;
    const statChip = document.createElement("span");
    statChip.className = "plan-summary-stat";
    statChip.textContent = `${activeBlocks.length} 个任务 · 共 ${formatDurationMinutes(totalMinutes)}`;
    ui.planSummaryStrip.appendChild(dateChip);
    ui.planSummaryStrip.appendChild(statChip);
  }

  renderTimeShortageDetails(
    plan.details.timeShortage,
    ui.planShortageSummary,
    ui.planShortageTaskList,
    ui.planShortageSection,
  );
  ui.planReasonText.textContent = plan.details.rationale || "暂无";
  ui.planRiskList.innerHTML = "";
  (plan.details.risks || []).forEach((risk) => {
    const li = document.createElement("li");
    li.textContent = risk;
    ui.planRiskList.appendChild(li);
  });
  if ((plan.details.risks || []).length === 0) {
    const li = document.createElement("li");
    li.textContent = "暂无明显风险";
    ui.planRiskList.appendChild(li);
  }

  ui.planEstimateList.innerHTML = "";
  (plan.details.taskEstimates || []).forEach((item) => {
    const li = document.createElement("li");
    li.className = "estimate-row";
    const head = document.createElement("div");
    head.className = "estimate-head";
    const title = document.createElement("span");
    title.className = "estimate-title";
    title.textContent = item.title;
    const badge = document.createElement("span");
    badge.className = "estimate-badge";
    badge.textContent = `${item.estimatedMinutes} 分钟`;
    head.appendChild(title);
    head.appendChild(badge);
    li.appendChild(head);
    if (item.reason) {
      const reason = document.createElement("p");
      reason.className = "estimate-reason";
      reason.textContent = item.reason;
      li.appendChild(reason);
    }
    ui.planEstimateList.appendChild(li);
  });
  if ((plan.details.taskEstimates || []).length === 0) {
    const li = document.createElement("li");
    li.className = "estimate-empty";
    li.textContent = "暂无任务估时详情";
    ui.planEstimateList.appendChild(li);
  }
  ui.planInfoModal.classList.remove("hidden");
}

function closePlanInfoModal() {
  ui.planInfoModal.classList.add("hidden");
}

function switchPage(pageName) {
  state.activePage = pageName;
  ui.pages.forEach((page) => page.classList.toggle("page-active", page.dataset.page === pageName));
  ui.navItems.forEach((item) => item.classList.toggle("nav-active", item.dataset.nav === pageName));
  if (pageName === "settings") showSettingsHome();
  if (pageName === "plan") showTaskListView();
  renderRailActions(pageName);
  renderActionRail(pageName);
}

// Right-side floating rail for page content actions. Each button proxies to the
// existing in-page control (so behavior stays identical) and shows its name on
// hover. Icons stack vertically and are separate from the left navigation rail.
const PENCIL_ICON =
  '<img src="/assets/icons/add.png" class="ui-icon" alt="">';

const ACTION_RAIL = {
  timeline: [
    { icon: '<img src="/assets/icons/brain.png" class="ui-icon" alt="">', label: "生成计划", target: "generateBtn" },
    {
      icon: '<img src="/assets/icons/info.png" class="ui-icon" alt="">',
      label: "计划详情",
      surface: "planInfoModal",
      panelSelector: ".modal-panel",
      open: () => openPlanInfoModal(),
      close: () => closePlanInfoModal(),
    },
  ],
  plan: [
    {
      icon: PENCIL_ICON,
      label: "创建新任务",
      surface: "taskCreateView",
      open: () => showTaskCreateView(),
      close: () => showTaskListView(),
    },
  ],
};

// Tracks the currently open rail surface so close triggers (✕ button, scrim,
// Esc) can play the collapse animation and reset the button morph. Null on
// mobile (there is no action rail there).
let activeRailBtn = null;
let activeRailAction = null;

function setRevealOrigin(panel, btn) {
  const b = btn.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  panel.style.transformOrigin = `${b.left + b.width / 2 - p.left}px ${b.top + b.height / 2 - p.top}px`;
}

function getRailPanel(action) {
  const surface = document.getElementById(action.surface);
  if (!surface) return null;
  return action.panelSelector ? surface.querySelector(action.panelSelector) : surface;
}

function openRailSurface(btn, action) {
  action.open();
  const panel = getRailPanel(action);
  if (panel) {
    setRevealOrigin(panel, btn);
    // Force reflow so the animation restarts even if the class lingered.
    void panel.offsetWidth;
    panel.classList.add("surface-reveal");
    panel.addEventListener(
      "animationend",
      () => panel.classList.remove("surface-reveal"),
      { once: true },
    );
  }
  btn.classList.add("is-open");
  btn.title = "关闭";
  btn.setAttribute("aria-label", "关闭");
  activeRailBtn = btn;
  activeRailAction = action;
}

function closeRailSurface() {
  if (!activeRailAction) return;
  const action = activeRailAction;
  const btn = activeRailBtn;
  const panel = getRailPanel(action);
  const finish = () => {
    if (panel) panel.classList.remove("surface-collapse");
    action.close();
  };
  if (panel) {
    panel.classList.add("surface-collapse");
    let done = false;
    const onEnd = () => {
      if (done) return;
      done = true;
      finish();
    };
    panel.addEventListener("animationend", onEnd, { once: true });
    setTimeout(onEnd, 400);
  } else {
    finish();
  }
  if (btn) {
    btn.classList.remove("is-open");
    btn.title = action.label;
    btn.setAttribute("aria-label", action.label);
  }
  activeRailBtn = null;
  activeRailAction = null;
}

function renderActionRail(pageName) {
  activeRailBtn = null;
  activeRailAction = null;
  if (!ui.actionRail) return;
  ui.actionRail.innerHTML = "";
  const actions = ACTION_RAIL[pageName] || [];
  actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "action-rail-btn";
    btn.title = action.label;
    btn.setAttribute("aria-label", action.label);
    btn.innerHTML = `<span class="action-rail-icon">${action.icon}</span><span class="action-rail-close" aria-hidden="true">✕</span><span class="action-rail-tip">${action.label}</span>`;
    if (action.railId === "generate" || action.target === "generateBtn") {
      btn.dataset.railAction = "generate";
    }
    btn.addEventListener("click", () => {
      if (typeof action.run === "function") {
        action.run();
        return;
      }
      if (!action.surface) {
        const target = document.getElementById(action.target);
        if (target) target.click();
        return;
      }
      if (btn.classList.contains("is-open")) {
        closeRailSurface();
      } else {
        openRailSurface(btn, action);
      }
    });
    ui.actionRail.appendChild(btn);
  });
  updateGenerateRailIcon();
}

// The "生成计划" rail button has three faces:
//   default  → brain.png
//   loading  → brain-lightning.png (with the spinning ring from .is-loading)
//   conflict → brain-doubt.png (last plan couldn't fit every task before its DDL)
let generatePlanLoading = false;

function updateGenerateRailIcon() {
  const railBtn = document.querySelector('#actionRail .action-rail-btn[data-rail-action="generate"]');
  if (!railBtn) return;
  const img = railBtn.querySelector(".action-rail-icon img");
  if (!img) return;
  let name = "brain";
  if (generatePlanLoading) name = "brain-lightning";
  else if (state.planShortage) name = "brain-doubt";
  img.src = `/assets/icons/${name}.png`;
}

// Desktop rail: only interface-level actions (e.g. logout) live here, shown
// contextually so the rail isn't permanently cluttered. Content actions such as
// "生成计划" stay as in-page buttons where users expect to find them.
const RAIL_ACTIONS = {
  settings: [{ icon: "🚪", label: "退出登录", danger: true, run: () => logout() }],
};

function renderRailActions(pageName) {
  if (!ui.railActions) return;
  ui.railActions.innerHTML = "";
  const actions = RAIL_ACTIONS[pageName] || [];
  actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `nav-item rail-action${action.danger ? " rail-danger" : ""}`;
    btn.innerHTML = `<span>${action.icon}</span><em>${action.label}</em>`;
    btn.addEventListener("click", () => {
      if (typeof action.run === "function") {
        action.run();
      } else if (action.target) {
        const target = document.getElementById(action.target);
        if (target) target.click();
      }
    });
    ui.railActions.appendChild(btn);
  });
}

function markPlanStale() {
  state.planStale = true;
  localStorage.setItem("plan_stale", "1");
  renderTimeline();
}

function clearPlanStale() {
  state.planStale = false;
  localStorage.removeItem("plan_stale");
  renderTimeline();
}

function showTaskCreateView() {
  ui.taskCreateView.hidden = false;
  ui.taskListView.hidden = true;
  ui.openTaskCreateBtn.hidden = true;
}

function showTaskListView() {
  ui.taskCreateView.hidden = true;
  ui.taskListView.hidden = false;
  ui.openTaskCreateBtn.hidden = false;
}

function hideAllSettingsViews() {
  ui.settingsHome.hidden = true;
  ui.availabilityModeSettings.hidden = true;
  ui.availabilityAiSettings.hidden = true;
  ui.availabilitySettings.hidden = true;
  ui.accountSettings.hidden = true;
  ui.focusSettingsPage.hidden = true;
}

function showSettingsHome() {
  hideAllSettingsViews();
  ui.settingsHome.hidden = false;
}

function showAvailabilityModeSettings() {
  hideAllSettingsViews();
  ui.availabilityModeSettings.hidden = false;
}

function showAvailabilityAiSettings() {
  if (!hasIdentity()) return setFeedback("初始化中，请稍候重试", true);
  hideAllSettingsViews();
  ui.availabilityAiSettings.hidden = false;
  if (state.availabilityChatMessages.length === 0) {
    state.availabilityChatMessages = [
      {
        role: "assistant",
        content: "你好，请用自然语言告诉我你每周什么时候有空。例如：「周一到周五晚上 7 点到 9 点，周末下午 2 点到 5 点。」",
      },
    ];
  }
  renderAvailabilityChat();
  ui.availabilityChatInput.focus();
}

function showAvailabilityManualSettings() {
  hideAllSettingsViews();
  ui.availabilitySettings.hidden = false;
  renderAvailabilityEditor();
}

function showAccountSettings() {
  hideAllSettingsViews();
  ui.accountSettings.hidden = false;
}

function showFocusSettingsPage() {
  hideAllSettingsViews();
  ui.focusSettingsPage.hidden = false;
  syncFocusSettingsInputs();
}

function renderAvailabilityChat() {
  ui.availabilityChatMessages.innerHTML = "";
  state.availabilityChatMessages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${msg.role === "user" ? "user" : "assistant"}`;
    bubble.textContent = msg.content;
    ui.availabilityChatMessages.appendChild(bubble);
  });
  if (state.availabilityChatSending) {
    const pending = document.createElement("div");
    pending.className = "chat-bubble assistant pending";
    pending.textContent = "正在解析…";
    ui.availabilityChatMessages.appendChild(pending);
  }
  ui.availabilityChatMessages.scrollTop = ui.availabilityChatMessages.scrollHeight;
}

function summarizeAvailabilityForChat(availability) {
  const lines = WEEK_KEYS.map((day) => {
    const slots = availability?.[day] || [];
    if (!slots.length) return `${WEEK_LABELS[day]}：无`;
    const slotText = slots.map((slot) => `${slot.start}-${slot.end}`).join("、");
    return `${WEEK_LABELS[day]}：${slotText}`;
  });
  return lines.join("\n");
}

async function sendAvailabilityChatMessage() {
  if (!hasIdentity()) return setFeedback("初始化中，请稍候重试", true);
  if (state.availabilityChatSending) return;
  const message = ui.availabilityChatInput.value.trim();
  if (!message) return;
  state.availabilityChatMessages.push({ role: "user", content: message });
  ui.availabilityChatInput.value = "";
  state.availabilityChatSending = true;
  ui.availabilityChatSendBtn.disabled = true;
  renderAvailabilityChat();
  try {
    const history = state.availabilityChatMessages.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    const result = await api("/settings/availability/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
    let reply = result.reply || "已处理你的描述。";
    if (result.applied && result.weeklyAvailability) {
      state.weeklyAvailability = result.weeklyAvailability;
      reply = `${reply}\n\n已保存为：\n${summarizeAvailabilityForChat(result.weeklyAvailability)}`;
    } else if (result.has_time_info === false) {
      reply = result.reply || "请具体描述你的空闲时间，例如：工作日晚上 7 点到 9 点有空。";
    }
    state.availabilityChatMessages.push({ role: "assistant", content: reply });
  } catch (error) {
    state.availabilityChatMessages.push({
      role: "assistant",
      content: `解析失败：${error.message}`,
    });
  } finally {
    state.availabilityChatSending = false;
    ui.availabilityChatSendBtn.disabled = false;
    renderAvailabilityChat();
  }
}

function hasIdentity() {
  return !!state.currentUser;
}

let authScrollRaf = 0;

function setupAuthGate() {
  if (!ui.authGate) return;
  ui.loginCards.forEach((card) => {
    const face = card.querySelector(".login-card-face");
    const form = card.querySelector(".login-card-form");
    const backBtn = card.querySelector('[data-action="back"]');
    const registerBtn = card.querySelector('[data-action="register"]');
    if (face) face.addEventListener("click", () => openLoginCard(card));
    if (backBtn) backBtn.addEventListener("click", () => closeLoginCards());
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        gateAuth(card, "login");
      });
    }
    if (registerBtn) registerBtn.addEventListener("click", () => gateAuth(card, "register"));
  });
  ui.authGate.addEventListener("scroll", () => {
    if (authScrollRaf) return;
    authScrollRaf = requestAnimationFrame(() => {
      authScrollRaf = 0;
      updateAuthScroll();
    });
  });
  window.addEventListener("resize", updateAuthScroll);
}

function updateAuthScroll() {
  if (!ui.authGate || ui.authGate.classList.contains("hidden")) return;
  if (ui.authActions && ui.authActions.classList.contains("has-open")) return;
  const threshold = Math.max(window.innerHeight * 0.5, 1);
  const progress = Math.min(ui.authGate.scrollTop / threshold, 1);
  if (ui.authLogo) {
    ui.authLogo.style.transform = `scale(${1 - 0.28 * progress}) translateY(${-12 * progress}vh)`;
  }
  if (ui.authActions) {
    ui.authActions.style.opacity = String(progress);
    ui.authActions.style.transform = `translateY(${20 * (1 - progress)}px)`;
    ui.authActions.style.pointerEvents = progress > 0.55 ? "auto" : "none";
  }
  if (ui.scrollHint) ui.scrollHint.style.opacity = String(1 - progress);
}

function openLoginCard(card) {
  if (!ui.authActions) return;
  ui.authActions.classList.add("has-open");
  ui.loginCards.forEach((c) => {
    c.classList.toggle("open", c === card);
    c.classList.toggle("dimmed", c !== card);
  });
  const input = card.querySelector('[data-field="identifier"]');
  if (input) setTimeout(() => input.focus(), 200);
}

function closeLoginCards() {
  if (ui.authActions) ui.authActions.classList.remove("has-open");
  ui.loginCards.forEach((c) => {
    c.classList.remove("open", "dimmed");
    setCardStatus(c, "");
  });
  updateAuthScroll();
}

function setCardStatus(card, message, isError = true) {
  const el = card.querySelector('[data-role="status"]');
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "var(--danger)" : "#2c7a3f";
}

function setCardLoading(card, loading) {
  card.querySelectorAll("button").forEach((btn) => {
    btn.disabled = loading;
  });
}

function showAuthGate(message = "") {
  if (!ui.authGate) return;
  ui.authGate.classList.remove("hidden");
  closeLoginCards();
  ui.authGate.scrollTop = 0;
  if (ui.authNotice) ui.authNotice.textContent = message || "";
  updateAuthScroll();
}

function hideAuthGate() {
  if (!ui.authGate) return;
  ui.authGate.classList.add("hidden");
  if (ui.authNotice) ui.authNotice.textContent = "";
}

async function gateAuth(card, mode) {
  const idType = card.dataset.login;
  const identifier = (card.querySelector('[data-field="identifier"]').value || "").trim().toLowerCase();
  const password = card.querySelector('[data-field="password"]').value || "";
  const idOk = idType === "phone"
    ? /^1[3-9]\d{9}$/.test(identifier)
    : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier);
  if (!idOk) return setCardStatus(card, idType === "phone" ? "请输入有效的手机号" : "请输入有效的邮箱");
  if (password.length < 6) return setCardStatus(card, "密码至少 6 位");
  setCardLoading(card, true);
  setCardStatus(card, mode === "login" ? "登录中…" : "正在创建账号…", false);
  try {
    const result = await api(`/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
      authOptional: true,
    });
    state.authToken = result.token || "";
    state.currentUser = result.user?.username || identifier;
    localStorage.setItem("auth_token", state.authToken);
    if (mode === "register") resetAssistantConversation();
    await enterAppAfterAuth();
    setFeedback(mode === "login" ? `欢迎回来：${state.currentUser}` : `注册成功，欢迎加入：${state.currentUser}`);
  } catch (error) {
    setCardStatus(card, error.message || (mode === "login" ? "登录失败" : "注册失败"));
  } finally {
    setCardLoading(card, false);
  }
}

function resetAssistantConversation() {
  state.assistantMessages = [{ role: "assistant", content: ASSISTANT_INTRO }];
  saveAssistantMessages();
  renderAssistantChat();
}

async function enterAppAfterAuth() {
  hideAuthGate();
  switchPage("chat");
  await loadIdentityData();
  renderDateSwitcher();
  renderTimeline();
  renderPlanList();
  renderAuthStatus();
}

function loadAssistantMessages() {
  try {
    const raw = localStorage.getItem("assistant_messages");
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // fall through to intro
  }
  return [{ role: "assistant", content: ASSISTANT_INTRO }];
}

function saveAssistantMessages() {
  try {
    localStorage.setItem("assistant_messages", JSON.stringify(state.assistantMessages.slice(-40)));
  } catch {
    // ignore quota errors
  }
}

function renderAssistantChat() {
  if (!ui.assistantChatMessages) return;
  ui.assistantChatMessages.innerHTML = "";
  state.assistantMessages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${msg.role === "user" ? "user" : "assistant"}`;
    bubble.textContent = msg.content;
    ui.assistantChatMessages.appendChild(bubble);
  });
  if (state.assistantChatSending) {
    const pending = document.createElement("div");
    pending.className = "chat-bubble assistant pending";
    pending.textContent = "正在思考…";
    ui.assistantChatMessages.appendChild(pending);
  }
  ui.assistantChatMessages.scrollTop = ui.assistantChatMessages.scrollHeight;
}

async function applyAssistantStateChange(changed) {
  if (!changed || (!changed.tasks && !changed.availability && !changed.plan)) return;
  try {
    await refreshState();
    if (changed.availability) renderAvailabilityEditor();
    if (changed.plan) {
      await refreshSelectedDatePlan();
      clearPlanStale();
    } else if (changed.tasks) {
      markPlanStale();
    }
    renderDateSwitcher();
    renderTimeline();
    renderPlanList();
  } catch {
    // refresh failures shouldn't break the chat reply
  }
}

async function sendAssistantMessage() {
  if (state.assistantChatSending) return;
  const message = ui.assistantChatInput.value.trim();
  if (!message) return;
  state.assistantMessages.push({ role: "user", content: message });
  ui.assistantChatInput.value = "";
  state.assistantChatSending = true;
  ui.assistantChatSendBtn.disabled = true;
  renderAssistantChat();
  saveAssistantMessages();
  try {
    const history = state.assistantMessages
      .slice(0, -1)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
    const result = await api("/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
    const reply = (result.reply || "").trim() || "我已经处理好了。";
    state.assistantMessages.push({ role: "assistant", content: reply });
    await applyAssistantStateChange(result.stateChanged || {});
  } catch (error) {
    state.assistantMessages.push({ role: "assistant", content: `抱歉，出错了：${error.message}` });
  } finally {
    state.assistantChatSending = false;
    ui.assistantChatSendBtn.disabled = false;
    renderAssistantChat();
    saveAssistantMessages();
  }
}

function showSettingsAvailability() {
  showAvailabilityManualSettings();
}

function buildTimeOptions() {
  ui.timeOptions.innerHTML = "";
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 30) {
      const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const op = document.createElement("option");
      op.value = val;
      ui.timeOptions.appendChild(op);
    }
  }
}

function renderTimer() {
  if (!ui.timerDisplay) return;
  ui.timerDisplay.textContent = formatDuration(state.timerSeconds);
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(safeSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(safeSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatClock(date = new Date()) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function getFocusElapsedMs() {
  const liveMs = state.timerRunning && state.focusSessionStartAt
    ? Date.now() - new Date(state.focusSessionStartAt).getTime()
    : 0;
  return state.focusElapsedMs + liveMs;
}

function renderFocusClock() {
  const elapsedSeconds = Math.floor(getFocusElapsedMs() / 1000);
  state.timerSeconds = elapsedSeconds;
  renderTimer();
  ui.focusClock.textContent = state.focusDisplayMode === "clock" ? formatClock() : formatDuration(elapsedSeconds);
}

function renderFocusContent() {
  ui.focusContentBtn.textContent = state.focusContent.trim() || "未填写";
}

function ensureFocusTicker() {
  if (state.timerHandle) return;
  state.timerHandle = setInterval(() => {
    renderFocusClock();
  }, 500);
}

function stopFocusTickerIfIdle() {
  if (!state.timerHandle || state.timerRunning) return;
  if (state.focusDisplayMode === "clock" && !ui.focusOverlay.classList.contains("hidden")) return;
  clearInterval(state.timerHandle);
  state.timerHandle = null;
}

function openFocusOverlay(shouldStart) {
  ui.focusOverlay.classList.remove("hidden");
  ui.focusBubble.classList.add("hidden");
  ui.focusContentBtn.disabled = true;
  ui.focusEndBtn.disabled = true;
  window.setTimeout(() => {
    ui.focusContentBtn.disabled = false;
    ui.focusEndBtn.disabled = false;
  }, 500);
  if (shouldStart && !state.timerRunning) {
    if (!state.focusBlockStartAt) state.focusBlockStartAt = new Date().toISOString();
    state.timerRunning = true;
    state.focusSessionStartAt = new Date().toISOString();
    if (ui.timerToggleBtn) ui.timerToggleBtn.textContent = "专注中";
    ui.focusPauseBtn.textContent = "暂停";
  }
  ensureFocusTicker();
  renderFocusClock();
  renderFocusContent();
}

function minimizeFocusOverlay() {
  ui.focusOverlay.classList.add("hidden");
  ui.focusBubble.classList.remove("hidden");
}

function toggleFocusPause() {
  if (state.timerRunning) {
    state.focusElapsedMs = getFocusElapsedMs();
    state.focusSessionStartAt = "";
    state.timerRunning = false;
    ui.focusPauseBtn.textContent = "继续";
    if (ui.timerToggleBtn) ui.timerToggleBtn.textContent = "继续";
    renderFocusClock();
    stopFocusTickerIfIdle();
    return;
  }
  state.timerRunning = true;
  if (!state.focusBlockStartAt) state.focusBlockStartAt = new Date().toISOString();
  state.focusSessionStartAt = new Date().toISOString();
  ui.focusPauseBtn.textContent = "暂停";
  if (ui.timerToggleBtn) ui.timerToggleBtn.textContent = "专注中";
  ensureFocusTicker();
  renderFocusClock();
}

function editFocusContent() {
  ui.focusContentInput.value = state.focusContent;
  ui.focusContentModal.classList.remove("hidden");
  ui.focusContentInput.focus();
}

function closeFocusContentModal() {
  ui.focusContentModal.classList.add("hidden");
}

function saveFocusContentFromModal() {
  state.focusContent = ui.focusContentInput.value.trim();
  localStorage.setItem("focus_content", state.focusContent);
  renderFocusContent();
  closeFocusContentModal();
}

function openFocusSettings() {
  syncFocusSettingsInputs();
  ui.focusSettingsModal.classList.remove("hidden");
}

function closeFocusSettings() {
  ui.focusSettingsModal.classList.add("hidden");
}

function syncFocusSettingsInputs() {
  ui.focusDisplayModeInputs.forEach((input) => {
    input.checked = input.value === state.focusDisplayMode;
  });
}

function endFocusSession() {
  const elapsedMs = getFocusElapsedMs();
  const startedAt = state.focusBlockStartAt ? new Date(state.focusBlockStartAt) : new Date(Date.now() - elapsedMs);
  if (elapsedMs >= 1000) {
    addFocusTimelineBlock(startedAt, elapsedMs, state.focusContent.trim() || "未填写");
  }
  if (state.timerHandle) clearInterval(state.timerHandle);
  state.timerHandle = null;
  state.timerRunning = false;
  state.timerSeconds = 0;
  state.focusElapsedMs = 0;
  state.focusBlockStartAt = "";
  state.focusSessionStartAt = "";
  if (ui.timerToggleBtn) ui.timerToggleBtn.textContent = "开始";
  ui.focusPauseBtn.textContent = "暂停";
  ui.focusOverlay.classList.add("hidden");
  ui.focusBubble.classList.add("hidden");
  renderTimer();
  renderFocusClock();
  renderTimeline();
  setFeedback("专注记录已添加到时间轴。");
}

/* ===== Homepage focus panel (segmented modes + dial) ===== */
const FOCUS_DIAL = { cx: 120, cy: 120, faceR: 78, tickOuter: 104, tickInner: 92, handR: 96 };
const FOCUS_MODE_INDEX = { countup: 0, countdown: 1, pomodoro: 2 };

// Pomodoro defaults (tweak here). A 组/set = `setsBeforeLongBreak` work intervals,
// each followed by a short break (except the last, which offers a long break or stop).
const POMODORO = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  setsBeforeLongBreak: 3,
};

function focusMinutesToPoint(minutes, radius) {
  const theta = (Math.min(60, Math.max(0, minutes)) / 60) * Math.PI * 2;
  return {
    x: FOCUS_DIAL.cx + radius * Math.sin(theta),
    y: FOCUS_DIAL.cy - radius * Math.cos(theta),
  };
}

function buildFocusDialTicks() {
  if (!ui.focusDialTicks) return;
  const parts = [];
  for (let i = 0; i < 60; i += 1) {
    const major = i % 5 === 0;
    const inner = focusMinutesToPoint(i, major ? FOCUS_DIAL.tickInner : FOCUS_DIAL.tickInner + 4);
    const outer = focusMinutesToPoint(i, FOCUS_DIAL.tickOuter);
    parts.push(
      `<line class="focus-tick ${major ? "major" : "minor"}" x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}"></line>`
    );
  }
  // A soft background face behind the sector.
  ui.focusDialTicks.insertAdjacentHTML(
    "beforebegin",
    `<circle class="focus-dial-face" cx="${FOCUS_DIAL.cx}" cy="${FOCUS_DIAL.cy}" r="${FOCUS_DIAL.faceR}"></circle>`
  );
  ui.focusDialTicks.innerHTML = parts.join("");
}

function focusSectorPath(minutes) {
  const m = Math.min(60, Math.max(0, minutes));
  if (m <= 0) return "";
  const r = FOCUS_DIAL.faceR;
  if (m >= 60) {
    // Full circle.
    return `M ${FOCUS_DIAL.cx} ${FOCUS_DIAL.cy - r} A ${r} ${r} 0 1 1 ${FOCUS_DIAL.cx - 0.01} ${FOCUS_DIAL.cy - r} Z`;
  }
  const start = focusMinutesToPoint(0, r);
  const end = focusMinutesToPoint(m, r);
  const largeArc = m > 30 ? 1 : 0;
  return `M ${FOCUS_DIAL.cx} ${FOCUS_DIAL.cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function focusDialArcMinutes() {
  // Minutes to visualize on the dial (arc + hand).
  if (!state.timerRunning && !isFocusSessionActive()) {
    // Count-up mode is non-adjustable: the arc starts at 0 and only grows while running.
    return state.focusMode === "countup" ? 0 : state.focusTargetMinutes;
  }
  const elapsedMs = getFocusElapsedMs();
  if (state.focusMode === "countup") {
    return (elapsedMs / 60000) % 60;
  }
  const targetMs = state.focusTargetMinutes * 60000;
  const remaining = Math.max(0, targetMs - elapsedMs);
  return remaining / 60000;
}

function isFocusSessionActive() {
  return !!state.focusBlockStartAt;
}

function isFocusDialLocked() {
  // The dial is only user-adjustable in countdown/pomodoro while no session runs.
  return state.focusMode === "countup" || isFocusSessionActive();
}

function renderFocusDial() {
  const minutes = focusDialArcMinutes();
  if (ui.focusDialSector) ui.focusDialSector.setAttribute("d", focusSectorPath(minutes));
  if (ui.focusDialHand) {
    const tip = focusMinutesToPoint(minutes, FOCUS_DIAL.handR);
    ui.focusDialHand.setAttribute("x2", tip.x.toFixed(2));
    ui.focusDialHand.setAttribute("y2", tip.y.toFixed(2));
  }
  if (ui.focusDial) ui.focusDial.classList.toggle("is-locked", isFocusDialLocked());
}

function formatMMSS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) return formatDuration(s);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function renderFocusReadout() {
  let seconds;
  if (!isFocusSessionActive()) {
    // Count-up starts at 00:00; countdown/pomodoro preview the chosen target.
    seconds = state.focusMode === "countup" ? 0 : state.focusTargetMinutes * 60;
  } else if (state.focusMode === "countup") {
    seconds = Math.floor(getFocusElapsedMs() / 1000);
  } else {
    const remaining = state.focusTargetMinutes * 60000 - getFocusElapsedMs();
    seconds = Math.ceil(Math.max(0, remaining) / 1000);
  }
  if (ui.focusReadout) ui.focusReadout.textContent = formatMMSS(seconds);
}

function renderFocusEndHint() {
  if (!ui.focusEndHint) return;
  // Count-up has no fixed end time, so hide the hint entirely.
  if (state.focusMode === "countup") {
    ui.focusEndHint.hidden = true;
    return;
  }
  // Nothing to project when a completed set is awaiting the user's choice.
  if (state.pomodoroPhase === "awaitingChoice") {
    ui.focusEndHint.hidden = true;
    return;
  }
  ui.focusEndHint.hidden = false;
  const start = isFocusSessionActive() && state.focusBlockStartAt
    ? new Date(state.focusBlockStartAt)
    : new Date();
  const end = new Date(start.getTime() + state.focusTargetMinutes * 60000);
  const fmt = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  ui.focusEndHint.textContent = `预计 ${fmt(end)} 结束`;
}

function pomodoroPhaseLabel(phase) {
  if (phase === "work") return "专注中";
  if (phase === "shortBreak") return "休息中";
  if (phase === "longBreak") return "大休息中";
  return "";
}

function renderFocusPomodoroStatus() {
  if (!ui.focusPomodoroStatus) return;
  const active = state.focusMode === "pomodoro"
    && (isFocusSessionActive() || state.pomodoroPhase === "awaitingChoice");
  if (!active) {
    ui.focusPomodoroStatus.hidden = true;
    return;
  }
  ui.focusPomodoroStatus.hidden = false;
  const total = POMODORO.setsBeforeLongBreak;
  if (state.pomodoroPhase === "awaitingChoice") {
    ui.focusPomodoroStatus.textContent = `已完成一组番茄（${total}/${total}）`;
  } else {
    const done = state.pomodoroPhase === "work"
      ? state.pomodoroWorkCount + 1
      : state.pomodoroWorkCount;
    const shown = Math.min(total, Math.max(1, done));
    ui.focusPomodoroStatus.textContent = `番茄 ${shown}/${total} · ${pomodoroPhaseLabel(state.pomodoroPhase)}`;
  }
}

function renderFocusPanelControls() {
  const running = isFocusSessionActive();
  const awaitingChoice = state.pomodoroPhase === "awaitingChoice";
  if (ui.focusStartBtn) ui.focusStartBtn.hidden = running || awaitingChoice;
  if (ui.focusRunningControls) ui.focusRunningControls.hidden = !running;
  if (ui.focusPomodoroChoice) ui.focusPomodoroChoice.hidden = !awaitingChoice;
  if (ui.focusPauseResumeBtn) ui.focusPauseResumeBtn.textContent = state.timerRunning ? "暂停" : "继续";
  if (ui.focusModeBtns) {
    ui.focusModeBtns.forEach((btn) => {
      btn.disabled = running || awaitingChoice;
    });
  }
}

function renderFocusPanel() {
  renderFocusDial();
  renderFocusReadout();
  renderFocusEndHint();
  renderFocusPomodoroStatus();
  renderFocusPanelControls();
}

function setFocusMode(mode) {
  if (!FOCUS_MODE_INDEX[mode] && mode !== "countup") return;
  if (isFocusSessionActive()) return; // don't switch mid-session
  state.focusMode = mode;
  ui.focusModeBtns.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.focusMode === mode));
  if (ui.focusModeSwitch) ui.focusModeSwitch.style.setProperty("--mode-index", String(FOCUS_MODE_INDEX[mode]));
  state.pomodoroPhase = "idle";
  state.pomodoroWorkCount = 0;
  if (mode === "pomodoro") state.focusTargetMinutes = POMODORO.workMinutes;
  renderFocusPanel();
}

function setFocusTargetMinutes(minutes) {
  const clamped = Math.min(60, Math.max(1, Math.round(minutes)));
  state.focusTargetMinutes = clamped;
  renderFocusPanel();
}

function focusDialMinutesFromEvent(event) {
  const rect = ui.focusDialSvg.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  let theta = Math.atan2(dx, -dy); // 0 at top, clockwise positive
  if (theta < 0) theta += Math.PI * 2;
  const minutes = (theta / (Math.PI * 2)) * 60;
  return minutes;
}

function onFocusDialPointerDown(event) {
  if (isFocusDialLocked()) return; // dial locked while running or in count-up mode
  event.preventDefault(); // stop text/selection box appearing during drag
  state.focusDialDrag = true;
  try {
    ui.focusDialSvg.setPointerCapture(event.pointerId);
  } catch (_) {
    /* noop */
  }
  setFocusTargetMinutes(focusDialMinutesFromEvent(event) || 1);
}

function onFocusDialPointerMove(event) {
  if (!state.focusDialDrag) return;
  setFocusTargetMinutes(focusDialMinutesFromEvent(event) || 1);
}

function onFocusDialPointerUp(event) {
  if (!state.focusDialDrag) return;
  state.focusDialDrag = false;
  try {
    ui.focusDialSvg.releasePointerCapture(event.pointerId);
  } catch (_) {
    /* noop */
  }
}

function ensureFocusPanelTicker() {
  if (state.focusPanelHandle) return;
  state.focusPanelHandle = setInterval(() => {
    if (!isFocusSessionActive()) return;
    if (state.focusMode !== "countup" && state.timerRunning) {
      const remaining = state.focusTargetMinutes * 60000 - getFocusElapsedMs();
      if (remaining <= 0) {
        if (state.focusMode === "pomodoro") {
          advancePomodoro();
        } else {
          stopFocusPanelSession(true);
        }
        return;
      }
    }
    renderFocusPanel();
  }, 250);
}

function stopFocusPanelTicker() {
  if (state.focusPanelHandle) clearInterval(state.focusPanelHandle);
  state.focusPanelHandle = null;
}

function startFocusPanelSession() {
  if (isFocusSessionActive()) return;
  if (state.focusMode !== "countup" && state.focusTargetMinutes < 1) {
    setFeedback("请先设置一个时长。", true);
    return;
  }
  if (state.focusMode === "pomodoro") {
    // The dial value is the work length for the whole cycle.
    state.pomodoroWorkMinutes = state.focusTargetMinutes;
    state.pomodoroWorkCount = 0;
    beginPomodoroPhase("work");
    return;
  }
  const now = new Date().toISOString();
  state.focusBlockStartAt = now;
  state.focusSessionStartAt = now;
  state.focusElapsedMs = 0;
  state.timerRunning = true;
  ensureFocusPanelTicker();
  renderFocusPanel();
}

/* ===== Pomodoro state machine ===== */
function beginPomodoroPhase(phase) {
  state.pomodoroPhase = phase;
  if (phase === "work") state.focusTargetMinutes = state.pomodoroWorkMinutes || POMODORO.workMinutes;
  else if (phase === "shortBreak") state.focusTargetMinutes = POMODORO.shortBreakMinutes;
  else if (phase === "longBreak") state.focusTargetMinutes = POMODORO.longBreakMinutes;
  const now = new Date().toISOString();
  state.focusBlockStartAt = now;
  state.focusSessionStartAt = now;
  state.focusElapsedMs = 0;
  state.timerRunning = true;
  ensureFocusPanelTicker();
  renderFocusPanel();
}

function pomodoroPhaseBlockMeta(phase) {
  if (phase === "work") {
    const goal = state.focusContent.trim();
    return { kind: "work", title: goal ? `专注 · 番茄 · ${goal}` : "专注 · 番茄" };
  }
  if (phase === "longBreak") return { kind: "break", title: "大休息" };
  return { kind: "break", title: "休息" };
}

function recordCurrentPomodoroInterval() {
  if (!state.focusBlockStartAt) return;
  const startedAt = new Date(state.focusBlockStartAt);
  // A completed interval spans its full target duration.
  const elapsedMs = state.focusTargetMinutes * 60000;
  const meta = pomodoroPhaseBlockMeta(state.pomodoroPhase);
  addFocusTimelineBlock(startedAt, elapsedMs, meta.title, meta.kind);
}

function advancePomodoro() {
  const finishedPhase = state.pomodoroPhase;
  recordCurrentPomodoroInterval();
  renderTimeline();
  if (finishedPhase === "work") {
    state.pomodoroWorkCount += 1;
    if (state.pomodoroWorkCount >= POMODORO.setsBeforeLongBreak) {
      enterPomodoroChoice();
    } else {
      beginPomodoroPhase("shortBreak");
      setFeedback("完成一个番茄，休息一下 ☕️");
    }
  } else if (finishedPhase === "shortBreak") {
    beginPomodoroPhase("work");
    setFeedback("休息结束，继续专注！");
  } else if (finishedPhase === "longBreak") {
    state.pomodoroWorkCount = 0;
    beginPomodoroPhase("work");
    setFeedback("大休息结束，新的一组开始！");
  }
}

function enterPomodoroChoice() {
  // The 3rd work interval is already recorded; pause and let the user choose.
  state.pomodoroPhase = "awaitingChoice";
  state.timerRunning = false;
  state.focusBlockStartAt = "";
  state.focusSessionStartAt = "";
  state.focusElapsedMs = 0;
  stopFocusPanelTicker();
  renderFocusPanel();
  setFeedback("完成一组番茄！可以「大休息」或「终止」。");
}

function startPomodoroLongBreak() {
  if (state.pomodoroPhase !== "awaitingChoice") return;
  beginPomodoroPhase("longBreak");
  setFeedback("开始大休息，好好放松一下 🌿");
}

function endPomodoro() {
  stopFocusPanelTicker();
  state.pomodoroPhase = "idle";
  state.pomodoroWorkCount = 0;
  state.timerRunning = false;
  state.focusBlockStartAt = "";
  state.focusSessionStartAt = "";
  state.focusElapsedMs = 0;
  renderFocusPanel();
  renderTimeline();
  setFeedback("番茄钟已结束。");
}

function toggleFocusPanelPause() {
  if (!isFocusSessionActive()) return;
  if (state.timerRunning) {
    state.focusElapsedMs = getFocusElapsedMs();
    state.focusSessionStartAt = "";
    state.timerRunning = false;
  } else {
    state.focusSessionStartAt = new Date().toISOString();
    state.timerRunning = true;
  }
  renderFocusPanel();
}

function stopFocusPanelSession(auto = false) {
  if (!isFocusSessionActive()) return;
  const elapsedMs = state.focusMode === "countup"
    ? getFocusElapsedMs()
    : Math.min(getFocusElapsedMs(), state.focusTargetMinutes * 60000);
  const startedAt = state.focusBlockStartAt ? new Date(state.focusBlockStartAt) : new Date(Date.now() - elapsedMs);
  let title = state.focusContent.trim() || "专注";
  let kind = "focus";
  if (state.focusMode === "pomodoro") {
    const meta = pomodoroPhaseBlockMeta(state.pomodoroPhase);
    title = meta.title;
    kind = meta.kind;
  }
  if (elapsedMs >= 1000) {
    addFocusTimelineBlock(startedAt, elapsedMs, title, kind);
  }
  stopFocusPanelTicker();
  state.timerRunning = false;
  state.focusElapsedMs = 0;
  state.focusBlockStartAt = "";
  state.focusSessionStartAt = "";
  if (state.focusMode === "pomodoro") {
    state.pomodoroPhase = "idle";
    state.pomodoroWorkCount = 0;
  }
  renderFocusPanel();
  renderTimeline();
  if (auto) {
    const rest = state.focusMode === "pomodoro" ? "该休息一下啦 ☕️" : "专注完成";
    setFeedback(`${rest}，记录已添加到时间轴。`);
  } else {
    setFeedback("专注记录已添加到时间轴。");
  }
}

function initFocusPanel() {
  if (!ui.focusPanel) return;
  buildFocusDialTicks();
  if (ui.focusGoalInput) {
    ui.focusGoalInput.value = state.focusContent;
    ui.focusGoalInput.addEventListener("input", () => {
      state.focusContent = ui.focusGoalInput.value;
      localStorage.setItem("focus_content", state.focusContent.trim());
    });
  }
  ui.focusModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setFocusMode(btn.dataset.focusMode));
  });
  if (ui.focusDialSvg) {
    ui.focusDialSvg.addEventListener("pointerdown", onFocusDialPointerDown);
    ui.focusDialSvg.addEventListener("pointermove", onFocusDialPointerMove);
    ui.focusDialSvg.addEventListener("pointerup", onFocusDialPointerUp);
    ui.focusDialSvg.addEventListener("pointercancel", onFocusDialPointerUp);
    ui.focusDialSvg.addEventListener("keydown", (event) => {
      if (isFocusDialLocked()) return; // no keyboard adjust while locked / in count-up
      if (event.key === "ArrowUp" || event.key === "ArrowRight") {
        event.preventDefault();
        setFocusTargetMinutes(state.focusTargetMinutes + 1);
      } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
        event.preventDefault();
        setFocusTargetMinutes(state.focusTargetMinutes - 1);
      }
    });
  }
  if (ui.focusStartBtn) ui.focusStartBtn.addEventListener("click", () => startFocusPanelSession());
  if (ui.focusPauseResumeBtn) ui.focusPauseResumeBtn.addEventListener("click", () => toggleFocusPanelPause());
  if (ui.focusStopBtn) ui.focusStopBtn.addEventListener("click", () => stopFocusPanelSession(false));
  if (ui.focusLongBreakBtn) ui.focusLongBreakBtn.addEventListener("click", () => startPomodoroLongBreak());
  if (ui.focusPomodoroStopBtn) ui.focusPomodoroStopBtn.addEventListener("click", () => endPomodoro());
  setFocusMode("countup");
  renderFocusPanel();
}

function startFocusBubbleDrag(event) {
  ui.focusBubble.setPointerCapture(event.pointerId);
  const rect = ui.focusBubble.getBoundingClientRect();
  state.focusBubbleDrag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    moved: false,
  };
  ui.focusBubble.classList.add("dragging");
}

function moveFocusBubble(event) {
  const drag = state.focusBubbleDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const maxLeft = window.innerWidth - ui.focusBubble.offsetWidth - 8;
  const maxTop = window.innerHeight - ui.focusBubble.offsetHeight - 8;
  const left = Math.max(8, Math.min(maxLeft, event.clientX - drag.offsetX));
  const top = Math.max(8, Math.min(maxTop, event.clientY - drag.offsetY));
  if (Math.abs(left - ui.focusBubble.offsetLeft) > 2 || Math.abs(top - ui.focusBubble.offsetTop) > 2) {
    drag.moved = true;
  }
  ui.focusBubble.style.left = `${left}px`;
  ui.focusBubble.style.top = `${top}px`;
}

function endFocusBubbleDrag(event) {
  const drag = state.focusBubbleDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  ui.focusBubble.releasePointerCapture(event.pointerId);
  ui.focusBubble.classList.remove("dragging");
  state.focusBubbleDrag = null;
  if (!drag.moved) openFocusOverlay(false);
}

function setGenerateLoading(loading) {
  generatePlanLoading = loading;
  ui.generateBtn.disabled = loading;
  ui.generateBtn.classList.toggle("loading", loading);
  ui.generateSpinner.setAttribute("aria-hidden", loading ? "false" : "true");
  const railBtn = document.querySelector('#actionRail .action-rail-btn[data-rail-action="generate"]');
  if (railBtn) {
    railBtn.classList.toggle("is-loading", loading);
    railBtn.disabled = loading;
  }
  updateGenerateRailIcon();
  // Only announce the loading state; leave the success/failure feedback to the
  // caller (generatePlanForToday) so it isn't overwritten when loading ends.
  if (loading) setFeedback("正在生成计划…");
}

async function refreshAvailability() {
  if (!hasIdentity()) return;
  const data = await api("/settings/availability");
  state.weeklyAvailability = data.weeklyAvailability || state.weeklyAvailability;
  renderAvailabilityEditor();
}

async function refreshState() {
  if (!hasIdentity()) return;
  const data = await api("/state");
  state.tasks = data.tasks || [];
  state.todayPlan = data.todayPlan || null;
  state.checkins = data.checkins || [];
  state.planner = data.planner || "none";
  if (data.weeklyAvailability) {
    state.weeklyAvailability = data.weeklyAvailability;
    renderAvailabilityEditor();
  }
}

async function refreshSelectedDatePlan() {
  if (!state.currentUser) {
    state.selectedPlan = null;
    return;
  }
  const data = await api(`/plans/${state.selectedDate}`);
  state.selectedPlan = data.plan || null;
}

function renderDateSwitcher() {
  const selected = parseDate(state.selectedDate);
  ui.selectedDateLabel.textContent = `${selected.getMonth() + 1}月${selected.getDate()}日`;
  const monday = startOfWeek(selected);
  ui.weekStrip.innerHTML = "";
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dayStr = formatDate(day);
    const isSelected = dayStr === state.selectedDate;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `week-day ${isSelected ? "active" : ""}`;
    cell.dataset.date = dayStr;
    cell.innerHTML = `<span>${"一二三四五六日"[i]}</span><strong>${day.getDate()}</strong>`;
    ui.weekStrip.appendChild(cell);
  }
}

function renderAvailabilityEditor() {
  ui.availabilityEditor.innerHTML = "";
  WEEK_KEYS.forEach((day) => {
    const row = document.createElement("div");
    row.className = "day-row";
    row.innerHTML = `
      <div class="day-row-head">
        <strong>${WEEK_LABELS[day]}</strong>
        <div class="day-row-actions"><button class="btn small" type="button" data-add-day="${day}">+ 添加时段</button></div>
      </div>
    `;
    const slotsWrap = document.createElement("div");
    slotsWrap.className = "slots-wrap";
    const ranges = state.weeklyAvailability[day] || [];
    const visibleRanges = ranges.length > 0 ? ranges : [{ start: "", end: "", isDraft: true }];
    visibleRanges.forEach((slot, idx) => {
      const slotRow = document.createElement("div");
      slotRow.className = `slot-row ${slot.isDraft ? "is-draft" : ""}`;
      const removeButton = slot.isDraft
        ? ""
        : `<button class="btn small" type="button" data-remove-day="${day}" data-remove-index="${idx}">删除</button>`;
      slotRow.innerHTML = `
        <input class="time-input" data-day="${day}" data-index="${idx}" data-kind="start" list="timeOptions" value="${escapeHtml(slot.start)}" placeholder="开始时间">
        <span class="slot-sep">-</span>
        <input class="time-input" data-day="${day}" data-index="${idx}" data-kind="end" list="timeOptions" value="${escapeHtml(slot.end)}" placeholder="结束时间">
        ${removeButton}
      `;
      slotsWrap.appendChild(slotRow);
    });
    if (ranges.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "留空则不保存该日时段，也可以直接输入后保存。";
      slotsWrap.appendChild(empty);
    }
    row.appendChild(slotsWrap);
    ui.availabilityEditor.appendChild(row);
  });
}

function addAvailabilitySlot(day) {
  if (!state.weeklyAvailability[day]) state.weeklyAvailability[day] = [];
  state.weeklyAvailability[day].push({ start: "18:00", end: "19:00" });
  renderAvailabilityEditor();
}

function removeAvailabilitySlot(day, index) {
  const arr = state.weeklyAvailability[day] || [];
  if (index >= 0 && index < arr.length) arr.splice(index, 1);
  renderAvailabilityEditor();
}

function cloneDayRanges(day) {
  return (state.weeklyAvailability[day] || []).map((r) => ({ ...r }));
}

function normalizeTimeText(raw) {
  let t = String(raw || "").trim().replace("：", ":").replace(".", ":");
  if (!t) throw new Error("时间不能为空");
  if (t.includes(":")) {
    const [hRaw, mRaw = "00"] = t.split(":");
    if (!/^\d{1,2}$/.test(hRaw) || !/^\d{1,2}$/.test(mRaw)) throw new Error("时间格式必须是 HH:MM");
    const h = Number.parseInt(hRaw, 10);
    const m = Number.parseInt(mRaw, 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("时间超出范围");
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (!/^\d{1,4}$/.test(t)) throw new Error("时间格式必须是 HH:MM");
  let h = 0;
  let m = 0;
  if (t.length <= 2) h = Number.parseInt(t, 10);
  else if (t.length === 3) {
    h = Number.parseInt(t.slice(0, 1), 10);
    m = Number.parseInt(t.slice(1), 10);
  } else {
    h = Number.parseInt(t.slice(0, 2), 10);
    m = Number.parseInt(t.slice(2), 10);
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("时间超出范围");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map((x) => Number.parseInt(x, 10));
  return h * 60 + m;
}

function collectAvailabilityPayload() {
  const inputs = Array.from(ui.availabilityEditor.querySelectorAll(".time-input"));
  const grouped = {};
  inputs.forEach((input) => {
    const day = input.dataset.day;
    const idx = Number.parseInt(input.dataset.index, 10);
    const kind = input.dataset.kind;
    if (!grouped[day]) grouped[day] = {};
    if (!grouped[day][idx]) grouped[day][idx] = {};
    grouped[day][idx][kind] = input;
  });

  const payload = {};
  WEEK_KEYS.forEach((day) => {
    const rows = grouped[day] || {};
    const slotEntries = Object.keys(rows)
      .map((k) => Number.parseInt(k, 10))
      .sort((a, b) => a - b)
      .map((idx) => rows[idx]);
    const daySlots = slotEntries.map((entry) => {
      const startRaw = entry.start?.value.trim() || "";
      const endRaw = entry.end?.value.trim() || "";
      if (!startRaw && !endRaw) return null;
      if (!startRaw || !endRaw) throw new Error(`${WEEK_LABELS[day]}存在未填完整的时间段`);
      const startNorm = normalizeTimeText(entry.start.value);
      const endNorm = normalizeTimeText(entry.end.value);
      entry.start.value = startNorm;
      entry.end.value = endNorm;
      const s = hhmmToMinutes(startNorm);
      const e = hhmmToMinutes(endNorm);
      if (e <= s) throw new Error(`${WEEK_LABELS[day]}存在结束时间早于开始时间`);
      return { start: startNorm, end: endNorm, s, e };
    }).filter(Boolean);
    daySlots.sort((a, b) => a.s - b.s);
    for (let i = 1; i < daySlots.length; i += 1) {
      if (daySlots[i].s < daySlots[i - 1].e) throw new Error(`${WEEK_LABELS[day]}存在重叠时段`);
    }
    payload[day] = daySlots.map((slot) => ({ start: slot.start, end: slot.end }));
    state.weeklyAvailability[day] = payload[day].map((r) => ({ ...r }));
  });
  return payload;
}

function renderTimeline() {
  const plan = state.selectedPlan;
  const blocks = plan?.scheduledBlocks || [];
  ui.timelineHeader.innerHTML = `${escapeHtml(state.selectedDate)} 时间轴${state.planStale ? '<span class="stale-warning">任务更改后还没重新生成计划</span>' : ""}`;
  ui.timelineCanvas.innerHTML = "";
  const content = document.createElement("div");
  content.className = "timeline-content";
  ui.timelineCanvas.appendChild(content);
  const pxPerMinute = 1;
  const renderBlocks = [];
  blocks.forEach((block) => {
    const task = state.tasks.find((t) => t.id === block.taskId);
    if (!task || task.status === "done") return;
    const key = getPlanBlockKey(block);
    const edit = state.timelineBlockEdits[key] || {};
    if (edit.deleted) return;
    const startMinute = Number.isFinite(edit.startMinute) ? edit.startMinute : block.startMinute;
    const endMinute = Number.isFinite(edit.endMinute) ? edit.endMinute : block.endMinute;
    const title = edit.title || block.title || task.title;
    const description = edit.description || "";
    renderBlocks.push({
      kind: "plan",
      key,
      taskId: block.taskId,
      startMinute,
      endMinute,
      html: `
      <p>${escapeHtml(title)}</p>
      <p class="ddl">${escapeHtml(minutesToHHMM(startMinute))}-${escapeHtml(minutesToHHMM(endMinute))} · DDL: ${escapeHtml(block.deadline || task.deadline)}</p>
      ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ""}
    `,
    });
  });

  state.focusBlocks
    .filter((block) => block.date === state.selectedDate)
    .forEach((block) => {
      const focusKind = block.kind || "focus";
      const kindLabel = focusKind === "work" ? "番茄" : focusKind === "break" ? "休息" : "专注";
      renderBlocks.push({
        kind: "focus",
        id: block.id,
        startMinute: block.startMinute,
        endMinute: block.endMinute,
        extraClass: `focus-block focus-block-${focusKind}`,
        html: `
        <p>${escapeHtml(block.title)}</p>
        <p class="ddl">${escapeHtml(minutesToHHMM(block.startMinute))}-${escapeHtml(minutesToHHMM(block.endMinute))} · ${escapeHtml(kindLabel)}</p>
        ${block.description ? `<p class="desc">${escapeHtml(block.description)}</p>` : ""}
      `,
      });
    });

  const minBlockStart = renderBlocks.length ? Math.min(...renderBlocks.map((block) => block.startMinute)) : 6 * 60;
  const startHour = 0;
  const endHour = 24;
  content.style.height = `${(endHour - startHour) * 60 * pxPerMinute}px`;

  // ① Free-time bands: light background tint behind the grid showing the
  // selected date's weekday availability. Drawn first so blocks stay on top.
  const weekdayKey = WEEK_KEYS[(parseDate(state.selectedDate).getDay() + 6) % 7];
  (state.weeklyAvailability[weekdayKey] || []).forEach((slot) => {
    if (!slot || !slot.start || !slot.end) return;
    const s = hhmmToMinutes(slot.start);
    const e = hhmmToMinutes(slot.end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
    const band = document.createElement("div");
    band.className = "timeline-free-band";
    band.style.top = `${(s - startHour * 60) * pxPerMinute}px`;
    band.style.height = `${(e - s) * pxPerMinute}px`;
    band.title = `空闲 ${slot.start}-${slot.end}`;
    content.appendChild(band);
  });

  for (let hour = startHour; hour <= endHour; hour += 1) {
    const top = (hour - startHour) * 60 * pxPerMinute;
    const line = document.createElement("div");
    line.className = "time-line";
    line.style.top = `${top}px`;
    content.appendChild(line);

    const label = document.createElement("div");
    label.className = "time-label";
    label.style.top = `${top}px`;
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    content.appendChild(label);
  }

  layoutTimelineBlocks(renderBlocks).forEach((block) => {
    const blockTop = (block.startMinute - startHour * 60) * pxPerMinute;
    const blockHeight = Math.max((block.endMinute - block.startMinute) * pxPerMinute, 20);
    const el = document.createElement("div");
    el.className = `timeline-block ${block.extraClass || ""}`;
    el.dataset.blockKind = block.kind;
    if (block.key) el.dataset.blockKey = block.key;
    if (block.taskId) el.dataset.taskId = block.taskId;
    if (block.id) el.dataset.blockId = block.id;
    el.style.top = `${Math.max(0, blockTop)}px`;
    el.style.height = `${blockHeight}px`;
    el.style.left = `calc(58px + ${block.column * block.columnWidth}%)`;
    el.style.right = "auto";
    el.style.width = `calc(${block.columnWidth}% - 8px)`;
    el.innerHTML = block.html;
    content.appendChild(el);
  });

  const firstStart = renderBlocks.length ? minBlockStart : 6 * 60;
  ui.timelineCanvas.scrollTop = Math.max(0, (firstStart - 30) * pxPerMinute);
}

function layoutTimelineBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  const active = [];
  sorted.forEach((block) => {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endMinute <= block.startMinute) active.splice(i, 1);
    }
    const used = new Set(active.map((item) => item.column));
    let column = 0;
    while (used.has(column)) column += 1;
    block.column = column;
    active.push(block);
    const groupSize = Math.max(...active.map((item) => item.column)) + 1;
    active.forEach((item) => {
      item.groupSize = Math.max(item.groupSize || 1, groupSize);
    });
  });
  return sorted.map((block) => ({
    ...block,
    columnWidth: 86 / Math.max(1, block.groupSize || 1),
  }));
}

function getPlanBlockKey(block) {
  return `plan:${state.selectedDate}:${block.taskId}:${block.startMinute}:${block.endMinute}`;
}

function loadFocusBlocks() {
  try {
    const raw = localStorage.getItem("focus_blocks");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFocusBlocks() {
  localStorage.setItem("focus_blocks", JSON.stringify(state.focusBlocks));
}

function loadTimelineBlockEdits() {
  try {
    const raw = localStorage.getItem("timeline_block_edits");
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveTimelineBlockEdits() {
  localStorage.setItem("timeline_block_edits", JSON.stringify(state.timelineBlockEdits));
}

function addFocusTimelineBlock(startedAt, elapsedMs, title, kind = "focus") {
  const startMinute = startedAt.getHours() * 60 + startedAt.getMinutes();
  const durationMinutes = Math.max(1, Math.ceil(elapsedMs / 60000));
  const endMinute = Math.min(24 * 60, startMinute + durationMinutes);
  const block = {
    id: `focus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: formatDate(startedAt),
    startMinute,
    endMinute,
    title,
    kind,
    description: "",
  };
  state.focusBlocks.push(block);
  saveFocusBlocks();
  state.selectedDate = block.date;
  renderDateSwitcher();
}

function openTimelineBlockEditor(element) {
  const kind = element.dataset.blockKind;
  let data = null;
  if (kind === "focus") {
    const block = state.focusBlocks.find((item) => item.id === element.dataset.blockId);
    if (!block) return;
    data = { kind, id: block.id, title: block.title, description: block.description || "", startMinute: block.startMinute, endMinute: block.endMinute };
  } else {
    const key = element.dataset.blockKey;
    const block = (state.selectedPlan?.scheduledBlocks || []).find((item) => getPlanBlockKey(item) === key);
    if (!block) return;
    const task = state.tasks.find((item) => item.id === block.taskId);
    const edit = state.timelineBlockEdits[key] || {};
    data = {
      kind: "plan",
      key,
      title: edit.title || block.title || task?.title || "",
      description: edit.description || "",
      startMinute: Number.isFinite(edit.startMinute) ? edit.startMinute : block.startMinute,
      endMinute: Number.isFinite(edit.endMinute) ? edit.endMinute : block.endMinute,
    };
  }
  state.editingTimelineBlock = data;
  ui.timelineEditTitleInput.value = data.title;
  ui.timelineEditStartInput.value = minutesToHHMM(data.startMinute);
  ui.timelineEditEndInput.value = minutesToHHMM(data.endMinute);
  ui.timelineEditDescriptionInput.value = data.description || "";
  ui.timelineEditModal.classList.remove("hidden");
}

function closeTimelineBlockEditor() {
  ui.timelineEditModal.classList.add("hidden");
  state.editingTimelineBlock = null;
}

function readTimelineEditForm() {
  const title = ui.timelineEditTitleInput.value.trim() || "未命名";
  const description = ui.timelineEditDescriptionInput.value.trim();
  const start = normalizeTimeText(ui.timelineEditStartInput.value);
  const end = normalizeTimeText(ui.timelineEditEndInput.value);
  const startMinute = hhmmToMinutes(start);
  const endMinute = hhmmToMinutes(end);
  if (endMinute <= startMinute) throw new Error("结束时间必须晚于开始时间");
  return { title, description, startMinute, endMinute };
}

function saveTimelineBlockEdit() {
  if (!state.editingTimelineBlock) return;
  try {
    const next = readTimelineEditForm();
    if (state.editingTimelineBlock.kind === "focus") {
      const block = state.focusBlocks.find((item) => item.id === state.editingTimelineBlock.id);
      if (block) Object.assign(block, next);
      saveFocusBlocks();
    } else {
      state.timelineBlockEdits[state.editingTimelineBlock.key] = {
        ...(state.timelineBlockEdits[state.editingTimelineBlock.key] || {}),
        ...next,
        deleted: false,
      };
      saveTimelineBlockEdits();
    }
    closeTimelineBlockEditor();
    renderTimeline();
    setFeedback("时间段已更新。");
  } catch (error) {
    setFeedback(`保存失败：${error.message}`, true);
  }
}

function deleteTimelineBlockEdit() {
  if (!state.editingTimelineBlock) return;
  if (state.editingTimelineBlock.kind === "focus") {
    state.focusBlocks = state.focusBlocks.filter((item) => item.id !== state.editingTimelineBlock.id);
    saveFocusBlocks();
  } else {
    state.timelineBlockEdits[state.editingTimelineBlock.key] = {
      ...(state.timelineBlockEdits[state.editingTimelineBlock.key] || {}),
      deleted: true,
    };
    saveTimelineBlockEdits();
  }
  closeTimelineBlockEditor();
  renderTimeline();
  setFeedback("时间段已删除。");
}


function renderPlanList() {
  ui.planList.innerHTML = "";
  const pending = state.tasks.filter((task) => task.status !== "done").sort((a, b) => a.deadline.localeCompare(b.deadline));
  const done = state.tasks.filter((task) => task.status === "done").sort((a, b) => a.deadline.localeCompare(b.deadline));
  const ordered = [...pending, ...done];
  if (ordered.length === 0) {
    const li = document.createElement("li");
    li.textContent = "还没有任务，先添加一个吧。";
    ui.planList.appendChild(li);
    return;
  }
  ordered.forEach((task) => {
    const doneClass = task.status === "done" ? "done" : "";
    const checkMark = task.status === "done" ? "✓" : "";
    const subjectLabel = SUBJECT_LABELS[task.subject] || "综合/其他";
    const taskTypeLabel = TASK_TYPE_LABELS[task.taskType] || "习题/刷题";
    const difficultyLabel = DIFFICULTY_LABELS[task.difficulty] || "普通";
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="task-item ${doneClass}">
        <div class="task-check ${task.status === "done" ? "checked" : ""}" data-task-id="${task.id}">${checkMark}</div>
        <div class="task-main">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">DDL: ${escapeHtml(task.deadline)} · ${escapeHtml(subjectLabel)} · ${escapeHtml(taskTypeLabel)} · ${escapeHtml(difficultyLabel)} · 预估 ${task.estimatedMinutes || 60} 分钟</div>
        </div>
        <button class="task-menu-btn" type="button" data-task-menu="${task.id}" aria-label="编辑任务">⋯</button>
      </div>
    `;
    ui.planList.appendChild(li);
  });
}

function openTaskEditor(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  state.editingTaskId = taskId;
  ui.editTitleInput.value = task.title || "";
  ui.editDeadlineInput.value = task.deadline || "";
  ui.editSubjectInput.value = task.subject || "general";
  ui.editTaskTypeInput.value = task.taskType || "exercise_set";
  ui.editDifficultyInput.value = task.difficulty || "medium";
  ui.editEstimateInput.value = task.estimatedMinutes || "";
  ui.taskEditModal.classList.remove("hidden");
}

function closeTaskEditor() {
  ui.taskEditModal.classList.add("hidden");
  state.editingTaskId = "";
}

function readTaskEditorPayload() {
  const title = ui.editTitleInput.value.trim();
  const deadline = ui.editDeadlineInput.value;
  if (!title || !deadline) throw new Error("请填写任务名称和截止日期");
  const estimateRaw = ui.editEstimateInput.value.trim();
  return {
    title,
    deadline,
    subject: ui.editSubjectInput.value,
    taskType: ui.editTaskTypeInput.value,
    difficulty: ui.editDifficultyInput.value,
    estimatedMinutes: estimateRaw ? Number.parseInt(estimateRaw, 10) : null,
  };
}

async function saveTaskEdit() {
  if (!state.editingTaskId) return;
  try {
    await api(`/tasks/${state.editingTaskId}`, {
      method: "PUT",
      body: JSON.stringify(readTaskEditorPayload()),
    });
    closeTaskEditor();
    await refreshState();
    await refreshSelectedDatePlan();
    renderPlanList();
    markPlanStale();
    setFeedback("任务已更新，请重新生成计划。");
  } catch (error) {
    setFeedback(`保存任务失败：${error.message}`, true);
  }
}

async function deleteTaskFromEditor() {
  if (!state.editingTaskId) return;
  try {
    await api(`/tasks/${state.editingTaskId}`, { method: "DELETE" });
    closeTaskEditor();
    await refreshState();
    await refreshSelectedDatePlan();
    renderPlanList();
    markPlanStale();
    setFeedback("任务已删除，请重新生成计划。");
  } catch (error) {
    setFeedback(`删除任务失败：${error.message}`, true);
  }
}

async function markTaskDone(taskId, done) {
  await api("/checkins", { method: "POST", body: JSON.stringify({ taskId, done, actualMinutes: null }) });
}

function setFeedback(message, isError = false) {
  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  ui.feedbackBox.textContent = message;
  ui.feedbackBox.classList.remove("hidden");
  ui.feedbackBox.style.borderColor = isError ? "#f2b8b5" : "#c7d6e9";
  ui.feedbackBox.style.background = isError ? "rgba(255, 244, 244, 0.82)" : "rgba(246, 250, 255, 0.82)";
  ui.feedbackBox.style.color = isError ? "var(--danger)" : "#26435f";
  state.feedbackTimer = setTimeout(() => ui.feedbackBox.classList.add("hidden"), 2000);
}

async function api(path, options = {}) {
  const authOptional = !!options.authOptional;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
  const fetchOptions = { ...options, headers };
  delete fetchOptions.authOptional;
  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (response.status === 401 && !authOptional) {
    state.authToken = "";
    state.currentUser = "";
    localStorage.removeItem("auth_token");
    clearAppData();
    renderAuthStatus();
    showAuthGate("登录已失效，请重新登录");
    throw new Error("登录已失效，请重新登录");
  }
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}

function parseDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDate(dateStr, deltaDays) {
  const dt = parseDate(dateStr);
  dt.setDate(dt.getDate() + deltaDays);
  return formatDate(dt);
}

function startOfWeek(date) {
  const dt = new Date(date);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt;
}

function minutesToHHMM(minutes) {
  const m = Math.max(0, Math.min(minutes, 24 * 60));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Kick off initialization last, after every top-level const/function above is
// initialized, so bootstrap() can safely call into them on first load/refresh.
bootstrap().catch((error) => setFeedback(`初始化失败：${error.message}`, true));
