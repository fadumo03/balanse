// Kjør med: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const B = require("../plan.js");

const TODAY = "2026-10-26"; // mandag

const subjects = [
  { id: "m", name: "Matematikk", difficulty: 3, examDate: "2026-10-31", obliger: [] },
  { id: "s", name: "Statistikk", difficulty: 2, examDate: "2026-11-20", obliger: [{ id: "o1", title: "Oblig 2", due: "2026-10-28", done: false }] },
  { id: "p", name: "Programmering", difficulty: 1, examDate: "2026-12-10", obliger: [] }
];

test("dagens lesetid fordeles på de viktigste fagene og summerer riktig", () => {
  const plan = B.suggestSubjects(subjects, TODAY, 180);
  assert.strictEqual(plan.length, 3);
  assert.strictEqual(plan.reduce((s, x) => s + x.minutes, 0), 180);
  assert.strictEqual(plan[0].name, "Matematikk"); // vanskelig + eksamen om 5 dager
  assert.ok(plan.every((x) => x.minutes % 15 === 0));
});

test("kort lesetid gir bare ett fag", () => {
  const plan = B.suggestSubjects(subjects, TODAY, 60);
  assert.strictEqual(plan.length, 1);
  assert.strictEqual(plan[0].minutes, 60);
});

test("en frist rett rundt hjørnet løfter faget og vises som grunn", () => {
  const plan = B.suggestSubjects(subjects, TODAY, 180);
  const stat = plan.find((x) => x.name === "Statistikk");
  assert.strictEqual(stat.reason, "Oblig 2 om 2 dager");
  const easy = B.suggestSubjects([{ id: "a", name: "A", difficulty: 2 }, { id: "b", name: "B", difficulty: 2, obliger: [{ id: "x", title: "Innlevering", due: "2026-10-27" }] }], TODAY, 60);
  assert.strictEqual(easy[0].name, "B");
});

test("fag med passert eksamen og ingen åpne obliger foreslås ikke", () => {
  const old = [{ id: "x", name: "Ferdig fag", difficulty: 3, examDate: "2026-10-01", obliger: [] }];
  assert.deepStrictEqual(B.suggestSubjects(old, TODAY, 120), []);
});

test("obliger teller i planen, men en frist er ikke en eksamensdag", () => {
  const items = B.planItems(subjects);
  assert.strictEqual(items.filter((x) => x.kind === "oblig").length, 1);
  const week = B.buildWeek(TODAY, { settings: {}, exams: items, logs: {} }, TODAY);
  const wed = week.days[2]; // fristen for Oblig 2
  assert.strictEqual(wed.examToday, null);
  assert.ok(wed.reasons.some((r) => r.startsWith("Frist i dag")));
  assert.strictEqual(B.examsOf(subjects).length, 3);
});

test("påminnelser: frister innenfor påminnelsen og på overtid", () => {
  const subs = [{
    id: "s", name: "Statistikk", obliger: [
      { id: "a", title: "Oblig 1", due: "2026-10-25" },              // på overtid
      { id: "b", title: "Oblig 2", due: "2026-10-28" },              // om 2 dager, standard 3 dager
      { id: "c", title: "Oblig 3", due: "2026-11-02", remind: 7 },   // om 7 dager, påminnelse 7
      { id: "d", title: "Oblig 4", due: "2026-11-20" },              // for langt unna
      { id: "e", title: "Oblig 5", due: "2026-10-27", done: true }   // levert
    ]
  }];
  const r = B.dueReminders(subs, TODAY);
  assert.deepStrictEqual(r.map((x) => x.oblig.id), ["a", "b", "c"]);
  assert.strictEqual(r[0].days, -1);
});

test("kalenderfil har frist kl. 9 og alarm X dager før", () => {
  const ics = B.icsFor("Statistikk", [
    { id: "o1", title: "Oblig 2, del A", due: "2026-10-28", remind: 3 },
    { id: "o2", title: "Oblig 3", due: "2026-11-06", remind: 0 }
  ], new Date("2026-10-26T10:00:00Z"));
  const lines = ics.split("\r\n");
  assert.strictEqual(lines[0], "BEGIN:VCALENDAR");
  assert.strictEqual(lines.filter((l) => l === "BEGIN:VEVENT").length, 2);
  assert.ok(lines.includes("DTSTART:20261028T090000"));
  assert.ok(lines.includes("SUMMARY:Frist: Statistikk – Oblig 2\\, del A")); // komma må escapes
  assert.ok(lines.includes("TRIGGER:-P3D"));
  assert.strictEqual(lines.filter((l) => l.startsWith("TRIGGER:-P") && l !== "TRIGGER:-PT0M").length, 1); // remind 0 gir bare alarm på dagen
  assert.strictEqual(lines[lines.length - 1], "END:VCALENDAR");
});

test("dagens oppgaver: uferdige oppgaver flytter seg til i dag", () => {
  const tasks = [
    { id: 1, text: "Fra i går", day: "2026-10-25", done: false },
    { id: 2, text: "Gjort i går", day: "2026-10-25", done: true, doneDay: "2026-10-25" },
    { id: 3, text: "I dag", day: "2026-10-26", done: true, doneDay: "2026-10-26" },
    { id: 4, text: "I morgen", day: "2026-10-27", done: false }
  ];
  assert.deepStrictEqual(B.tasksForDay(tasks, TODAY, TODAY).map((t) => t.id), [1, 3]);
  assert.deepStrictEqual(B.tasksForDay(tasks, "2026-10-25", TODAY).map((t) => t.id), [2]);
  assert.deepStrictEqual(B.tasksForDay(tasks, "2026-10-27", TODAY).map((t) => t.id), [4]);
});
