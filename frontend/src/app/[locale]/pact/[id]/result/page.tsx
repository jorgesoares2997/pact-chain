"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";
import type { Pact } from "@/types/pact";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Trophy, RotateCcw, Copy, ArrowLeft } from "lucide-react";

export default function ResultPage() {
  const t = useTranslations("Result");
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
  }

  if (!pact) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner size="lg" /></div>;

  const winner = pact.winner ?? "Unknown";
  const total = (pact.stakeAmount * pact.maxParticipants) / 1e7;
  const fee = (total * 0.02).toFixed(2);
  const payout = (total - parseFloat(fee)).toFixed(2);

  function shareResult() {
    const text = `🏆 ${pact!.title}\nWinner: ${winner.slice(0, 8)}…\nPayout: ${payout} USDC\n\nCreated on PactChain ⛓\n${window.location.href}`;
    navigator.clipboard.writeText(text);
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12 text-center">
      {pact.status === "REFUNDED" ? (
        <div className="flex flex-col items-center mb-8">
          <div className="bg-muted p-4 rounded-full mb-6">
            <RotateCcw className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">{t("refundedTitle")}</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            {t("refundedDesc")}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary/10 p-4 rounded-full mb-6">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">{t("winnerTitle")}</h1>
            <p className="text-muted-foreground text-sm max-w-sm">{pact.title}</p>
          </div>

          <Card className="mb-8 border-primary/20 bg-primary/5 shadow-md">
            <CardContent className="pt-6">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("winnerLabel")}</div>
              <div className="font-mono text-primary text-sm break-all mb-6 bg-background rounded-md border p-2">{winner}</div>
              
              <div className="grid grid-cols-3 gap-4 text-center divide-x divide-border">
                <div className="px-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1 leading-tight">{t("totalPool")}</div>
                  <div className="text-foreground font-semibold text-sm">{total.toFixed(2)}</div>
                </div>
                <div className="px-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1 leading-tight">{t("protocolFee")}</div>
                  <div className="text-muted-foreground text-sm">{fee}</div>
                </div>
                <div className="px-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1 leading-tight">{t("winnerPayout")}</div>
                  <div className="text-emerald-500 font-bold text-sm">{payout}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={shareResult}
            variant="outline"
            className="w-full mb-8 font-semibold"
          >
            <Copy className="mr-2 h-4 w-4" />
            {t("copyCard")}
          </Button>
        </>
      )}

      {!npsSent ? (
        <Card className="mb-8 bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-foreground mb-4">
              {t("npsQuestion")}
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => submitNps(n)}
                  className={`w-9 h-9 rounded-md text-sm font-bold transition-all border ${
                    nps === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-600 dark:text-green-400 font-medium text-sm mb-8 flex items-center justify-center gap-2">
          {t("npsThanks", { score: nps ?? 0 })}
        </div>
      )}

      <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("backHome")}
      </Link>
    </main>
  );
}
