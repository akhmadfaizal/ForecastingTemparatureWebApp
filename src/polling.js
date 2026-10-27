/** A visible tab polls immediately; each channel has one active request at most. */
export function createVisiblePoller({ run, intervalMs, visibility = document, timers = globalThis, requestTimeoutMs = 15_000 }) {
  let stopped = false;
  let pending = null;
  let controller = null;
  let timer;
  const refresh = () => {
    if (stopped || visibility.hidden) return Promise.resolve();
    if (pending) return pending;
    timers.clearTimeout(timer);
    const active = new AbortController();
    controller = active;
    const timeout = timers.setTimeout(() => active.abort(new DOMException("Permintaan melewati batas waktu.", "TimeoutError")), requestTimeoutMs);
    pending = Promise.resolve().then(() => run(active.signal)).finally(() => {
      timers.clearTimeout(timeout);
      pending = null;
      controller = null;
      if (!stopped && !visibility.hidden) timer = timers.setTimeout(refresh, intervalMs);
    });
    return pending;
  };
  const onVisibility = () => {
    timers.clearTimeout(timer);
    if (visibility.hidden) controller?.abort();
    else if (pending) pending.finally(() => { if (!stopped && !visibility.hidden) refresh(); });
    else refresh();
  };
  visibility.addEventListener("visibilitychange", onVisibility);
  refresh();
  return {
    refresh,
    stop() {
      stopped = true;
      timers.clearTimeout(timer);
      controller?.abort();
      visibility.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

export function pollingInterval(value, fallback) {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds >= 1_000 ? milliseconds : fallback;
}
