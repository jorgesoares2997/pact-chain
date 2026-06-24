"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Spinner from "@/components/Spinner";
import Countdown from "@/components/Countdown";
import { api } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import type { Pact } from "@/types/pact";

export default function PactDashboard() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { address } = useWallet();

  const [pact, setPact] = useState<Pact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteCode = searchParams.get("invite");
  const inviteUrl = inviteCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${inviteCode}` : null;

  useEffect(() => {
    api.getPact(id).then(setPact).catch((e: Error) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <div className="flex flex-col items-center py-24 gap-3 text-center px-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-semibold text-slate-200">Error loading pact</h2>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    );

  if (!pact) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  const stakeUsdc = (pact.stakeAmount / 1e7).toFixed(2);

  const statusColor: Record<string, string> = {
    OPEN: "text-green-400",
    ACTIVE: "text-yellow-400",
    RESOLVED: "text-purple-400",
    REFUNDED: "text-slate-400",
  };

  function copyInvite() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-6 gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">{pact.title}</h1>
          <span className={`text-xs font-medium uppercase tracking-wide ${statusColor[pact.status]}`}>
            {pact.status}
          </span>
        </div>
        {pact.status === "ACTIVE" && (
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-500 mb-0.5">Deadline</div>
            <Countdown deadline={pact.deadline} />
          </div>
        )}
      </div>

      <p className="text-slate-400 text-sm mb-6">{pact.description}</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Stake" value={`${stakeUsdc} USDC`} />
        <Stat label="Mode" value={pact.resolutionMode} />
        <Stat label="Max" value={`${pact.maxParticipants} people`} />
      </div>

      {inviteUrl && (
        <div className="bg-[#1a1730] border border-purple-800/40 rounded-xl p-4 mb-6">
          <div className="text-xs text-slate-400 mb-2">Share invite link</div>
          <div className="flex items-center gap-2">
            <code className="text-xs text-purple-300 bg-purple-900/30 rounded-lg px-3 py-1.5 flex-1 truncate">
              {inviteUrl}
            </code>
            <button
              onClick={copyInvite}
              className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg shrink-0 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {pact.status === "ACTIVE" && address && (
        <Link
          href={`/pact/${id}/vote`}
          className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors mb-3"
        >
          Cast Your Vote
        </Link>
      )}

      {pact.status === "RESOLVED" && (
        <Link
          href={`/pact/${id}/result`}
          className="block w-full text-center bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          View Results
        </Link>
      )}

      {pact.status === "OPEN" && address === pact.creator && (
        <LockButton
          pactId={id}
          onLocked={() => setPact((p) => p && { ...p, status: "ACTIVE" })}
        />
      )}
    </main>
  );
}

function LockButton({ pactId, onLocked }: { pactId: string; onLocked: () => void }) {
  const [loading, setLoading] = useState(false);

  async function lockPact() {
    setLoading(true);
    try {
      await api.updatePactStatus(pactId, "ACTIVE");
      toast.success("Pact locked! Voting is now open.");
      onLocked();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={lockPact}
      disabled={loading}
      className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-3"
    >
      {loading && <Spinner size="sm" />}
      {loading ? "Locking…" : "Lock Pact & Start Voting"}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1a1730] border border-purple-900/40 rounded-xl p-3 text-center">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
