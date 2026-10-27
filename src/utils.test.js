import test from "node:test";
import assert from "node:assert/strict";
import { toChartPoint } from "./utils.js";

test("koordinat X grafik tetap unik ketika jam yang sama muncul pada hari berbeda", () => {
  const firstDay = toChartPoint({
    timestamp: "2026-09-29T12:15:00+07:00",
    temperature: 27.8,
    humidity: 42
  });
  const secondDay = toChartPoint({
    timestamp: "2026-09-30T12:15:00+07:00",
    temperature: 27.9,
    humidity: 41
  });

  assert.notEqual(firstDay.x, secondDay.x);
});
