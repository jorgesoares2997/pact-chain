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
}

export interface CreatePactResponse {
  id: string;
  code: string;
  inviteUrl: string;
}
