import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../services/api";
import { mockPredictions, mockReadings } from "../data/mockData";
import { normalizePrediction } from "../utils/utils";
import { createVisiblePoller, pollingInterval } from "../utils/polling";

export const PREDICTION_INTERVAL_MS = pollingInterval(import.meta.env.VITE_PREDICTION_POLL_MS, 5_000);
const HISTORY_INTERVAL_MS = pollingInterval(import.meta.env.VITE_HISTORY_POLL_MS, 60_000);

export function useDashboardData(demo) {
  const [readings, setReadings] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [serverTime, setServerTime] = useState(null);
  const [channels, setChannels] = useState({ history: false, predictions: false });
  const [busy, setBusy] = useState({ history: true, predictions: true });
  const [errors, setErrors] = useState({ history: "", predictions: "" });
  const [ready, setReady] = useState(false);
  const pollers = useRef([]);
  useEffect(() => {
    let disposed = false;
    const update = (setter, channel, value) => {
      if (!disposed) setter(previous => ({ ...previous, [channel]: value }));
    };
    if (demo) {
      setReadings(mockReadings);
      setPredictions(mockPredictions.map(normalizePrediction));
      setServerTime(mockReadings.at(-1)?.timestamp);
      setChannels({ history: true, predictions: true });
      setBusy({ history: false, predictions: false });
      setErrors({ history: "", predictions: "" });
      setReady(true);
      return () => { disposed = true; };
    }
    setReady(false);
    setReadings([]);
    setPredictions([]);
    setServerTime(null);
    setChannels({ history: false, predictions: false });
    setErrors({ history: "", predictions: "" });
    const channel = (name, intervalMs, fetchData, apply) => createVisiblePoller({
      intervalMs,
      run: async signal => {
        update(setBusy, name, true);
        try {
          const data = await fetchData(signal);
          if (disposed || signal.aborted) return;
          apply(data);
          update(setChannels, name, true);
          update(setErrors, name, "");
        } catch (error) {
          if (!disposed && !(signal.aborted && signal.reason?.name === "AbortError")) {
            update(setChannels, name, false);
            update(setErrors, name, error.message);
          }
        } finally {
          update(setBusy, name, false);
          if (!disposed && !(signal.aborted && signal.reason?.name === "AbortError")) setReady(true);
        }
      }
    });
    pollers.current = [
      channel("history", HISTORY_INTERVAL_MS,
        signal => Promise.all([api.health(signal), api.readings(288, signal)]),
        ([health, data]) => {
          if (health.status !== "ok") throw new Error("Pemeriksaan backend belum berhasil.");
          setReadings(data.readings || []);
          setServerTime(data.server_time || health.server_time || null);
        }),
      channel("predictions", PREDICTION_INTERVAL_MS,
        signal => api.predictions(signal),
        data => {
          setPredictions((data.predictions || []).map(normalizePrediction));
          if (data.server_time) setServerTime(data.server_time);
        })
    ];
    return () => {
      disposed = true;
      pollers.current.forEach(poller => poller.stop());
      pollers.current = [];
    };
  }, [demo]);
  const reload = useCallback(() => { pollers.current.forEach(poller => poller.refresh()); }, []);
  return {
    readings, predictions, serverTime,
    connected: channels.history && channels.predictions,
    loading: !ready,
    refreshing: busy.history || busy.predictions,
    error: Object.values(errors).filter(Boolean).join(" "),
    reload
  };
}
