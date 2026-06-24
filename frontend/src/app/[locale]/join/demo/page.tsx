"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileSignature, CheckCircle2, ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Spinner from "@/components/Spinner";

const DEMO_PACT = {
  id: "demo",
  title: "30-Day Running Challenge",
  description:
    "Run at least 5 km every day for 30 consecutive days. Log your run with a screenshot or GPS data. The group votes on the winner at the end.",
  stakeAmount: 500_000_000, // 50 USDC (7 decimals)
  maxParticipants: 8,
  deadline: Math.floor(Date.now() / 1000) + 30 * 86400,
  resolutionMode: "MAJORITY",
};

export default function JoinDemoPage() {
  const t = useTranslations("Join");
  const tDemo = useTranslations("JoinDemo");
  const [phase, setPhase] = useState<"idle" | "joining" | "done">("idle");

  const stakeUsdc = (DEMO_PACT.stakeAmount / 1e7).toFixed(2);
  const deadlineStr = new Date(DEMO_PACT.deadline * 1000).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  function handleJoin() {
    setPhase("joining");
    setTimeout(() => setPhase("done"), 1400);
  }

  if (phase === "done") {
    return (
      <main className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-6 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-900">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {tDemo("successTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tDemo("successDesc")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/pact/demo"
            className="flex-1 inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {tDemo("viewPact")}
          </Link>
          <Link
            href="/create"
            className="flex-1 inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {tDemo("createOwn")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">{tDemo("demoNote")}</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:border-amber-900">
        {tDemo("demoBadge")}
      </div>

      <Card className="border-border shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg leading-snug">
              {DEMO_PACT.title}
            </CardTitle>
          </div>
          <CardDescription className="text-sm leading-relaxed">
            {DEMO_PACT.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-6">
          <dl className="grid grid-cols-2 gap-y-3.5 text-sm mb-6 border-y border-border py-4">
            <dt className="text-muted-foreground">{t("stakeRequired")}</dt>
            <dd className="text-foreground font-semibold text-right">
              {stakeUsdc} USDC
            </dd>

            <dt className="text-muted-foreground">{t("resolution")}</dt>
            <dd className="text-foreground text-right">
              {DEMO_PACT.resolutionMode}
            </dd>

            <dt className="text-muted-foreground">{t("votingDeadline")}</dt>
            <dd className="text-foreground text-right">{deadlineStr}</dd>

            <dt className="text-muted-foreground">{t("maxParticipants")}</dt>
            <dd className="text-foreground text-right">
              {DEMO_PACT.maxParticipants}
            </dd>
          </dl>

          <div className="bg-muted rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
            {tDemo("demoDisclaimer")}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleJoin}
            disabled={phase === "joining"}
            size="lg"
            className="w-full"
          >
            {phase === "joining" && <Spinner size="sm" />}
            {phase === "joining"
              ? t("joining")
              : t("joinButton", { stake: stakeUsdc })}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {tDemo("noWalletNeeded")}
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
