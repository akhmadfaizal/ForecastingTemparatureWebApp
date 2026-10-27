const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://skripsi-temperature-api.vercel.app" : "")).replace(/\/$/, "");

async function request(path, options = {}) {
  const headers = options.body
    ? { "content-type": "application/json", ...options.headers }
    : options.headers;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...(headers ? { headers } : {}),
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Permintaan gagal (${response.status}).`);
  return body;
}

export const api = {
  health: signal => request("/health", { signal }),
  readings: (limit = 288, signal) => request(`/api/readings/latest?limit=${limit}`, { signal }),
  predictions: signal => request("/api/predictions/latest", { signal })
};
