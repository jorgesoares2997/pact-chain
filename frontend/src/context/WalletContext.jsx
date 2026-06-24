import { createContext, useContext, useState, useCallback } from "react";
import {
  StellarWalletsKit,
  Networks,
} from "@creit.tech/stellar-wallets-kit";
import { FreighterModule, FREIGHTER_ID } from "@creit.tech/stellar-wallets-kit/modules/freighter";

const WalletCtx = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
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
    async (xdrStr) => {
      if (!address) throw new Error("Wallet not connected");
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

export const useWallet = () => useContext(WalletCtx);
