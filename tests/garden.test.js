// Kjør med: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const G = require("../garden.js");
const B = require("../plan.js");

const MIN = 60000;

function fresh() {
  return G.ensure({ logs: {} });
}

// Starttidspunkt kl. 10 lokal tid på en gitt dag.
function at(dayKey, hour = 10) {
  const d = B.parseKey(dayKey);
  d.setHours(hour);
  return d.getTime();
}

function grow(state, dayKey, plant = "tulipan", hour = 10, exams = []) {
  const p = G.plantInfo(plant);
  const active = { start: at(dayKey, hour), plant, minutes: p.minutes };
  return G.completeSession(state, active, active.start + p.minutes * MIN, exams);
}

test("timer: fortsetter, fullføres og visner riktig", () => {
  const start = 1_000_000;
  const a = { start, minutes: 45 };
  assert.strictEqual(G.resolve(a, start + 10 * MIN), "continue");
  assert.strictEqual(G.resolve(a, start + 45 * MIN), "complete");
  // Borte i 1 min: helt greit (snill modus)
  assert.strictEqual(G.resolve({ ...a, leftAt: start + 5 * MIN }, start + 6 * MIN), "continue");
  // Borte i 3 min: planten visner
  assert.strictEqual(G.resolve({ ...a, leftAt: start + 5 * MIN }, start + 8 * MIN), "wither");
  // Gikk ut 1 min før slutt og kom tilbake mye senere: økta var ferdig innenfor de 2 minuttene
  assert.strictEqual(G.resolve({ ...a, leftAt: start + 44 * MIN }, start + 60 * MIN), "complete");
});

test("fullført økt planter riktig plante og teller minutter", () => {
  const s = fresh();
  const events = grow(s, "2026-10-24", "tre");
  assert.strictEqual(events[0].plant.id, "tre");
  assert.strictEqual(G.studyMinutes(s, "2026-10-24"), 60);
  assert.ok(s.garden.tiles.some((t) => t && t.kind === "plant"));
});

test("visnet plante gir ingen minutter og ingen streak", () => {
  const s = fresh();
  G.witherSession(s, { start: at("2026-10-24"), plant: "tulipan", minutes: 45 }, at("2026-10-24", 11));
  assert.strictEqual(G.studyMinutes(s, "2026-10-24"), 0);
  assert.strictEqual(G.streak(s, "2026-10-24"), 0);
});

test("visnet plante kan gjenopplives i samme rute ved å lese like lenge", () => {
  const s = fresh();
  const dead = G.witherSession(s, { start: at("2026-10-23"), plant: "tre", minutes: 60 }, at("2026-10-23", 11));
  const tile = s.garden.tiles.findIndex((t) => t && t.sid === dead.id);
  const active = { start: at("2026-10-24"), plant: "tre", minutes: 60, revive: dead.id };
  const events = G.completeSession(s, active, active.start + 60 * MIN, []);
  assert.strictEqual(events[0].revived, true);
  assert.strictEqual(s.sessions.length, 1); // ingen ny plante, den gamle er gjenopplivet
  assert.strictEqual(s.sessions[0].status, "grown");
  assert.strictEqual(s.sessions[0].plant, "tre");
  assert.strictEqual(s.garden.tiles[tile].sid, dead.id); // samme rute
  assert.strictEqual(G.studyMinutes(s, "2026-10-24"), 60); // teller på dagen du leste
});

test("mislykket gjenoppliving lager ikke enda en vissen plante", () => {
  const s = fresh();
  const dead = G.witherSession(s, { start: at("2026-10-23"), plant: "tulipan", minutes: 45 }, at("2026-10-23", 11));
  G.witherSession(s, { start: at("2026-10-24"), plant: "tulipan", minutes: 45, revive: dead.id }, at("2026-10-24", 11));
  assert.strictEqual(s.sessions.length, 1);
  assert.strictEqual(s.garden.tiles.filter(Boolean).length, 1);
});

test("tre økter samme dag gir gjødsel én gang", () => {
  const s = fresh();
  grow(s, "2026-10-24", "spire", 9);
  grow(s, "2026-10-24", "spire", 10);
  const third = grow(s, "2026-10-24", "spire", 11);
  assert.ok(third.some((e) => e.type === "gjodsel"));
  grow(s, "2026-10-24", "spire", 12);
  assert.strictEqual(s.inventory.gjodsel, 1);
});

