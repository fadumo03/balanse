// Balanse – brukergrensesnitt. Logikken for selve planen ligger i plan.js.
(function () {
  "use strict";

  const B = window.Balanse;
  const STORAGE_KEY = "balanse-v1";
  const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

  const $ = (id) => document.getElementById(id);

  // ---------- Lagring ----------
  function emptyState() {
    return { settings: Object.assign({}, B.DEFAULT_SETTINGS), exams: [], logs: {}, done: {} };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      return Object.assign(emptyState(), parsed, {
        settings: Object.assign({}, B.DEFAULT_SETTINGS, parsed.settings)
      });
    } catch (e) {
      return emptyState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Privat modus e.l. – appen fungerer fortsatt, men lagrer ikke.
    }
  }

  let state = load();
  const today = () => B.toKey(new Date());
  let currentWeek = B.weekStart(today());

  // ---------- Formatering ----------
  function fmtMinutes(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h && m) return `${h} t ${m} min`;
    if (h) return `${h} t`;
    return `${m} min`;
  }

  function fmtDate(key) {
    const d = B.parseKey(key);
    return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  }

  function isoWeek(key) {
    const d = B.parseKey(key);
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Uke ----------
  function renderWeek() {
    const t = today();
    const week = B.buildWeek(currentWeek, state, t);
    const end = B.addDays(currentWeek, 6);

    $("week-title").textContent = `Uke ${isoWeek(currentWeek)}`;
    $("week-range").textContent = `${fmtDate(currentWeek)} – ${fmtDate(end)}`;

    let doneSessions = 0;
    let doneStudy = 0;
    let plannedSessions = 0;
    for (const day of week.days) {
      const done = state.done[day.key] || {};
      if (day.training && day.training.isSession) {
        plannedSessions++;
        if (done.training) doneSessions++;
      }
      if (done.study) doneStudy += day.study;
    }

    const modeClass = { "Rolig uke": "calm", "Eksamensperiode": "mid", "Innspurt": "high" }[week.mode];
    $("week-summary").innerHTML = `
      <span class="badge ${modeClass}">${week.mode}</span>
      <div class="stats">
        <div><span class="dot study"></span><strong>${fmtMinutes(week.totalStudy)}</strong><small>lesing</small></div>
        <div><span class="dot train"></span><strong>${fmtMinutes(week.totalTraining)}</strong><small>trening</small></div>
        <div><strong>${doneSessions}/${plannedSessions}</strong><small>økter gjort</small></div>
      </div>
      <div class="progress" aria-label="Lesetid fullført">
        <span style="width:${week.totalStudy ? Math.round((doneStudy / week.totalStudy) * 100) : 0}%"></span>
      </div>
      <small class="muted">${fmtMinutes(doneStudy)} av ${fmtMinutes(week.totalStudy)} lesetid fullført</small>`;

    const showPrompt = t >= currentWeek && t <= end && !state.logs[t];
    $("log-prompt").innerHTML = showPrompt
      ? `<button class="card prompt" data-go="log">Hvordan sov du i natt, og hvor stresset er du? <strong>Logg nå ›</strong></button>`
      : "";

    $("days").innerHTML = week.days.map((day) => renderDay(day, t)).join("");
  }

  function renderDay(day, t) {
    const done = state.done[day.key] || {};
    const isToday = day.key === t;
    const past = day.key < t;
    const pressurePct = Math.round(day.pressure * 100);
    const exam = day.examToday
      ? `<span class="chip exam">Eksamen: ${escapeHtml(day.examToday.subject)}</span>`
      : "";

    const training = day.training
      ? `<label class="task ${done.training ? "checked" : ""}">
           <input type="checkbox" data-day="${day.key}" data-kind="training" ${done.training ? "checked" : ""}>
           <span class="dot train"></span>
           <span class="task-text"><strong>${day.training.label}</strong> · ${day.training.activity}
             <small>${day.training.minutes} min</small></span>
         </label>`
      : `<div class="task rest"><span class="dot rest"></span><span class="task-text">Hviledag</span></div>`;

    const study = day.study > 0
      ? `<label class="task ${done.study ? "checked" : ""}">
           <input type="checkbox" data-day="${day.key}" data-kind="study" ${done.study ? "checked" : ""}>
           <span class="dot study"></span>
           <span class="task-text"><strong>Les</strong> <small>${fmtMinutes(day.study)}</small></span>
         </label>`
      : "";

    const tip = day.sleepTip ? `<p class="tip">${day.sleepTip}</p>` : "";
    const reasons = day.reasons.length
      ? `<details><summary>Hvorfor?</summary><ul>${day.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></details>`
      : "";

    return `
      <article class="card day ${isToday ? "today" : ""} ${past ? "past" : ""}">
        <div class="day-head">
          <h3>${day.name} <span class="muted">${fmtDate(day.key)}</span></h3>
          ${isToday ? `<span class="chip">I dag</span>` : ""}
          ${exam}
        </div>
        <div class="pressure" title="Eksamenspress ${pressurePct} %"><span style="width:${pressurePct}%"></span></div>
        ${study}
        ${training}
        ${tip}
        ${reasons}
      </article>`;
  }

  $("days").addEventListener("change", (e) => {
    const box = e.target;
    if (!box.matches("input[type=checkbox]")) return;
    const key = box.dataset.day;
    state.done[key] = Object.assign({}, state.done[key], { [box.dataset.kind]: box.checked });
    save();
    renderWeek();
  });

  $("prev-week").addEventListener("click", () => {
    currentWeek = B.addDays(currentWeek, -7);
    renderWeek();
  });
  $("next-week").addEventListener("click", () => {
    currentWeek = B.addDays(currentWeek, 7);
    renderWeek();
  });

  // ---------- Logg ----------
  let stressValue = 3;

  function setStress(v) {
    stressValue = v;
    for (const btn of $("stress-group").children) btn.classList.toggle("on", Number(btn.dataset.v) === v);
  }

  function fillLogForm(key) {
    const entry = state.logs[key];
    $("log-date").value = key;
    $("log-sleep").value = entry ? entry.sleep : 7.5;
    $("sleep-out").textContent = `${String($("log-sleep").value).replace(".", ",")} t`;
    setStress(entry ? entry.stress : 3);
  }

  function renderLog() {
    const t = today();
    let html = "";
    for (let i = 13; i >= 0; i--) {
      const key = B.addDays(t, -i);
      const entry = state.logs[key];
      const d = B.parseKey(key);
      const sleepH = entry ? Math.min(100, (entry.sleep / 12) * 100) : 0;
      const stressH = entry ? (entry.stress / 5) * 100 : 0;
      html += `<div class="bar-col" title="${fmtDate(key)}${entry ? `: ${entry.sleep} t søvn, stress ${entry.stress}` : ""}">
        <div class="bars">
          <span class="bar sleep" style="height:${sleepH}%"></span>
          <span class="bar stress" style="height:${stressH}%"></span>
        </div>
        <small>${d.getDate()}</small>
      </div>`;
    }
    $("log-chart").innerHTML = html;
  }

  $("log-sleep").addEventListener("input", (e) => {
    $("sleep-out").textContent = `${String(e.target.value).replace(".", ",")} t`;
  });
  $("log-date").addEventListener("change", (e) => {
    if (e.target.value) fillLogForm(e.target.value);
  });
  $("stress-group").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn) setStress(Number(btn.dataset.v));
  });
  $("log-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const key = $("log-date").value;
    if (!key) return;
    state.logs[key] = { sleep: Number($("log-sleep").value), stress: stressValue };
    save();
    renderLog();
    const readiness = B.readinessFor(today(), state.logs, today());
    let msg = "Lagret.";
    if (readiness && readiness.value < 0.4) msg += " Du virker sliten – planen er justert med lettere trening og kortere leseøkter.";
    else if (readiness && readiness.value > 0.75) msg += " Du har godt overskudd – planen kjører som normalt.";
    $("log-feedback").textContent = msg;
  });

  // ---------- Eksamener ----------
  function renderExams() {
    const t = today();
    const exams = [...state.exams].sort((a, b) => a.date.localeCompare(b.date));
    if (!exams.length) {
      $("exam-list").innerHTML = `<li class="card empty">Ingen eksamener lagt inn ennå.</li>`;
      return;
    }
    $("exam-list").innerHTML = exams.map((exam) => {
      const days = B.daysBetween(t, exam.date);
      const when = days < 0 ? "Ferdig" : days === 0 ? "I dag!" : days === 1 ? "I morgen" : `Om ${days} dager`;
      return `<li class="card exam-item ${days < 0 ? "past" : ""}">
        <div><strong>${escapeHtml(exam.subject)}</strong><small class="muted">${fmtDate(exam.date)}</small></div>
        <span class="chip ${days >= 0 && days <= 7 ? "exam" : ""}">${when}</span>
        <button class="icon-btn" data-delete="${exam.id}" aria-label="Slett ${escapeHtml(exam.subject)}">×</button>
      </li>`;
    }).join("");
  }

  $("exam-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const subject = $("exam-subject").value.trim();
    const date = $("exam-date").value;
    if (!subject || !date) return;
    state.exams.push({ id: String(Date.now()), subject, date });
    save();
    $("exam-form").reset();
    renderExams();
  });
  $("exam-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete]");
    if (!btn) return;
    state.exams = state.exams.filter((x) => x.id !== btn.dataset.delete);
    save();
    renderExams();
  });

  // ---------- Mål ----------
  const goalInputs = [
    ["goal-sessions", "sessionsPerWeek", "sessions-out", (v) => String(v)],
    ["goal-minutes", "sessionMinutes", "minutes-out", (v) => `${v} min`],
    ["goal-study-base", "studyBase", "study-base-out", fmtMinutes],
    ["goal-study-max", "studyMax", "study-max-out", fmtMinutes]
  ];

  function renderGoals() {
    for (const [inputId, field, outId, fmt] of goalInputs) {
      $(inputId).value = state.settings[field];
      $(outId).textContent = fmt(state.settings[field]);
    }
  }

  for (const [inputId, field, outId, fmt] of goalInputs) {
    $(inputId).addEventListener("input", (e) => {
      state.settings[field] = Number(e.target.value);
      // Maks lesetid kan ikke være lavere enn vanlig lesetid.
      if (state.settings.studyMax < state.settings.studyBase) {
        if (field === "studyBase") state.settings.studyMax = state.settings.studyBase;
        else state.settings.studyBase = state.settings.studyMax;
        renderGoals();
      }
      $(outId).textContent = fmt(state.settings[field]);
      save();
    });
  }

  $("demo-data").addEventListener("click", () => {
    if (!confirm("Erstatte dataene dine med eksempeldata?")) return;
    const t = today();
    const sleep = [7.5, 8, 7, 6, 5.5, 6, 5];
    const stress = [2, 2, 3, 3, 4, 4, 4];
    const logs = {};
    sleep.forEach((s, i) => { logs[B.addDays(t, i - 6)] = { sleep: s, stress: stress[i] }; });
    state = {
      settings: Object.assign({}, B.DEFAULT_SETTINGS),
      exams: [
        { id: "1", subject: "Matematikk 1", date: B.addDays(t, 5) },
        { id: "2", subject: "Statistikk", date: B.addDays(t, 19) },
        { id: "3", subject: "Programmering", date: B.addDays(t, 40) }
      ],
      logs,
      done: {}
    };
    save();
    renderAll();
    show("week");
  });

  $("reset-data").addEventListener("click", () => {
    if (!confirm("Slette alle eksamener, logger og mål?")) return;
    state = emptyState();
    save();
    renderAll();
  });

  // ---------- Navigasjon ----------
  function show(view) {
    for (const v of document.querySelectorAll(".view")) v.classList.toggle("active", v.id === `view-${view}`);
    for (const b of document.querySelectorAll(".tabbar button")) b.classList.toggle("on", b.dataset.view === view);
    if (view === "week") renderWeek();
    if (view === "log") { fillLogForm(today()); renderLog(); $("log-feedback").textContent = ""; }
    if (view === "exams") renderExams();
    if (view === "goals") renderGoals();
    window.scrollTo(0, 0);
  }

  document.querySelector(".tabbar").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view]");
    if (btn) show(btn.dataset.view);
  });
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) show(go.dataset.go);
  });

  function renderAll() {
    renderWeek();
    renderLog();
    renderExams();
    renderGoals();
  }

  renderAll();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
