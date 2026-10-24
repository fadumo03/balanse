// Balanse – planleggingslogikk.
// Lager en ukeplan for lesing og trening ut fra eksamensdatoer,
// treningsmål og loggført søvn/stress. Fungerer både i nettleseren og i Node (for testing).
(function (root) {
  "use strict";

  const DAY_NAMES = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

  const DEFAULT_SETTINGS = {
    studyBase: 90,        // minutter lesing per hverdag i en rolig uke
    studyMax: 300,        // maks minutter lesing per dag rett før eksamen
    sessionsPerWeek: 4,   // treningsmål: økter per uke
    sessionMinutes: 45    // treningsmål: minutter per økt
  };

  const ACTIVITIES = {
    2: { label: "Hard", activity: "Styrke eller intervaller" },
    1: { label: "Moderat", activity: "Rolig løpetur eller sykkel" },
    0: { label: "Lett", activity: "Gåtur, yoga eller tøying" }
  };

  // ---------- Datohjelpere (lokale datoer som "ÅÅÅÅ-MM-DD") ----------
  function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(key, n) {
    const date = parseKey(key);
    date.setDate(date.getDate() + n);
    return toKey(date);
  }

  // Antall dager fra a til b (b - a), uavhengig av sommertid.
  function daysBetween(aKey, bKey) {
    const [ay, am, ad] = aKey.split("-").map(Number);
    const [by, bm, bd] = bKey.split("-").map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
  }

  function weekStart(key) {
    const date = parseKey(key);
    const offset = (date.getDay() + 6) % 7; // mandag = 0
    date.setDate(date.getDate() - offset);
    return toKey(date);
  }

  function roundTo(value, step) {
    return Math.round(value / step) * step;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // ---------- Eksamenspress ----------
  // 0 = ingen eksamen i sikte, 1 = eksamensdag.
  function pressureFromDays(days) {
    if (days < 0) return 0;
    if (days === 0) return 1;
    if (days <= 3) return 0.9;
    if (days <= 7) return 0.7;
    if (days <= 14) return 0.4;
    if (days <= 21) return 0.2;
    return 0;
  }

  function pressureFor(dayKey, exams) {
    let best = { value: 0, exam: null, days: null };
    for (const exam of exams || []) {
      const days = daysBetween(dayKey, exam.date);
      const value = pressureFromDays(days);
      if (value > best.value || (value === best.value && value > 0 && days < best.days)) {
        best = { value, exam, days };
      }
    }
    return best;
  }

  // ---------- Overskudd fra søvn og stress ----------
  // Ser på de tre siste loggførte dagene fram til og med "i dag".
  // 1 = godt uthvilt og lite stress, 0 = lite søvn og mye stress. null = ingen logg.
  function readinessFor(dayKey, logs, todayKey) {
    const until = dayKey < todayKey ? dayKey : todayKey;
    const recent = [];
    for (let i = 0; i < 3; i++) {
      const entry = logs && logs[addDays(until, -i)];
      if (entry) recent.push(entry);
    }
    if (recent.length === 0) return null;
    const avgSleep = recent.reduce((s, e) => s + Number(e.sleep), 0) / recent.length;
    const avgStress = recent.reduce((s, e) => s + Number(e.stress), 0) / recent.length;
    const sleepScore = clamp((avgSleep - 5) / 3, 0, 1);   // 5 t = 0, 8 t = 1
    const stressScore = clamp((5 - avgStress) / 4, 0, 1); // stress 1 = 1, stress 5 = 0
    return {
      value: (sleepScore + stressScore) / 2,
      avgSleep,
      avgStress
    };
  }

  // Fordeler k økter jevnt utover uka (indekser 0–6).
  function spreadSessions(k) {
    const days = new Set();
    for (let i = 0; i < k; i++) days.add(Math.floor((i * 7) / k));
    return days;
  }

  // ---------- Selve ukeplanen ----------
  function buildWeek(startKey, state, todayKey) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
    const exams = state.exams || [];
    const logs = state.logs || {};

    const pressures = [];
    for (let i = 0; i < 7; i++) pressures.push(pressureFor(addDays(startKey, i), exams));
    const weekPressure = Math.max(...pressures.map((p) => p.value));

    const goal = clamp(Math.round(settings.sessionsPerWeek), 1, 7);
    const calmWeek = weekPressure < 0.2;
    const sessionCount = calmWeek ? Math.min(7, goal + 1) : goal;
    const sessionDays = spreadSessions(sessionCount);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const key = addDays(startKey, i);
      const pressure = pressures[i];
      const readiness = readinessFor(key, logs, todayKey);
      const tired = readiness !== null && readiness.value < 0.4;
      const isExamDay = pressure.days === 0;
      const isWeekend = i >= 5;
      const reasons = [];

      // Lesetid
      let study;
      if (isExamDay) {
        study = 30;
        reasons.push(`Eksamen i ${pressure.exam.subject} i dag – bare lett repetisjon.`);
      } else {
        const base = isWeekend && pressure.value < 0.4 ? settings.studyBase * 0.6 : settings.studyBase;
        study = base + pressure.value * (settings.studyMax - base);
        if (pressure.exam) {
          reasons.push(`${pressure.days} dager til ${pressure.exam.subject} – mer lesetid.`);
        }
        if (tired) {
          study *= 0.85;
          reasons.push("Lite søvn / høyt stress i det siste – litt kortere leseøkter.");
        }
      }
      study = Math.max(0, roundTo(study, 15));

      // Trening
      let training = null;
      if (sessionDays.has(i) || isExamDay || pressure.value >= 0.7) {
        const plannedSession = sessionDays.has(i);
        let level = pressure.value < 0.3 ? 2 : pressure.value < 0.7 ? 1 : 0;
        if (tired && level > 0) {
          level -= 1;
          reasons.push("Trening skrudd ned ett hakk fordi du trenger restitusjon.");
        }
        if (isExamDay) level = 0;

        let minutes;
        if (!plannedSession) {
          minutes = isExamDay ? 20 : 15; // aktiv pause, ikke en full økt
        } else if (level === 2) {
          minutes = settings.sessionMinutes;
        } else if (level === 1) {
          minutes = roundTo(settings.sessionMinutes * 0.75, 5);
        } else {
          minutes = clamp(roundTo(settings.sessionMinutes * 0.5, 5), 20, 30);
        }

        training = {
          level,
          label: plannedSession ? ACTIVITIES[level].label : "Aktiv pause",
          activity: plannedSession ? ACTIVITIES[level].activity : "Gåtur ute",
          minutes,
          isSession: plannedSession
        };
        if (plannedSession && pressure.value >= 0.7 && !isExamDay) {
          reasons.push("Eksamen nærmer seg – lett trening holder stresset nede uten å stjele energi.");
        } else if (!plannedSession) {
          reasons.push("Kort gåtur for å lufte hodet – bevegelse hjelper konsentrasjonen.");
        }
      }

      if (calmWeek && sessionDays.has(i) && i === Math.max(...sessionDays)) {
        reasons.push("Rolig uke – en ekstra treningsøkt er lagt til.");
      }

      let sleepTip = null;
      if (tired) sleepTip = "Legg deg 30 min tidligere i kveld.";
      else if (pressure.value >= 0.7) sleepTip = "Prioriter 7–9 timer søvn – det hjelper hukommelsen.";

      days.push({
        key,
        name: DAY_NAMES[i],
        pressure: pressure.value,
        examToday: isExamDay ? pressure.exam : null,
        readiness: readiness ? readiness.value : null,
        study,
        training,
        sleepTip,
        reasons
      });
    }

    let mode;
    if (weekPressure >= 0.7) mode = "Innspurt";
    else if (weekPressure >= 0.2) mode = "Eksamensperiode";
    else mode = "Rolig uke";

    return {
      start: startKey,
      mode,
      weekPressure,
      sessionCount,
      days,
      totalStudy: days.reduce((s, d) => s + d.study, 0),
      totalTraining: days.reduce((s, d) => s + (d.training ? d.training.minutes : 0), 0)
    };
  }

  const api = {
    DEFAULT_SETTINGS,
    toKey,
    parseKey,
    addDays,
    daysBetween,
    weekStart,
    pressureFromDays,
    pressureFor,
    readinessFor,
    spreadSessions,
    buildWeek
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Balanse = api;
})(typeof window !== "undefined" ? window : this);
