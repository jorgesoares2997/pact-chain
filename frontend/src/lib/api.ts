import type { CreatePactPayload, CreatePactResponse, Pact, PactStatus, Interaction } from "@/types/pact";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  createPact: (data: CreatePactPayload) =>
    request<CreatePactResponse>("/api/pacts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPact: (id: string) => request<Pact>(`/api/pacts/${id}`),

  updatePactStatus: (id: string, status: string) =>
    request<{ ok: boolean }>(`/api/pacts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateWinner: (id: string, winner: string) =>
    request<{ ok: boolean }>(`/api/pacts/${id}/winner`, {
      method: "PATCH",
      body: JSON.stringify({ winner }),
    }),

  // Resolve: set winner then flip status to RESOLVED in sequence
  resolvePact: async (id: string, winner: string) => {
    await request<{ ok: boolean }>(`/api/pacts/${id}/winner`, {
      method: "PATCH",
      body: JSON.stringify({ winner }),
    });
  },

  refundPact: (id: string) =>
    request<{ ok: boolean }>(`/api/pacts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "REFUNDED" }),
    }),

  resolveInvite: (code: string) => request<Pact>(`/api/invite/${code}`),

  createInvite: (pactId: string) =>
    request<{ code: string }>(`/api/pacts/${pactId}/invite`, { method: "POST" }),

  listPacts: (status?: PactStatus) =>
    request<Pact[]>(`/api/pacts${status ? `?status=${status}` : ""}`),

  getActivity: (limit = 30) =>
    request<Interaction[]>(`/api/interactions?limit=${limit}`),

  getPactVotes: (pactId: string) =>
    request<Interaction[]>(`/api/interactions?pactId=${pactId}&limit=100`),

  getParticipants: (pactId: string) =>
    request<Interaction[]>(`/api/interactions?pactId=${pactId}&limit=100`)
      .then((list) => list.filter((i) => i.action === "joined_pact").map((i) => i.wallet)),

  hasVoted: (pactId: string, wallet: string) =>
    request<Interaction[]>(`/api/interactions?pactId=${pactId}&wallet=${wallet}&limit=10`)
      .then((list) => list.some((i) => i.action === "voted")),

  logInteraction: (
    wallet: string,
    action: string,
    pactId?: string,
    pactTitle?: string,
    meta?: unknown
  ) =>
    request<{ ok: boolean }>("/api/interactions", {
      method: "POST",
      body: JSON.stringify({
        wallet,
        action,
        pactId,
        pactTitle,
        meta: meta ? JSON.stringify(meta) : undefined,
      }),
    }),
};
