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
import type { Pact } from "@/types/pact";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Copy, AlertCircle, CheckCircle2, MessageCircle, Send, X as XIcon } from "lucide-react";

export default function PactDashboard() {
  const t = useTranslations("Dashboard");
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { address } = useWallet();

  const [pact, setPact] = useState<Pact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteCode = searchParams.get("invite");

  useEffect(() => {
    api.getPact(id).then(setPact).catch((e: Error) => setError(e.message));
  }, [id]);

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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = inviteCode ? `${origin}/join/${inviteCode}` : null;
  const pactUrl = `${origin}/pact/${id}`;
  const shareUrl = inviteUrl ?? pactUrl;
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

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, "_blank");
  }

  function shareTelegram() {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
  }

  function shareTwitter() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, "_blank");
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
        {pact.status === "ACTIVE" && (
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

      {/* Share section */}
      <Card className="mb-8 border-dashed bg-muted/30">
        <CardContent className="pt-5 pb-5">
          <div className="text-sm font-semibold text-foreground mb-1">{t("shareTitle")}</div>
          <p className="text-xs text-muted-foreground mb-4">
            {inviteUrl ? t("shareSubtitleInvite") : t("shareSubtitle")}
          </p>

          {/* Link row */}
          <div className="flex items-center gap-2 mb-4">
            <code className="text-xs bg-background border border-border rounded-md px-3 py-2 flex-1 truncate font-mono text-primary">
              {shareUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 h-9 gap-1.5">
              {copied
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : <Copy className="h-4 w-4" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-2">
            <ShareButton
              onClick={shareWhatsApp}
              icon={<MessageCircle className="h-4 w-4" />}
              label="WhatsApp"
              className="text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:border-[#25D366]/60"
            />
            <ShareButton
              onClick={shareTelegram}
              icon={<Send className="h-4 w-4" />}
              label="Telegram"
              className="text-[#2AABEE] border-[#2AABEE]/30 hover:bg-[#2AABEE]/10 hover:border-[#2AABEE]/60"
            />
            <ShareButton
              onClick={shareTwitter}
              icon={<XIcon className="h-4 w-4" />}
              label="X / Twitter"
              className="text-foreground border-border hover:bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {pact.status === "ACTIVE" && address && (
        <Link
          href={`/pact/${id}/vote`}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full mb-4"
        >
          {t("castVote")}
        </Link>
      )}

      {pact.status === "RESOLVED" && (
        <Link
          href={`/pact/${id}/result`}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full mb-4"
        >
          {t("viewResults")}
        </Link>
      )}

      {pact.status === "OPEN" && address === pact.creator && (
        <LockButton
          pactId={id}
          onLocked={() => setPact((p) => p && { ...p, status: "ACTIVE" })}
          t={t}
        />
      )}
    </main>
  );
}

function ShareButton({
  onClick,
  icon,
  label,
  className,
}: {
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
      {icon}
      {label}
    </button>
  );
}

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
    <Button onClick={lockPact} disabled={loading} variant="default" size="lg" className="w-full mt-4">
      {loading && <Spinner size="sm" />}
      {loading ? t("locking") : t("lockPact")}
    </Button>
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
