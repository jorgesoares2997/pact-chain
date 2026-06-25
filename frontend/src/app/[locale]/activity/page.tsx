"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  UserPlus,
  Trophy,
  Lock,
  RefreshCcw,
  PlusCircle,
  Vote,
} from "lucide-react";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";
import type { Interaction, InteractionAction } from "@/types/pact";

type EventType = "JOIN" | "WIN" | "LOCK" | "REFUND" | "CREATE" | "VOTE";

const ACTION_MAP: Record<InteractionAction, EventType> = {
  pact_created: "CREATE",
  joined_pact: "JOIN",
  pact_locked: "LOCK",
  voted: "VOTE",
  pact_won: "WIN",
  pact_refunded: "REFUND",
};

const EVENT_TO_I18N_KEY: Record<EventType, "joined" | "won" | "locked" | "refunded" | "created" | "voted"> = {
  JOIN: "joined",
  WIN: "won",
  LOCK: "locked",
  REFUND: "refunded",
  CREATE: "created",
  VOTE: "voted",
};

const EVENT_CONFIG: Record<
  EventType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  JOIN: {
    icon: <UserPlus className="h-3.5 w-3.5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
  WIN: {
    icon: <Trophy className="h-3.5 w-3.5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  LOCK: {
    icon: <Lock className="h-3.5 w-3.5" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  REFUND: {
    icon: <RefreshCcw className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  CREATE: {
    icon: <PlusCircle className="h-3.5 w-3.5" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  VOTE: {
    icon: <Vote className="h-3.5 w-3.5" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
};

function relativeTime(ts: string): string {
  const delta = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ActivityPage() {
  const t = useTranslations("Activity");
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getActivity(50)
      .then(setInteractions)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-destructive text-sm">{error}</div>
      ) : interactions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          <div className="flex flex-col gap-0">
            {interactions.map((item, idx) => {
              const type: EventType = ACTION_MAP[item.action] ?? "CREATE";
              const config = EVENT_CONFIG[type];
              const isLast = idx === interactions.length - 1;

              return (
                <div
                  key={item.id}
                  className={`relative flex gap-4 ${isLast ? "" : "pb-6"}`}
                >
                  <div
                    className={`relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border bg-background ${config.color}`}
                  >
                    <span className={`${config.bgColor} rounded-full p-1.5`}>
                      {config.icon}
                    </span>
                  </div>

                  <div className="flex-1 pt-1.5 pb-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm text-muted-foreground leading-snug">
                        <span className="font-semibold text-foreground">
                          {shortAddress(item.wallet)}
                        </span>{" "}
                        {t(`events.${EVENT_TO_I18N_KEY[type]}`)}{" "}
                        {item.pactId ? (
                          <Link
                            href={`/pact/${item.pactId}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            &ldquo;{item.pactTitle ?? item.pactId}&rdquo;
                          </Link>
                        ) : null}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
