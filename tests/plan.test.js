// Kjør med: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const B = require("../plan.js");

const MONDAY = "2026-10-19";
const TODAY = "2026-10-19";

function week(state) {
  return B.buildWeek(MONDAY, Object.assign({ settings: {}, exams: [], logs: {} }, state), TODAY);
}

test("rolig uke gir en ekstra treningsøkt", () => {
  const w = week({});
  assert.strictEqual(w.mode, "Rolig uke");
  assert.strictEqual(w.sessionCount, B.DEFAULT_SETTINGS.sessionsPerWeek + 1);
  const hard = w.days.filter((d) => d.training && d.training.label === "Hard");
  assert.strictEqual(hard.length, w.sessionCount);
});

test("eksamen om få dager gir mer lesing og lettere trening", () => {
  const calm = week({});
  const exam = week({ exams: [{ subject: "Matte", date: "2026-10-23" }] }); // fredag
  assert.strictEqual(exam.mode, "Innspurt");
  assert.ok(exam.totalStudy > calm.totalStudy, "mer lesetid");
  const thursday = exam.days[3];
  assert.ok(thursday.study > calm.days[3].study);
  assert.ok(!thursday.training || thursday.training.level === 0, "bare lett trening dagen før");
});

test("trening kuttes aldri helt, selv i innspurt", () => {
  const w = week({
    exams: [
      { subject: "A", date: "2026-10-20" },
      { subject: "B", date: "2026-10-23" },
      { subject: "C", date: "2026-10-25" }
    ]
  });
  assert.ok(w.totalTraining > 0);
  for (const day of w.days) assert.ok(day.training, `${day.name} har bevegelse`);
});

test("eksamensdag gir kort repetisjon og gåtur", () => {
  const w = week({ exams: [{ subject: "Matte", date: "2026-10-21" }] });
  const wed = w.days[2];
  assert.strictEqual(wed.examToday.subject, "Matte");
  assert.strictEqual(wed.study, 30);
  assert.strictEqual(wed.training.level, 0);
});

test("lite søvn og høyt stress skrur ned belastningen", () => {
  const rested = week({ logs: { "2026-10-19": { sleep: 8, stress: 1 } } });
  const tired = week({
    logs: {
      "2026-10-17": { sleep: 5, stress: 5 },
      "2026-10-18": { sleep: 5.5, stress: 4 },
      "2026-10-19": { sleep: 5, stress: 5 }
    }
  });
  const mon = 0;
  assert.ok(tired.days[mon].readiness < 0.4);
  assert.ok(tired.days[mon].study < rested.days[mon].study);
  assert.ok(tired.days[mon].training.level < rested.days[mon].training.level);
  assert.ok(tired.days[mon].sleepTip);
});

test("datoer håndterer sommertid og ukestart", () => {
  assert.strictEqual(B.daysBetween("2026-10-24", "2026-10-26"), 2); // over sommertidsskiftet
  assert.strictEqual(B.weekStart("2026-10-25"), "2026-10-19"); // søndag -> mandag
  assert.strictEqual(B.addDays("2026-12-31", 1), "2027-01-01");
});
