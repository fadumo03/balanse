// Balanse – belønninger: lese-streak, poeng/nivå og merker.
// Bygger på "done"-registreringene: done["ÅÅÅÅ-MM-DD"] = { study, studyMin, training }.
(function (root) {
  "use strict";

  const POINTS_PER_LEVEL = 100;

  function addDays(key, n) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d + n);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${mm}-${dd}`;
  }

  // Dager på rad med fullført lesing. Har du ikke lest i dag ennå,
  // teller vi fra i går – streaken ryker først når dagen er over.
  function studyStreak(done, todayKey) {
    let day = todayKey;
    if (!(done[day] && done[day].study)) day = addDays(day, -1);
    let count = 0;
    while (done[day] && done[day].study) {
      count++;
      day = addDays(day, -1);
    }
    return count;
  }

  function bestStreak(done) {
    const keys = Object.keys(done).filter((k) => done[k].study).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const key of keys) {
      run = prev && addDays(prev, 1) === key ? run + 1 : 1;
      best = Math.max(best, run);
      prev = key;
    }
    return best;
  }

  function totals(done) {
    let studyMin = 0;
    let studyDays = 0;
    let trainingDays = 0;
    let balancedDays = 0;
    for (const entry of Object.values(done)) {
      if (entry.study) {
        studyDays++;
        studyMin += Number(entry.studyMin) || 0;
      }
      if (entry.training) trainingDays++;
      if (entry.study && entry.training) balancedDays++;
    }
    return { studyMin, studyDays, trainingDays, balancedDays };
  }

  // 10 poeng per leseøkt + 1 poeng per 15 min lest, 5 poeng per treningsøkt.
  function points(done) {
    const t = totals(done);
    return t.studyDays * 10 + Math.floor(t.studyMin / 15) + t.trainingDays * 5;
  }

  function level(done) {
    const p = points(done);
    return {
      points: p,
      level: Math.floor(p / POINTS_PER_LEVEL) + 1,
      progress: (p % POINTS_PER_LEVEL) / POINTS_PER_LEVEL,
      toNext: POINTS_PER_LEVEL - (p % POINTS_PER_LEVEL)
    };
  }

  const BADGES = [
    { id: "first", icon: "📖", title: "Første økt", desc: "Fullfør din første leseøkt", test: (s) => s.t.studyDays >= 1 },
    { id: "streak3", icon: "🔥", title: "På gang", desc: "Les 3 dager på rad", test: (s) => s.best >= 3 },
    { id: "streak7", icon: "⚡", title: "En hel uke", desc: "Les 7 dager på rad", test: (s) => s.best >= 7 },
    { id: "streak14", icon: "🏆", title: "Uknuselig", desc: "Les 14 dager på rad", test: (s) => s.best >= 14 },
    { id: "hours10", icon: "⏱️", title: "10 timer", desc: "Les totalt 10 timer", test: (s) => s.t.studyMin >= 600 },
    { id: "hours50", icon: "🎓", title: "50 timer", desc: "Les totalt 50 timer", test: (s) => s.t.studyMin >= 3000 },
    { id: "balance1", icon: "⚖️", title: "Balansert dag", desc: "Les og tren samme dag", test: (s) => s.t.balancedDays >= 1 },
    { id: "balance5", icon: "🧘", title: "Balansemester", desc: "5 dager med både lesing og trening", test: (s) => s.t.balancedDays >= 5 },
    { id: "logger", icon: "🌙", title: "Kjenn deg selv", desc: "Logg søvn og stress 7 ganger", test: (s) => s.logs >= 7 }
  ];

  function badges(state) {
    const done = state.done || {};
    const s = { t: totals(done), best: bestStreak(done), logs: Object.keys(state.logs || {}).length };
    return BADGES.map((b) => ({ id: b.id, icon: b.icon, title: b.title, desc: b.desc, earned: b.test(s) }));
  }

  const api = { studyStreak, bestStreak, totals, points, level, badges, POINTS_PER_LEVEL };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Rewards = api;
})(typeof window !== "undefined" ? window : this);
