"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConnectWalletGate from "@/components/ConnectWalletGate";
import Spinner from "@/components/Spinner";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import type { Pact } from "@/types/pact";

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
    if (!selected) return toast.error("Select a candidate first");
    setSubmitting(true);
    try {
      await api.logInteraction(address!, "vote_cast", id, { candidate: selected });
      if (typeof window !== "undefined" && (window as any).plausible) {
        (window as any).plausible("vote_cast");
      }
      toast.success("Vote submitted!");
      router.push(`/pact/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!pact) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  const candidates = MOCK_PARTICIPANTS.filter((p) => p.address !== address);

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-white mb-2">Cast Your Vote</h1>
      <p className="text-slate-400 text-sm mb-6">{pact.title}</p>
      <p className="text-xs text-slate-500 mb-3">
        Select who you think won the commitment challenge. You cannot vote for yourself.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {candidates.map((p) => (
          <button
            key={p.address}
            onClick={() => setSelected(p.address)}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
              selected === p.address
                ? "border-purple-500 bg-purple-900/30"
                : "border-slate-700 hover:border-slate-500 bg-[#1a1730]"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold shrink-0">
              {p.label[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">{p.label}</div>
              <div className="text-slate-500 text-xs font-mono truncate">{p.address}</div>
            </div>
            {selected === p.address && <span className="text-purple-400">✓</span>}
          </button>
        ))}
      </div>

      <button
        onClick={submitVote}
        disabled={!selected || submitting}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {submitting && <Spinner size="sm" />}
        {submitting ? "Submitting…" : "Submit Vote"}
      </button>
    </main>
  );
}
