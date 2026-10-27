import test from "node:test";
import assert from "node:assert/strict";
import { createVisiblePoller, pollingInterval } from "./polling.js";
function environment() {
  const visibility = new EventTarget();
  visibility.hidden = false;
  const scheduled = new Map();
  let id = 0;
  return { visibility, scheduled, timers: {
    setTimeout(callback, milliseconds) { scheduled.set(++id, { callback, milliseconds }); return id; },
    clearTimeout(key) { scheduled.delete(key); }
  } };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
test("slow requests and manual refresh cannot overlap; polling resumes after completion", async () => {
  const env = environment();
  let calls = 0;
  let finish;
  const poller = createVisiblePoller({ ...env, intervalMs: 5000, run: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  await flush();
  const first = poller.refresh();
  assert.equal(poller.refresh(), first);
  assert.equal(calls, 1);
  finish();
  await first;
  assert.deepEqual([...env.scheduled.values()].map(task => task.milliseconds), [5000]);
  poller.stop();
  assert.equal(env.scheduled.size, 0);
});
test("hiding aborts active request; visible immediately refreshes; stop prevents later work", async () => {
  const env = environment();
  const signals = [];
  const poller = createVisiblePoller({ ...env, intervalMs: 5000, run: signal => {
    signals.push(signal);
    return new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
  } });
  await flush();
  env.visibility.hidden = true;
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  assert.equal(signals[0].aborted, true);
  env.visibility.hidden = false;
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(signals.length, 2);
  poller.stop();
  await flush();
  assert.equal(signals[1].aborted, true);
  assert.equal(env.scheduled.size, 0);
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(signals.length, 2);
});
test("hidden initial page sends no request; stalled request times out and permits retry", async () => {
  const env = environment();
  env.visibility.hidden = true;
  let calls = 0;
  let signal;
  const poller = createVisiblePoller({ ...env, intervalMs: 5000, run: active => {
    calls++;
    signal = active;
    return new Promise(resolve => active.addEventListener("abort", resolve, { once: true }));
  } });
  await flush();
  assert.equal(calls, 0);
  env.visibility.hidden = false;
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  await flush();
  [...env.scheduled.values()].find(task => task.milliseconds === 15000).callback();
  await flush();
  assert.equal(signal.reason.name, "TimeoutError");
  assert.ok([...env.scheduled.values()].some(task => task.milliseconds === 5000));
  poller.stop();
});
test("invalid polling configuration falls back instead of producing a busy loop", () => {
  for (const value of [undefined, "", "oops", "0", "-1", "500", Infinity]) assert.equal(pollingInterval(value, 5000), 5000);
  assert.equal(pollingInterval("2500", 5000), 2500);
});
