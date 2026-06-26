"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import Countdown from "@/components/Countdown";
import { api } from "@/lib/api";
import { joinPact, resolvePact, judgeResolvePact, refundPact } from "@/lib/stellar";
import { useWallet } from "@/context/WalletContext";
import type { Pact, Interaction } from "@/types/pact";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Copy, AlertCircle, CheckCircle2, MessageCircle, Send,
  X as XIcon, Trophy, CheckCheck, Gavel, Users, Vote,
} from "lucide-react";

// ── Vote tally helpers ───────────────────────────────────────────────────────

function tallyVotes(votes: Interaction[]): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const v of votes) {
    if (!v.meta) continue;
    try {
      const parsed = JSON.parse(v.meta) as { vote?: string };
      if (parsed.vote) tally[parsed.vote] = (tally[parsed.vote] ?? 0) + 1;
    } catch { /* skip */ }
  }
  return tally;
}

function majorityWallet(tally: Record<string, number>, total: number): string | null {
  const entries = Object.entries(tally);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const threshold = Math.floor(total / 2) + 1;
  return entries[0][1] >= threshold ? entries[0][0] : null;
}

function unanimityWallet(tally: Record<string, number>, total: number): string | null {
  const entries = Object.entries(tally);
  if (entries.length === 1 && entries[0][1] === total) return entries[0][0];
  return null;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PactDashboard() {
  const t = useTranslations("Dashboard");
  const { id } = useParams<{ id: string }>();
  const { address, signTx } = useWallet();

  const [pact, setPact] = useState<Pact | null>(null);
  const [votes, setVotes] = useState<Interaction[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function refreshAll() {
    api.getPact(id).then(setPact).catch((e: Error) => setError(e.message));
    api.getPactVotes(id).then((all) => setVotes(all.filter((i) => i.action === "voted")));
    api.getParticipants(id).then(setParticipants);
  }

  useEffect(() => { refreshAll(); }, [id]);
  useEffect(() => {
    if (address) api.hasVoted(id, address).then(setAlreadyVoted);
  }, [id, address]);

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-foreground">{t("errorLoading")}</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );

  if (!pact) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner size="lg" /></div>;

  const stakeUsdc = (pact.stakeAmount / 1e7).toFixed(2);
  const nowSec = Math.floor(Date.now() / 1000);
  const deadlinePassed = nowSec > pact.deadline;
  const isLive = pact.status === "OPEN" || pact.status === "ACTIVE";

  const isParticipant = !!address && participants.includes(address);
  const isCreator = !!address && address === pact.creator;
  const isWinner = pact.status === "RESOLVED" && !!address && pact.winner === address;

  const canResolve =
    isLive &&
    deadlinePassed &&
    (pact.resolutionMode !== "JUDGE" ? isCreator : address === pact.judge);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/pact/${id}`
    : `/pact/${id}`;
  const shareText = `Join my commitment pact "${pact.title}" on PactChain — stake ${stakeUsdc} USDC 🤝`;

  const statusColor: Record<string, string> = {
    OPEN:     "text-emerald-500 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
    ACTIVE:   "text-amber-500 bg-amber-500/10 border-amber-200 dark:border-amber-900",
    RESOLVED: "text-primary bg-primary/10 border-primary/20",
    REFUNDED: "text-muted-foreground bg-muted border-border",
  };

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8 sm:py-12">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">{pact.title}</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide ${statusColor[pact.status]}`}>
            {t(`status.${pact.status}`)}
          </span>
        </div>
        {isLive && !deadlinePassed && (
          <div className="text-right shrink-0 bg-muted/50 p-3 rounded-lg border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{t("deadline")}</div>
            <Countdown deadline={pact.deadline} />
          </div>
        )}
      </div>

      {pact.description && (
        <p className="text-muted-foreground text-base mb-8 leading-relaxed">{pact.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label={t("stake")} value={`${stakeUsdc} USDC`} />
        <Stat label={t("mode")} value={pact.resolutionMode} />
        <Stat label={t("participants")} value={`${participants.length} / ${pact.maxParticipants}`} />
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}

      {/* Winner: claim reward */}
      {isWinner && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <Trophy className="h-10 w-10 text-primary" />
          <p className="text-base font-semibold text-foreground">You won this pact!</p>
          <p className="text-xs text-muted-foreground mb-2">
            Your reward was distributed on-chain at resolution.
          </p>
          <Button size="lg" className="w-full" onClick={() => toast.success("Reward already claimed on-chain at resolution!")}>
            Reward Claimed ✓
          </Button>
        </div>
      )}

      {/* Loser: after resolution */}
      {pact.status === "RESOLVED" && !isWinner && pact.winner && (
        <div className="mb-8 rounded-2xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Pact resolved</p>
          <p className="text-xs text-muted-foreground font-mono mb-3">
            Winner: {pact.winner.slice(0, 8)}…{pact.winner.slice(-6)}
          </p>
          {isParticipant && (
            <Button size="sm" variant="outline" disabled className="w-full opacity-50">
              Not a winner this time
            </Button>
          )}
        </div>
      )}

      {/* Refunded */}
      {pact.status === "REFUNDED" && (
        <div className="mb-8 rounded-2xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">No consensus — pact refunded</p>
          <p className="text-xs text-muted-foreground">All participants received their stakes back on-chain.</p>
        </div>
      )}

      {/* Resolution section */}
      {canResolve && (
        <ResolutionSection
          pact={pact}
          votes={votes}
          participants={participants}
          signTx={signTx}
          onResolved={refreshAll}
        />
      )}

      {/* Vote button — participant, not yet voted, deadline not passed */}
      {isLive && isParticipant && !deadlinePassed && (
        alreadyVoted ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <CheckCheck className="h-4 w-4 text-primary shrink-0" />
            Your vote has been recorded on-chain.
          </div>
        ) : (
          <Link
            href={`/pact/${id}/vote`}
            className="mb-6 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full"
          >
            {t("castVote")}
          </Link>
        )
      )}

      {/* Join button — connected wallet, not yet a participant, pact live */}
      {isLive && address && !isParticipant && !deadlinePassed && (
        <JoinFromPactButton pact={pact} onJoined={refreshAll} signTx={signTx} />
      )}

      {/* Waiting for deadline */}
      {isLive && deadlinePassed && !canResolve && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 text-center">
          Deadline passed — waiting for resolution by{" "}
          {pact.resolutionMode === "JUDGE" ? "the judge" : "the creator"}.
        </div>
      )}

      {/* Votes cast */}
      {votes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
            Votes ({votes.length})
          </h2>
          <div className="flex flex-col gap-2">
            {votes.map((v) => {
              const candidate = v.meta
                ? (() => { try { return (JSON.parse(v.meta) as { vote?: string }).vote ?? null; } catch { return null; } })()
                : null;
              const isMe = !!address && v.wallet === address;
              const isWinningVote = pact.status === "RESOLVED" && candidate === pact.winner;
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                    isWinningVote ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {isMe ? "You" : `${v.wallet.slice(0, 6)}…${v.wallet.slice(-4)}`}
                    {isWinningVote && <span className="ml-1 text-primary">✓</span>}
                  </span>
                  {candidate && (
                    <span className={`ml-2 shrink-0 rounded-full border px-3 py-0.5 text-xs font-mono font-semibold ${
                      isWinningVote ? "bg-primary text-primary-foreground border-primary" : "bg-primary/10 border-primary/20 text-primary"
                    }`}>
                      {candidate.slice(0, 6)}…{candidate.slice(-4)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Share */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 pb-5">
          <div className="text-sm font-semibold text-foreground mb-1">{t("shareTitle")}</div>
          <p className="text-xs text-muted-foreground mb-4">{t("shareSubtitle")}</p>
          <div className="flex items-center gap-2 mb-4">
            <code className="text-xs bg-background border border-border rounded-md px-3 py-2 flex-1 truncate font-mono text-primary">
              {shareUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 h-9 gap-1.5">
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ShareButton
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, "_blank")}
              icon={<MessageCircle className="h-4 w-4" />}
              label="WhatsApp"
              className="text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:border-[#25D366]/60"
            />
            <ShareButton
              onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank")}
              icon={<Send className="h-4 w-4" />}
              label="Telegram"
              className="text-[#2AABEE] border-[#2AABEE]/30 hover:bg-[#2AABEE]/10 hover:border-[#2AABEE]/60"
            />
            <ShareButton
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, "_blank")}
              icon={<XIcon className="h-4 w-4" />}
              label="X / Twitter"
              className="text-foreground border-border hover:bg-muted"
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// ── Resolution section ──────────────────────────────────────────────────────

function ResolutionSection({
  pact,
  votes,
  participants,
  signTx,
  onResolved,
}: {
  pact: Pact;
  votes: Interaction[];
  participants: string[];
  signTx: (xdr: string) => Promise<string>;
  onResolved: () => void;
}) {
  const { address } = useWallet();
  const [judgeChoice, setJudgeChoice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "contract" | "backend">("idle");

  const tally = tallyVotes(votes);
  const totalVoters = votes.length;

  let previewWinner: string | null = null;
  let noConsensus = false;

  if (pact.resolutionMode === "MAJORITY") {
    previewWinner = majorityWallet(tally, totalVoters);
  } else if (pact.resolutionMode === "UNANIMITY") {
    previewWinner = unanimityWallet(tally, totalVoters);
    if (!previewWinner && totalVoters > 0) noConsensus = true;
  }

  const modeIcon = {
    MAJORITY:  <Users className="h-5 w-5 text-primary" />,
    UNANIMITY: <Vote className="h-5 w-5 text-primary" />,
    JUDGE:     <Gavel className="h-5 w-5 text-primary" />,
  }[pact.resolutionMode];

  async function resolve() {
    if (!address) return;
    setLoading(true);
    try {
      if (pact.resolutionMode === "JUDGE") {
        if (!judgeChoice) { toast.error("Select the winner first."); return; }
        setStep("contract");
        await judgeResolvePact(pact.contractId, address, judgeChoice, signTx);
        setStep("backend");
        await api.updateWinner(pact.id, judgeChoice);
        toast.success(`Resolved — winner: ${judgeChoice.slice(0, 8)}…`);

      } else if (noConsensus) {
        setStep("contract");
        await refundPact(pact.contractId, address, signTx);
        setStep("backend");
        await api.refundPact(pact.id);
        toast.success("No consensus — pact refunded on-chain.");

      } else {
        setStep("contract");
        await resolvePact(pact.contractId, address, signTx);
        const winner = previewWinner!;
        setStep("backend");
        await api.updateWinner(pact.id, winner);
        toast.success(`Resolved — winner: ${winner.slice(0, 8)}…`);
      }

      onResolved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
      setStep("idle");
    }
  }

  const stepLabel = () => {
    if (!loading) return noConsensus ? "Refund pact (no consensus)" : "Confirm resolution";
    if (step === "contract") return "Signing on-chain…";
    if (step === "backend") return "Syncing…";
    return "Resolving…";
  };

  return (
    <div className="mb-8 rounded-2xl border border-amber-400/40 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        {modeIcon}
        <span className="text-sm font-semibold text-foreground">
          Liquidate pact — {pact.resolutionMode}
        </span>
      </div>

      {/* Vote tally bars */}
      {totalVoters > 0 ? (
        <div className="mb-4 flex flex-col gap-2">
          {Object.entries(tally).map(([wallet, count]) => {
            const pct = Math.round((count / totalVoters) * 100);
            return (
              <div key={wallet} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-foreground w-28 truncate">
                  {wallet.slice(0, 6)}…{wallet.slice(-4)}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">
                  {count} vote{count !== 1 ? "s" : ""} ({pct}%)
                </span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground mt-1">{totalVoters} total vote{totalVoters !== 1 ? "s" : ""}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No votes cast yet.</p>
      )}

      {/* JUDGE: pick winner from participant list */}
      {pact.resolutionMode === "JUDGE" && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Pick the winning participant:</p>
          {participants.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setJudgeChoice(w)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-mono transition-all ${
                judgeChoice === w
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span className="truncate">{w.slice(0, 8)}…{w.slice(-6)}</span>
            </button>
          ))}
        </div>
      )}

      {/* MAJORITY/UNANIMITY outcome preview */}
      {pact.resolutionMode !== "JUDGE" && totalVoters > 0 && (
        <div className="mb-4 text-sm">
          {noConsensus ? (
            <span className="text-amber-600 font-semibold">No unanimity — pact will be refunded.</span>
          ) : previewWinner ? (
            <span className="text-foreground">
              Outcome: <strong className="text-primary font-mono">{previewWinner.slice(0, 8)}…{previewWinner.slice(-6)}</strong> wins
            </span>
          ) : (
            <span className="text-muted-foreground">No majority yet.</span>
          )}
        </div>
      )}

      <Button
        onClick={resolve}
        disabled={loading || (pact.resolutionMode === "JUDGE" && !judgeChoice)}
        size="sm"
        className="w-full"
      >
        {loading && <Spinner size="sm" />}
        {stepLabel()}
      </Button>
    </div>
  );
}

// ── Join from pact page ──────────────────────────────────────────────────────

function JoinFromPactButton({
  pact,
  onJoined,
  signTx,
}: {
  pact: Pact;
  onJoined: () => void;
  signTx: (xdr: string) => Promise<string>;
}) {
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "contract" | "backend">("idle");
  const stakeUsdc = (pact.stakeAmount / 1e7).toFixed(2);

  async function handleJoin() {
    if (!address) return;
    setLoading(true);
    try {
      setStep("contract");
      await joinPact(pact.contractId, address, signTx);
      setStep("backend");
      await api.addParticipant(pact.id, address, pact.stakeAmount);
      await api.logInteraction(address, "joined_pact", pact.id, pact.title);
      toast.success(`Joined! ${stakeUsdc} USDC staked on-chain.`);
      onJoined();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
      setStep("idle");
    }
  }

  const label = () => {
    if (!loading) return `Join & stake ${stakeUsdc} USDC`;
    if (step === "contract") return `Staking ${stakeUsdc} USDC on-chain…`;
    if (step === "backend") return "Recording participation…";
    return "Joining…";
  };

  return (
    <Button onClick={handleJoin} disabled={loading} variant="default" size="lg" className="w-full mb-4">
      {loading && <Spinner size="sm" />}
      {label()}
    </Button>
  );
}

// ── Tiny components ─────────────────────────────────────────────────────────

function ShareButton({ onClick, icon, label, className }: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all ${className}`}
    >
      {icon}{label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}
