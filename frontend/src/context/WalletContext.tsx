"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTx: (xdr: string) => Promise<string>;
}

const WalletCtx = createContext<WalletContextValue | null>(null);

// Dynamically imported only on the client to avoid SSR issues with localstorage
async function getKit() {
  const { StellarWalletsKit, Networks } = await import("@creit.tech/stellar-wallets-kit");
  const { FreighterModule, FREIGHTER_ID } = await import(
    "@creit.tech/stellar-wallets-kit/modules/freighter"
  );
  return { StellarWalletsKit, Networks, FreighterModule, FREIGHTER_ID };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { StellarWalletsKit, Networks, FreighterModule, FREIGHTER_ID } = await getKit();
      StellarWalletsKit.init({
        network: Networks.TESTNET,
        selectedWalletId: FREIGHTER_ID,
        modules: [new FreighterModule()],
      });
      StellarWalletsKit.setWallet(FREIGHTER_ID);
      const { address: addr } = await StellarWalletsKit.fetchAddress();
      setAddress(addr);
    } catch (e) {
      console.error("Wallet connect error", e);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const signTx = useCallback(
    async (xdrStr: string) => {
      if (!address) throw new Error("Wallet not connected");
      const { StellarWalletsKit, Networks } = await getKit();
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
