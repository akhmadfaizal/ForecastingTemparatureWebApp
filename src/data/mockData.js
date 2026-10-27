const start = new Date("2026-09-18T02:00:00+07:00");

export const mockReadings = Array.from({ length: 72 }, (_, index) => {
  const timestamp = new Date(start.getTime() + index * 5 * 60 * 1000);
  const temperature = 26.18 + Math.sin(index / 8) * 0.38 + index * 0.006;
  return {
    timestamp: timestamp.toISOString(),
    temperature: temperature.toFixed(3),
    humidity: (50.7 + Math.cos(index / 11) * 1.4).toFixed(3)
  };
});

export const mockPredictions = [
  { horizon_minutes: 60, model_name: "LSTM", predicted_temperature: "26.48", above_threshold: 0, target_at: "2026-09-18 09:55:00", ensemble_size: 1 },
  { horizon_minutes: 120, model_name: "LSTM", predicted_temperature: "26.06", above_threshold: 0, target_at: "2026-09-18 10:55:00", ensemble_size: 1 },
  { horizon_minutes: 180, model_name: "LSTM", predicted_temperature: "26.95", above_threshold: 0, target_at: "2026-09-18 11:55:00", ensemble_size: 1 },
  { horizon_minutes: 60, model_name: "GRU", predicted_temperature: "25.48", above_threshold: 0, target_at: "2026-09-18 09:55:00", ensemble_size: 1 },
  { horizon_minutes: 120, model_name: "GRU", predicted_temperature: "26.75", above_threshold: 0, target_at: "2026-09-18 10:55:00", ensemble_size: 1 },
  { horizon_minutes: 180, model_name: "GRU", predicted_temperature: "26.27", above_threshold: 0, target_at: "2026-09-18 11:55:00", ensemble_size: 1 }
];
