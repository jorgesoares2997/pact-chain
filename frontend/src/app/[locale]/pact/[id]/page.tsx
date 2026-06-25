"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import Countdown from "@/components/Countdown";
import { api } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import type { Pact, Interaction } from "@/types/pact";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Copy, AlertCircle, CheckCircle2, MessageCircle, Send,
  X as XIcon, Trophy, CheckCheck, Gavel, Users, Vote,
} from "lucide-react";

// ── Resolution helpers ──────────────────────────────────────────────────────

function tallyVotes(votes: Interaction[]): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const v of votes) {
    if (!v.meta) continue;
    try {
      const parsed = JSON.parse(v.meta) as { vote?: string };
      if (parsed.vote) tally[parsed.vote] = (tally[parsed.vote] ?? 0) + 1;
    } catch { /* skip malformed */ }
  }
  return tally;
}

function majorityWinner(tally: Record<string, number>): string | null {
  const entries = Object.entries(tally);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  // Require strict majority (> 50%) or simply the most-voted option
  return entries[0][0];
}

function unanimityWinner(tally: Record<string, number>, totalVoters: number): string | null {
  const entries = Object.entries(tally);
  if (entries.length === 1 && entries[0][1] === totalVoters) return entries[0][0];
  return null; // no consensus → refund
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PactDashboard() {
  const t = useTranslations("Dashboard");
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { address } = useWallet();

  const [pact, setPact] = useState<Pact | null>(null);
  const [votes, setVotes] = useState<Interaction[]>([]);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteCode = searchParams.get("invite");

  function refreshPact() {
    api.getPact(id).then(setPact).catch((e: Error) => setError(e.message));
    api.getPactVotes(id).then((all) => setVotes(all.filter((i) => i.action === "voted")));
  }

  useEffect(() => { refreshPact(); }, [id]);

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

  // My vote option (parsed from interactions)
  const myVoteRecord = votes.find((v) => v.wallet === address);
  const myVoteOption = myVoteRecord?.meta
    ? (() => { try { return (JSON.parse(myVoteRecord.meta) as { vote?: string }).vote ?? null; } catch { return null; } })()
    : null;

  // Am I the winner?
  const isWinner = pact.status === "RESOLVED" && !!address && !!pact.winner && myVoteOption === pact.winner;

  // Who can resolve?
  const canResolve =
    pact.status === "ACTIVE" &&
    deadlinePassed &&
    (
      pact.resolutionMode !== "JUDGE"
        ? address === pact.creator                 // creator resolves auto modes
        : address === pact.judge                   // judge resolves judge mode
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = inviteCode ? `${origin}/join/${inviteCode}` : null;
  const shareUrl = inviteUrl ?? `${origin}/pact/${id}`;
  const shareText = `Join my commitment pact "${pact.title}" on PactChain — stake ${stakeUsdc} USDC 🤝`;

  const statusColor: Record<string, string> = {
    OPEN: "text-emerald-500 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
    ACTIVE: "text-amber-500 bg-amber-500/10 border-amber-200 dark:border-amber-900",
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
        {!deadlinePassed && (pact.status === "ACTIVE" || pact.status === "OPEN") && (
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
        <Stat label={t("max")} value={`${pact.maxParticipants} ${t("people")}`} />
      </div>

      {/* ── Resolution section ── */}
      {canResolve && (
        <ResolutionSection
          pact={pact}
          votes={votes}
          onResolved={refreshPact}
        />
      )}

      {/* ── Claim reward — winner only ── */}
      {isWinner && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <Trophy className="h-10 w-10 text-primary" />
          <p className="text-base font-semibold text-foreground">You won this pact!</p>
          <p className="text-xs text-muted-foreground mb-2">
            Your stake reward is ready to claim on-chain.
            <br />Winning option: <strong>{pact.winner}</strong>
          </p>
          <Button size="lg" className="w-full">
            Claim {stakeUsdc} USDC
          </Button>
        </div>
      )}

      {/* ── Resolved — show outcome to non-winners ── */}
      {pact.status === "RESOLVED" && !isWinner && pact.winner && (
        <div className="mb-8 rounded-2xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Pact resolved</p>
          <p className="text-xs text-muted-foreground">Winning option: <span className="font-semibold text-foreground">{pact.winner}</span></p>
        </div>
      )}

      {/* ── Refunded ── */}
      {pact.status === "REFUNDED" && (
        <div className="mb-8 rounded-2xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">No consensus — pact refunded</p>
          <p className="text-xs text-muted-foreground">All participants will receive their stakes back.</p>
        </div>
      )}

      {/* ── Vote button / already voted ── */}
      {pact.status === "ACTIVE" && address && !deadlinePassed && (
        alreadyVoted ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <CheckCheck className="h-4 w-4 text-primary shrink-0" />
            Your vote has been recorded{myVoteOption ? ` — "${myVoteOption}"` : ""}.
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

      {/* ── Lock pact (creator, OPEN) ── */}
      {pact.status === "OPEN" && address === pact.creator && (
        <LockButton
          pactId={id}
          onLocked={() => setPact((p) => p && { ...p, status: "ACTIVE" })}
          t={t}
        />
      )}

      {/* ── Votes cast ── */}
      {votes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
            Votes ({votes.length})
          </h2>
          <div className="flex flex-col gap-2">
            {votes.map((v) => {
              const voteValue = v.meta
                ? (() => { try { return (JSON.parse(v.meta) as { vote?: string }).vote ?? null; } catch { return null; } })()
                : null;
              const isMe = !!address && v.wallet === address;
              const isWinningVote = pact.status === "RESOLVED" && voteValue === pact.winner;
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                    isWinningVote ? "border-primary/40 bg-primary/5" : isMe ? "border-border bg-muted/30" : "border-border bg-card"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                    {isMe ? "You" : `${v.wallet.slice(0, 6)}…${v.wallet.slice(-4)}`}
                    {isWinningVote && <span className="ml-1 text-primary">✓</span>}
                  </span>
                  {voteValue && (
                    <span className={`ml-2 shrink-0 rounded-full border px-3 py-0.5 text-xs font-semibold ${
                      isWinningVote ? "bg-primary text-primary-foreground border-primary" : "bg-primary/10 border-primary/20 text-primary"
                    }`}>
                      {voteValue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Share section ── */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 pb-5">
          <div className="text-sm font-semibold text-foreground mb-1">{t("shareTitle")}</div>
          <p className="text-xs text-muted-foreground mb-4">
            {inviteUrl ? t("shareSubtitleInvite") : t("shareSubtitle")}
          </p>
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
              icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp"
              className="text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:border-[#25D366]/60"
            />
            <ShareButton
              onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank")}
              icon={<Send className="h-4 w-4" />} label="Telegram"
              className="text-[#2AABEE] border-[#2AABEE]/30 hover:bg-[#2AABEE]/10 hover:border-[#2AABEE]/60"
            />
            <ShareButton
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, "_blank")}
              icon={<XIcon className="h-4 w-4" />} label="X / Twitter"
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
  onResolved,
}: {
  pact: Pact;
  votes: Interaction[];
  onResolved: () => void;
}) {
  const [judgeChoice, setJudgeChoice] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const tally = tallyVotes(votes);
  const options = pact.voteOptions
    ? pact.voteOptions.split(",").map((o) => o.trim()).filter(Boolean)
    : ["Yes", "No"];

  const modeIcon = {
    MAJORITY: <Users className="h-5 w-5 text-primary" />,
    UNANIMITY: <Vote className="h-5 w-5 text-primary" />,
    JUDGE: <Gavel className="h-5 w-5 text-primary" />,
  }[pact.resolutionMode];

  const modeLabel = {
    MAJORITY: "Majority vote",
    UNANIMITY: "Unanimity required",
    JUDGE: "Judge decision",
  }[pact.resolutionMode];

  // Preview what the auto-resolution would pick
  let preview: string | null = null;
  let noConsensus = false;
  if (pact.resolutionMode === "MAJORITY") {
    preview = majorityWinner(tally);
  } else if (pact.resolutionMode === "UNANIMITY") {
    preview = unanimityWinner(tally, votes.length);
    if (!preview && votes.length > 0) noConsensus = true;
  }

  async function resolve() {
    setLoading(true);
    try {
      if (pact.resolutionMode === "JUDGE") {
        if (!judgeChoice) { toast.error("Select a winning option first."); return; }
        await api.resolvePact(pact.id, judgeChoice);
        toast.success(`Resolved: "${judgeChoice}" wins.`);
      } else if (noConsensus) {
        await api.refundPact(pact.id);
        toast.success("No consensus — pact refunded.");
      } else if (preview) {
        await api.resolvePact(pact.id, preview);
        toast.success(`Resolved: "${preview}" wins.`);
      }
      onResolved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-400/40 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        {modeIcon}
        <span className="text-sm font-semibold text-foreground">Resolve pact — {modeLabel}</span>
      </div>

      {/* Vote tally */}
      {votes.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2">
          {options.map((opt) => {
            const count = tally[opt] ?? 0;
            const pct = votes.length ? Math.round((count / votes.length) * 100) : 0;
            return (
              <div key={opt} className="flex items-center gap-3 text-sm">
                <span className="w-24 truncate text-xs font-medium text-foreground">{opt}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-14 text-right">{count} vote{count !== 1 ? "s" : ""} ({pct}%)</span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground mt-1">{votes.length} total vote{votes.length !== 1 ? "s" : ""}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No votes cast yet.</p>
      )}

      {/* JUDGE: picker */}
      {pact.resolutionMode === "JUDGE" && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">As the judge, pick the winning option:</p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setJudgeChoice(opt)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                  judgeChoice === opt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAJORITY / UNANIMITY: preview outcome */}
      {pact.resolutionMode !== "JUDGE" && (
        <div className="mb-4 text-sm">
          {noConsensus ? (
            <span className="text-amber-600 font-semibold">No unanimity — pact will be refunded.</span>
          ) : preview ? (
            <span className="text-foreground">
              Outcome: <strong className="text-primary">&quot;{preview}&quot;</strong> wins
              {pact.resolutionMode === "MAJORITY" && tally[preview] != null && (
                <> ({tally[preview]} of {votes.length} votes)</>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">No votes to tally.</span>
          )}
        </div>
      )}

      <Button
        onClick={resolve}
        disabled={loading || (pact.resolutionMode === "JUDGE" && !judgeChoice) || votes.length === 0}
        size="sm"
        className="w-full"
      >
        {loading && <Spinner size="sm" />}
        {loading ? "Resolving…" : noConsensus ? "Refund pact (no consensus)" : "Confirm resolution"}
      </Button>
    </div>
  );
}

// ── Small sub-components ────────────────────────────────────────────────────

function LockButton({ pactId, onLocked, t }: { pactId: string; onLocked: () => void; t: ReturnType<typeof useTranslations<"Dashboard">> }) {
  const [loading, setLoading] = useState(false);
  async function lockPact() {
    setLoading(true);
    try {
      await api.updatePactStatus(pactId, "ACTIVE");
      toast.success(t("lockedSuccess"));
      onLocked();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button onClick={lockPact} disabled={loading} variant="default" size="lg" className="w-full mb-6">
      {loading && <Spinner size="sm" />}
      {loading ? t("locking") : t("lockPact")}
    </Button>
  );
}

function ShareButton({ onClick, icon, label, className }: { onClick: () => void; icon: React.ReactNode; label: string; className: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all ${className}`}>
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
