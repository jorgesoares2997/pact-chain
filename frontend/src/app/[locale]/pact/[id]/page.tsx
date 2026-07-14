"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import Countdown from "@/components/Countdown";
import { api, errorMessage } from "@/lib/api";
import { joinPact, resolvePact, judgeResolvePact, refundPact as refundPactOnChain, claimReward } from "@/lib/stellar";
import { useWallet } from "@/context/WalletContext";
import type { Pact, Interaction } from "@/types/pact";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Copy, AlertCircle, CheckCircle2, MessageCircle, Send,
  X as XIcon, Trophy, CheckCheck, Gavel, Users, Vote, Target, MessageSquare,
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

  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);

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
  const deadlinePassed = nowSec > pact.deadline;
  const isLive = pact.status === "OPEN" || pact.status === "ACTIVE";

  const isParticipant = !!address && participants.includes(address);
  const isCreator = !!address && address === pact.creator;

  // pact.winner holds the winning option label (e.g. "Yes"), not a wallet address.
  // A participant wins if they voted for that option.
  const myVoteOption = (() => {
    if (!address) return null;
    const myVoteInteraction = votes.find((v) => v.wallet === address);
    if (!myVoteInteraction?.meta) return null;
    try { return (JSON.parse(myVoteInteraction.meta) as { vote?: string }).vote ?? null; }
    catch { return null; }
  })();
  const isWinner = pact.status === "RESOLVED" && !!pact.winner && myVoteOption === pact.winner;

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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide ${statusColor[pact.status]}`}>
              {t(`status.${pact.status}`)}
            </span>
            {pact.pactType === "COMMITMENT" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Target className="h-3 w-3" /> Commitment
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <MessageSquare className="h-3 w-3" /> Opinion
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{pact.title}</h1>
        </div>
        {isLive && !deadlinePassed && (
          <div className="text-right shrink-0 bg-muted/50 p-3 rounded-lg border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{t("deadline")}</div>
            <Countdown deadline={pact.deadline} />
          </div>
        )}
      </div>

      {pact.description && (
        <p className="text-muted-foreground text-base mb-6 leading-relaxed">{pact.description}</p>
      )}

      {pact.pactType === "COMMITMENT" && pact.successCriteria && (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Success criteria</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{pact.successCriteria}</p>
          {pact.evidenceRequirements && (
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold">Evidence: </span>{pact.evidenceRequirements}
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label={t("stake")} value={`${stakeUsdc} USDC`} />
        <Stat label={t("mode")} value={pact.resolutionMode} />
        <Stat label={t("participants")} value={`${participants.length} / ${pact.maxParticipants}`} />
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}

      {/* Winner: claim reward on-chain */}
      {isWinner && (
        <ClaimRewardSection
          pact={pact}
          votes={votes}
          participants={participants}
          signTx={signTx}
          onClaimed={refreshAll}
        />
      )}

      {/* Non-winner participant: after resolution */}
      {pact.status === "RESOLVED" && !isWinner && pact.winner && isParticipant && (
        <div className="mb-8 rounded-2xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Pact resolved</p>
          <p className="text-xs text-muted-foreground mb-3">
            Winning outcome: <span className="font-semibold text-foreground">{pact.winner}</span>
            {myVoteOption && myVoteOption !== pact.winner && (
              <span className="ml-1">(you voted: {myVoteOption})</span>
            )}
            {!myVoteOption && (
              <span className="ml-1 italic">(you did not vote — stake refunded on-chain)</span>
            )}
          </p>
          <Button size="sm" variant="outline" disabled className="w-full opacity-50">
            {myVoteOption && myVoteOption !== pact.winner ? "Not the winning side this time" : "Stake refunded"}
          </Button>
        </div>
      )}

      {/* Refunded */}
      {pact.status === "REFUNDED" && (
        <RefundSection pact={pact} isParticipant={isParticipant} signTx={signTx} onClaimed={refreshAll} />
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

      {/* Judge-mode participant notice — voting not applicable */}
      {isLive && isParticipant && !deadlinePassed && pact.resolutionMode === "JUDGE" && !alreadyVoted && (
        <div className="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground text-center">
          <Gavel className="h-4 w-4 inline-block mr-1 mb-0.5" />
          Your stake is locked. The judge will resolve this pact after the deadline.
        </div>
      )}

      {/* Vote options preview + vote button — MAJORITY / UNANIMITY only */}
      {isLive && isParticipant && !deadlinePassed && pact.resolutionMode !== "JUDGE" && (() => {
        const voteOptionList = pact.voteOptions
          ? pact.voteOptions.split(",").map((o) => o.trim()).filter(Boolean)
          : ["Yes", "No"];
        return alreadyVoted ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <CheckCheck className="h-4 w-4 text-primary shrink-0" />
            Your vote has been recorded on-chain.
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Vote options
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {voteOptionList.map((opt, idx) => (
                <div
                  key={opt}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground"
                >
                  <span className="w-5 h-5 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </span>
                  {opt}
                </div>
              ))}
            </div>
            <Link
              href={`/pact/${id}/vote`}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full"
            >
              {t("castVote")}
            </Link>
          </div>
        );
      })()}

      {/* Join button */}
      {isLive && address && !isParticipant && !deadlinePassed && (
        <JoinFromPactButton pact={pact} onJoined={refreshAll} signTx={signTx} />
      )}

      {/* Waiting for the deadline to pass before resolution */}
      {isLive && isCreator && !deadlinePassed && participants.length < 2 && (
        <div className="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground text-center">
          Share the link below so others can join and vote.
        </div>
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
              const option = v.meta
                ? (() => { try { return (JSON.parse(v.meta) as { vote?: string }).vote ?? null; } catch { return null; } })()
                : null;
              const isMe = !!address && v.wallet === address;
              const isWinningVote = pact.status === "RESOLVED" && option === pact.winner;
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                    isWinningVote ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {isMe ? "You" : `${v.wallet.slice(0, 6)}…${v.wallet.slice(-4)}`}
                  </span>
                  {option && (
                    <span className={`ml-2 shrink-0 rounded-full border px-3 py-0.5 text-xs font-semibold ${
                      isWinningVote
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-primary/10 border-primary/20 text-primary"
                    }`}>
                      {option}{isWinningVote ? " ✓" : ""}
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

  // Options for judge to pick from
  const voteOptionLabels = pact.voteOptions
    ? pact.voteOptions.split(",").map((o) => o.trim()).filter(Boolean)
    : ["Yes", "No"];

  async function resolve() {
    if (!address) return;
    setLoading(true);
    try {
      if (pact.resolutionMode === "JUDGE") {
        if (!judgeChoice) { toast.error("Select the winning outcome first."); return; }
        const optionIndex = voteOptionLabels.indexOf(judgeChoice);
        await judgeResolvePact(pact.contractId, address, optionIndex, signTx);
        await api.updateWinner(pact.id, judgeChoice);
        toast.success(`Pact resolved — "${judgeChoice}" wins!`);

      } else if (noConsensus) {
        // Draw — call refund on-chain (pushes USDC back to all participants), then update backend
        await refundPactOnChain(pact.contractId, address, signTx);
        await api.refundPact(pact.id);
        toast.success("Draw — stakes refunded to all participants.");

      } else {
        // Call resolve on-chain — contract tallies votes and pays out winners
        await resolvePact(pact.contractId, address, signTx);
        await api.updateWinner(pact.id, previewWinner!);
        toast.success(`Pact resolved — "${previewWinner}" wins!`);
      }

      onResolved();
    } catch (e) {
      const msg = errorMessage(e);
      // Contract auto-resolves during vote() via _try_resolve — calling resolve()
      // again hits "pact not open". Treat as success and sync backend.
      if (msg.includes("InvalidAction") || msg.includes("WasmVm") || msg.includes("not open")) {
        if (noConsensus) {
          await api.refundPact(pact.id).catch(() => null);
          toast.success("Draw — stakes were refunded automatically when the last vote was cast.");
        } else {
          await api.updateWinner(pact.id, previewWinner!).catch(() => null);
          toast.success(`Already resolved on-chain — "${previewWinner}" wins!`);
        }
        onResolved();
      } else if (msg.includes("deadline not reached") || msg.includes("deadline")) {
        toast.error("The deadline hasn't passed yet. Wait until the deadline to resolve.");
      } else if (msg.includes("not a participant") || msg.includes("participant")) {
        toast.error("Only participants can trigger resolution.");
      } else if (msg.includes("use judge_resolve") || msg.includes("judge")) {
        toast.error("This pact uses judge mode — only the judge can resolve it.");
      } else {
        toast.error("Resolution failed. Try again or wait for the deadline to pass.");
      }
    } finally {
      setLoading(false);
    }
  }

  const stepLabel = () => {
    if (!loading) return noConsensus ? "Refund pact (no consensus)" : "Confirm resolution";
    return "Resolving…";
  };

  return (
    <div className="mb-8 rounded-2xl border border-amber-400/40 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        {modeIcon}
        <span className="text-sm font-semibold text-foreground">
          Resolve pact — {pact.resolutionMode}
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

      {/* JUDGE: pick the winning outcome */}
      {pact.resolutionMode === "JUDGE" && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground mb-1">Pick the winning outcome:</p>
          {voteOptionLabels.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setJudgeChoice(option)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                judgeChoice === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              {option}
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
              Outcome: <strong className="text-primary">&ldquo;{previewWinner}&rdquo;</strong> wins
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

// ── Claim reward (winner) ────────────────────────────────────────────────────

function ClaimRewardSection({
  pact,
  votes,
  participants,
  signTx,
  onClaimed,
}: {
  pact: Pact;
  votes: Interaction[];
  participants: string[];
  signTx: (xdr: string) => Promise<string>;
  onClaimed: () => void;
}) {
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Calculate the winner's share: (total_staked * 0.98) / winner_count
  const winnerCount = votes.filter((v) => {
    try { return (JSON.parse(v.meta ?? "{}") as { vote?: string }).vote === pact.winner; }
    catch { return false; }
  }).length || 1;
  const totalStaked = pact.stakeAmount * participants.length;
  const rewardUsdc = ((totalStaked * 0.98) / winnerCount / 1e7).toFixed(2);

  async function handleClaim() {
    if (!address) return;
    setLoading(true);
    try {
      await claimReward(pact.contractId, address, signTx);
      await api.logInteraction(address, "pact_won", pact.id, pact.title);
      setClaimed(true);
      toast.success(`Reward claimed — ${rewardUsdc} USDC sent to your wallet!`);
      onClaimed();
    } catch (err) {
      const msg = errorMessage(err);
      if (msg.includes("already claimed")) {
        toast.error("You already claimed your reward for this pact.");
      } else if (msg.includes("not a winner") || msg.includes("not resolved")) {
        toast.error("You are not eligible to claim a reward for this pact.");
      } else if (msg.includes("InvalidAction") || msg.includes("WasmVm")) {
        toast.error("Claim failed — the pact may not be resolved yet or you already claimed.");
      } else {
        toast.error("Claim failed. Try again in a moment.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (claimed) {
    return (
      <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <Trophy className="h-10 w-10 text-primary" />
        <p className="text-base font-semibold text-foreground">Reward received!</p>
        <p className="text-xs text-muted-foreground">
          {rewardUsdc} USDC — winning side: <span className="font-semibold text-foreground">{pact.winner}</span>
        </p>
        <Button size="lg" className="w-full" disabled>
          Reward Claimed ✓
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
      <Trophy className="h-10 w-10 text-primary" />
      <p className="text-base font-semibold text-foreground">You picked the winning outcome!</p>
      <p className="text-xs text-muted-foreground mb-1">
        Winning side: <span className="font-semibold text-foreground">{pact.winner}</span>.
        Your estimated reward: <span className="font-semibold text-foreground">{rewardUsdc} USDC</span>.
      </p>
      <p className="text-xs text-muted-foreground mb-2">
        Click to trigger the on-chain payout. If it already resolved automatically, your USDC is already in your wallet.
      </p>
      <Button size="lg" className="w-full" onClick={handleClaim} disabled={loading}>
        {loading && <Spinner size="sm" />}
        {loading ? "Claiming…" : `Claim ${rewardUsdc} USDC`}
      </Button>
    </div>
  );
}

// ── Claim refund (draw / no consensus) ──────────────────────────────────────

function RefundSection({
  pact,
  isParticipant,
  signTx,
  onClaimed,
}: {
  pact: Pact;
  isParticipant: boolean;
  signTx: (xdr: string) => Promise<string>;
  onClaimed: () => void;
}) {
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function handleClaim() {
    if (!address) return;
    setLoading(true);
    try {
      await refundPactOnChain(pact.contractId, address, signTx);
      await api.logInteraction(address, "pact_refunded", pact.id, pact.title);
      setClaimed(true);
      toast.success("Refund claimed — stakes returned to all participants.");
      onClaimed();
    } catch (e) {
      const msg = errorMessage(e);
      if (msg.includes("InvalidAction") || msg.includes("WasmVm")) {
        toast.error("Refund already processed — stakes were returned when the pact resolved.");
      } else if (msg.includes("deadline")) {
        toast.error("The deadline hasn't passed yet.");
      } else {
        toast.error("Refund failed. Try again in a moment.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (claimed) {
    return (
      <div className="mb-8 rounded-2xl border border-border bg-muted/30 p-5 text-center">
        <p className="text-sm font-semibold text-foreground mb-1">Refund complete</p>
        <p className="text-xs text-muted-foreground">All stakes have been returned on-chain.</p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5">
      <p className="text-sm font-semibold text-foreground mb-1">Draw — no consensus reached</p>
      <p className="text-xs text-muted-foreground mb-4">
        The vote ended in a draw. All participants get their stake back.
        {isParticipant
          ? " Trigger the on-chain refund below — one transaction returns everyone's USDC."
          : " A participant must trigger the on-chain refund."}
      </p>
      {isParticipant && (
        <Button onClick={handleClaim} disabled={loading} variant="outline" size="sm" className="w-full">
          {loading && <Spinner size="sm" />}
          {loading ? "Processing refund…" : `Claim refund — ${(pact.stakeAmount / 1e7).toFixed(2)} USDC`}
        </Button>
      )}
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
      const msg = errorMessage(e);
      if (msg.includes("already joined") || msg.includes("already a participant")) {
        toast.error("Your wallet has already joined this pact.");
      } else if (msg.includes("pact full") || msg.includes("full")) {
        toast.error("This pact is full — no more participants can join.");
      } else if (msg.includes("deadline") || msg.includes("deadline passed")) {
        toast.error("The deadline has passed — this pact is no longer accepting participants.");
      } else if (msg.includes("pact not open") || msg.includes("InvalidAction") || msg.includes("WasmVm")) {
        toast.error("This pact is no longer open for joining.");
      } else if (msg.includes("insufficient") || msg.includes("balance")) {
        toast.error(`Insufficient USDC balance. You need ${stakeUsdc} USDC to join.`);
      } else {
        toast.error("Failed to join. Make sure you have enough USDC and try again.");
      }
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
