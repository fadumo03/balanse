// Balanse – brukergrensesnitt. Logikken for planen ligger i plan.js, hagen i garden.js og ikonene i icons.js.
(function () {
  "use strict";

  const B = window.Balanse;
  const G = window.Garden;
  const { icon, art } = window.Icons;
  const STORAGE_KEY = "balanse-v1";
  const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
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
      settings: Object.assign({}, B.DEFAULT_SETTINGS),
      templates: copyTemplates(),
      exams: [],
      logs: {},
      done: {},
      trainingOverride: {},
      active: null
    });
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      return G.ensure(Object.assign(emptyState(), parsed, {
        settings: Object.assign({}, B.DEFAULT_SETTINGS, parsed.settings),
        templates: parsed.templates || copyTemplates(),
        trainingOverride: parsed.trainingOverride || {}
      }));
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
  function ask(text, okLabel) {
    return new Promise((resolve) => {
      $("dialog-text").textContent = text;
      $("dialog-ok").textContent = okLabel;
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
    const t = today();
    const week = B.buildWeek(currentWeek, state, t);
    const end = B.addDays(currentWeek, 6);

    $("week-title").textContent = `Uke ${isoWeek(currentWeek)}`;
    $("week-range").textContent = `${fmtDate(currentWeek)} – ${fmtDate(end)}`;

    let doneSessions = 0;
    let plannedSessions = 0;
    let doneStudy = 0;
    let totalTraining = 0;
    for (const day of week.days) {
      const tr = trainingFor(day);
      if (tr) totalTraining += tr.minutes;
      if (tr && tr.isSession) {
        plannedSessions++;
        if ((state.done[day.key] || {}).training) doneSessions++;
      }
      doneStudy += G.studyMinutes(state, day.key);
    }

    const modeClass = { "Rolig uke": "calm", "Eksamensperiode": "mid", "Innspurt": "high" }[week.mode];
    const pct = week.totalStudy ? Math.min(100, Math.round((doneStudy / week.totalStudy) * 100)) : 0;
    $("week-summary").innerHTML = `
      <div class="summary-head">
        <span class="badge ${modeClass}">${week.mode}</span>
        <span class="muted small">${pct} % lest</span>
      </div>
      <div class="stats">
        <div><small><span class="dot study"></span>Lesing</small><strong>${fmtMinutes(week.totalStudy)}</strong></div>
        <div><small><span class="dot train"></span>Trening</small><strong>${fmtMinutes(totalTraining)}</strong></div>
        <div><small>Økter</small><strong>${doneSessions}/${plannedSessions}</strong></div>
      </div>
      <div class="progress" aria-label="Lesetid fullført"><span style="width:${pct}%"></span></div>
      <small class="muted">${fmtMinutes(doneStudy)} av ${fmtMinutes(week.totalStudy)} lest med timer</small>`;

    const showPrompt = t >= currentWeek && t <= end && !state.logs[t];
    $("log-prompt").innerHTML = showPrompt
      ? `<button class="card prompt" data-go="log"><span>Hvordan sov du i natt?</span><span class="prompt-go">Logg ${icon("chevronRight")}</span></button>`
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

    // Lesing – fylles bare av ekte timer-tid
    const readMin = G.studyMinutes(state, day.key);
    const plants = state.sessions.filter((s) => s.day === day.key).map((s) => art(s.plant, "mini")).join("");
    const studyDone = day.study > 0 && readMin >= day.study;
    let action = "";
    if (isToday) action = `<button class="start-btn" data-open-focus>${icon("play")}Les</button>`;
    else if (studyDone) action = `<span class="check-badge">${icon("check")}</span>`;
    const study = day.study > 0
      ? `<div class="task study-task ${studyDone ? "complete" : ""}">
           <span class="dot study"></span>
           <span class="task-text"><strong>Les ${fmtMinutes(day.study)}</strong>
             <small>${readMin ? `${fmtMinutes(readMin)} lest` : past ? "Ingen økter" : "Ikke startet"}${plants ? `<span class="minis">${plants}</span>` : ""}</small>
             <span class="mini-progress"><span style="width:${Math.min(100, Math.round((readMin / day.study) * 100))}%"></span></span>
           </span>
           ${action}
         </div>`
      : "";

    // Trening – egen økt fra listen, kan byttes
    const tr = trainingFor(day);
    const training = tr
      ? `<div class="task train-task ${done.training ? "checked" : ""}">
           <input type="checkbox" data-day="${day.key}" data-kind="training" aria-label="Trening gjort" ${done.training ? "checked" : ""}>
           <span class="dot train"></span>
           <span class="task-text"><strong>${tr.label}</strong> · ${escapeHtml(tr.activity)}
             <small>${tr.minutes} min · gir vann til hagen</small>
             ${swapSelect(day)}</span>
         </div>`
      : `<div class="task rest"><span class="dot rest"></span><span class="task-text">Hviledag ${swapSelect(day)}</span></div>`;

    const tip = day.sleepTip ? `<p class="tip">${icon("moon")}<span>${day.sleepTip}</span></p>` : "";
    const reasons = day.reasons.slice();
    if (tr && tr.custom) reasons.push("Du har valgt denne økta selv.");
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
    if (!el.matches("input[data-kind=training]")) return;
    const key = el.dataset.day;
    state.done[key] = Object.assign({}, state.done[key], { training: el.checked });
    let msg = null;
    if (el.checked) msg = G.giveWater(state, key) ? "+1 vann til hagen. Bruk det til å få en plante til å blomstre." : "Bra jobba!";
    save();
    renderWeek();
    if (msg) toast(msg);
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
    return state.exams.filter((x) => B.daysBetween(t, x.date) === 1 && !state.examFlowers[x.id]);
  }

  function openPicker() {
    if (state.active) return showRun();
    $("seed-list").innerHTML = G.PLANTS.map((p) => `
      <button type="button" class="seed ${p.id === selectedPlant ? "on" : ""}" data-plant="${p.id}">
        ${art(p.id, "seed-art")}
        <strong>${p.name}</strong>
        <small>${p.minutes} min</small>
      </button>`).join("");
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

  $("start-focus").addEventListener("click", () => {
    const plant = G.plantInfo(selectedPlant);
    const golden = $("use-golden").checked && state.inventory.gjodsel > 0;
    if (golden) state.inventory.gjodsel--;
    state.active = { start: Date.now(), plant: plant.id, minutes: plant.minutes, golden };
    save();
    keepAwake();
    showRun();
  });

  let lastStage = null;
  function showRun() {
    showFocusPart("focus-run");
    const plant = G.plantInfo(state.active.plant);
    $("focus-label").textContent = state.active.golden
      ? `Gyllen ${plant.name.toLowerCase()} gror mens du leser`
      : `${plant.name} gror mens du leser`;
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
    const events = G.completeSession(state, a, Math.min(Date.now(), end), state.exams);
    state.active = null;
    save();
    releaseAwake();
    renderAll();

    const day = B.toKey(new Date(a.start));
    const planned = B.buildWeek(B.weekStart(day), state, today()).days.find((d) => d.key === day);
    const lines = events.map((ev) => {
      if (ev.type === "plant") return rewardLine(art(ev.plant.id), `${ev.golden ? "Gyllen " : ""}${ev.plant.name} er plantet i hagen`);
      if (ev.type === "exam") return rewardLine(art("eksamen"), `Eksamensblomst for ${escapeHtml(ev.subject)}. Lykke til i morgen!`);
      if (ev.type === "gjodsel") return rewardLine(icon("sparkles"), "Gjødsel: tre økter i dag. Neste plante kan bli gyllen.");
      if (ev.type === "frys") return rewardLine(icon("snowflake"), `Streak-frys: ${ev.streak} dager på rad. Den redder streaken en dag du ikke rekker å lese.`);
      if (ev.type === "decor") return rewardLine(art(ev.decor.id), `Ny pynt: ${ev.decor.name}. Plasser den i hagen.`);
      return "";
    });
    if (planned && planned.study) lines.push(rewardLine(icon("book"), `${fmtMinutes(G.studyMinutes(state, day))} av ${fmtMinutes(planned.study)} lest i dag`));

    $("done-icon").innerHTML = art(events[0].plant.id);
    $("done-icon").classList.toggle("golden", !!events[0].golden);
    $("done-title").textContent = `${a.minutes} minutter i strekk`;
    $("done-rewards").innerHTML = lines.join("");
    showFocusPart("focus-done");
    confetti(events.length > 1 ? 60 : 40);
  }

  function wither(reason) {
    const a = state.active;
    clearInterval(tickTimer);
    G.witherSession(state, a, Date.now());
    state.active = null;
    save();
    releaseAwake();
    renderAll();
    $("done-icon").innerHTML = art("visnet");
    $("done-icon").classList.remove("golden");
    $("done-title").textContent = "Planten visnet";
    $("done-rewards").innerHTML = rewardLine(icon("clock"), reason)
      + rewardLine(icon("info"), "Den visne planten blir stående i hagen. Prøv igjen – en kortere økt er også fin.");
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
    if (!state.active) return;
    if (document.visibilityState === "hidden") {
      state.active.leftAt = Date.now();
      save();
    } else {
      checkReturn(false);
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-focus]")) openPicker();
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

    const thirsty = state.sessions.filter((s) => s.status === "grown" && !s.bloomed).length;
    $("inventory").innerHTML = `
      <div class="inv"><span class="inv-ico water">${icon("droplet")}</span><strong>${state.inventory.vann}</strong>
        <span class="inv-text"><b>Vann</b><small>Fås når du trener. Trykk på en plante for å få den til å blomstre${thirsty ? ` (${thirsty} venter)` : ""}.</small></span></div>
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
      ask(`Flytte ${d.name.toLowerCase()} tilbake til lageret?`, "Flytt").then((ok) => {
        if (!ok) return;
        G.removeDecor(state, index);
        save();
        renderGarden();
      });
      return;
    }
    const s = state.sessions.find((x) => x.id === tile.sid);
    const info = G.plantInfo(s.plant);
    if (s.status === "withered") return toast(`Visnet ${fmtDate(s.day)} – økta ble ikke fullført`);
    if (!s.bloomed) {
      if (G.waterPlant(state, s.id)) {
        save();
        renderGarden();
        toast(`${info.name} blomstrer`);
        confetti(20);
      } else {
        toast("Planten er tørst. Tren for å få vann.");
      }
      return;
    }
    toast(`${s.golden ? "Gyllen " : ""}${info.name}${s.subject ? ` for ${s.subject}` : ""} · ${fmtDate(s.day)}${s.minutes ? ` · ${s.minutes} min` : ""}`);
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
      const when = days < 0 ? "Ferdig" : days === 0 ? "I dag" : days === 1 ? "I morgen" : `Om ${days} dager`;
      return `<li class="card exam-item ${days < 0 ? "past" : ""}">
        <div><strong>${escapeHtml(exam.subject)}</strong><small class="muted">${fmtDate(exam.date)}</small></div>
        ${state.examFlowers[exam.id] ? art("eksamen", "mini") : ""}
        <span class="chip ${days >= 0 && days <= 7 ? "exam" : ""}">${when}</span>
        <button class="icon-btn tiny" data-delete="${exam.id}" aria-label="Slett ${escapeHtml(exam.subject)}">${icon("x")}</button>
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
    renderTemplates();
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
    state.templates[lvl].splice(i, 1);
    save();
    renderTemplates();
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
    state = emptyState();
    state.settings.theme = load().settings.theme;
    state.logs = logs;
    state.exams = [
      { id: "1", subject: "Matematikk 1", date: B.addDays(t, 5) },
      { id: "2", subject: "Statistikk", date: B.addDays(t, 19) },
      { id: "3", subject: "Programmering", date: B.addDays(t, 40) }
    ];
    // Leseøkter de siste dagene, inkludert én som visnet.
    const plan = [
      [6, ["tulipan"]], [5, ["tre", "spire"]], [4, ["solsikke", "tre", "spire"]],
      [3, ["kirsebaer"]], [2, ["tulipan", "!"]], [1, ["tre", "solsikke"]]
    ];
    for (const [ago, plants] of plan) {
      const key = B.addDays(t, -ago);
      plants.forEach((id, n) => {
        const start = B.parseKey(key).getTime() + (9 + n * 2) * 3600000;
        if (id === "!") return G.witherSession(state, { start, plant: "tre", minutes: 60 }, start + 20 * 60000);
        const p = G.plantInfo(id);
        G.completeSession(state, { start, plant: id, minutes: p.minutes }, start + p.minutes * 60000, state.exams);
      });
      if (ago % 2 === 0) {
        state.done[key] = { training: true };
        G.giveWater(state, key);
      }
    }
    // Vann én plante (så det er vann igjen å prøve med) og plasser benken.
    G.waterPlant(state, state.sessions.find((s) => s.status === "grown").id);
    G.placeDecor(state, "benk", state.garden.tiles.indexOf(null) + 2);
    save();
    renderAll();
    show("week");
  });

  $("reset-data").addEventListener("click", async () => {
    if (!(await ask("Slette alle eksamener, logger, hagen og mål?", "Slett alt"))) return;
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
    if (view === "garden") { placing = null; renderGarden(); }
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
    applyTheme();
    renderWeek();
    renderLog();
    renderGarden();
    renderExams();
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
})();
