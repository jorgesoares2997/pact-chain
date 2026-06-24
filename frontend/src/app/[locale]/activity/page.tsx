"use client";

import { useTranslations } from "next-intl";
import {
  UserPlus,
  Trophy,
  Lock,
  RefreshCcw,
  PlusCircle,
  Vote,
} from "lucide-react";

type EventType = "JOIN" | "WIN" | "LOCK" | "REFUND" | "CREATE" | "VOTE";

interface ActivityEvent {
  id: string;
  type: EventType;
  actor: string;
  pactTitle: string;
  pactId: string;
  amount?: number;
  timestamp: number;
}

const MOCK_EVENTS: ActivityEvent[] = [
  {
    id: "e1",
    type: "WIN",
    actor: "GBXYZ…4321",
    pactTitle: "30-Day Running Challenge",
    pactId: "1",
    amount: 3_800_000_000,
    timestamp: Date.now() - 2 * 60 * 1000,
  },
  {
    id: "e2",
    type: "VOTE",
    actor: "GABC…9876",
    pactTitle: "No Social Media for 2 Weeks",
    pactId: "2",
    timestamp: Date.now() - 18 * 60 * 1000,
  },
  {
    id: "e3",
    type: "JOIN",
    actor: "GDEF…1111",
    pactTitle: "Cold Shower Streak — 21 Days",
    pactId: "4",
    amount: 750_000_000,
    timestamp: Date.now() - 45 * 60 * 1000,
  },
  {
    id: "e4",
    type: "LOCK",
    actor: "GABC…9876",
    pactTitle: "No Social Media for 2 Weeks",
    pactId: "2",
    timestamp: Date.now() - 2 * 3600 * 1000,
  },
  {
    id: "e5",
    type: "CREATE",
    actor: "GHIJ…2222",
    pactTitle: "Cold Shower Streak — 21 Days",
    pactId: "4",
    timestamp: Date.now() - 4 * 3600 * 1000,
  },
  {
    id: "e6",
    type: "JOIN",
    actor: "GKLM…3333",
    pactTitle: "Read 5 Books in 60 Days",
    pactId: "5",
    amount: 300_000_000,
    timestamp: Date.now() - 6 * 3600 * 1000,
  },
  {
    id: "e7",
    type: "REFUND",
    actor: "GNOP…7777",
    pactTitle: "Daily Meditation — 21 Days",
    pactId: "6",
    amount: 500_000_000,
    timestamp: Date.now() - 24 * 3600 * 1000,
  },
  {
    id: "e8",
    type: "WIN",
    actor: "GQRS…8888",
    pactTitle: "Learn Spanish — 100 Hours",
    pactId: "3",
    amount: 7_600_000_000,
    timestamp: Date.now() - 26 * 3600 * 1000,
  },
];

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

function relativeTime(ts: number): string {
  const delta = Math.floor((Date.now() - ts) / 1000);
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export default function ActivityPage() {
  const t = useTranslations("Activity");

  return (
    <main className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

        <div className="flex flex-col gap-0">
          {MOCK_EVENTS.map((event, idx) => {
            const config = EVENT_CONFIG[event.type];
            const isLast = idx === MOCK_EVENTS.length - 1;

            return (
              <div
                key={event.id}
                className={`relative flex gap-4 ${isLast ? "" : "pb-6"}`}
              >
                {/* Icon dot */}
                <div
                  className={`relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border bg-background ${config.color}`}
                >
                  <span className={`${config.bgColor} rounded-full p-1.5`}>
                    {config.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1.5 pb-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-foreground leading-snug">
                      <EventDescription event={event} t={t} />
                    </p>
                    <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                      {relativeTime(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function EventDescription({
  event,
  t,
}: {
  event: ActivityEvent;
  t: ReturnType<typeof useTranslations<"Activity">>;
}) {
  const usdc = event.amount
    ? (event.amount / 1e7).toFixed(2)
    : null;

  const actor = (
    <span className="font-semibold text-foreground">{event.actor}</span>
  );
  const pact = (
    <span className="font-medium text-foreground">&ldquo;{event.pactTitle}&rdquo;</span>
  );
  const amount = usdc ? (
    <span className="font-semibold text-foreground">{usdc} USDC</span>
  ) : null;

  switch (event.type) {
    case "JOIN":
      return (
        <span className="text-muted-foreground">
          {actor} {t("events.joined")} {pact}
          {amount && (
            <>
              {" "}
              {t("events.staking")} {amount}
            </>
          )}
        </span>
      );
    case "WIN":
      return (
        <span className="text-muted-foreground">
          {actor} {t("events.won")} {pact}
          {amount && (
            <>
              {" "}— {amount}
            </>
          )}
        </span>
      );
    case "LOCK":
      return (
        <span className="text-muted-foreground">
          {actor} {t("events.locked")} {pact}
        </span>
      );
    case "REFUND":
      return (
        <span className="text-muted-foreground">
          {actor} {t("events.refunded")} {pact}
          {amount && (
            <>
              {" "}— {amount}
            </>
          )}
        </span>
      );
    case "CREATE":
      return (
        <span className="text-muted-foreground">
          {actor} {t("events.created")} {pact}
        </span>
      );
    case "VOTE":
      return (
        <span className="text-muted-foreground">
          {actor} {t("events.voted")} {pact}
        </span>
      );
  }
}
