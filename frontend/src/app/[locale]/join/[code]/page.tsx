"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import ConnectWalletGate from "@/components/ConnectWalletGate";
import Spinner from "@/components/Spinner";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import type { Pact } from "@/types/pact";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertCircle, FileSignature } from "lucide-react";

export default function JoinPactPage() {
  return (
    <ConnectWalletGate>
      <JoinPactInner />
    </ConnectWalletGate>
  );
}

function JoinPactInner() {
  const t = useTranslations("Join");
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { address } = useWallet();

  const [pact, setPact] = useState<Pact | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api.resolveInvite(code).then(setPact).catch((e: Error) => setFetchError(e.message));
  }, [code]);

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-foreground">{t("invalidLink")}</h2>
        <p className="text-muted-foreground text-sm">{fetchError}</p>
      </div>
    );
  }

  if (!pact) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner size="lg" /></div>;

  const stakeUsdc = (pact.stakeAmount / 1e7).toFixed(2);

  async function handleJoin() {
    if (!pact) return;
    setJoining(true);
    try {
      await api.logInteraction(address!, "joined_pact", pact.id);
      toast.success(t("success"));
      router.push(`/pact/${pact.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <Card className="border-border shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileSignature className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">{pact.title}</CardTitle>
          </div>
          <CardDescription className="text-base">{pact.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="pb-6">
          <dl className="grid grid-cols-2 gap-y-4 text-sm mb-6 border-y border-border py-4">
            <dt className="text-muted-foreground">{t("stakeRequired")}</dt>
            <dd className="text-foreground font-semibold text-right">{stakeUsdc} USDC</dd>
            
            <dt className="text-muted-foreground">{t("resolution")}</dt>
            <dd className="text-foreground text-right">{pact.resolutionMode}</dd>
            
            <dt className="text-muted-foreground">{t("votingDeadline")}</dt>
            <dd className="text-foreground text-right">{new Date(pact.deadline * 1000).toLocaleString()}</dd>
            
            <dt className="text-muted-foreground">{t("maxParticipants")}</dt>
            <dd className="text-foreground text-right">{pact.maxParticipants}</dd>
          </dl>

          <div className="bg-muted rounded-xl p-4 text-xs text-muted-foreground">
            {t("disclaimer", { stake: stakeUsdc })}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleJoin}
            disabled={joining}
            size="lg"
            className="w-full"
          >
            {joining && <Spinner size="sm" />}
            {joining ? t("joining") : t("joinButton", { stake: stakeUsdc })}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
