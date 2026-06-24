"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Wallet,
  TrendingUp,
  Trophy,
  BarChart2,
  LogOut,
  Globe,
  Moon,
  Sun,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/context/WalletContext";
import type { Pact } from "@/types/pact";

const MOCK_PACTS: Pact[] = [
  {
    id: "1",
    contractId: "C001",
    title: "30-Day Running Challenge",
    description: "",
    creator: "GBXYZ",
    stakeAmount: 500_000_000,
    maxParticipants: 8,
    deadline: Date.now() - 1_000_000,
    resolutionMode: "MAJORITY",
    status: "RESOLVED",
    winner: "GBXYZ",
    createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
  },
  {
    id: "2",
    contractId: "C002",
    title: "No Social Media for 2 Weeks",
    description: "",
    creator: "GABC",
    stakeAmount: 1_000_000_000,
    maxParticipants: 5,
    deadline: Date.now() + 500_000_000,
    resolutionMode: "JUDGE",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
  },
  {
    id: "5",
    contractId: "C005",
    title: "Read 5 Books in 60 Days",
    description: "",
    creator: "GBXYZ",
    stakeAmount: 300_000_000,
    maxParticipants: 6,
    deadline: Date.now() + 800_000_000,
    resolutionMode: "MAJORITY",
    status: "OPEN",
    createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
  },
];

const STATUS_BADGE: Record<string, string> = {
  OPEN: "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
  ACTIVE: "text-amber-600 bg-amber-500/10 border-amber-200 dark:border-amber-900",
  RESOLVED: "text-primary bg-primary/10 border-primary/20",
  REFUNDED: "text-muted-foreground bg-muted border-border",
};

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const { address, disconnect } = useWallet();
  const { theme, setTheme } = useTheme();

  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = pathname.startsWith("/pt") ? "pt" : "en";
  const toggleLocale = () => {
    const next = currentLocale === "en" ? "pt" : "en";
    router.replace(pathname.replace(`/${currentLocale}`, `/${next}`));
  };

  if (!address) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">{t("notConnected.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("notConnected.desc")}</p>
      </main>
    );
  }

  const shortAddr = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const totalLocked = MOCK_PACTS.filter((p) => p.status !== "RESOLVED" && p.status !== "REFUNDED")
    .reduce((acc, p) => acc + p.stakeAmount, 0);
  const totalEarned = 3_800_000_000;
  const winRate = 67;

  return (
    <main className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Wallet Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-border">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("wallet")}</p>
            <p className="text-sm font-mono font-semibold text-foreground">{shortAddr}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/50"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          {t("disconnect")}
        </Button>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t("stats.title")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={t("stats.locked")}
            value={`${(totalLocked / 1e7).toFixed(2)}`}
            unit="USDC"
          />
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label={t("stats.earned")}
            value={`${(totalEarned / 1e7).toFixed(2)}`}
            unit="USDC"
          />
          <StatCard
            icon={<BarChart2 className="h-4 w-4" />}
            label={t("stats.winRate")}
            value={`${winRate}`}
            unit="%"
          />
        </div>
      </div>

      {/* Pact History */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t("history.title")}
        </h2>
        <div className="flex flex-col gap-2">
          {MOCK_PACTS.map((pact) => (
            <Link key={pact.id} href={`/pact/${pact.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="py-4 px-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate mb-1">
                      {pact.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(pact.stakeAmount / 1e7).toFixed(2)} USDC &middot; {pact.resolutionMode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_BADGE[pact.status]}`}
                    >
                      {pact.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t("settings.title")}
        </h2>
        <Card>
          <CardContent className="py-2 px-0 divide-y divide-border">
            <button
              onClick={toggleLocale}
              className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t("settings.language")}</span>
              </div>
              <span className="text-xs font-semibold font-mono bg-muted border border-border px-2 py-0.5 rounded">
                {currentLocale.toUpperCase()}
              </span>
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">{t("settings.theme")}</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground capitalize">{theme}</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-3 flex flex-col items-center text-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <div className="text-base font-bold text-foreground leading-none">
            {value}
            <span className="text-xs font-medium text-muted-foreground ml-0.5">{unit}</span>
          </div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
