"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";
import type { Pact } from "@/types/pact";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [pact, setPact] = useState<Pact | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [npsSent, setNpsSent] = useState(false);

  useEffect(() => {
    api.getPact(id).then(setPact).catch(console.error);
  }, [id]);

  function submitNps(score: number) {
    setNps(score);
    setNpsSent(true);
    if (typeof window !== "undefined" && (window as any).plausible) {
      (window as any).plausible("nps_submitted", { props: { score: String(score) } });
    }
  }

  if (!pact) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  const winner = pact.winner ?? "Unknown";
  const total = (pact.stakeAmount * pact.maxParticipants) / 1e7;
  const fee = (total * 0.02).toFixed(2);
  const payout = (total - parseFloat(fee)).toFixed(2);

  function shareResult() {
    const text = `🏆 ${pact!.title}\nWinner: ${winner.slice(0, 8)}…\nPayout: ${payout} USDC\n\nCreated on PactChain ⛓\n${window.location.href}`;
    navigator.clipboard.writeText(text);
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10 text-center">
      {pact.status === "REFUNDED" ? (
        <>
          <div className="text-5xl mb-4">↩️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Pact Refunded</h1>
          <p className="text-slate-400 text-sm mb-8">
            No unanimity was reached within 48 hours. All participants have been refunded.
          </p>
        </>
      ) : (
        <>
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-white mb-2">Winner Announced!</h1>
          <p className="text-slate-400 text-sm mb-6">{pact.title}</p>

          <div className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-violet-500/50 rounded-2xl p-6 mb-6 text-left shadow-[0_0_40px_rgba(124,58,237,0.3)]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent opacity-50 blur-2xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="text-xs text-slate-500 mb-1">Winner</div>
              <div className="font-mono text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] text-sm break-all mb-4">{winner}</div>
              <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-slate-500">Total pool</div>
                <div className="text-white font-semibold text-sm">{total.toFixed(2)} USDC</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Protocol fee</div>
                <div className="text-slate-400 text-sm">{fee} USDC</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Winner payout</div>
                <div className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] font-bold text-sm">{payout} USDC</div>
              </div>
            </div>
            </div>
          </div>

          <button
            onClick={shareResult}
            className="w-full backdrop-blur-sm border border-violet-500/50 text-violet-300 hover:bg-violet-500/20 hover:text-white font-bold py-2.5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] text-sm mb-8"
          >
            📋 Copy result card
          </button>
        </>
      )}

      {!npsSent ? (
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5 text-left mb-6 shadow-lg">
          <p className="text-sm font-medium text-white mb-3">
            How likely are you to use PactChain again? (1–10)
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => submitNps(n)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all border ${
                  nps === n
                    ? "bg-gradient-to-br from-violet-600 to-cyan-500 border-transparent text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                    : "border-white/20 bg-white/5 text-slate-300 hover:border-violet-500/50 hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-700/40 rounded-2xl p-4 text-green-400 text-sm mb-6">
          Thanks for the feedback! Score: {nps}/10
        </div>
      )}

      <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
        ← Back to home
      </Link>
    </main>
  );
}
