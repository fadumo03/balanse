// Balanse – brukergrensesnitt. Logikken for planen ligger i plan.js, hagen i garden.js og ikonene i icons.js.
(function () {
  "use strict";

  const B = window.Balanse;
  const G = window.Garden;
  const { icon, art } = window.Icons;
  const STORAGE_KEY = "balanse-v1";
  const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
  const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
  const THEMES = [
    { id: "mint", name: "Mint", swatch: "#1f8a70", bar: "#f7f8f7" },
    { id: "fersken", name: "Fersken", swatch: "#e0684b", bar: "#faf7f5" },
    { id: "lavendel", name: "Lavendel", swatch: "#6d5bd0", bar: "#f8f7fb" },
    { id: "hav", name: "Hav", swatch: "#2472b8", bar: "#f5f8fa" },
    { id: "natt", name: "Natt", swatch: "#1b1f24", bar: "#121417" }
  ];
  const WEATHER = {
    sun: { icon: "sun", short: "Sol", text: "Sol i hagen – du har sovet godt og har lite stress." },
    cloud: { icon: "cloud", short: "Skyet", text: "Litt skyet. Logg søvn og stress for å få sol." },
    rain: { icon: "cloudRain", short: "Regn", text: "Regn i dag – lite søvn eller mye stress. Ta det litt roligere." }
  };
  const REMIND_OPTIONS = [[0, "Samme dag"], [1, "1 dag før"], [3, "3 dager før"], [7, "1 uke før"]];
  const CONFETTI_COLORS = ["#1f8a70", "#3b6fd4", "#f9c23c", "#ef6f98", "#9b87e8"];
  const RING = 2 * Math.PI * 90;

  const $ = (id) => document.getElementById(id);

  // Statiske ikoner i HTML-en
  for (const el of document.querySelectorAll("[data-icon]")) el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));

  // ---------- Lagring ----------
  function copyTemplates() {
    return JSON.parse(JSON.stringify(B.DEFAULT_TEMPLATES));
  }

  function emptyState() {
    return G.ensure({
      settings: Object.assign({}, B.DEFAULT_SETTINGS, { notify: false }),
      templates: copyTemplates(),
      subjects: [],
      tasks: [],
      notified: {},
      logs: {},
      done: {},
      trainingOverride: {},
      active: null
    });
  }

  // Versjon 1–4 hadde en egen eksamensliste. Den gjøres om til fag med eksamensdato.
  function subjectsFromExams(exams) {
    return (exams || []).map((e) => ({ id: e.id, name: e.subject, difficulty: 2, examDate: e.date, obliger: [] }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      const loaded = G.ensure(Object.assign(emptyState(), parsed, {
        settings: Object.assign({}, B.DEFAULT_SETTINGS, { notify: false }, parsed.settings),
        templates: parsed.templates || copyTemplates(),
        trainingOverride: parsed.trainingOverride || {},
        subjects: parsed.subjects || subjectsFromExams(parsed.exams),
        tasks: parsed.tasks || [],
        notified: parsed.notified || {}
      }));
      delete loaded.exams;
      return loaded;
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
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  let currentWeek = B.weekStart(today());

  // Planen bruker både eksamener og åpne obliger fra fagene.
  const planState = () => Object.assign({}, state, { exams: B.planItems(state.subjects) });
  const weekPlan = (start) => B.buildWeek(start, planState(), today());
  const subjectById = (id) => state.subjects.find((s) => s.id === id);

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

  function fmtDay(key) {
    return `${WEEKDAYS[B.parseKey(key).getDay()]} ${fmtDate(key)}`;
  }

  function dueText(days) {
    if (days < 0) return days === -1 ? "1 dag på overtid" : `${-days} dager på overtid`;
    return `frist ${B.whenText(days)}`;
  }

  function isoWeek(key) {
    const d = B.parseKey(key);
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  }

  // «en tulipan», «et tre»
  function withArticle(plant) {
    return `${plant.article || "en"} ${plant.name.toLowerCase()}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Feiring ----------
  let toastTimer;
  function toast(text) {
    const el = $("toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function confetti(count) {
    const box = $("confetti");
    box.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.animationDuration = `${1.1 + Math.random() * 0.8}s`;
      box.appendChild(piece);
    }
    setTimeout(() => { box.innerHTML = ""; }, 2500);
  }

  // Egen bekreftelsesdialog. confirm() returnerer «nei» uten å vise noe i enkelte nettlesere og installerte apper.
  function ask(text, okLabel, destructive = true) {
    return new Promise((resolve) => {
      $("dialog-text").textContent = text;
      $("dialog-ok").textContent = okLabel;
      $("dialog-ok").classList.toggle("destructive", destructive);
      $("dialog").hidden = false;
      $("dialog-ok").focus();
      const done = (answer) => {
        $("dialog").hidden = true;
        $("dialog-ok").onclick = null;
        $("dialog-cancel").onclick = null;
        resolve(answer);
      };
      $("dialog-ok").onclick = () => done(true);
      $("dialog-cancel").onclick = () => done(false);
    });
  }

  // ---------- Tema ----------
  function applyTheme() {
    const theme = THEMES.find((x) => x.id === state.settings.theme) || THEMES[0];
    if (theme.id === "mint") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme.id;
    document.querySelector('meta[name="theme-color"]').setAttribute("content", theme.bar);
    $("theme-picker").innerHTML = THEMES.map((x) => `
      <button type="button" class="theme-btn ${x.id === theme.id ? "on" : ""}" data-theme-id="${x.id}" aria-pressed="${x.id === theme.id}">
        <span class="sw" style="background:${x.swatch}"></span>${x.name}
      </button>`).join("");
  }

  $("theme-picker").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-id]");
    if (!btn) return;
    state.settings.theme = btn.dataset.themeId;
    save();
    applyTheme();
  });

  // ---------- Nøkkeltall øverst ----------
  function plantsThisWeek() {
    const start = B.weekStart(today());
    const end = B.addDays(start, 6);
    return state.sessions.filter((s) => s.status === "grown" && s.minutes > 0 && s.day >= start && s.day <= end).length;
  }

  function renderStats() {
    const t = today();
    const streak = G.streak(state, t);
    const readToday = G.studyMinutes(state, t) > 0;
    const w = WEATHER[G.weather(state, t)];
    const plants = plantsThisWeek();

    let message;
    if (readToday) message = "Dagens økt er gjort. Streaken er trygg.";
    else if (streak > 0) message = `Fullfør en leseøkt i dag for å holde streaken på ${streak + 1} dager.`;
    else message = "Start en leseøkt for å plante noe og starte en streak.";

    $("streak-card").innerHTML = `
      <div class="stat-row">
        <button class="stat" data-go="garden"><span class="stat-top"><span class="stat-ico flame ${streak ? "" : "off"}">${icon("flame")}</span><strong>${streak}</strong></span>
          <small>${streak === 1 ? "dag" : "dager"} på rad</small></button>
        <button class="stat" data-go="garden"><span class="stat-top"><span class="stat-ico leaf">${icon("sprout")}</span><strong>${plants}</strong></span>
          <small>${plants === 1 ? "plante" : "planter"} denne uka</small></button>
        <button class="stat" data-go="log"><span class="stat-top"><span class="stat-ico w-${G.weather(state, t)}">${icon(w.icon)}</span><strong>${w.short}</strong></span>
          <small>vær i hagen</small></button>
      </div>
      <p class="hint">${message}</p>`;
  }

  // ---------- Påminnelser om frister ----------
  function renderReminders() {
    const list = B.dueReminders(state.subjects, today());
    if (!list.length) {
      $("reminders").innerHTML = "";
      return;
    }
    $("reminders").innerHTML = `
      <div class="card reminders">
        <h2><span class="h-ico">${icon("clock")}</span>Frister</h2>
        ${list.map(({ subject, oblig, days }) => `
          <div class="reminder ${days < 0 ? "late" : days <= 1 ? "soon" : ""}">
            <input type="checkbox" data-oblig-done="${subject.id}:${oblig.id}" aria-label="Marker ${escapeHtml(oblig.title)} som levert">
            <button class="reminder-text" data-open-subject="${subject.id}" data-subtab="obliger">
              <strong>${escapeHtml(oblig.title)}</strong>
              <small>${escapeHtml(subject.name)} · ${fmtDay(oblig.due)}</small>
            </button>
            <span class="chip ${days <= 1 ? "exam" : ""}">${dueText(days)}</span>
          </div>`).join("")}
        <p class="muted small reminder-hint">Kryss av når du har levert.</p>
      </div>`;
  }

  function setObligDone(subjectId, obligId, done) {
    const s = subjectById(subjectId);
    const o = s && s.obliger.find((x) => x.id === obligId);
    if (!o) return;
    o.done = done;
    save();
    renderAll();
    if (done) {
      toast(`${o.title} er markert som levert. Bra jobba!`);
      confetti(30);
    }
  }

  // Varsel på telefonen når appen åpnes og en frist nærmer seg (én gang per frist per dag).
  async function notifyDue() {
    if (!state.settings.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    const t = today();
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
    let changed = false;
    for (const { subject, oblig, days } of B.dueReminders(state.subjects, t)) {
      const key = `${oblig.id}:${t}`;
      if (state.notified[key]) continue;
      state.notified[key] = true;
      changed = true;
      const title = `${subject.name}: ${oblig.title}`;
      const body = `${dueText(days).replace(/^./, (c) => c.toUpperCase())} (${fmtDay(oblig.due)}).`;
      try {
        if (reg) await reg.showNotification(title, { body, icon: "icon-192.png", tag: oblig.id });
        else new Notification(title, { body, icon: "icon-192.png" });
      } catch (e) {
        // Varsler er ikke tilgjengelige her – påminnelsen vises uansett i appen.
      }
    }
    if (changed) save();
  }

  function renderNotify() {
    const supported = "Notification" in window;
    const on = state.settings.notify && supported && Notification.permission === "granted";
    $("notify-toggle").textContent = on ? "Slå av varsler" : "Slå på varsler";
    $("notify-toggle").disabled = !supported || (Notification.permission === "denied" && !on);
    let status = "";
    if (!supported) status = "Denne nettleseren støtter ikke varsler. På iPhone må appen være lagt på hjemskjermen.";
    else if (Notification.permission === "denied") status = "Varsler er blokkert i nettleseren. Du kan slå dem på i nettleserens innstillinger.";
    else if (on) status = "Varsler er på. Du får varsel når du åpner appen og en frist nærmer seg.";
    $("notify-status").textContent = status;
  }

  $("notify-toggle").addEventListener("click", async () => {
    if (state.settings.notify) {
      state.settings.notify = false;
    } else if ("Notification" in window) {
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      state.settings.notify = permission === "granted";
    }
    save();
    renderNotify();
    notifyDue();
  });

  // Kalenderfilen lages i plan.js (B.icsFor) og lastes ned her.
  function downloadIcs(subject, obliger, filename) {
    const blob = new Blob([B.icsFor(subject.name, obliger)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Åpne filen for å legge fristen i kalenderen.");
  }

  // ---------- Trening per dag ----------
  function trainingFor(day) {
    const o = state.trainingOverride[day.key];
    if (o && o.rest) return null;
    if (o && o.level !== undefined) {
      const list = state.templates[o.level] && state.templates[o.level].length ? state.templates[o.level] : B.DEFAULT_TEMPLATES[o.level];
      return {
        level: o.level,
        label: B.ACTIVITIES[o.level].label,
        activity: list[o.index] || list[0],
        minutes: B.minutesForLevel(o.level, state.settings.sessionMinutes),
        isSession: true,
        custom: true
      };
    }
    return day.training;
  }

  function swapSelect(day) {
    const groups = [2, 1, 0].map((lvl) => {
      const list = state.templates[lvl].length ? state.templates[lvl] : B.DEFAULT_TEMPLATES[lvl];
      return `<optgroup label="${B.ACTIVITIES[lvl].label}">${list.map((t, i) => `<option value="${lvl}:${i}">${escapeHtml(t)}</option>`).join("")}</optgroup>`;
    }).join("");
    const hasOverride = !!state.trainingOverride[day.key];
    return `<select class="swap" data-swap="${day.key}" aria-label="Bytt treningsøkt ${day.name}">
      <option value="">Bytt økt</option>${groups}
      <option value="rest">Hviledag</option>
      ${hasOverride ? `<option value="reset">Tilbake til forslaget</option>` : ""}
    </select>`;
  }

  // ---------- Uke ----------
  function renderWeek() {
    renderStats();
    renderReminders();
    const t = today();
    const week = weekPlan(currentWeek);
    const end = B.addDays(currentWeek, 6);

    $("week-title").textContent = `Uke ${isoWeek(currentWeek)}`;
    $("week-range").textContent = `${fmtDate(currentWeek)} – ${fmtDate(end)}`;

    // Ukemål: planlagt for hele uka, og hvor mye som faktisk er gjort.
    let doneStudy = 0;
    let plannedTraining = 0;
    let doneTraining = 0;
    let plannedSessions = 0;
    let doneSessions = 0;
    for (const day of week.days) {
      const tr = trainingFor(day);
      const trained = !!(state.done[day.key] || {}).training;
      if (tr) {
        plannedTraining += tr.minutes;
        if (trained) doneTraining += tr.minutes;
      }
      if (tr && tr.isSession) {
        plannedSessions++;
        if (trained) doneSessions++;
      }
      doneStudy += G.studyMinutes(state, day.key);
    }

    const pctOf = (done, planned) => (planned ? Math.min(100, Math.round((done / planned) * 100)) : 0);
    const upcoming = B.planItems(state.subjects)
      .map((x) => ({ ...x, days: B.daysBetween(t, x.date) }))
      .filter((x) => x.days >= 0)
      .sort((a, b) => a.days - b.days || (a.kind === "exam" ? -1 : 1))[0];
    let why;
    if (!upcoming) why = "Ingen eksamener eller frister lagt inn";
    else if (upcoming.kind === "oblig") why = `Frist for ${escapeHtml(upcoming.subject)} ${B.whenText(upcoming.days)}`;
    else why = `${escapeHtml(upcoming.subject)} ${B.whenText(upcoming.days)}`;

    const modeClass = { "Rolig uke": "calm", "Eksamensperiode": "mid", "Innspurt": "high" }[week.mode];
    $("week-summary").innerHTML = `
      <div class="summary-head">
        <h2>Ukemål</h2>
        <span class="badge ${modeClass}">${week.mode}</span>
      </div>
      <p class="muted small summary-why">${why}. Planen for uka er regnet ut fra eksamener, frister og søvnen din.</p>
      <div class="goal">
        <div class="goal-top"><span><span class="dot study"></span>Lest</span>
          <span><strong>${fmtMinutes(doneStudy)}</strong> <span class="muted">av ${fmtMinutes(week.totalStudy)}</span></span></div>
        <div class="progress"><span style="width:${pctOf(doneStudy, week.totalStudy)}%"></span></div>
      </div>
      <div class="goal">
        <div class="goal-top"><span><span class="dot train"></span>Trent</span>
          <span><strong>${fmtMinutes(doneTraining)}</strong> <span class="muted">av ${fmtMinutes(plannedTraining)} · ${doneSessions} av ${plannedSessions} økter</span></span></div>
        <div class="progress train"><span style="width:${pctOf(doneTraining, plannedTraining)}%"></span></div>
      </div>`;

    const showPrompt = t >= currentWeek && t <= end && !state.logs[t];
    $("log-prompt").innerHTML = showPrompt
      ? `<button class="card prompt" data-go="log"><span>Hvordan sov du i natt?</span><span class="prompt-go">Logg ${icon("chevronRight")}</span></button>`
      : "";

    $("days").innerHTML = week.days.map((day) => renderDay(day, t)).join("");
  }

  // Hva du bør lese en dag, fordelt på fag.
  function suggestionsFor(day) {
    return B.suggestSubjects(state.subjects, day.key, day.study);
  }

  function minutesBySubject(dayKey) {
    const out = {};
    for (const s of state.sessions) {
      if (s.day === dayKey && s.status === "grown" && s.minutes > 0 && s.subjectId) out[s.subjectId] = (out[s.subjectId] || 0) + s.minutes;
    }
    return out;
  }

  function renderDay(day, t) {
    const done = state.done[day.key] || {};
    const isToday = day.key === t;
    const past = day.key < t;
    const pressurePct = Math.round(day.pressure * 100);
    const exam = day.examToday
      ? `<span class="chip exam">Eksamen: ${escapeHtml(day.examToday.subject)}</span>`
      : "";

    // Lesing – fylles bare av ekte timer-tid
    const readMin = G.studyMinutes(state, day.key);
    const plants = state.sessions.filter((s) => s.day === day.key).map((s) => art(s.plant, "mini")).join("");
    const studyDone = day.study > 0 && readMin >= day.study;
    let action = "";
    if (isToday) action = `<button class="start-btn" data-open-focus>${icon("play")}Les</button>`;
    else if (studyDone) action = `<span class="check-badge">${icon("check")}</span>`;

    // Forslag til fag (ikke for dager som er over)
    let subjectsHtml = "";
    if (!past && day.study > 0) {
      const read = minutesBySubject(day.key);
      const sugg = suggestionsFor(day);
      if (sugg.length) {
        subjectsHtml = `<ul class="suggest">${sugg.map((x) => `
          <li>
            <span class="suggest-text"><strong>${escapeHtml(x.name)}</strong> · ${fmtMinutes(x.minutes)}
              <small>${escapeHtml(x.reason)}${read[x.subjectId] ? ` · ${fmtMinutes(read[x.subjectId])} lest` : ""}</small></span>
            ${isToday ? `<button class="small-btn" data-open-focus data-subject="${x.subjectId}">Les</button>` : ""}
          </li>`).join("")}</ul>`;
      } else if (isToday && !state.subjects.length) {
        subjectsHtml = `<button class="link-btn" data-go="exams">Legg inn fagene dine for å få forslag til hva du bør lese ${icon("chevronRight")}</button>`;
      }
    }

    const study = day.study > 0
      ? `<div class="task study-task ${studyDone ? "complete" : ""} ${subjectsHtml ? "has-suggest" : ""}">
           <span class="dot study"></span>
           <span class="task-text"><strong>Les ${fmtMinutes(day.study)}</strong>
             <small>${readMin ? `${fmtMinutes(readMin)} lest` : past ? "Ingen økter" : "Ikke startet"}${plants ? `<span class="minis">${plants}</span>` : ""}</small>
             <span class="mini-progress"><span style="width:${Math.min(100, Math.round((readMin / day.study) * 100))}%"></span></span>
           </span>
           ${action}
         </div>
         ${subjectsHtml ? `<div class="suggest-wrap">${subjectsHtml}</div>` : ""}`
      : "";

    // Dagens oppgaver
    const tasks = B.tasksForDay(state.tasks, day.key, t);
    let tasksHtml = "";
    if (isToday || tasks.length) {
      const subjectOptions = state.subjects.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
      tasksHtml = `<div class="tasks">
        <p class="tasks-title">${isToday ? "Dagens oppgaver" : "Oppgaver"}</p>
        <ul class="task-list">${tasks.map((task) => {
          const subj = task.subjectId && subjectById(task.subjectId);
          const carried = isToday && !task.done && task.day < t;
          return `<li class="${task.done ? "checked" : ""}">
            <input type="checkbox" data-task="${task.id}" aria-label="Oppgave gjort" ${task.done ? "checked" : ""} ${past ? "disabled" : ""}>
            <span class="task-label">${escapeHtml(task.text)}
              ${subj || carried ? `<small>${subj ? escapeHtml(subj.name) : ""}${subj && carried ? " · " : ""}${carried ? (B.daysBetween(task.day, t) === 1 ? "fra i går" : `fra ${fmtDate(task.day)}`) : ""}</small>` : ""}</span>
            ${past ? "" : `<button type="button" class="icon-btn tiny" data-task-del="${task.id}" aria-label="Slett oppgave">${icon("x")}</button>`}
          </li>`;
        }).join("")}</ul>
        ${isToday ? `<form class="task-add" data-task-add="${day.key}">
          <input type="text" maxlength="80" placeholder="F.eks. Les kap. 4" aria-label="Ny oppgave">
          ${state.subjects.length ? `<select aria-label="Fag"><option value="">Fag</option>${subjectOptions}</select>` : ""}
          <button type="submit" class="small-btn">Legg til</button>
        </form>` : ""}
      </div>`;
    }

    // Trening – egen økt fra listen, kan byttes
    const tr = trainingFor(day);
    const training = tr
      ? `<div class="task train-task ${done.training ? "checked" : ""}">
           <input type="checkbox" data-day="${day.key}" data-kind="training" aria-label="Trening gjort" ${done.training ? "checked" : ""}>
           <span class="dot train"></span>
           <span class="task-text"><strong>${tr.label}</strong> · ${escapeHtml(tr.activity)}
             <small>${tr.minutes} min · vanner hele hagen</small>
             ${swapSelect(day)}</span>
         </div>`
      : `<div class="task rest"><span class="dot rest"></span><span class="task-text">Hviledag ${swapSelect(day)}</span></div>`;

    const tip = day.sleepTip ? `<p class="tip">${icon("moon")}<span>${day.sleepTip}</span></p>` : "";
    const reasons = day.reasons.slice();
    if (tr && tr.custom) reasons.push("Du har valgt denne økta selv.");
    if (subjectsHtml && state.subjects.length) reasons.push("Fagene er valgt ut fra hvor vanskelige de er og hvor nær eksamen eller frister er.");
    const why = reasons.length
      ? `<details><summary>Hvorfor?</summary><ul>${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></details>`
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
        ${tasksHtml}
        ${training}
        ${tip}
        ${why}
      </article>`;
  }

  $("days").addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("select[data-swap]")) {
      const key = el.dataset.swap;
      if (el.value === "rest") state.trainingOverride[key] = { rest: true };
      else if (el.value === "reset") delete state.trainingOverride[key];
      else if (el.value) {
        const [level, index] = el.value.split(":").map(Number);
        state.trainingOverride[key] = { level, index };
      }
      save();
      renderWeek();
      return;
    }
    if (el.matches("input[data-task]")) {
      const task = state.tasks.find((x) => x.id === el.dataset.task);
      if (!task) return;
      task.done = el.checked;
      task.doneDay = el.checked ? today() : null;
      save();
      renderWeek();
      if (el.checked) toast("Oppgave gjort.");
      return;
    }
    if (!el.matches("input[data-kind=training]")) return;
    const key = el.dataset.day;
    state.done[key] = Object.assign({}, state.done[key], { training: el.checked });
    let bloomed = 0;
    if (el.checked) bloomed = G.giveWater(state, key);
    save();
    renderWeek();
    if (!el.checked) return;
    if (bloomed) {
      toast(`Hagen er vannet – ${bloomed} ${bloomed === 1 ? "plante blomstrer" : "planter blomstrer"}`);
      confetti(30);
    } else {
      toast("Bra jobba! Hagen er vannet.");
    }
  });

  $("days").addEventListener("submit", (e) => {
    const form = e.target.closest("[data-task-add]");
    if (!form) return;
    e.preventDefault();
    const text = form.querySelector("input").value.trim();
    if (!text) return;
    const select = form.querySelector("select");
    state.tasks.push({ id: uid(), text, subjectId: select && select.value ? select.value : null, day: form.dataset.taskAdd, done: false, doneDay: null });
    save();
    renderWeek();
  });

  $("days").addEventListener("click", (e) => {
    const del = e.target.closest("[data-task-del]");
    if (!del) return;
    const task = state.tasks.find((x) => x.id === del.dataset.taskDel);
    if (!task) return;
    ask(`Slette oppgaven «${task.text}»?`, "Slett").then((ok) => {
      if (!ok) return;
      state.tasks = state.tasks.filter((x) => x.id !== task.id);
      save();
      renderWeek();
    });
  });

  $("reminders").addEventListener("change", (e) => {
    const box = e.target.closest("[data-oblig-done]");
    if (!box || !box.checked) return;
    const [sid, oid] = box.dataset.obligDone.split(":");
    setObligDone(sid, oid, true);
  });

  $("prev-week").addEventListener("click", () => {
    currentWeek = B.addDays(currentWeek, -7);
    renderWeek();
  });
  $("next-week").addEventListener("click", () => {
    currentWeek = B.addDays(currentWeek, 7);
    renderWeek();
  });

  // ---------- Fokus-timer ----------
  let selectedPlant = "tulipan";
  let selectedSubject = null;
  let tickTimer = null;
  let wakeLock = null;

  async function keepAwake() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (e) {
      // Ikke støttet eller nektet – timeren fungerer uansett.
    }
  }

  function releaseAwake() {
    if (wakeLock) wakeLock.release().catch(() => {});
    wakeLock = null;
  }

  function showFocusPart(part) {
    for (const id of ["focus-pick", "focus-run", "focus-done"]) $(id).hidden = id !== part;
    $("focus").hidden = false;
    document.body.classList.add("focus-open");
  }

  function closeFocus() {
    $("focus").hidden = true;
    document.body.classList.remove("focus-open");
  }

  function examTomorrow() {
    const t = today();
    return B.examsOf(state.subjects).filter((x) => B.daysBetween(t, x.date) === 1 && !state.examFlowers[x.id]);
  }

  function renderSubjectPick() {
    $("subject-pick-wrap").hidden = !state.subjects.length;
    $("subject-pick").innerHTML = state.subjects.map((s) => `
      <button type="button" class="chip-btn ${s.id === selectedSubject ? "on" : ""}" data-pick-subject="${s.id}">${escapeHtml(s.name)}</button>`).join("")
      + `<button type="button" class="chip-btn ${selectedSubject === null ? "on" : ""}" data-pick-subject="">Annet</button>`;
  }

  function openPicker(subjectId) {
    if (state.active) return showRun();
    // Foreslått fag for i dag er valgt på forhånd, men kan byttes.
    if (subjectId !== undefined) selectedSubject = subjectId;
    else {
      const t = today();
      const day = weekPlan(B.weekStart(t)).days.find((d) => d.key === t);
      const top = day ? B.suggestSubjects(state.subjects, t, day.study || 60)[0] : null;
      selectedSubject = top ? top.subjectId : null;
    }
    $("seed-list").innerHTML = G.PLANTS.map((p) => `
      <button type="button" class="seed ${p.id === selectedPlant ? "on" : ""}" data-plant="${p.id}">
        ${art(p.id, "seed-art")}
        <strong>${p.name}</strong>
        <small>${p.minutes} min</small>
      </button>`).join("");
    renderSubjectPick();
    const exams = examTomorrow();
    $("exam-banner").innerHTML = exams.length
      ? `<p class="tip">${art("eksamen", "mini")}<span>Eksamen i morgen. Fullfør en økt i dag og få en eksamensblomst for ${exams.map((x) => escapeHtml(x.subject)).join(" og ")}.</span></p>`
      : "";
    $("golden-wrap").hidden = state.inventory.gjodsel <= 0;
    $("use-golden").checked = false;
    $("gjodsel-count").textContent = `(du har ${state.inventory.gjodsel})`;
    showFocusPart("focus-pick");
  }

  $("seed-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-plant]");
    if (!btn) return;
    selectedPlant = btn.dataset.plant;
    for (const b of $("seed-list").children) b.classList.toggle("on", b === btn);
  });

  $("subject-pick").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pick-subject]");
    if (!btn) return;
    selectedSubject = btn.dataset.pickSubject || null;
    renderSubjectPick();
  });

  function startSession(plantId, golden, revive, subjectId) {
    const plant = G.plantInfo(plantId);
    if (golden) state.inventory.gjodsel--;
    state.active = { start: Date.now(), plant: plant.id, minutes: plant.minutes, golden, subjectId: subjectId || null };
    if (revive) state.active.revive = revive;
    save();
    keepAwake();
    showRun();
  }

  $("start-focus").addEventListener("click", () => {
    startSession(selectedPlant, $("use-golden").checked && state.inventory.gjodsel > 0, null, selectedSubject);
  });

  let lastStage = null;
  function showRun() {
    showFocusPart("focus-run");
    const plant = G.plantInfo(state.active.plant);
    const subj = state.active.subjectId && subjectById(state.active.subjectId);
    let label;
    if (state.active.revive) label = `Den visne planten blir til ${withArticle(plant)} igjen`;
    else if (state.active.golden) label = `Gyllen ${plant.name.toLowerCase()} gror mens du leser`;
    else label = `${plant.name} gror mens du leser`;
    $("focus-label").textContent = subj ? `${subj.name} · ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;
    lastStage = null;
    clearInterval(tickTimer);
    tick();
    tickTimer = setInterval(tick, 1000);
  }

  function tick() {
    const a = state.active;
    if (!a) return;
    const now = Date.now();
    const total = a.minutes * 60000;
    const left = Math.max(0, a.start + total - now);
    const p = 1 - left / total;
    if (G.resolve(a, now) === "complete") return finish();

    const secs = Math.ceil(left / 1000);
    $("countdown").textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
    $("ring-fg").style.strokeDasharray = `${RING}`;
    $("ring-fg").style.strokeDashoffset = `${RING * (1 - p)}`;
    const stage = p < 0.2 ? "seed" : p < 0.5 ? "spire" : p < 0.85 ? "ung" : a.plant;
    const grow = $("grow-plant");
    if (stage !== lastStage) {
      grow.innerHTML = art(stage);
      lastStage = stage;
    }
    grow.style.transform = `scale(${0.7 + 0.3 * p})`;
    grow.classList.toggle("golden", !!a.golden);
  }

  function rewardLine(graphic, text) {
    return `<li><span class="reward-ico">${graphic}</span><span>${text}</span></li>`;
  }

  function finish() {
    const a = state.active;
    clearInterval(tickTimer);
    const end = a.start + a.minutes * 60000;
    const events = G.completeSession(state, a, Math.min(Date.now(), end), B.examsOf(state.subjects));
    state.active = null;
    save();
    releaseAwake();
    renderAll();

    const day = B.toKey(new Date(a.start));
    const planned = weekPlan(B.weekStart(day)).days.find((d) => d.key === day);
    const subj = a.subjectId && subjectById(a.subjectId);
    const lines = events.map((ev) => {
      if (ev.type === "plant" && ev.revived) return rewardLine(art(ev.plant.id), `Den visne planten er gjenopplivet og ble til ${withArticle(ev.plant)} igjen`);
      if (ev.type === "plant") return rewardLine(art(ev.plant.id), `${ev.golden ? "Gyllen " : ""}${ev.plant.name} er plantet i hagen`);
      if (ev.type === "exam") return rewardLine(art("eksamen"), `Eksamensblomst for ${escapeHtml(ev.subject)}. Lykke til i morgen!`);
      if (ev.type === "gjodsel") return rewardLine(icon("sparkles"), "Gjødsel: tre økter i dag. Neste plante kan bli gyllen.");
      if (ev.type === "frys") return rewardLine(icon("snowflake"), `Streak-frys: ${ev.streak} dager på rad. Den redder streaken en dag du ikke rekker å lese.`);
      if (ev.type === "decor") return rewardLine(art(ev.decor.id), `Ny pynt: ${ev.decor.name}. Plasser den i hagen.`);
      return "";
    });
    if (subj) lines.push(rewardLine(icon("book"), `${a.minutes} min ${escapeHtml(subj.name)} · ${fmtMinutes(minutesBySubject(day)[subj.id] || 0)} i dag`));
    if (planned && planned.study) lines.push(rewardLine(icon("clock"), `${fmtMinutes(G.studyMinutes(state, day))} av ${fmtMinutes(planned.study)} lest i dag`));

    $("done-icon").innerHTML = art(events[0].plant.id);
    $("done-icon").classList.toggle("golden", !!events[0].golden);
    $("done-title").textContent = `${a.minutes} minutter i strekk`;
    $("done-rewards").innerHTML = lines.join("");
    showFocusPart("focus-done");
    confetti(events.length > 1 ? 60 : 40);
  }

  function wither(reason) {
    const a = state.active;
    const wasRevive = !!a.revive;
    clearInterval(tickTimer);
    G.witherSession(state, a, Date.now());
    state.active = null;
    save();
    releaseAwake();
    renderAll();
    $("done-icon").innerHTML = art("visnet");
    $("done-icon").classList.remove("golden");
    $("done-title").textContent = wasRevive ? "Ikke gjenopplivet denne gangen" : "Planten visnet";
    $("done-rewards").innerHTML = rewardLine(icon("clock"), reason)
      + rewardLine(icon("info"), wasRevive
        ? "Planten står fortsatt i hagen, og du kan prøve igjen når du vil."
        : `Trykk på den i hagen for å gjenopplive den: les ${a.minutes} min i strekk, så får du planten tilbake.`);
    showFocusPart("focus-done");
  }

  $("give-up").addEventListener("click", async () => {
    const ok = await ask("Gi opp? Planten visner, og økta teller ikke.", "Gi opp");
    // Økta kan ha blitt ferdig mens dialogen var åpen.
    if (ok && state.active) wither("Du ga opp økta.");
  });

  // Snill modus: inntil 2 minutter utenfor appen er greit.
  function checkReturn(isStartup) {
    const a = state.active;
    if (!a) return;
    const result = G.resolve(a, Date.now());
    if (result === "wither") {
      const away = Math.round((Date.now() - a.leftAt) / 60000);
      return wither(`Du var borte fra appen i ${away} min. Grensen er 2 min.`);
    }
    const wasAway = !!a.leftAt;
    delete a.leftAt;
    save();
    if (result === "complete") return finish();
    showRun();
    keepAwake();
    if (wasAway && !isStartup) toast("Velkommen tilbake. Planten lever fortsatt.");
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") notifyDue();
    if (!state.active) return;
    if (document.visibilityState === "hidden") {
      state.active.leftAt = Date.now();
      save();
    } else {
      checkReturn(false);
    }
  });

  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open-focus]");
    if (open) openPicker(open.dataset.subject !== undefined ? open.dataset.subject : undefined);
    if (e.target.closest("[data-close-focus]")) closeFocus();
  });
  $("close-done").addEventListener("click", closeFocus);
  $("to-garden").addEventListener("click", () => {
    closeFocus();
    show("garden");
  });

  // ---------- Hage ----------
  let placing = null;

  function renderGarden() {
    const t = today();
    const wKey = G.weather(state, t);
    $("weather-pill").innerHTML = `<span class="w-${wKey}">${icon(WEATHER[wKey].icon)}</span>${WEATHER[wKey].short}`;
    $("weather-text").textContent = WEATHER[wKey].text;

    const start = B.weekStart(t);
    const week = state.sessions.filter((s) => s.day >= start && s.day <= B.addDays(start, 6));
    const grown = week.filter((s) => s.status === "grown" && s.minutes > 0);
    const withered = week.filter((s) => s.status === "withered").length;
    $("garden-stats").innerHTML = `
      <div><strong>${grown.length}</strong><small>planter denne uka</small></div>
      <div><strong>${fmtMinutes(grown.reduce((x, s) => x + s.minutes, 0))}</strong><small>lest</small></div>
      <div><strong>${withered}</strong><small>visnet</small></div>`;

    const byId = Object.fromEntries(state.sessions.map((s) => [s.id, s]));
    $("garden-grid").innerHTML = state.garden.tiles.map((tile, i) => {
      if (!tile) return `<button class="tile empty ${placing ? "target" : ""}" data-tile="${i}" aria-label="Ledig rute"></button>`;
      if (tile.kind === "decor") {
        const d = G.DECOR.find((x) => x.id === tile.id);
        return `<button class="tile decor" data-tile="${i}" aria-label="${d.name}">${art(d.id)}</button>`;
      }
      const s = byId[tile.sid];
      if (!s) return `<button class="tile empty" data-tile="${i}"></button>`;
      const info = G.plantInfo(s.plant);
      const cls = s.status === "withered" ? "withered" : s.bloomed ? "bloomed" : "thirsty";
      return `<button class="tile plant ${cls} ${s.golden ? "golden" : ""}" data-tile="${i}" aria-label="${info.name}">${art(s.plant)}</button>`;
    }).join("");

    const hint = $("place-hint");
    if (placing) {
      const d = G.DECOR.find((x) => x.id === placing);
      hint.hidden = false;
      hint.innerHTML = `<span>Velg en ledig rute for ${d.name.toLowerCase()}</span><button class="ghost small-btn" id="cancel-place">Avbryt</button>`;
    } else {
      hint.hidden = true;
    }

    const thirsty = G.thirstyCount(state);
    $("inventory").innerHTML = `
      <div class="inv"><span class="inv-ico water">${icon("droplet")}</span><strong>${thirsty}</strong>
        <span class="inv-text"><b>Tørste planter</b><small>${thirsty ? "Én treningsøkt vanner hele hagen, så alle blomstrer."
          : state.waterGiven[t] ? "Du har trent i dag. Planter du får resten av dagen blomstrer med én gang."
          : "Alle plantene blomstrer. Tren for å vanne neste plante du får."}</small></span></div>
      <div class="inv"><span class="inv-ico gold">${icon("sparkles")}</span><strong>${state.inventory.gjodsel}</strong>
        <span class="inv-text"><b>Gjødsel</b><small>Fås etter 3 økter på én dag. Gjør neste plante gyllen.</small></span></div>
      <div class="inv"><span class="inv-ico ice">${icon("snowflake")}</span><strong>${state.inventory.frys}</strong>
        <span class="inv-text"><b>Streak-frys</b><small>Fås for hver 7. dag på rad. Brukes automatisk hvis du glemmer en dag.</small></span></div>`;

    const total = G.totalMinutes(state);
    $("decor-list").innerHTML = G.decorStatus(state).map((d) => `
      <div class="decor-item ${d.unlocked ? "" : "locked"}">
        <span class="decor-art">${art(d.id)}</span>
        <span class="decor-text"><strong>${d.name}</strong>
          <small>${d.unlocked ? (d.placed ? "I hagen" : "Klar til å plasseres") : `Les ${Math.round(d.minutes / 60)} t totalt · ${(total / 60).toFixed(1).replace(".", ",")} t nå`}</small></span>
        ${d.unlocked && !d.placed ? `<button class="small-btn" data-place="${d.id}">Plasser</button>` : ""}
      </div>`).join("");

    $("catalog").innerHTML = G.catalog(state).map((p) => {
      const how = p.id === "eksamen" ? "Økt dagen før en eksamen" : `${p.minutes} min i strekk`;
      return `<div class="cat ${p.count ? "earned" : "locked"}">
        ${art(p.id)}
        <strong>${p.name}</strong>
        <small>${p.count ? `× ${p.count}${p.golden ? ` · ${p.golden} gyllen` : ""}` : how}</small>
      </div>`;
    }).join("");
  }

  $("view-garden").addEventListener("click", (e) => {
    if (e.target.closest("#cancel-place")) {
      placing = null;
      return renderGarden();
    }
    const placeBtn = e.target.closest("[data-place]");
    if (placeBtn) {
      placing = placeBtn.dataset.place;
      renderGarden();
      $("garden-grid").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const tileBtn = e.target.closest("[data-tile]");
    if (!tileBtn) return;
    const index = Number(tileBtn.dataset.tile);
    const tile = state.garden.tiles[index];

    if (placing) {
      if (!tile && G.placeDecor(state, placing, index)) {
        placing = null;
        save();
        renderGarden();
        toast("Pynten er plassert.");
      }
      return;
    }
    if (!tile) return;
    if (tile.kind === "decor") {
      const d = G.DECOR.find((x) => x.id === tile.id);
      ask(`Flytte ${d.name.toLowerCase()} tilbake til lageret?`, "Flytt", false).then((ok) => {
        if (!ok) return;
        G.removeDecor(state, index);
        save();
        renderGarden();
      });
      return;
    }
    const s = state.sessions.find((x) => x.id === tile.sid);
    const info = G.plantInfo(s.plant);
    if (s.status === "withered") {
      const wanted = G.plantInfo(s.wanted || "tulipan");
      ask(`Gjenoppliv planten? Les ${wanted.minutes} min i strekk, så blir den til ${withArticle(wanted)} igjen.`, "Start økt", false)
        .then((ok) => { if (ok && !state.active) startSession(wanted.id, false, s.id, null); });
      return;
    }
    if (!s.bloomed) return toast("Planten er tørst. Én treningsøkt vanner hele hagen.");
    const subj = s.subjectId && subjectById(s.subjectId);
    const what = s.subject ? ` for ${s.subject}` : subj ? ` · ${subj.name}` : "";
    toast(`${s.golden ? "Gyllen " : ""}${info.name}${what} · ${fmtDate(s.day)}${s.minutes ? ` · ${s.minutes} min` : ""}`);
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
    let msg = `Lagret. Været i hagen: ${WEATHER[G.weather(state, today())].short.toLowerCase()}.`;
    if (readiness && readiness.value < 0.4) msg += " Du virker sliten – planen er justert med lettere trening og kortere leseøkter.";
    else if (readiness && readiness.value > 0.75) msg += " Du har godt overskudd – planen kjører som normalt.";
    $("log-feedback").textContent = msg;
  });

  // ---------- Fag ----------
  let openSubject = null;   // id for faget som vises, eller null for listen
  let subjectTab = "overview";
  let newDifficulty = 2;

  function weekMinutesFor(subjectId) {
    const start = B.weekStart(today());
    const end = B.addDays(start, 6);
    return state.sessions
      .filter((s) => s.subjectId === subjectId && s.status === "grown" && s.day >= start && s.day <= end)
      .reduce((sum, s) => sum + s.minutes, 0);
  }

  function difficultyButtons(current, attr) {
    return [1, 2, 3].map((d) => `<button type="button" data-${attr}="${d}" class="${d === current ? "on" : ""}">${B.DIFFICULTY[d].label}</button>`).join("");
  }

  function renderSubjects() {
    if (openSubject && !subjectById(openSubject)) openSubject = null;
    $("subjects-main").hidden = !!openSubject;
    $("subject-detail").hidden = !openSubject;
    if (openSubject) return renderSubjectDetail();

    const t = today();
    if (!state.subjects.length) {
      $("subject-list").innerHTML = `<li class="card empty">Ingen fag lagt inn ennå.</li>`;
    } else {
      $("subject-list").innerHTML = state.subjects.map((s) => {
        const examDays = s.examDate ? B.daysBetween(t, s.examDate) : null;
        const open = s.obliger.filter((o) => !o.done).sort((a, b) => a.due.localeCompare(b.due));
        const next = open[0];
        const nextDays = next ? B.daysBetween(t, next.due) : null;
        const lines = [];
        if (examDays !== null) lines.push(examDays < 0 ? "Eksamen ferdig" : `Eksamen ${B.whenText(examDays)}`);
        if (next) lines.push(`${escapeHtml(next.title)}: ${dueText(nextDays)}`);
        else if (s.obliger.length) lines.push("Alle obliger levert");
        return `<li>
          <button class="card subject-item" data-open-subject="${s.id}">
            <span class="subject-main">
              <strong>${escapeHtml(s.name)}</strong>
              <small>${lines.join(" · ") || "Ingen eksamen eller frister"}</small>
              <small>${fmtMinutes(weekMinutesFor(s.id))} lest denne uka</small>
            </span>
            <span class="diff diff-${s.difficulty}">${B.DIFFICULTY[s.difficulty].label}</span>
            ${state.examFlowers[s.id] ? art("eksamen", "mini") : ""}
            ${icon("chevronRight")}
          </button>
        </li>`;
      }).join("");
    }
    $("new-difficulty").innerHTML = difficultyButtons(newDifficulty, "diff");
  }

  function renderSubjectDetail() {
    const s = subjectById(openSubject);
    const t = today();
    const open = s.obliger.filter((o) => !o.done).length;
    const header = `
      <header class="top">
        <button class="icon-btn" data-back aria-label="Tilbake til fag">${icon("chevronLeft")}</button>
        <div class="top-title"><p class="eyebrow">Fag</p><h1>${escapeHtml(s.name)}</h1></div>
      </header>
      <div class="segmented tabs" role="tablist">
        <button type="button" role="tab" data-subtab="overview" class="${subjectTab === "overview" ? "on" : ""}" aria-selected="${subjectTab === "overview"}">Oversikt</button>
        <button type="button" role="tab" data-subtab="obliger" class="${subjectTab === "obliger" ? "on" : ""}" aria-selected="${subjectTab === "obliger"}">Obliger${open ? ` (${open})` : ""}</button>
      </div>`;

    let body;
    if (subjectTab === "overview") {
      const total = state.sessions.filter((x) => x.subjectId === s.id && x.status === "grown").reduce((sum, x) => sum + x.minutes, 0);
      body = `
        <div class="card">
          <div class="stats-2">
            <div><strong>${fmtMinutes(weekMinutesFor(s.id))}</strong><small>lest denne uka</small></div>
            <div><strong>${fmtMinutes(total)}</strong><small>lest totalt</small></div>
          </div>
        </div>
        <div class="card">
          <fieldset class="field">
            <legend>Vanskelighetsgrad</legend>
            <div class="segmented three">${difficultyButtons(s.difficulty, "set-diff")}</div>
            <p class="muted small">Vanskelige fag får mer av lesetiden når appen fordeler dagen.</p>
          </fieldset>
          <label class="field">Eksamensdato
            <input type="date" data-exam-date value="${s.examDate || ""}">
          </label>
          ${s.examDate ? `<p class="muted small">${B.daysBetween(t, s.examDate) < 0 ? "Eksamen er ferdig." : `Eksamen ${B.whenText(B.daysBetween(t, s.examDate))}.`}${state.examFlowers[s.id] ? " Du har fått eksamensblomsten." : ""}</p>` : ""}
          <label class="field">Navn
            <input type="text" data-rename maxlength="40" value="${escapeHtml(s.name)}">
          </label>
        </div>
        <button type="button" class="danger-btn" data-delete-subject>Slett faget</button>`;
    } else {
      const sorted = [...s.obliger].sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
      const remindSelect = (val, attr) => `<select ${attr} aria-label="Påminnelse">${REMIND_OPTIONS.map(([v, l]) => `<option value="${v}" ${v === val ? "selected" : ""}>${l}</option>`).join("")}</select>`;
      body = `
        <ul class="list">${sorted.length ? sorted.map((o) => {
          const days = B.daysBetween(t, o.due);
          return `<li class="card oblig ${o.done ? "done" : ""} ${!o.done && days < 0 ? "late" : ""}">
            <div class="oblig-top">
              <input type="checkbox" data-oblig-check="${o.id}" aria-label="Levert" ${o.done ? "checked" : ""}>
              <span class="oblig-text"><strong>${escapeHtml(o.title)}</strong>
                <small>${fmtDay(o.due)}${o.done ? " · levert" : ""}</small></span>
              ${o.done ? "" : `<span class="chip ${days <= 1 ? "exam" : ""}">${dueText(days)}</span>`}
            </div>
            ${o.done ? `<div class="oblig-actions"><button type="button" class="icon-btn tiny" data-oblig-del="${o.id}" aria-label="Slett oblig">${icon("x")}</button></div>` : `
            <div class="oblig-actions">
              <label class="remind">Påminnelse ${remindSelect(o.remind === undefined ? 3 : o.remind, `data-oblig-remind="${o.id}"`)}</label>
              <button type="button" class="small-btn" data-oblig-ics="${o.id}">Legg i kalender</button>
              <button type="button" class="icon-btn tiny" data-oblig-del="${o.id}" aria-label="Slett oblig">${icon("x")}</button>
            </div>`}
          </li>`;
        }).join("") : `<li class="card empty">Ingen obliger lagt inn ennå.</li>`}</ul>
        <form class="card" data-oblig-add>
          <h2>Ny oblig</h2>
          <label class="field">Navn
            <input type="text" name="title" maxlength="60" placeholder="F.eks. Oblig 3" required>
          </label>
          <label class="field">Frist
            <input type="date" name="due" required>
          </label>
          <label class="field">Påminnelse ${remindSelect(3, 'name="remind"')}</label>
          <button type="submit" class="primary">Legg til oblig</button>
        </form>
        ${s.obliger.some((o) => !o.done) ? `<button type="button" class="secondary-btn" data-ics-all>Legg alle åpne frister i kalenderen</button>` : ""}`;
    }
    $("subject-detail").innerHTML = header + body;
  }

  function openSubjectPage(id, tab) {
    openSubject = id;
    subjectTab = tab || "overview";
    show("exams");
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-open-subject]");
    if (link) openSubjectPage(link.dataset.openSubject, link.dataset.subtab);
  });

  $("new-difficulty").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-diff]");
    if (!btn) return;
    newDifficulty = Number(btn.dataset.diff);
    $("new-difficulty").innerHTML = difficultyButtons(newDifficulty, "diff");
  });

  $("subject-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("subject-name").value.trim();
    if (!name) return;
    state.subjects.push({ id: uid(), name, difficulty: newDifficulty, examDate: $("subject-exam").value || null, obliger: [] });
    save();
    $("subject-form").reset();
    newDifficulty = 2;
    renderSubjects();
    toast(`${name} er lagt til.`);
  });

  $("subject-detail").addEventListener("click", (e) => {
    const s = subjectById(openSubject);
    if (!s) return;
    if (e.target.closest("[data-back]")) {
      openSubject = null;
      return renderSubjects();
    }
    const tab = e.target.closest("[data-subtab]");
    if (tab) {
      subjectTab = tab.dataset.subtab;
      return renderSubjectDetail();
    }
    const diff = e.target.closest("[data-set-diff]");
    if (diff) {
      s.difficulty = Number(diff.dataset.setDiff);
      save();
      return renderSubjectDetail();
    }
    if (e.target.closest("[data-delete-subject]")) {
      ask(`Slette faget ${s.name} med alle obliger? Lesetiden i hagen blir ikke slettet.`, "Slett").then((ok) => {
        if (!ok) return;
        state.subjects = state.subjects.filter((x) => x.id !== s.id);
        state.tasks.forEach((tk) => { if (tk.subjectId === s.id) tk.subjectId = null; });
        openSubject = null;
        save();
        renderAll();
        toast("Faget er slettet.");
      });
      return;
    }
    const del = e.target.closest("[data-oblig-del]");
    if (del) {
      const o = s.obliger.find((x) => x.id === del.dataset.obligDel);
      ask(`Slette «${o.title}»?`, "Slett").then((ok) => {
        if (!ok) return;
        s.obliger = s.obliger.filter((x) => x.id !== o.id);
        save();
        renderAll();
      });
      return;
    }
    const ics = e.target.closest("[data-oblig-ics]");
    if (ics) {
      const o = s.obliger.find((x) => x.id === ics.dataset.obligIcs);
      return downloadIcs(s, [o], `${s.name}-${o.title}.ics`.replace(/[^\wæøåÆØÅ.-]+/g, "-"));
    }
    if (e.target.closest("[data-ics-all]")) {
      return downloadIcs(s, s.obliger.filter((o) => !o.done), `${s.name}-frister.ics`.replace(/[^\wæøåÆØÅ.-]+/g, "-"));
    }
  });

  $("subject-detail").addEventListener("change", (e) => {
    const s = subjectById(openSubject);
    if (!s) return;
    const el = e.target;
    if (el.matches("[data-exam-date]")) s.examDate = el.value || null;
    else if (el.matches("[data-rename]")) s.name = el.value.trim() || s.name;
    else if (el.matches("[data-oblig-check]")) return setObligDone(s.id, el.dataset.obligCheck, el.checked);
    else if (el.matches("[data-oblig-remind]")) s.obliger.find((x) => x.id === el.dataset.obligRemind).remind = Number(el.value);
    else return;
    save();
    renderAll();
  });

  $("subject-detail").addEventListener("submit", (e) => {
    const form = e.target.closest("[data-oblig-add]");
    if (!form) return;
    e.preventDefault();
    const s = subjectById(openSubject);
    const title = form.elements.title.value.trim();
    const due = form.elements.due.value;
    if (!title || !due) return;
    s.obliger.push({ id: uid(), title, due, done: false, remind: Number(form.elements.remind.value) });
    save();
    renderAll();
    toast(`${title} er lagt til.`);
  });

  // ---------- Innstillinger ----------
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
    renderTemplates();
    renderNotify();
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

  function renderTemplates() {
    const hints = { 2: "Når det er rolig", 1: "Når eksamen nærmer seg", 0: "Innspurt eller lite søvn" };
    $("templates").innerHTML = [2, 1, 0].map((lvl) => `
      <div class="tpl-group">
        <h3>${B.ACTIVITIES[lvl].label} <span class="muted small">${hints[lvl]}</span></h3>
        <ul class="tpl-list">
          ${state.templates[lvl].map((t, i) => `<li><span>${escapeHtml(t)}</span><button type="button" class="icon-btn tiny" data-tpl-del="${lvl}:${i}" aria-label="Slett">${icon("x")}</button></li>`).join("")}
        </ul>
        <form class="tpl-add" data-tpl-add="${lvl}">
          <input type="text" maxlength="80" placeholder="Ny økt" aria-label="Ny ${B.ACTIVITIES[lvl].label.toLowerCase()} økt">
          <button type="submit" class="small-btn">Legg til</button>
        </form>
      </div>`).join("");
  }

  $("templates").addEventListener("click", (e) => {
    const del = e.target.closest("[data-tpl-del]");
    if (!del) return;
    const [lvl, i] = del.dataset.tplDel.split(":").map(Number);
    const text = state.templates[lvl][i];
    ask(`Slette «${text}» fra ${B.ACTIVITIES[lvl].label}?`, "Slett").then((ok) => {
      if (!ok || state.templates[lvl][i] !== text) return;
      state.templates[lvl].splice(i, 1);
      save();
      renderTemplates();
      toast("Økta er slettet.");
    });
  });
  $("templates").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target.closest("[data-tpl-add]");
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    state.templates[Number(form.dataset.tplAdd)].push(text);
    save();
    renderTemplates();
  });

  $("demo-data").addEventListener("click", async () => {
    if (!(await ask("Erstatte dataene dine med eksempeldata?", "Erstatt"))) return;
    const t = today();
    const sleep = [7.5, 8, 7, 6, 5.5, 6, 5];
    const stress = [2, 2, 3, 3, 4, 4, 4];
    const logs = {};
    sleep.forEach((s, i) => { logs[B.addDays(t, i - 6)] = { sleep: s, stress: stress[i] }; });
    const prev = load().settings;
    state = emptyState();
    state.settings.theme = prev.theme;
    state.settings.notify = prev.notify;
    state.logs = logs;
    state.subjects = [
      { id: "1", name: "Matematikk 1", difficulty: 3, examDate: B.addDays(t, 5), obliger: [
        { id: "m1", title: "Oblig 3", due: B.addDays(t, -3), done: true, remind: 3 }
      ] },
      { id: "2", name: "Statistikk", difficulty: 2, examDate: B.addDays(t, 19), obliger: [
        { id: "s1", title: "Oblig 2", due: B.addDays(t, 2), done: false, remind: 3 },
        { id: "s2", title: "Oblig 3", due: B.addDays(t, 12), done: false, remind: 3 }
      ] },
      { id: "3", name: "Programmering", difficulty: 1, examDate: B.addDays(t, 40), obliger: [
        { id: "p1", title: "Innlevering 1", due: B.addDays(t, 9), done: false, remind: 7 }
      ] }
    ];
    state.tasks = [
      { id: "t1", text: "Regn eksamensoppgave fra 2024", subjectId: "1", day: B.addDays(t, -1), done: false, doneDay: null },
      { id: "t2", text: "Les kap. 6 om regresjon", subjectId: "2", day: t, done: false, doneDay: null },
      { id: "t3", text: "Repeter derivasjonsregler", subjectId: "1", day: t, done: true, doneDay: t }
    ];
    // Leseøkter de siste dagene, inkludert én som visnet.
    const plan = [
      [6, [["tulipan", "1"]]], [5, [["tre", "1"], ["spire", "2"]]], [4, [["solsikke", "2"], ["tre", "1"], ["spire", "3"]]],
      [3, [["kirsebaer", "1"]]], [2, [["tulipan", "2"], ["!", "1"]]], [1, [["tre", "1"], ["solsikke", "2"]]]
    ];
    const exams = B.examsOf(state.subjects);
    for (const [ago, sessions] of plan) {
      const key = B.addDays(t, -ago);
      sessions.forEach(([id, subjectId], n) => {
        const start = B.parseKey(key).getTime() + (9 + n * 2) * 3600000;
        if (id === "!") return G.witherSession(state, { start, plant: "tre", minutes: 60, subjectId }, start + 20 * 60000);
        const p = G.plantInfo(id);
        G.completeSession(state, { start, plant: id, minutes: p.minutes, subjectId }, start + p.minutes * 60000, exams);
      });
      if (ago % 2 === 0) {
        state.done[key] = { training: true };
        G.giveWater(state, key);
      }
    }
    // Plasser benken. Plantene fra i går er tørste, så man kan se at trening vanner hele hagen.
    G.placeDecor(state, "benk", state.garden.tiles.indexOf(null) + 2);
    openSubject = null;
    save();
    renderAll();
    show("week");
  });

  $("reset-data").addEventListener("click", async () => {
    if (!(await ask("Slette alle fag, oppgaver, logger, hagen og mål?", "Slett alt"))) return;
    state = emptyState();
    openSubject = null;
    save();
    renderAll();
  });

  // ---------- Navigasjon ----------
  function show(view) {
    for (const v of document.querySelectorAll(".view")) v.classList.toggle("active", v.id === `view-${view}`);
    for (const b of document.querySelectorAll(".tabbar button")) b.classList.toggle("on", b.dataset.view === view);
    if (view === "week") renderWeek();
    if (view === "log") { fillLogForm(today()); renderLog(); $("log-feedback").textContent = ""; }
    if (view === "garden") { placing = null; renderGarden(); }
    if (view === "exams") renderSubjects();
    if (view === "goals") renderGoals();
    window.scrollTo(0, 0);
  }

  document.querySelector(".tabbar").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view]");
    if (!btn) return;
    if (btn.dataset.view === "exams") openSubject = null; // fanen viser alltid listen over fag
    show(btn.dataset.view);
  });
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (!go) return;
    if (go.dataset.go === "exams") openSubject = null;
    show(go.dataset.go);
  });

  function renderAll() {
    applyTheme();
    renderWeek();
    renderLog();
    renderGarden();
    renderSubjects();
    renderGoals();
  }

  // Oppstart: bruk streak-frys om nødvendig, og fortsett en økt som var i gang.
  const frozen = G.applyFreezes(state, today());
  save();
  renderAll();
  if (frozen.length) toast(`Streak-frys brukt for ${frozen.map(fmtDate).join(", ")}. Streaken lever.`);
  if (state.active) checkReturn(true);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  notifyDue();
})();
