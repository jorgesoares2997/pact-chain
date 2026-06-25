"use client";

import { useWallet } from "@/context/WalletContext";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

export default function ConnectWalletGate({ children }: { children: ReactNode }) {
  const { address, connecting, connect } = useWallet();

  if (address) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2 border border-primary/20 shadow-sm">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">Connect your wallet</h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-4 leading-relaxed">
        You need a Stellar wallet (Freighter) to create or join pacts.
      </p>
      <Button
        onClick={connect}
        disabled={connecting}
        size="lg"
        className="w-full sm:w-auto px-8"
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    </div>
  );
}
