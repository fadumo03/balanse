// Balanse – hagen. Hver fullført leseøkt med timer gror en plante.
// Lengre økt i strekk gir finere plante, trening gir vann som får plantene til å blomstre,
// og man vinner ting (gjødsel, streak-frys, pynt) underveis.
(function (root) {
  "use strict";

  const B = typeof module !== "undefined" && module.exports ? require("./plan.js") : root.Balanse;

  const GRACE_MS = 2 * 60 * 1000; // snill modus: inntil 2 min utenfor appen
  const MIN_TILES = 30;
  const COLS = 5;

  // Illustrasjonene ligger i icons.js og slås opp på id.
  const PLANTS = [
    { id: "spire", name: "Spire", minutes: 25 },
    { id: "tulipan", name: "Tulipan", minutes: 45 },
    { id: "solsikke", name: "Solsikke", minutes: 45 },
    { id: "tre", name: "Tre", minutes: 60, article: "et" },
    { id: "kirsebaer", name: "Kirsebærtre", minutes: 90, article: "et" }
  ];
  const EXAM_FLOWER = { id: "eksamen", name: "Eksamensblomst" };
  const WITHERED = { id: "visnet", name: "Visnet plante" };

  // Pynt låses opp etter totalt antall minutter lest med timer.
  const DECOR = [
    { id: "benk", name: "Benk", minutes: 300 },
    { id: "lykt", name: "Lykt", minutes: 600 },
    { id: "sommerfugl", name: "Sommerfugler", minutes: 900 },
    { id: "dam", name: "Dam", minutes: 1200 },
    { id: "fontene", name: "Fontene", minutes: 1800 },
    { id: "sopp", name: "Sopp", minutes: 2400 },
    { id: "hus", name: "Hagestue", minutes: 3000 }
  ];

  function plantInfo(id) {
    if (id === EXAM_FLOWER.id) return EXAM_FLOWER;
    if (id === WITHERED.id) return WITHERED;
    return PLANTS.find((p) => p.id === id);
  }

  function ensure(state) {
    state.sessions = state.sessions || [];
    state.inventory = Object.assign({ vann: 0, gjodsel: 0, frys: 0 }, state.inventory);
    state.garden = state.garden || { tiles: [] };
    state.frozen = state.frozen || {};
    state.waterGiven = state.waterGiven || {};
    state.fertilizedDays = state.fertilizedDays || {};
    state.examFlowers = state.examFlowers || {};
    while (state.garden.tiles.length < MIN_TILES) state.garden.tiles.push(null);
    return state;
  }

  function placeInGarden(state, item) {
    const tiles = state.garden.tiles;
    let index = tiles.indexOf(null);
    if (index === -1) {
      index = tiles.length;
      for (let i = 0; i < COLS; i++) tiles.push(null);
    }
    tiles[index] = item;
    return index;
  }

  // ---------- Minutter og streak ----------
  function grownOn(state, dayKey) {
    return state.sessions.filter((s) => s.day === dayKey && s.status === "grown" && s.minutes > 0);
  }

  function studyMinutes(state, dayKey) {
    return grownOn(state, dayKey).reduce((sum, s) => sum + s.minutes, 0);
  }

  function totalMinutes(state) {
    return state.sessions.reduce((sum, s) => sum + (s.status === "grown" ? s.minutes : 0), 0);
  }

  function hasStudied(state, dayKey) {
    return grownOn(state, dayKey).length > 0 || !!state.frozen[dayKey];
  }

  // Dager på rad med minst én fullført økt. Har du ikke lest i dag ennå, teller vi fra i går.
  function streak(state, todayKey) {
    let day = hasStudied(state, todayKey) ? todayKey : B.addDays(todayKey, -1);
    let count = 0;
    while (hasStudied(state, day)) {
      count++;
      day = B.addDays(day, -1);
    }
    return count;
  }

  // Bruker streak-frys automatisk på dager du gikk glipp av, hvis du har nok frys til å redde streaken.
  function applyFreezes(state, todayKey) {
    const missing = [];
    let day = B.addDays(todayKey, -1);
    while (!hasStudied(state, day) && missing.length <= state.inventory.frys) {
      missing.push(day);
      day = B.addDays(day, -1);
    }
    if (!missing.length || missing.length > state.inventory.frys || !hasStudied(state, day)) return [];
    for (const key of missing) state.frozen[key] = true;
    state.inventory.frys -= missing.length;
    return missing;
  }

  // ---------- Timer ----------
  // Hva skal skje med en aktiv økt nå? "continue", "complete" eller "wither".
  function resolve(active, nowMs) {
    const end = active.start + active.minutes * 60000;
    if (active.leftAt && nowMs - active.leftAt > GRACE_MS) {
      // Ble økta ferdig før de 2 minuttene var brukt opp, teller den likevel.
      return end <= active.leftAt + GRACE_MS ? "complete" : "wither";
    }
    return nowMs >= end ? "complete" : "continue";
  }

  // Den visne planten en økt prøver å gjenopplive, hvis den fortsatt er vissen.
  function reviveTarget(state, active) {
    if (!active.revive) return null;
    return state.sessions.find((s) => s.id === active.revive && s.status === "withered") || null;
  }

  function completeSession(state, active, nowMs, exams) {
    ensure(state);
    const plant = plantInfo(active.plant);
    const day = B.toKey(new Date(active.start));
    const before = totalMinutes(state);
    const target = reviveTarget(state, active);
    let session;
    if (target) {
      // Gjenoppliving: den visne planten blir til den opprinnelige planten igjen, i samme rute.
      session = Object.assign(target, {
        day,
        plant: plant.id,
        minutes: plant.minutes,
        status: "grown",
        golden: !!active.golden,
        bloomed: false,
        revived: true,
        subjectId: active.subjectId || null,
        end: nowMs
      });
      delete session.wanted;
    } else {
      session = {
        id: String(active.start),
        day,
        plant: plant.id,
        minutes: plant.minutes,
        status: "grown",
        golden: !!active.golden,
        bloomed: false,
        subjectId: active.subjectId || null,
        end: nowMs
      };
      state.sessions.push(session);
      placeInGarden(state, { kind: "plant", sid: session.id });
    }
    // Har du allerede trent i dag, er hagen vannet og planten blomstrer med én gang.
    if (state.waterGiven[day]) session.bloomed = true;
    const events = [{ type: "plant", plant, golden: session.golden, minutes: plant.minutes, revived: !!target, bloomed: session.bloomed }];

    const doneToday = grownOn(state, day).length;
    if (doneToday === 3 && !state.fertilizedDays[day]) {
      state.fertilizedDays[day] = true;
      state.inventory.gjodsel++;
      events.push({ type: "gjodsel" });
    }

    for (const exam of exams || []) {
      if (B.daysBetween(day, exam.date) === 1 && !state.examFlowers[exam.id]) {
        state.examFlowers[exam.id] = true;
        const flower = { id: `${session.id}-${exam.id}`, day, plant: EXAM_FLOWER.id, minutes: 0, status: "grown", bloomed: true, subject: exam.subject, end: nowMs };
        state.sessions.push(flower);
        placeInGarden(state, { kind: "plant", sid: flower.id });
        events.push({ type: "exam", subject: exam.subject });
      }
    }

    if (doneToday === 1) {
      const s = streak(state, day);
      if (s > 0 && s % 7 === 0) {
        state.inventory.frys++;
        events.push({ type: "frys", streak: s });
      }
    }

    const after = totalMinutes(state);
    for (const d of DECOR) {
      if (before < d.minutes && after >= d.minutes) events.push({ type: "decor", decor: d });
    }
    return events;
  }

  function witherSession(state, active, nowMs) {
    ensure(state);
    // Et mislykket gjenopplivingsforsøk lager ikke enda en vissen plante – den gamle blir stående.
    const target = reviveTarget(state, active);
    if (target) return target;
    const session = {
      id: String(active.start),
      day: B.toKey(new Date(active.start)),
      plant: WITHERED.id,
      wanted: active.plant,
      minutes: 0,
      status: "withered",
      end: nowMs
    };
    state.sessions.push(session);
    placeInGarden(state, { kind: "plant", sid: session.id });
    return session;
  }

  // ---------- Vann og blomstring ----------
  // Én treningsøkt vanner hele hagen: alle tørste planter blomstrer.
  // Planter som gror senere samme dag blomstrer med én gang (se completeSession).
  // Returnerer antall planter som begynte å blomstre.
  function giveWater(state, dayKey) {
    ensure(state);
    state.waterGiven[dayKey] = true;
    let bloomed = 0;
    for (const s of state.sessions) {
      if (s.status === "grown" && !s.bloomed) {
        s.bloomed = true;
        bloomed++;
      }
    }
    return bloomed;
  }

  function thirstyCount(state) {
    return state.sessions.filter((s) => s.status === "grown" && !s.bloomed).length;
  }

  // ---------- Pynt ----------
  function decorStatus(state) {
    const total = totalMinutes(state);
    const placed = new Set(state.garden.tiles.filter((t) => t && t.kind === "decor").map((t) => t.id));
    return DECOR.map((d) => ({ ...d, unlocked: total >= d.minutes, placed: placed.has(d.id) }));
  }

  function placeDecor(state, decorId, index) {
    const d = decorStatus(state).find((x) => x.id === decorId);
    if (!d || !d.unlocked || d.placed || state.garden.tiles[index]) return false;
    state.garden.tiles[index] = { kind: "decor", id: decorId };
    return true;
  }

  function removeDecor(state, index) {
    const tile = state.garden.tiles[index];
    if (!tile || tile.kind !== "decor") return false;
    state.garden.tiles[index] = null;
    return true;
  }

  // ---------- Vær fra søvn og stress ----------
  function weather(state, todayKey) {
    const logs = state.logs || {};
    const entry = logs[todayKey] || logs[B.addDays(todayKey, -1)];
    if (!entry) return "cloud";
    if (entry.sleep >= 7 && entry.stress <= 3) return "sun";
    if (entry.sleep < 6 || entry.stress >= 4) return "rain";
    return "cloud";
  }

  // ---------- Frøkatalog ----------
  function catalog(state) {
    return [...PLANTS, EXAM_FLOWER].map((p) => {
      const grown = state.sessions.filter((s) => s.status === "grown" && s.plant === p.id);
      return { ...p, count: grown.length, golden: grown.filter((s) => s.golden).length };
    });
  }

  const api = {
    GRACE_MS, COLS, PLANTS, EXAM_FLOWER, WITHERED, DECOR,
    plantInfo, ensure, studyMinutes, totalMinutes, hasStudied, streak, applyFreezes,
    resolve, completeSession, witherSession, giveWater, thirstyCount,
    decorStatus, placeDecor, removeDecor, weather, catalog
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Garden = api;
})(typeof window !== "undefined" ? window : this);
