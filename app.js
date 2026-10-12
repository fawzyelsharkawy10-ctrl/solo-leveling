(() => {
  "use strict";
  const STORAGE_KEY = "player-system-v1";
  const quests = [
    {id:"study", title:"التدريب العقلي", desc:"ذاكر أو تعلّم شيئًا جديدًا لمدة 25 دقيقة.", xp:25, icon:"✧"},
    {id:"move", title:"التدريب البدني", desc:"تحرّك أو مارس نشاطًا مناسبًا لك لمدة 15–20 دقيقة.", xp:20, icon:"➤"},
    {id:"learn", title:"اكتساب المعرفة", desc:"اقرأ أو تعلّم مهارة جديدة لمدة 15 دقيقة.", xp:20, icon:"▤"},
    {id:"tidy", title:"ترتيب البيئة", desc:"رتّب مكتبك أو مكانك لمدة 10 دقائق.", xp:15, icon:"⌘"},
    {id:"reflect", title:"مراجعة الذات", desc:"اكتب هدفًا للغد وشيئًا واحدًا تعلّمته اليوم.", xp:20, icon:"◇"}
  ];
  const $ = (id) => document.getElementById(id);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const dateLabel = (key) => {
    const [y,m,d] = key.split("-").map(Number);
    return new Date(y,m-1,d).toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  };
  const freshState = () => ({name:"اللاعب", totalXp:0, completed:{}, history:[], createdAt:today()});
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.totalXp !== "number" || !parsed.completed) return freshState();
      return {...freshState(), ...parsed};
    } catch (err) {
      console.warn("تعذّر قراءة الحفظ المحلي", err);
      return freshState();
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      showToast("تعذّر حفظ البيانات. تأكد من مساحة المتصفح.");
      return false;
    }
  }
  function levelInfo(totalXp) {
    const safeXp = Math.max(0, Math.floor(totalXp));
    return {level:Math.floor(safeXp/100)+1, inLevel:safeXp%100, total:safeXp};
  }
  function rankFor(level) {
    if (level >= 30) return "S";
    if (level >= 20) return "A";
    if (level >= 12) return "B";
    if (level >= 7) return "C";
    if (level >= 4) return "D";
    return "E";
  }
  function todayCompleted() { return state.completed[today()] || []; }
  function render() {
    const info = levelInfo(state.totalXp);
    $("player-name-heading").textContent = state.name || "اللاعب";
    $("player-name").value = state.name || "اللاعب";
    $("level").textContent = info.level;
    $("rank").textContent = rankFor(info.level);
    $("level-xp").textContent = info.inLevel;
    $("xp-total").textContent = `إجمالي الخبرة: ${info.total} XP`;
    $("xp-bar").style.width = `${info.inLevel}%`;
    $("stat-strength").textContent = 10 + Math.floor(info.total/100)*2;
    $("stat-vitality").textContent = 10 + Math.floor(info.total/150)*2;
    $("stat-agility").textContent = 10 + Math.floor(info.total/200)*2;
    $("stat-intellect").textContent = 10 + Math.floor(info.total/100)*2;
    $("today-label").textContent = dateLabel(today());
    const completed = todayCompleted();
    $("done-count").textContent = `${completed.length}/${quests.length}`;
    $("quest-list").innerHTML = quests.map(q => {
      const done = completed.includes(q.id);
      return `<article class="quest ${done ? "completed" : ""}">
        <div class="quest-symbol">${done ? "✓" : q.icon}</div>
        <div class="quest-info"><div class="quest-title">${q.title}</div><div class="quest-desc">${q.desc}</div></div>
        <div class="quest-xp">+${q.xp} XP</div>
        <button class="quest-action" data-quest="${q.id}" ${done ? "disabled" : ""}>${done ? "✓ مكتملة" : "إكمال المهمة"}</button>
      </article>`;
    }).join("");
    $("activity-log").innerHTML = state.history.length ? state.history.slice(0,12).map(entry =>
      `<div class="log-entry"><span>${escapeHtml(entry.title)} <span class="muted">· ${escapeHtml(entry.date)}</span></span><strong>+${entry.xp} XP</strong></div>`
    ).join("") : '<p class="muted small">لم تُسجّل إنجازات بعد.</p>';
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function completeQuest(id) {
    const quest = quests.find(q => q.id === id);
    if (!quest) return;
    const key = today();
    const done = state.completed[key] || [];
    if (done.includes(id)) { showToast("تم احتساب هذه المهمة من قبل."); return; }
    const oldLevel = levelInfo(state.totalXp).level;
    state.completed[key] = [...done, id];
    state.totalXp += quest.xp;
    state.history.unshift({id, title:quest.title, xp:quest.xp, date:key, timestamp:Date.now()});
    state.history = state.history.slice(0,100);
    if (!saveState()) {
      // Keep current session usable, but clearly tell the user persistence failed.
      render();
      return;
    }
    render();
    const newLevel = levelInfo(state.totalXp).level;
    if (newLevel > oldLevel) {
      $("level-modal-text").textContent = `أصبحت في المستوى ${newLevel}. إجمالي خبرتك الآن ${state.totalXp} XP.`;
      $("level-modal").classList.remove("hidden");
    } else {
      showToast(`تم إكمال «${quest.title}» — حصلت على ${quest.xp} XP!`);
    }
  }
  $("quest-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-quest]");
    if (button && !button.disabled) completeQuest(button.dataset.quest);
  });
  $("save-name").addEventListener("click", () => {
    const name = $("player-name").value.trim().slice(0,24) || "اللاعب";
    state.name = name;
    if (saveState()) { render(); showToast("تم حفظ اسم اللاعب."); }
  });
  $("player-name").addEventListener("keydown", event => {
    if (event.key === "Enter") $("save-name").click();
  });
  $("close-modal").addEventListener("click", () => $("level-modal").classList.add("hidden"));
  $("level-modal").addEventListener("click", event => {
    if (event.target === $("level-modal")) $("level-modal").classList.add("hidden");
  });
  $("reset-button").addEventListener("click", () => {
    const confirmed = window.confirm("هل تريد حذف مستوى اللاعب والخبرة وسجل الإنجازات من هذا المتصفح؟ لا يمكن التراجع عن ذلك.");
    if (!confirmed) return;
    state = freshState();
    if (saveState()) { render(); showToast("تمت إعادة ضبط التقدم."); }
  });
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) { state = loadState(); render(); }
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(err => console.log("Service worker unavailable", err)));
  }
  render();
})();