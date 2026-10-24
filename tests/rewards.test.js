// Kjør med: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const R = require("../rewards.js");

const read = (min = 60) => ({ study: true, studyMin: min });

test("streak teller dager på rad, også før dagens lesing er gjort", () => {
  const done = { "2026-10-21": read(), "2026-10-22": read(), "2026-10-23": read() };
  assert.strictEqual(R.studyStreak(done, "2026-10-24"), 3); // i dag ikke lest ennå
  done["2026-10-24"] = read();
  assert.strictEqual(R.studyStreak(done, "2026-10-24"), 4);
});

test("streak ryker når en dag hoppes over", () => {
  const done = { "2026-10-20": read(), "2026-10-22": read() };
  assert.strictEqual(R.studyStreak(done, "2026-10-24"), 0);
  assert.strictEqual(R.bestStreak(done), 1);
});

test("streak fungerer over månedsskifte", () => {
  const done = { "2026-10-30": read(), "2026-10-31": read(), "2026-11-01": read() };
  assert.strictEqual(R.studyStreak(done, "2026-11-01"), 3);
  assert.strictEqual(R.bestStreak(done), 3);
});

test("avkrysset trening uten lesing teller ikke på streaken", () => {
  const done = { "2026-10-23": { training: true } };
  assert.strictEqual(R.studyStreak(done, "2026-10-24"), 0);
});

test("poeng og nivå", () => {
  // 2 leseøkter à 90 min = 2*10 + 180/15 = 32, + 1 treningsøkt = 37
  const done = { "2026-10-22": read(90), "2026-10-23": Object.assign(read(90), { training: true }) };
  assert.strictEqual(R.points(done), 37);
  const lvl = R.level(done);
  assert.strictEqual(lvl.level, 1);
  assert.strictEqual(lvl.toNext, 63);
});

test("merker låses opp", () => {
  const done = {};
  for (let d = 1; d <= 7; d++) done[`2026-10-${String(d).padStart(2, "0")}`] = read(120);
  const earned = R.badges({ done, logs: {} }).filter((b) => b.earned).map((b) => b.id);
  assert.deepStrictEqual(earned.sort(), ["first", "hours10", "streak3", "streak7"].sort());
});
