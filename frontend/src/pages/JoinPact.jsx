import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ConnectWalletGate from "../components/ConnectWalletGate.jsx";
import Spinner from "../components/Spinner.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { api } from "../lib/api.js";

export default function JoinPact() {
  return (
    <ConnectWalletGate>
      <JoinPactInner />
    </ConnectWalletGate>
  );
}

function JoinPactInner() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { address, signTx } = useWallet();

  const [pact, setPact] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api
      .resolveInvite(code)
      .then(setPact)
      .catch((e) => setFetchError(e.message));
  }, [code]);

  if (fetchError) {
    return (
      <div className="flex flex-col items-center py-24 gap-3 text-center px-4">
        <div className="text-4xl">❌</div>
        <h2 className="text-xl font-semibold text-slate-200">Invalid invite link</h2>
        <p className="text-slate-500 text-sm">{fetchError}</p>
      </div>
    );
  }

  if (!pact) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const deadlineStr = new Date(pact.deadline * 1000).toLocaleString();
  const stakeUsdc = (pact.stake_amount / 1e7).toFixed(2);

  async function handleJoin() {
    setJoining(true);
    try {
      // In production: build join() tx, sign, submit
      // const xdrStr = await buildAndSimulate(address, contract.call("join", ...))
      // const signed = await signTx(xdrStr)
      // await submitSigned(signed)

      await api.logInteraction(address, "joined_pact", pact.id);
      if (window.plausible) window.plausible("user_joined");

      toast.success("You joined the pact!");
      navigate(`/pact/${pact.id}`);
    } catch (err) {
      toast.error(err.message || "Failed to join pact");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <div className="bg-[#1a1730] border border-purple-900/40 rounded-2xl p-6">
        <div className="text-3xl mb-3">📜</div>
        <h1 className="text-xl font-bold text-white mb-1">{pact.title}</h1>
        <p className="text-slate-400 text-sm mb-5">{pact.description}</p>

        <dl className="grid grid-cols-2 gap-y-3 text-sm mb-6">
          <dt className="text-slate-500">Stake required</dt>
          <dd className="text-white font-semibold">{stakeUsdc} USDC</dd>
          <dt className="text-slate-500">Resolution</dt>
          <dd className="text-purple-300">{pact.resolution_mode}</dd>
          <dt className="text-slate-500">Voting deadline</dt>
          <dd className="text-white">{deadlineStr}</dd>
          <dt className="text-slate-500">Max participants</dt>
          <dd className="text-white">{pact.max_participants}</dd>
        </dl>

        <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-3 text-xs text-purple-300 mb-5">
          By joining, you agree to stake <strong>{stakeUsdc} USDC</strong>. Funds are held in a
          Soroban smart contract and released to the winner(s) after resolution.
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {joining && <Spinner size="sm" />}
          {joining ? "Joining…" : `Stake ${stakeUsdc} USDC & Join`}
        </button>
      </div>
    </main>
  );
}
