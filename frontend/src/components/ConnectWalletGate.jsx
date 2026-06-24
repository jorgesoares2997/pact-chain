import { useWallet } from "../context/WalletContext.jsx";

export default function ConnectWalletGate({ children }) {
  const { address, connecting, connect } = useWallet();

  if (address) return children;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <div className="text-5xl">🔐</div>
      <h2 className="text-xl font-semibold text-slate-200">Connect your wallet to continue</h2>
      <p className="text-slate-500 text-sm text-center max-w-xs">
        You need a Stellar wallet (Freighter or WalletConnect) to create or join pacts.
      </p>
      <button
        onClick={connect}
        disabled={connecting}
        className="mt-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    </div>
  );
}
