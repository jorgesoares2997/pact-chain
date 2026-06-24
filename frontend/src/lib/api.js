const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  createPact: (data) => request("/pacts", { method: "POST", body: JSON.stringify(data) }),
  getPact: (id) => request(`/pacts/${id}`),
  updatePactStatus: (id, status) => request(`/pacts/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  resolveInvite: (code) => request(`/invite/${code}`),
  createInvite: (pactId) => request(`/pacts/${pactId}/invite`, { method: "POST" }),
  logInteraction: (wallet, action, pactId, meta) =>
    request("/interactions", { method: "POST", body: JSON.stringify({ wallet, action, pactId, meta }) }),
};
