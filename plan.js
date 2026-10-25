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

  // Brukerens egne økter per intensitet. Appen velger fra disse,
  // så man slipper å bestemme seg hver dag.
  const DEFAULT_TEMPLATES = {
    2: ["Styrke: knebøy, push-ups, utfall og planke – 3 runder", "Intervaller: 4 × 4 min hardt løp", "Spinning eller gruppetime"],
    1: ["Rolig løpetur", "Sykkeltur", "Svømming"],
    0: ["Gåtur ute", "Yoga", "Tøying og mobilitet"]
  };

  // Velger en økt fra listen ut fra datoen, slik at det varierer fra dag til dag.
  function templateFor(templates, level, dayKey) {
    const list = (templates && templates[level] && templates[level].length) ? templates[level] : DEFAULT_TEMPLATES[level];
    const [y, m, d] = dayKey.split("-").map(Number);
    const dayNumber = Math.round(Date.UTC(y, m - 1, d) / 86400000);
    return list[dayNumber % list.length];
  }

  function minutesForLevel(level, sessionMinutes) {
    if (level === 2) return sessionMinutes;
    if (level === 1) return roundTo(sessionMinutes * 0.75, 5);
    return clamp(roundTo(sessionMinutes * 0.5, 5), 20, 30);
  }

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

  // exams kan også inneholde frister (kind "oblig"), som teller litt mindre (weight).
  function pressureFor(dayKey, exams) {
    let best = { value: 0, exam: null, days: null };
    for (const exam of exams || []) {
      const days = daysBetween(dayKey, exam.date);
      const value = pressureFromDays(days) * (exam.weight === undefined ? 1 : exam.weight);
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
      const isExamDay = pressure.days === 0 && (pressure.exam.kind || "exam") === "exam";
      const isOblig = pressure.exam && pressure.exam.kind === "oblig";
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
        if (isOblig) {
          if (pressure.days > 0) reasons.push(`${pressure.days} dager til fristen for ${pressure.exam.subject} – mer lesetid.`);
        } else if (pressure.exam) {
          reasons.push(`${pressure.days} dager til ${pressure.exam.subject} – mer lesetid.`);
        }
        if (tired) {
          study *= 0.85;
          reasons.push("Lite søvn / høyt stress i det siste – litt kortere leseøkter.");
        }
      }
      study = Math.max(0, roundTo(study, 15));

      // Frister som går ut i dag nevnes alltid, også når en eksamen veier tyngre.
      for (const item of exams) {
        if (item.kind === "oblig" && daysBetween(key, item.date) === 0) reasons.push(`Frist i dag: ${item.subject}.`);
      }

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

        const minutes = plannedSession
          ? minutesForLevel(level, settings.sessionMinutes)
          : isExamDay ? 20 : 15; // aktiv pause, ikke en full økt

        training = {
          level,
          label: plannedSession ? ACTIVITIES[level].label : "Aktiv pause",
          activity: plannedSession ? templateFor(state.templates, level, key) : "Gåtur ute",
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

  // ---------- Fag, frister og dagens oppgaver ----------
  const DIFFICULTY = {
    1: { label: "Lett", weight: 1 },
    2: { label: "Middels", weight: 1.5 },
    3: { label: "Vanskelig", weight: 2 }
  };
  const OBLIG_WEIGHT = 0.6; // en frist teller litt mindre enn en eksamen

  function whenText(days) {
    if (days === 0) return "i dag";
    if (days === 1) return "i morgen";
    return `om ${days} dager`;
  }

  // Eksamener og åpne obliger fra alle fag, i formatet buildWeek forventer.
  function planItems(subjects) {
    const items = [];
    for (const s of subjects || []) {
      if (s.examDate) items.push({ id: s.id, subject: s.name, date: s.examDate, kind: "exam" });
      for (const o of s.obliger || []) {
        if (!o.done) items.push({ id: o.id, subject: `${s.name}: ${o.title}`, date: o.due, kind: "oblig", weight: OBLIG_WEIGHT });
      }
    }
    return items;
  }

  // Bare eksamener (brukes til eksamensblomsten i hagen).
  function examsOf(subjects) {
    return planItems(subjects).filter((x) => x.kind === "exam");
  }

  // Hvor viktig et fag er akkurat nå (0–1), og hvorfor.
  function subjectUrgency(subject, dayKey) {
    let best = { value: 0, reason: null };
    if (subject.examDate) {
      const d = daysBetween(dayKey, subject.examDate);
      const v = pressureFromDays(d);
      if (v > best.value) best = { value: v, reason: `eksamen ${whenText(d)}` };
    }
    for (const o of subject.obliger || []) {
      if (o.done) continue;
      const d = daysBetween(dayKey, o.due);
      const v = d < 0 ? 0.7 : pressureFromDays(d) * OBLIG_WEIGHT;
      if (v > best.value) best = { value: v, reason: d < 0 ? `${o.title} er på overtid` : `${o.title} ${whenText(d)}` };
    }
    return best;
  }

  function isActiveSubject(subject, dayKey) {
    const examPassed = subject.examDate && daysBetween(dayKey, subject.examDate) < 0;
    const openOblig = (subject.obliger || []).some((o) => !o.done);
    return !examPassed || openOblig;
  }

  // Fordeler dagens lesetid på de 1–3 viktigste fagene ut fra vanskelighetsgrad og hvor nær eksamen/frister er.
  function suggestSubjects(subjects, dayKey, minutes) {
    const active = (subjects || []).filter((s) => isActiveSubject(s, dayKey));
    if (!active.length || minutes <= 0) return [];
    const scored = active.map((s) => {
      const u = subjectUrgency(s, dayKey);
      const diff = DIFFICULTY[s.difficulty] || DIFFICULTY[2];
      return {
        subjectId: s.id,
        name: s.name,
        score: diff.weight * (0.25 + u.value),
        reason: u.reason || `${diff.label.toLowerCase()} fag`
      };
    }).sort((a, b) => b.score - a.score);

    const count = minutes < 75 ? 1 : minutes < 150 ? 2 : 3;
    const top = scored.slice(0, count);
    const total = top.reduce((sum, x) => sum + x.score, 0);
    let left = minutes;
    return top.map((x, i) => {
      const share = i === top.length - 1 ? left : Math.max(15, roundTo((minutes * x.score) / total, 15));
      const m = Math.max(0, Math.min(left, share));
      left -= m;
      return { subjectId: x.subjectId, name: x.name, minutes: m, reason: x.reason };
    }).filter((x) => x.minutes > 0);
  }

  // Obliger som nærmer seg (innenfor påminnelsen) eller er på overtid.
  function dueReminders(subjects, todayKey) {
    const out = [];
    for (const s of subjects || []) {
      for (const o of s.obliger || []) {
        if (o.done) continue;
        const days = daysBetween(todayKey, o.due);
        const remind = o.remind === undefined ? 3 : o.remind;
        if (days <= remind) out.push({ subject: s, oblig: o, days });
      }
    }
    return out.sort((a, b) => a.days - b.days);
  }

  // Dagens oppgaver: i dag vises også uferdige oppgaver fra tidligere dager.
  function tasksForDay(tasks, dayKey, todayKey) {
    return (tasks || []).filter((t) => {
      if (dayKey === todayKey) return (!t.done && t.day <= todayKey) || (t.done && t.doneDay === todayKey);
      if (dayKey < todayKey) return t.done && t.doneDay === dayKey;
      return !t.done && t.day === dayKey;
    });
  }

  // Kalenderfil (.ics) for frister, med alarm på fristdagen og X dager før,
  // så telefonens kalender varsler selv når appen er lukket.
  function icsFor(subjectName, obliger, now) {
    const stamp = (now || new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const esc = (s) => String(s).replace(/[\\,;]/g, (c) => `\\${c}`);
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Balanse//NO", "CALSCALE:GREGORIAN"];
    for (const o of obliger) {
      const remind = o.remind === undefined ? 3 : o.remind;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${o.id}@balanse`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${o.due.replace(/-/g, "")}T090000`,
        "DURATION:PT1H",
        `SUMMARY:${esc(`Frist: ${subjectName} – ${o.title}`)}`,
        "DESCRIPTION:Lagt inn fra Balanse.",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(o.title)}`, "TRIGGER:-PT0M", "END:VALARM"
      );
      if (remind > 0) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(o.title)}`, `TRIGGER:-P${remind}D`, "END:VALARM");
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  const api = {
    DEFAULT_SETTINGS,
    DIFFICULTY,
    icsFor,
    planItems,
    examsOf,
    subjectUrgency,
    suggestSubjects,
    dueReminders,
    tasksForDay,
    whenText,
    DEFAULT_TEMPLATES,
    ACTIVITIES,
    templateFor,
    minutesForLevel,
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
