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

  getParticipants: async (pactId: string): Promise<string[]> => {
    // Always merge both sources: new pact_participants table + legacy wallet_interactions.
    // This ensures pacts created before the schema upgrade still show correct participants.
    const [structured, interactions] = await Promise.all([
      request<{ wallet: string }[]>(`/api/pacts/${pactId}/participants`).catch(() => [] as { wallet: string }[]),
      request<Interaction[]>(`/api/interactions?pactId=${pactId}&limit=100`).catch(() => [] as Interaction[]),
    ]);
    const fromStructured = structured.map((p) => p.wallet);
    const fromInteractions = interactions
      .filter((i) => i.action === "joined_pact")
      .map((i) => i.wallet);
    // deduplicate
    return [...new Set([...fromStructured, ...fromInteractions])];
  },

  hasVoted: async (pactId: string, wallet: string): Promise<boolean> => {
    // Check both sources so pre-schema-upgrade votes are detected.
    const [structuredResult, interactions] = await Promise.all([
      request<{ voted: boolean }>(`/api/pacts/${pactId}/votes/check?wallet=${encodeURIComponent(wallet)}`).catch(() => ({ voted: false })),
      request<Interaction[]>(`/api/interactions?pactId=${pactId}&wallet=${wallet}&limit=10`).catch(() => [] as Interaction[]),
    ]);
    return structuredResult.voted || interactions.some((i) => i.action === "voted");
  },

  addParticipant: (pactId: string, wallet: string, stakeAmount: number, txHash?: string) =>
    request<{ ok: boolean }>(`/api/pacts/${pactId}/participants`, {
      method: "POST",
      body: JSON.stringify({ wallet, txHash }),
    }),

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

// Normalize any thrown value (Error, plain object, string) to a readable message.
// Wallet kit and Stellar SDK sometimes throw plain objects instead of Errors.
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err || fallback;
  try {
    const s = JSON.stringify(err);
    return s && s !== "{}" ? s : fallback;
  } catch {
    return fallback;
  }
}
