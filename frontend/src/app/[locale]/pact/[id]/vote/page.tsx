"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import ConnectWalletGate from "@/components/ConnectWalletGate";
import Spinner from "@/components/Spinner";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { votePact } from "@/lib/stellar";
import type { Pact } from "@/types/pact";
import { Button } from "@/components/ui/Button";
import { Check, CheckCheck } from "lucide-react";

export default function VotePage() {
  return (
    <ConnectWalletGate>
      <VoteInner />
    </ConnectWalletGate>
  );
}

function VoteInner() {
  const t = useTranslations("Vote");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address, signTx } = useWallet();

  const [pact, setPact] = useState<Pact | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"idle" | "contract" | "backend">("idle");

  useEffect(() => {
    api.getPact(id).then(setPact).catch(console.error);
    api.getParticipants(id).then(setParticipants);
  }, [id]);

  useEffect(() => {
    if (address) api.hasVoted(id, address).then(setAlreadyVoted);
  }, [id, address]);

  async function submitVote() {
    if (!selected || !pact || alreadyVoted) return;
    setSubmitting(true);
    try {
      // 1. Vote on-chain
      setStep("contract");
      await votePact(pact.contractId, address!, selected, signTx);

      // 2. Record in backend
      setStep("backend");
      await api.logInteraction(address!, "voted", id, pact.title, { vote: selected });

      setAlreadyVoted(true);
      toast.success(t("success"));
      router.push(`/pact/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
      setStep("idle");
    }
  }

  if (!pact) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner size="lg" /></div>;

  // Candidates = participants minus self (can't vote for yourself)
  const candidates = participants.filter((p) => p !== address);

  if (alreadyVoted) {
    return (
      <main className="max-w-md mx-auto px-4 py-8 sm:py-12 flex flex-col items-center gap-6 text-center">
        <div className="bg-primary/10 rounded-full p-5">
          <CheckCheck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Already voted</h1>
        <p className="text-muted-foreground text-sm">You already cast your vote for this pact. Each wallet can only vote once.</p>
        <Button variant="outline" onClick={() => router.push(`/pact/${id}`)}>Back to pact</Button>
      </main>
    );
  }

  if (candidates.length === 0) {
    return (
      <main className="max-w-md mx-auto px-4 py-8 sm:py-12 flex flex-col items-center gap-6 text-center">
        <p className="text-muted-foreground text-sm">No other participants to vote for yet.</p>
        <Button variant="outline" onClick={() => router.push(`/pact/${id}`)}>Back to pact</Button>
      </main>
    );
  }

  const voteLabel = () => {
    if (!submitting) return t("submitVote");
    if (step === "contract") return "Signing vote on-chain…";
    if (step === "backend") return "Recording vote…";
    return t("submitting");
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">{t("title")}</h1>
        <p className="text-primary font-medium text-sm mb-2">{pact.title}</p>
        <p className="text-muted-foreground text-sm">Select the participant you believe should win.</p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {candidates.map((wallet) => {
          const isSelected = selected === wallet;
          return (
            <button
              key={wallet}
              onClick={() => setSelected(wallet)}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {isSelected ? <Check className="h-5 w-5" /> : wallet.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 font-mono text-xs text-foreground truncate">
                {wallet.slice(0, 8)}…{wallet.slice(-6)}
              </span>
              {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      <Button onClick={submitVote} disabled={!selected || submitting} size="lg" className="w-full">
        {submitting && <Spinner size="sm" />}
        {voteLabel()}
      </Button>
    </main>
  );
}
