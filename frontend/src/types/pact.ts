export type ResolutionMode = "MAJORITY" | "JUDGE" | "UNANIMITY";
export type PactStatus = "OPEN" | "ACTIVE" | "RESOLVED" | "REFUNDED";

export interface Pact {
  id: string;
  contractId: string;
  title: string;
  description: string;
  creator: string;
  stakeAmount: number;
  maxParticipants: number;
  deadline: number;
  resolutionMode: ResolutionMode;
  judge?: string;
  status: PactStatus;
  winner?: string;
  voteOptions?: string;
  createdAt: string;
}

export interface CreatePactPayload {
  contractId: string;
  title: string;
  description: string;
  creator: string;
  stakeAmount: number;
  maxParticipants: number;
  deadline: number;
  resolutionMode: ResolutionMode;
  judge?: string;
  voteOptions?: string[];
}

export type InteractionAction =
  | "pact_created"
  | "joined_pact"
  | "pact_locked"
  | "voted"
  | "pact_won"
  | "pact_refunded";

export interface Interaction {
  id: string;
  wallet: string;
  action: InteractionAction;
  pactId?: string;
  pactTitle?: string;
  meta?: string;
  createdAt: string;
}

export interface CreatePactResponse {
  id: string;
  code: string;
  inviteUrl: string;
}
