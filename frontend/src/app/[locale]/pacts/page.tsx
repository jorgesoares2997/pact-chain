"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users, Lock, CheckCircle2, RefreshCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { Pact, PactStatus } from "@/types/pact";

const MOCK_PACTS: Pact[] = [
  {
    id: "1",
    contractId: "C001",
    title: "30-Day Running Challenge",
    description: "Run at least 5km every day for 30 days.",
    creator: "GBXYZ",
    stakeAmount: 500_000_000,
    maxParticipants: 8,
    deadline: Date.now() + 1_000_000_000,
    resolutionMode: "MAJORITY",
    status: "OPEN",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    contractId: "C002",
    title: "No Social Media for 2 Weeks",
    description: "Delete all social apps and stay off for 14 days.",
    creator: "GABC",
    stakeAmount: 1_000_000_000,
    maxParticipants: 5,
    deadline: Date.now() + 500_000_000,
    resolutionMode: "JUDGE",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    contractId: "C003",
    title: "Learn Spanish — 100 Hours",
    description: "Log 100 hours of Spanish study by the deadline.",
    creator: "GDEF",
    stakeAmount: 2_000_000_000,
    maxParticipants: 4,
    deadline: Date.now() - 100_000_000,
    resolutionMode: "UNANIMITY",
    status: "RESOLVED",
    winner: "GDEF",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    contractId: "C004",
    title: "Cold Shower Streak — 21 Days",
    description: "Cold shower every morning for 21 days straight.",
    creator: "GHIJ",
    stakeAmount: 750_000_000,
    maxParticipants: 10,
    deadline: Date.now() + 1_500_000_000,
    resolutionMode: "MAJORITY",
    status: "OPEN",
    createdAt: new Date().toISOString(),
  },
  {
    id: "5",
    contractId: "C005",
    title: "Read 5 Books in 60 Days",
    description: "Finish and summarize five non-fiction books.",
    creator: "GKLM",
    stakeAmount: 300_000_000,
    maxParticipants: 6,
    deadline: Date.now() + 800_000_000,
    resolutionMode: "MAJORITY",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  },
];

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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: t("filters.all") },
    { key: "OPEN", label: t("filters.open") },
    { key: "ACTIVE", label: t("filters.active") },
    { key: "RESOLVED", label: t("filters.resolved") },
  ];

  const filtered =
    activeFilter === "ALL"
      ? MOCK_PACTS
      : MOCK_PACTS.filter((p) => p.status === activeFilter);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Filter Pills */}
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

      {/* Pact Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((pact) => (
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
            {pact.description}
          </p>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric
              label={t("card.stake")}
              value={`${stakeUsdc} USDC`}
            />
            <Metric
              label={t("card.pool")}
              value={`${totalPool} USDC`}
            />
            <Metric
              label={t("card.mode")}
              value={pact.resolutionMode}
            />
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