test("7 dager på rad gir streak-frys, som redder en glemt dag", () => {
  const s = fresh();
  let events = [];
  for (let d = 1; d <= 7; d++) events = grow(s, `2026-10-0${d}`);
  assert.ok(events.some((e) => e.type === "frys"));
  assert.strictEqual(s.inventory.frys, 1);
  // Glemte 8. oktober, i dag er det 9.
  const used = G.applyFreezes(s, "2026-10-09");
  assert.deepStrictEqual(used, ["2026-10-08"]);
  assert.strictEqual(G.streak(s, "2026-10-09"), 8);
  assert.strictEqual(s.inventory.frys, 0);
});

test("frys brukes ikke når det ikke er nok til å redde streaken", () => {
  const s = fresh();
  grow(s, "2026-10-01");
  s.inventory.frys = 1;
  assert.deepStrictEqual(G.applyFreezes(s, "2026-10-05"), []); // tre dager borte
  assert.strictEqual(s.inventory.frys, 1);
});

test("eksamensblomst dagen før eksamen, bare én per eksamen", () => {
  const s = fresh();
  const exams = [{ id: "m1", subject: "Matte", date: "2026-10-25" }];
  const events = grow(s, "2026-10-24", "tulipan", 10, exams);
  assert.ok(events.some((e) => e.type === "exam" && e.subject === "Matte"));
  grow(s, "2026-10-24", "tulipan", 12, exams);
  assert.strictEqual(G.catalog(s).find((c) => c.id === "eksamen").count, 1);
});

test("én treningsøkt vanner hele hagen", () => {
  const s = fresh();
  for (let h = 8; h < 13; h++) grow(s, "2026-10-23", "spire", h);
  grow(s, "2026-10-24", "tre", 8);
  G.witherSession(s, { start: at("2026-10-24", 10), plant: "tulipan", minutes: 45 }, at("2026-10-24", 11));
  assert.strictEqual(G.thirstyCount(s), 6);
  assert.strictEqual(G.giveWater(s, "2026-10-24"), 6); // alle seks blomstrer på én gang
  assert.strictEqual(G.thirstyCount(s), 0);
  assert.strictEqual(s.sessions.find((x) => x.status === "withered").bloomed, undefined); // visne planter vannes ikke
});

test("planter som gror etter dagens trening blomstrer med én gang", () => {
  const s = fresh();
  G.giveWater(s, "2026-10-24");
  const events = grow(s, "2026-10-24", "tulipan", 18);
  assert.strictEqual(events[0].bloomed, true);
  grow(s, "2026-10-25", "tulipan", 10); // ny dag, ikke trent ennå
  assert.strictEqual(G.thirstyCount(s), 1);
});

test("pynt låses opp etter 5 timer og kan plasseres i hagen", () => {
  const s = fresh();
  let unlocked = [];
  for (let h = 8; h < 13; h++) unlocked = unlocked.concat(grow(s, "2026-10-24", "tre", h).filter((e) => e.type === "decor"));
  assert.strictEqual(unlocked.length, 1);
  assert.strictEqual(unlocked[0].decor.id, "benk");
  const free = s.garden.tiles.indexOf(null);
  assert.strictEqual(G.placeDecor(s, "benk", free), true);
  assert.strictEqual(G.placeDecor(s, "benk", free + 1), false); // allerede plassert
  assert.strictEqual(G.placeDecor(s, "lykt", free + 1), false); // ikke låst opp
});

test("været følger søvn og stress", () => {
  const s = fresh();
  assert.strictEqual(G.weather(s, "2026-10-24"), "cloud");
  s.logs["2026-10-24"] = { sleep: 8, stress: 2 };
  assert.strictEqual(G.weather(s, "2026-10-24"), "sun");
  s.logs["2026-10-24"] = { sleep: 5, stress: 4 };
  assert.strictEqual(G.weather(s, "2026-10-24"), "rain");
});

test("treningsøkt velges fra egne maler og varierer fra dag til dag", () => {
  const templates = { 2: ["A", "B"], 1: [], 0: ["Gå"] };
  const a = B.templateFor(templates, 2, "2026-10-24");
  const b = B.templateFor(templates, 2, "2026-10-25");
  assert.notStrictEqual(a, b);
  assert.ok(["A", "B"].includes(a));
  assert.ok(B.DEFAULT_TEMPLATES[1].includes(B.templateFor(templates, 1, "2026-10-24"))); // tom liste -> standard
});
