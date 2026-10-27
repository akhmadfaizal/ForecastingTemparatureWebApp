import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./pipelineSnapshot.json", import.meta.url)));

test("cleaning audit reconciles all removals and identifies the actual artifact interval", () => {
  const steps = data.cleaning.steps;
  for (let i = 1; i < steps.length; i++) assert.equal(steps[i].before, steps[i - 1].after);
  assert.equal(steps[0].after, data.rawCount);
  assert.equal(steps.at(-1).after, data.cleanCount);
  assert.equal(steps.reduce((sum, s) => sum + s.before - s.after, 0), steps[0].before - data.cleanCount);
  const removed = data.cleaning.example.filter(row => row.removedAt);
  assert.equal(removed.length, data.artifactRemoved);
  assert.equal(data.cleaning.example.length, 12);
  assert.equal(new Set(data.cleaning.example.map(row => row.time)).size, 12);
  for (const row of data.cleaning.example) {
    const inside = Date.parse(row.time) > Date.parse("2026-08-26T09:35:15.777+07:00") && Date.parse(row.time) < Date.parse("2026-08-26T13:18:40.717+07:00");
    assert.equal(row.removedAt === "artifact", inside);
  }
});

test("42-day snapshot preserves observed coverage before interpolation", () => {
  assert.equal(data.total, 42 * 288);
  assert.equal(data.complete + data.missing, data.total);
  assert.deepEqual(data.splits.map(s => s.slots), [28 * 288, 7 * 288, 7 * 288]);
  assert.equal(data.daily.reduce((sum, d) => sum + d.complete, 0), data.complete);
  assert.equal(data.splits.reduce((sum, s) => sum + s.completeBefore, 0), data.complete);
  assert.equal(data.longGap.slots, 283);
  assert.ok(data.longGap.rows.filter(r => r.temperature === null).every(r => r.after === null));
});

test("sequence example contains contiguous history and targets for every selectable window", () => {
  for (let offset = 0; offset <= 30; offset++) {
    const issue = data.sequence[offset + 143];
    for (const horizon of [60, 120, 180]) {
      const target = data.sequence[offset + 143 + horizon / 5];
      assert.equal(Date.parse(target.time) - Date.parse(issue.time), horizon * 60_000);
      assert.ok(Number.isFinite(target.temperature_celsius));
    }
  }
  for (let i = 1; i < data.sequence.length; i++) {
    assert.equal(Date.parse(data.sequence[i].time) - Date.parse(data.sequence[i - 1].time), 300_000);
  }
});

test("scaled sensor values recover actual units and cyclic features have unit norm", () => {
  for (const row of data.scaled) {
    const actual = row.temperature * (data.scale.max.temperature - data.scale.min.temperature) + data.scale.min.temperature;
    assert.ok(Math.abs(actual - row.temperature_celsius) < 0.0001);
  }
  for (const row of data.features) {
    assert.ok(Math.abs(row.jam_sin ** 2 + row.jam_cos ** 2 - 1) < 0.00001);
    assert.ok(Math.abs(row.hari_sin ** 2 + row.hari_cos ** 2 - 1) < 0.00001);
  }
  if (data.shortGap.simulated) {
    assert.equal(data.shortGap.rows.filter(r => r.temperature === null).length, 2);
    assert.ok(data.shortGap.rows.every(r => Number.isFinite(r.after)));
  }
});
