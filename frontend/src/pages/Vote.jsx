import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ConnectWalletGate from "../components/ConnectWalletGate.jsx";
import Spinner from "../components/Spinner.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { api } from "../lib/api.js";

export default function Vote() {
  return (
    <ConnectWalletGate>
      <VoteInner />
    </ConnectWalletGate>
  );
}

function VoteInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, signTx } = useWallet();

  const [pact, setPact] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Mock participants until contract is live
  const participants = [
    { address: "GABC…1234", label: "Alice" },
    { address: "GDEF…5678", label: "Bob" },
    { address: "GHIJ…9012", label: "Carol" },
  ];

  useEffect(() => {
    api.getPact(id).then(setPact).catch(console.error);
  }, [id]);

  async function submitVote() {
    if (!selected) return toast.error("Select a candidate first");
    setSubmitting(true);
    try {
      // Production: build vote() tx, sign, submit
      // const xdrStr = await buildAndSimulate(address, contract.call("vote", ...))
      // const signed = await signTx(xdrStr)
      // await submitSigned(signed)

      await api.logInteraction(address, "vote_cast", id, { candidate: selected });
      if (window.plausible) window.plausible("vote_cast");

      toast.success("Vote submitted!");
      navigate(`/pact/${id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!pact) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-white mb-2">Cast Your Vote</h1>
      <p className="text-slate-400 text-sm mb-6">{pact.title}</p>

      <p className="text-xs text-slate-500 mb-3">
        Select who you think won the commitment challenge.
        You cannot vote for yourself.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {participants
          .filter((p) => p.address !== address)
          .map((p) => (
            <button
              key={p.address}
              onClick={() => setSelected(p.address)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                selected === p.address
                  ? "border-purple-500 bg-purple-900/30"
                  : "border-slate-700 hover:border-slate-500 bg-[#1a1730]"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold">
                {p.label[0]}
              </div>
              <div>
                <div className="text-white text-sm font-medium">{p.label}</div>
                <div className="text-slate-500 text-xs font-mono">{p.address}</div>
              </div>
              {selected === p.address && <span className="ml-auto text-purple-400">✓</span>}
            </button>
          ))}
      </div>

      <button
        onClick={submitVote}
        disabled={!selected || submitting}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {submitting && <Spinner size="sm" />}
        {submitting ? "Submitting…" : "Submit Vote"}
      </button>
    </main>
  );
}
