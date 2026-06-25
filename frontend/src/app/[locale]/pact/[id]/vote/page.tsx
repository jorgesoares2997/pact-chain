"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import ConnectWalletGate from "@/components/ConnectWalletGate";
import Spinner from "@/components/Spinner";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import type { Pact } from "@/types/pact";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";

export default function VotePage() {
  return (
    <ConnectWalletGate>
      <VoteInner />
    </ConnectWalletGate>
  );
}

// Placeholder participants — replaced with on-chain data once contract is live
const MOCK_PARTICIPANTS = [
  { address: "GABC1234ABCDEF", label: "Alice" },
  { address: "GDEF5678GHIJKL", label: "Bob" },
  { address: "GHIJ9012MNOPQR", label: "Carol" },
];

function VoteInner() {
  const t = useTranslations("Vote");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address } = useWallet();

  const [pact, setPact] = useState<Pact | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getPact(id).then(setPact).catch(console.error);
  }, [id]);

  async function submitVote() {
    if (!selected) return toast.error(t("errorSelect"));
    setSubmitting(true);
    try {
      await api.logInteraction(address!, "voted", id, pact?.title, { candidate: selected });
      toast.success(t("success"));
      router.push(`/pact/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!pact) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner size="lg" /></div>;

  const candidates = MOCK_PARTICIPANTS.filter((p) => p.address !== address);

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">{t("title")}</h1>
        <p className="text-primary font-medium text-sm mb-2">{pact.title}</p>
        <p className="text-muted-foreground text-sm">
          {t("description")}
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {candidates.map((p) => {
          const isSelected = selected === p.address;
          return (
            <button
              key={p.address}
              onClick={() => setSelected(p.address)}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0 text-primary">
                {p.label[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-foreground text-sm font-semibold">{p.label}</div>
                <div className="text-muted-foreground text-xs font-mono truncate">{p.address}</div>
              </div>
              {isSelected && <Check className="h-5 w-5 text-primary" />}
            </button>
          );
        })}
      </div>

      <Button
        onClick={submitVote}
        disabled={!selected || submitting}
        size="lg"
        className="w-full"
      >
        {submitting && <Spinner size="sm" />}
        {submitting ? t("submitting") : t("submitVote")}
      </Button>
    </main>
  );
}
