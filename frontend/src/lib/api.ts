import type { CreatePactPayload, CreatePactResponse, Pact } from "@/types/pact";

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

  resolveInvite: (code: string) => request<Pact>(`/api/invite/${code}`),

  createInvite: (pactId: string) =>
    request<{ code: string }>(`/api/pacts/${pactId}/invite`, { method: "POST" }),

  logInteraction: (
    wallet: string,
    action: string,
    pactId?: string,
    meta?: unknown
  ) =>
    request<{ ok: boolean }>("/api/interactions", {
      method: "POST",
      body: JSON.stringify({
        wallet,
        action,
        pactId,
        meta: meta ? JSON.stringify(meta) : undefined,
      }),
    }),
};
