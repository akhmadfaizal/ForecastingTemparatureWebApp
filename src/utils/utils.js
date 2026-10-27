export const THRESHOLD = 27;

export function parseTimestamp(value) {
  if (!value) return null;
  if (value.includes("T") || /[zZ]|[+-]\d\d:\d\d$/.test(value)) return new Date(value);
  return new Date(value.replace(" ", "T") + "+07:00");
}

export function formatTime(value) {
  const date = parseTimestamp(value);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
    : "-";
}

export function formatDateTime(value) {
  const date = parseTimestamp(value);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(date)
    : "-";
}

export function toChartPoint(row) {
  return {
    x: row.timestamp,
    temperature: Number(row.temperature),
    humidity: row.humidity == null ? null : Number(row.humidity)
  };
}

export function normalizePrediction(row) {
  return {
    id: row.id == null ? "" : String(row.id),
    generatedAt: row.generated_at || row.created_at || "",
    horizon: Number(row.horizon_minutes),
    model: row.model_name || row.model || "-",
    temperature: Number(row.predicted_temperature ?? row.predicted_temperature_celsius),
    targetAt: row.target_at || row.target_timestamp,
    above: row.above_threshold === true || Number(row.above_threshold) === 1,
    threshold: Number(row.threshold_celsius ?? THRESHOLD),
    ensemble: Number(row.ensemble_size || 1)
  };
}

export function ageInMinutes(value, serverTime) {
  const timestamp = parseTimestamp(value);
  const server = parseTimestamp(serverTime);
  if (!timestamp || !server || Number.isNaN(timestamp.getTime()) || Number.isNaN(server.getTime())) return null;
  return Math.max(0, Math.floor((server.getTime() - timestamp.getTime()) / 60000));
}
