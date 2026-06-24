"use client";

import Link from "next/link";
import { useWallet } from "@/context/WalletContext";

export default function Navbar() {
  const { address, connecting, connect, disconnect } = useWallet();

  const short = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

  return (
    <nav className="border-b border-purple-900/40 px-4 py-3 flex items-center justify-between bg-[#0f0f1a]/80 backdrop-blur sticky top-0 z-50">
      <Link href="/" className="text-purple-400 font-bold text-lg tracking-tight">
        ⛓ PactChain
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/create" className="text-sm text-slate-300 hover:text-white hidden sm:block">
          New Pact
        </Link>
        {address ? (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-900/50 text-purple-300 px-3 py-1.5 rounded-full font-mono">
              {short(address)}
            </span>
            <button
              onClick={disconnect}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={connecting}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
          >
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
}
