"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users, Lock, CheckCircle2, RefreshCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";
import type { Pact, PactStatus } from "@/types/pact";

type FilterTab = "ALL" | PactStatus;

const STATUS_CONFIG: Record<
  PactStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  OPEN: {
    label: "Open",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
    icon: <Users className="h-3 w-3" />,
  },
  ACTIVE: {
    label: "Active",
    color: "text-amber-600 bg-amber-500/10 border-amber-200 dark:border-amber-900",
    icon: <Lock className="h-3 w-3" />,
  },
  RESOLVED: {
    label: "Resolved",
    color: "text-primary bg-primary/10 border-primary/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  REFUNDED: {
    label: "Refunded",
    color: "text-muted-foreground bg-muted border-border",
    icon: <RefreshCcw className="h-3 w-3" />,
  },
};

export default function PactsPage() {
  const t = useTranslations("Pacts");
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("ALL");
  const [pacts, setPacts] = React.useState<Pact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    const status = activeFilter === "ALL" ? undefined : activeFilter;
    api
      .listPacts(status)
      .then(setPacts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: t("filters.all") },
    { key: "OPEN", label: t("filters.open") },
    { key: "ACTIVE", label: t("filters.active") },
    { key: "RESOLVED", label: t("filters.resolved") },
  ];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeFilter === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-destructive text-sm">{error}</div>
      ) : pacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pacts.map((pact) => (
            <PactCard key={pact.id} pact={pact} t={t} />
          ))}
        </div>
      )}
    </main>
  );
}

function PactCard({ pact, t }: { pact: Pact; t: ReturnType<typeof useTranslations<"Pacts">> }) {
  const config = STATUS_CONFIG[pact.status];
  const stakeUsdc = (pact.stakeAmount / 1e7).toFixed(2);
  const totalPool = ((pact.stakeAmount * pact.maxParticipants) / 1e7).toFixed(0);

  return (
    <Link href={`/pact/${pact.id}`}>
      <Card className="hover:border-primary/40 transition-colors cursor-pointer">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
              {pact.title}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 uppercase tracking-wide ${config.color}`}
            >
              {config.icon}
              {config.label}
            </span>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-1 mb-4">
            {pact.description || "—"}
          </p>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric label={t("card.stake")} value={`${stakeUsdc} USDC`} />
            <Metric label={t("card.pool")} value={`${totalPool} USDC`} />
            <Metric label={t("card.mode")} value={pact.resolutionMode} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-xs font-semibold text-foreground truncate">{value}</div>
    </div>
  );
}
