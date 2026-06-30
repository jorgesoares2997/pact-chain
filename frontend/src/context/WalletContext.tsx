"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

const WALLET_ID_KEY = "swk_selected_wallet";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTx: (xdr: string) => Promise<string>;
}

const WalletCtx = createContext<WalletContextValue | null>(null);

async function buildKit() {
  const { StellarWalletsKit, Networks, KitEventType } = await import(
    "@creit.tech/stellar-wallets-kit"
  );
  const { FreighterModule } = await import(
    "@creit.tech/stellar-wallets-kit/modules/freighter"
  );
  const { LobstrModule } = await import(
    "@creit.tech/stellar-wallets-kit/modules/lobstr"
  );
  const { xBullModule } = await import(
    "@creit.tech/stellar-wallets-kit/modules/xbull"
  );
  const { CactusLinkModule } = await import(
    "@creit.tech/stellar-wallets-kit/modules/cactuslink"
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modules: any[] = [
    new FreighterModule(),
    new LobstrModule(),
    new xBullModule(),
    new CactusLinkModule(),
  ];

  // WalletConnect requires a Reown project ID — optional
  const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (wcProjectId) {
    const { WalletConnectModule, WalletConnectTargetChain } = await import(
      "@creit.tech/stellar-wallets-kit/modules/wallet-connect"
    );
    modules.push(
      new WalletConnectModule({
        projectId: wcProjectId,
        metadata: {
          name: "PactChain",
          description: "Binding social commitments on Stellar",
          url: typeof window !== "undefined" ? window.location.origin : "https://pactchain.app",
          icons: ["https://pactchain.app/logo.png"],
        },
        allowedChains: [WalletConnectTargetChain.TESTNET],
      })
    );
  }

  const savedWalletId = typeof localStorage !== "undefined"
    ? localStorage.getItem(WALLET_ID_KEY) ?? undefined
    : undefined;

  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: savedWalletId,
    modules,
  });

  return { StellarWalletsKit, Networks, KitEventType };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedAddr = localStorage.getItem("swk_address");
    const savedWalletId = localStorage.getItem(WALLET_ID_KEY);
    if (savedAddr && savedWalletId) {
      // Re-init kit silently so signTx works on page reload
      buildKit().catch(() => null);
      setAddress(savedAddr);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { StellarWalletsKit, Networks, KitEventType } = await buildKit();

      // authModal handles wallet picker + mobile deep-link QR
      const { address: addr } = await StellarWalletsKit.authModal();

      // Persist for reconnection
      const selectedId = StellarWalletsKit.selectedModule?.productId;
      if (selectedId) localStorage.setItem(WALLET_ID_KEY, selectedId);
      localStorage.setItem("swk_address", addr);

      setAddress(addr);

      // Listen for disconnects triggered from inside the wallet/kit
      StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
        localStorage.removeItem(WALLET_ID_KEY);
        localStorage.removeItem("swk_address");
        setAddress(null);
      });
    } catch (e) {
      // User closed modal — not an error
      console.error("Wallet connect error", e);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    localStorage.removeItem(WALLET_ID_KEY);
    localStorage.removeItem("swk_address");
    setAddress(null);
    try {
      const { StellarWalletsKit } = await buildKit();
      await StellarWalletsKit.disconnect();
    } catch {
      // Ignore errors on disconnect
    }
  }, []);

  const signTx = useCallback(
    async (xdrStr: string) => {
      if (!address) throw new Error("Wallet not connected");
      const { StellarWalletsKit, Networks } = await buildKit();
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrStr, {
        address,
        networkPassphrase: Networks.TESTNET,
      });
      return signedTxXdr;
    },
    [address]
  );

  return (
    <WalletCtx.Provider value={{ address, connecting, connect, disconnect, signTx }}>
      {children}
    </WalletCtx.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}
